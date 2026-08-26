inventoryModules.index = (() => {
    const INVENTORY_PATH =
        /^\/(?:my\/inventory|id\/[^/]+\/inventory|profiles\/\d+\/inventory)\/?$/i;

    function numericSteamId(value) {
        const normalized = String(value || '');

        return /^\d{17}$/.test(normalized) ? normalized : '';
    }

    function getPageContext() {
        const profileMatch = location.pathname.match(
            /^\/profiles\/(\d{17})\/inventory\/?$/i
        );
        const currentAccountId = numericSteamId(
            window.g_steamID || window.UserYou?.strSteamId
        );
        const activeOwnerId = numericSteamId(
            window.g_ActiveUser?.strSteamId ||
            window.g_rgProfileData?.steamid
        );
        const ownFlag = location.pathname.toLowerCase().startsWith('/my/') ||
            window.g_bViewingOwnProfile === true;
        const ownerSteamId = numericSteamId(
            profileMatch?.[1] || activeOwnerId ||
            (ownFlag ? currentAccountId : '')
        );
        const wallet = window.g_rgWalletInfo || {};
        const currencyId = Number(wallet.wallet_currency);
        const currencyCode = inventoryModules.types.getCurrencyCode(
            currencyId,
            wallet.wallet_currency_code
        );

        return {
            appContextData: window.g_rgAppContextData || {},
            country: String(window.g_strCountryCode || '').toUpperCase(),
            currencyCode,
            currencyId: Number.isSafeInteger(currencyId) && currencyId > 0
                ? currencyId
                : null,
            currentAccountId,
            isOwnInventory: Boolean(
                ownFlag &&
                currentAccountId &&
                ownerSteamId === currentAccountId
            ),
            ownerSteamId,
            wallet,
        };
    }

    function createFeeConfig(wallet) {
        const parseBps = inventoryModules.types.parseDecimalToBasisPoints;

        return inventoryModules.pricingService.normalizeFeeConfig({
            marketMinimumMinor: Number(wallet.wallet_market_minimum),
            publisherFeeBps: parseBps(
                wallet.wallet_publisher_fee_percent_default,
                null
            ),
            publisherFeeMinimumMinor: Number(
                wallet.wallet_publisher_fee_minimum
            ),
            steamFeeBaseMinor: Number(wallet.wallet_fee_base),
            steamFeeBps: parseBps(wallet.wallet_fee_percent, null),
            steamFeeMinimumMinor: Number(wallet.wallet_fee_minimum),
        });
    }

    function getSessionId() {
        if (window.g_sessionID) {
            return String(window.g_sessionID);
        }

        const match = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);

        return match ? decodeURIComponent(match[1]) : '';
    }

    function activeInventory(contexts) {
        const hash = location.hash.match(/^#(\d+)_(\d+)/);
        const appId = String(
            hash?.[1] || window.g_ActiveInventory?.appid || ''
        );
        const contextId = String(
            hash?.[2] || window.g_ActiveInventory?.contextid || ''
        );
        const context = contexts.find((candidate) => (
            candidate.appId === appId && candidate.contextId === contextId
        ));

        return {
            key: appId && contextId ? `${appId}:${contextId}` : '',
            label: context
                ? `${context.appName} · ${context.contextName}`
                : 'Current inventory tab',
        };
    }

    function inventoryKeyChanged(previousKey, nextKey) {
        return Boolean(
            previousKey &&
            nextKey &&
            previousKey !== nextKey
        );
    }

    function nativeInventoryState(
        nativeInventory = window.g_ActiveInventory,
        root = document
    ) {
        const errors = root.querySelectorAll?.(
            '#inventories .inventory_load_error'
        ) || [];
        const visibleError = [...errors].some((element) => (
            typeof element.getClientRects !== 'function' ||
            element.getClientRects().length > 0
        ));

        if (nativeInventory?.m_tsLastError || visibleError) {
            return 'error';
        }

        if (
            nativeInventory?.m_bPerformedInitialLoad &&
            !nativeInventory.m_ActivePromise
        ) {
            return 'ready';
        }

        if (
            nativeInventory?.BIsEmptyInventory?.() &&
            !nativeInventory.m_ActivePromise
        ) {
            return 'ready';
        }

        return root.querySelector?.(
            '#inventories .item[id]:not(.pendingItem)'
        ) ? 'ready' : 'loading';
    }

    async function waitForNativeInventoryIdle(
        signal,
        getActiveInventory = () => window.g_ActiveInventory
    ) {
        while (!signal?.aborted) {
            const activePromise = getActiveInventory()?.m_ActivePromise;

            if (!activePromise) {
                return;
            }

            await new Promise((resolve) => {
                let settled = false;
                const done = () => {
                    if (settled) {
                        return;
                    }

                    settled = true;
                    signal?.removeEventListener('abort', done);
                    resolve();
                };

                signal?.addEventListener('abort', done, { once: true });

                if (typeof activePromise.always === 'function') {
                    activePromise.always(done);
                } else if (typeof activePromise.then === 'function') {
                    activePromise.then(done, done);
                } else {
                    done();
                }
            });

            if (getActiveInventory()?.m_ActivePromise === activePromise) {
                return;
            }
        }
    }

    function findMountPoint() {
        const nativeFilters = document.querySelector(
            '.filter_ctn.inventory_filters'
        );

        if (nativeFilters?.parentElement) {
            return {
                before: nativeFilters,
                native: true,
                parent: nativeFilters.parentElement,
            };
        }

        const inventoryPage = document.querySelector('#inventory_page');

        if (inventoryPage?.parentElement) {
            return {
                native: true,
                parent: inventoryPage.parentElement,
                before: inventoryPage,
            };
        }

        const content = document.querySelector(
            '.responsive_page_template_content'
        );

        return content ? {
            before: content.firstChild,
            native: false,
            parent: content,
        } : null;
    }

    async function waitForPage() {
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const context = getPageContext();
            const mount = findMountPoint();

            if (
                mount &&
                context.ownerSteamId &&
                Object.keys(context.appContextData).length
            ) {
                return { context, mount };
            }

            await new Promise((resolve) => setTimeout(resolve, 250));
        }

        return { context: getPageContext(), mount: findMountPoint() };
    }

    async function init() {
        if (
            location.origin !== inventoryModules.steamApi.STEAM_COMMUNITY_ORIGIN ||
            !INVENTORY_PATH.test(location.pathname) ||
            document.getElementById('spt-inventory-economy')
        ) {
            return;
        }

        const { context, mount } = await waitForPage();

        if (!mount) {
            return;
        }

        inventoryModules.inventoryStyles.inject();

        const storage = inventoryModules.storage.createStorage(localStorage);
        const settings = storage.getSettings();
        let pageContext = context;
        const feeConfig = createFeeConfig(pageContext.wallet);
        const api = inventoryModules.steamApi.createSteamApi({
            fetchImpl: window.fetch.bind(window),
        });
        const inventoryService =
            inventoryModules.inventoryService.createInventoryService({ api });
        const pricingService = pageContext.currencyId && pageContext.currencyCode
            ? inventoryModules.pricingService.createPricingService({
                api,
                country: pageContext.country,
                currencyCode: pageContext.currencyCode,
                currencyId: pageContext.currencyId,
                feeConfig,
                storage,
            })
            : null;
        const actionService = inventoryModules.actionService
            .createActionService({ api });
        const contexts = inventoryModules.inventoryService.listContexts(
            pageContext.appContextData
        );
        let activeInventoryKey = activeInventory(contexts).key;
        const formatMinor = (value) => inventoryModules.types.formatMinor(
            value,
            pageContext.currencyCode
        );
        let items = [];
        let loadController = null;
        let actionRunning = false;
        let sessionInvalidated = false;
        let initialRefreshStarted = false;
        let initialForcePrices = false;

        const ui = inventoryModules.inventoryUi.createUi({
            callbacks: {
                onCancelRead: cancelRead,
                onGems: runGems,
                onInstantSell: (selected) => runSell(selected, {
                    instant: true,
                }),
                onRefresh: requestRefresh,
                onSell: runSell,
            },
            currencyCode: pageContext.currencyCode,
            formatMinor,
            isOwnInventory: pageContext.isOwnInventory,
        });

        ui.root.classList.toggle('native', mount.native);
        mount.parent.insertBefore(ui.root, mount.before);

        function applyMarketPrices(prices) {
            items = items.map((item) => ({
                ...item,
                price: prices.get(
                    `${item.appId}\u001f${item.marketHashName}`
                ) || (
                    item.marketable
                        ? { status: 'unpriced' }
                        : {
                            source: 'Not marketable',
                            status: 'unpriced',
                        }
                ),
            }));
        }

        function applyMarketPrice(key, snapshot) {
            items = items.map((item) => (
                `${item.appId}\u001f${item.marketHashName}` === key
                    ? { ...item, price: snapshot }
                    : item
            ));
        }

        function render() {
            const valuation = inventoryModules.valuationService.aggregate(items);
            const active = activeInventory(contexts);
            const activeTotals = valuation.byInventory.get(active.key) ||
                inventoryModules.valuationService.emptyTotals();
            ui.update({
                activeLabel: active.label,
                activeTotals,
                approximateFees: items.some((item) => (
                    item.price?.approximateFees
                )),
                items,
                overallTotals: valuation.overall,
            });
        }

        function startInitialRefreshWhenNativeReady() {
            if (initialRefreshStarted || sessionInvalidated) {
                return;
            }

            const state = nativeInventoryState();

            if (state === 'error') {
                ui.setStatus(
                    'Steam’s inventory must load first. Use Steam’s Try Again; valuation will resume automatically.',
                    { error: true }
                );
                return;
            }

            if (state !== 'ready') {
                ui.setStatus(
                    'Waiting for Steam to finish loading the current inventory…'
                );
                return;
            }

            initialRefreshStarted = true;
            refreshInventory(initialForcePrices);
        }

        function requestRefresh(forcePrices = false) {
            if (!initialRefreshStarted) {
                initialForcePrices = initialForcePrices || forcePrices;
                startInitialRefreshWhenNativeReady();
                return;
            }

            refreshInventory(forcePrices);
        }

        async function refreshInventory(forcePrices = false) {
            if (sessionInvalidated) {
                ui.setStatus(
                    'The Steam account changed. Reload the page before continuing.',
                    { error: true }
                );
                return;
            }

            if (actionRunning) {
                ui.setStatus('Finish the current action before refreshing.', {
                    error: true,
                });
                return;
            }

            loadController?.abort();
            loadController = new AbortController();
            ui.setLoading(true);
            ui.setStatus('Loading Steam inventory pages…');

            try {
                const result = await inventoryService.loadAll(
                    pageContext.ownerSteamId,
                    contexts,
                    {
                        beforePage: ({ signal }) => (
                            waitForNativeInventoryIdle(signal)
                        ),
                        onContext(progress) {
                            ui.setStatus(
                                `Loaded ${progress.completed} of ` +
                                `${progress.total} inventory tabs…`
                            );
                        },
                        signal: loadController.signal,
                    }
                );

                items = result.items;
                render();

                if (!pricingService) {
                    ui.setStatus(
                        'Currency unavailable. Items are shown without valuation.',
                        { error: true }
                    );
                    return;
                }

                ui.setStatus('Loading current Steam Market prices…');

                const priced = await pricingService.priceItems(items, {
                    force: forcePrices,
                    onProgress(progress) {
                        applyMarketPrice(progress.key, progress.snapshot);
                        render();
                        ui.setStatus(
                            `Priced ${progress.completed} of ` +
                            `${progress.total} unique market items…`
                        );
                    },
                    signal: loadController.signal,
                });

                applyMarketPrices(priced.prices);
                render();

                const failureText = result.failures.length
                    ? ` ${result.failures.length} inventory tab(s) failed.`
                    : '';
                const haltText = priced.halted
                    ? priced.haltReason === 'rate_limited'
                        ? ' Pricing stopped after repeated Steam rate limits. Wait before refreshing.'
                        : ' Pricing stopped after repeated Steam errors. Try refreshing later.'
                    : '';
                const ownershipText = pageContext.isOwnInventory
                    ? ''
                    : ' Read-only: this is another user’s inventory.';

                ui.setStatus(
                    `Valuation complete for ${items.length} asset(s).` +
                    failureText + haltText + ownershipText,
                    { error: Boolean(result.failures.length || priced.halted) }
                );
            } catch (error) {
                ui.setStatus(
                    error.code === 'cancelled'
                        ? 'Inventory loading cancelled.'
                        : error.code === 'authentication'
                            ? 'Steam session expired. Sign in again and reload.'
                            : error.message,
                    { error: error.code !== 'cancelled' }
                );
            } finally {
                ui.setLoading(false);
            }
        }

        function cancelRead() {
            loadController?.abort();
        }

        async function refreshSelectedPrices(selected, {
            onProgress,
            signal,
        } = {}) {
            const priced = await pricingService.priceItems(selected, {
                force: true,
                onProgress,
                signal,
            });

            for (const item of selected) {
                const snapshot = priced.prices.get(
                    `${item.appId}\u001f${item.marketHashName}`
                );

                if (snapshot) {
                    item.price = snapshot;
                }
            }

            render();
        }

        function liveSessionId() {
            const sessionId = getSessionId();

            if (!sessionId) {
                throw Object.assign(
                    new Error('Steam session expired. Reload after signing in.'),
                    { code: 'authentication' }
                );
            }

            return sessionId;
        }

        async function runSell(selected, { instant = false } = {}) {
            if (!pricingService || actionRunning) {
                return;
            }

            actionRunning = true;
            let mutationPhaseStarted = false;
            let progress = null;
            let refreshDialog = null;
            const refreshController = new AbortController();
            ui.setStatus('Refreshing selected prices for the sale preview…');

            try {
                refreshDialog = inventoryModules.actionProgressDialog
                    .showLoading(
                        instant
                            ? 'Preparing quick sales'
                            : 'Preparing Steam Market listings',
                        {
                            message:
                                `Refreshing current prices for ` +
                                `${selected.length} selected item(s)...`,
                            onCancel: () => refreshController.abort(),
                        }
                    );
                await refreshSelectedPrices(selected, {
                    onProgress: ({ completed, total }) => {
                        refreshDialog?.update(
                            `Refreshed ${completed} of ${total} ` +
                            'Market price(s)...'
                        );
                    },
                    signal: refreshController.signal,
                });
                refreshDialog.close();
                refreshDialog = null;
                const prepared = actionService.prepareSell({
                    feeConfig,
                    isOwnInventory: pageContext.isOwnInventory,
                    items: selected,
                    pricingMode: instant ? 'instant' : 'listing',
                    settings,
                });
                const review = await inventoryModules.actionPreviewDialog
                    .showSellReview({
                        currencyCode: pageContext.currencyCode,
                        exclusions: prepared.exclusions,
                        formatMinor,
                        instant,
                        proposals: prepared.proposals,
                        validate: (proposals) => actionService.validateEditedSell({
                            feeConfig,
                            isOwnInventory: pageContext.isOwnInventory,
                            proposals,
                            settings,
                        }),
                    });

                if (!review) {
                    ui.setStatus('Sale preview cancelled. No request was sent.');
                    return;
                }

                const confirmation = await inventoryModules.actionPreviewDialog
                    .showConfirmation({
                        actionLabel: instant
                            ? 'quick sales'
                            : 'selected listings',
                        summary:
                            `${review.totals.count} item(s) · ` +
                            `${formatMinor(review.totals.grossMinor)} buyer total · ` +
                            `${formatMinor(review.totals.feesMinor)} fees · ` +
                            `${formatMinor(review.totals.netMinor)} estimated proceeds`,
                    });

                if (!confirmation) {
                    ui.setStatus('Sale confirmation cancelled. No request was sent.');
                    return;
                }

                const sessionId = liveSessionId();
                progress = inventoryModules.actionProgressDialog
                    .showProgress(
                        instant
                            ? 'Submitting quick sales'
                            : 'Submitting listings'
                    );
                mutationPhaseStarted = true;
                const result = await actionService.executeSell({
                    acceptedSubscriberAgreement:
                        review.acceptedSubscriberAgreement,
                    confirmation,
                    isAuthorized: () => (
                        !sessionInvalidated &&
                        pageContext.isOwnInventory
                    ),
                    onProgress: progress.update,
                    proposals: review.proposals,
                    revalidateItem: (item) => inventoryService.findAsset(
                        pageContext.ownerSteamId,
                        item
                    ),
                    refreshPrice: (item) => pricingService.getItemPrice(item, {
                        force: true,
                    }),
                    sessionId,
                    shouldStop: progress.isStopped,
                });

                progress.finish(
                    `${result.results.length} item(s) processed` +
                    (result.halted ? ' · stopped early' : '')
                );
                ui.setStatus(
                    instant
                        ? 'Quick-sale batch complete. Review any Steam confirmations.'
                        : 'Sale batch complete. Review any Steam confirmations.'
                );
                ui.clearSelection();
            } catch (error) {
                refreshDialog?.close();
                refreshDialog = null;
                progress?.finish(`Stopped: ${error.message}`);
                ui.setStatus(
                    error.code === 'cancelled'
                        ? 'Sale price refresh cancelled. No request was sent.'
                        : error.message,
                    { error: error.code !== 'cancelled' }
                );
            } finally {
                refreshDialog?.close();
                actionRunning = false;

                if (mutationPhaseStarted) {
                    await refreshInventory(true);
                }
            }
        }

        async function quoteGems(item) {
            if (
                !item.gem?.eligible ||
                !/^\d+$/.test(item.gem.sourceAppId) ||
                !/^\d+$/.test(item.contextId) ||
                !/^\d+$/.test(item.assetId)
            ) {
                throw new Error('Gem eligibility metadata is unavailable');
            }

            const response = await api.loadGemQuote({
                appId: item.gem.sourceAppId,
                assetId: item.assetId,
                contextId: item.contextId,
                ownerSteamId: pageContext.ownerSteamId,
                sessionId: liveSessionId(),
            });
            const expectedGems = Number(response?.goo_value);

            if (!Number.isSafeInteger(expectedGems) || expectedGems < 1) {
                throw new Error('Steam did not return a valid Gem value');
            }

            return { expectedGems, retrievedAt: Date.now() };
        }

        async function runGems(selected) {
            if (actionRunning) {
                return;
            }

            actionRunning = true;
            let mutationPhaseStarted = false;
            let progress = null;
            ui.setStatus('Verifying selected Gem values…');

            try {
                for (const item of selected) {
                    try {
                        item.gemQuote = await quoteGems(item);
                    } catch (error) {
                        item.gemQuote = { error: error.message };

                        if (error.code === 'authentication') {
                            throw error;
                        }
                    }
                }

                const prepared = actionService.prepareGems({
                    isOwnInventory: pageContext.isOwnInventory,
                    items: selected,
                });
                const review = await inventoryModules.actionPreviewDialog
                    .showGemReview(prepared);

                if (!review) {
                    ui.setStatus('Gems preview cancelled. No request was sent.');
                    return;
                }

                const confirmation = await inventoryModules.actionPreviewDialog
                    .showConfirmation({
                        actionLabel: 'Gems conversion',
                        summary:
                            `${review.totals.count} item(s) · ` +
                            `${review.totals.expectedGems} expected Gems`,
                    });

                if (!confirmation) {
                    ui.setStatus('Gems confirmation cancelled. No request was sent.');
                    return;
                }

                const sessionId = liveSessionId();
                progress = inventoryModules.actionProgressDialog
                    .showProgress('Converting items to Gems');
                mutationPhaseStarted = true;
                const result = await actionService.executeGems({
                    confirmation,
                    isAuthorized: () => (
                        !sessionInvalidated &&
                        pageContext.isOwnInventory
                    ),
                    onProgress: progress.update,
                    ownerSteamId: pageContext.ownerSteamId,
                    proposals: review.proposals,
                    revalidateItem: (item) => inventoryService.findAsset(
                        pageContext.ownerSteamId,
                        item
                    ),
                    refreshGemQuote: quoteGems,
                    sessionId,
                    shouldStop: progress.isStopped,
                });

                progress.finish(
                    `${result.results.length} item(s) processed` +
                    (result.halted ? ' · stopped early' : '')
                );
                ui.setStatus('Gems conversion batch complete.');
                ui.clearSelection();
            } catch (error) {
                progress?.finish(`Stopped: ${error.message}`);
                ui.setStatus(error.message, { error: true });
            } finally {
                actionRunning = false;

                if (mutationPhaseStarted) {
                    await refreshInventory(true);
                }
            }
        }

        window.addEventListener('hashchange', () => {
            setTimeout(() => {
                const nextInventoryKey = activeInventory(contexts).key;

                if (inventoryKeyChanged(
                    activeInventoryKey,
                    nextInventoryKey
                )) {
                    ui.clearSelection();
                    ui.setStatus(
                        'Selection cleared after switching inventory tabs.'
                    );
                }

                if (nextInventoryKey) {
                    activeInventoryKey = nextInventoryKey;
                }

                render();
                ui.syncSteamItems();
                startInitialRefreshWhenNativeReady();
            }, 80);
        });
        setInterval(() => {
            const next = getPageContext();
            const accountChanged =
                next.currentAccountId !== pageContext.currentAccountId ||
                !next.currentAccountId;

            if (accountChanged) {
                sessionInvalidated = true;
                ui.setManagementEnabled(false);
                loadController?.abort();
                ui.setStatus(
                    'Steam account or login state changed. Reload before continuing.',
                    { error: true }
                );
            }

            pageContext = next;
        }, 5000);

        const inventoryDom = document.querySelector('#inventories');

        if (inventoryDom) {
            new MutationObserver((records) => {
                const hasNativeChanges = records.some((record) => (
                    !record.target.closest?.(
                        '.spt-inventory-tile-price, ' +
                        '.spt-inventory-tile-selection'
                    ) &&
                    [...record.addedNodes, ...record.removedNodes].some(
                        (node) => !(
                            node.nodeType === 1 &&
                            (
                                node.classList?.contains(
                                    'spt-inventory-tile-price'
                                ) ||
                                node.classList?.contains(
                                    'spt-inventory-tile-selection'
                                )
                            )
                        )
                    )
                ));

                if (!hasNativeChanges) {
                    return;
                }

                ui.syncSteamItems();
                startInitialRefreshWhenNativeReady();
            }).observe(inventoryDom, { childList: true, subtree: true });
        }

        window.g_ActiveInventory?.AddOnItemsLoadedCallback?.(() => {
            ui.syncSteamItems();
            startInitialRefreshWhenNativeReady();
        });

        if (!pageContext.currentAccountId) {
            ui.setStatus('Sign in to Steam to value this inventory.', {
                error: true,
            });
        } else if (!pageContext.ownerSteamId) {
            ui.setStatus('Steam inventory owner could not be determined.', {
                error: true,
            });
        } else if (!contexts.length) {
            ui.setStatus('No Steam inventory tabs are available.');
        } else {
            startInitialRefreshWhenNativeReady();
        }
    }

    return Object.freeze({
        INVENTORY_PATH,
        activeInventory,
        createFeeConfig,
        getPageContext,
        init,
        inventoryKeyChanged,
        nativeInventoryState,
        waitForNativeInventoryIdle,
    });
})();
