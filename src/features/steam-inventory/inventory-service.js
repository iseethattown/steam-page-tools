inventoryModules.inventoryService = (() => {
    const { makeAssetKey, parseDecimalToBasisPoints } = inventoryModules.types;
    const STEAM_ICON_ORIGIN =
        'https://community.fastly.steamstatic.com/economy/image/';

    function listContexts(appContextData) {
        const contexts = [];

        for (const [appId, app] of Object.entries(appContextData || {})) {
            if (!/^\d+$/.test(appId) || !app || typeof app !== 'object') {
                continue;
            }

            const entries = Object.entries(app.rgContexts || {})
                .filter(([contextId]) => /^\d+$/.test(contextId));
            const concrete = entries.filter(([contextId]) => contextId !== '0');
            const selected = concrete.length ? concrete : entries;

            for (const [contextId, context] of selected) {
                contexts.push({
                    appId,
                    appName: String(app.name || `App ${appId}`),
                    contextId,
                    contextName: String(
                        context?.name || `Inventory ${contextId}`
                    ),
                    expectedCount: Number.parseInt(
                        context?.asset_count || '0',
                        10
                    ) || 0,
                });
            }
        }

        return contexts;
    }

    function descriptionKey(value) {
        return `${value.classid}_${value.instanceid || '0'}`;
    }

    function findGameTag(description) {
        const tag = (description.tags || []).find((candidate) => (
            String(candidate.category || '').toLowerCase() === 'game'
        ));

        return String(tag?.localized_tag_name || tag?.name || '');
    }

    function parseMarketListingFilters(description) {
        if (
            !description.market_bucket_group_id &&
            !description.market_bucket_id
        ) {
            return {};
        }

        const supportedCategories = new Set(['Exterior', 'Quality']);
        const filters = {};

        for (const tag of description.tags || []) {
            const category = String(tag?.category || '');
            const value = String(tag?.internal_name || '');

            if (supportedCategories.has(category) && value) {
                filters[`category_${category}`] = value;
            }
        }

        return filters;
    }

    function parseGemMetadata(description) {
        const ownerActions = Array.isArray(description.owner_actions)
            ? description.owner_actions
            : [];

        for (const action of ownerActions) {
            const link = String(action?.link || '');

            if (!/goo|gem/i.test(`${link} ${action?.name || ''}`)) {
                continue;
            }

            const call = link.match(/GetGooValue\(([^)]*)\)/i);
            const args = call
                ? call[1].split(',').map((value) => (
                    value.trim().replace(/^(['"])(.*)\1$/, '$2')
                ))
                : [];
            // Steam's current action is
            // GetGooValue(itemAppId, contextId, sourceAppId, itemType,
            // borderColor). Older inventory payloads exposed only the final
            // three quote arguments.
            const quoteArgs = args.length >= 5 ? args.slice(2, 5) : args;

            return {
                eligible: true,
                sourceAppId: quoteArgs[0] || String(
                    description.market_fee_app || ''
                ),
                itemType: quoteArgs[1] || '',
                borderColor: quoteArgs[2] || '',
            };
        }

        return {
            eligible: false,
            sourceAppId: '',
            itemType: '',
            borderColor: '',
        };
    }

    function iconUrl(iconReference) {
        const value = String(iconReference || '');

        return /^[A-Za-z0-9_-]+$/.test(value)
            ? `${STEAM_ICON_ORIGIN}${value}/64fx64f`
            : '';
    }

    function normalizeAsset(asset, description, context, refreshedAt) {
        const quantity = Number.parseInt(asset.amount || '1', 10);
        const gem = parseGemMetadata(description);
        const sourceGameId = String(
            description.market_fee_app || gem.sourceAppId || context.appId
        );

        return {
            appId: String(asset.appid || context.appId),
            assetId: String(asset.assetid || asset.id || ''),
            classId: String(asset.classid || ''),
            contextId: String(asset.contextid || context.contextId),
            gameAppId: sourceGameId,
            gameName: findGameTag(description) || context.appName,
            gem,
            iconUrl: iconUrl(description.icon_url),
            instanceId: String(asset.instanceid || '0'),
            marketFeeBps: parseDecimalToBasisPoints(
                description.market_fee,
                null
            ),
            marketHashName: String(description.market_hash_name || ''),
            marketListingFilters: parseMarketListingFilters(description),
            marketable: Number(description.marketable) === 1,
            name: String(description.name || 'Unknown item'),
            price: { status: 'idle' },
            quantity: Number.isSafeInteger(quantity) && quantity > 0
                ? quantity
                : 1,
            refreshedAt,
            tradable: Number(description.tradable) === 1,
            type: String(description.type || ''),
        };
    }

    function mergeInventoryPage(state, page, context, refreshedAt) {
        const descriptions = new Map(state.descriptions);

        for (const description of page?.descriptions || []) {
            descriptions.set(descriptionKey(description), description);
        }

        const items = new Map(state.items);

        for (const asset of page?.assets || []) {
            const description = descriptions.get(descriptionKey(asset));

            if (!description) {
                continue;
            }

            const item = normalizeAsset(
                asset,
                description,
                context,
                refreshedAt
            );

            if (/^\d+$/.test(item.assetId)) {
                items.set(makeAssetKey(item), item);
            }
        }

        return { descriptions, items };
    }

    function createInventoryService({ api, nowImpl = Date.now }) {
        async function loadContext(ownerSteamId, context, {
            beforePage,
            onPage,
            signal,
        } = {}) {
            let cursor = '';
            let state = { descriptions: new Map(), items: new Map() };
            let pageNumber = 0;
            const refreshedAt = nowImpl();

            do {
                await beforePage?.({
                    context,
                    pageNumber: pageNumber + 1,
                    signal,
                });

                const page = await api.loadInventoryPage({
                    appId: context.appId,
                    contextId: context.contextId,
                    ownerSteamId,
                    signal,
                    startAssetId: cursor,
                });

                if (!page || (page.success !== 1 && page.success !== true)) {
                    throw Object.assign(new Error('Steam inventory is unavailable'), {
                        code: 'inventory_unavailable',
                    });
                }

                state = mergeInventoryPage(state, page, context, refreshedAt);
                pageNumber += 1;
                onPage?.({
                    context,
                    itemCount: state.items.size,
                    pageNumber,
                });

                if (!page.more_items) {
                    cursor = '';
                } else {
                    const next = String(page.last_assetid || '');

                    if (!/^\d+$/.test(next) || next === cursor) {
                        throw Object.assign(
                            new Error('Steam inventory pagination did not advance'),
                            { code: 'pagination' }
                        );
                    }

                    cursor = next;
                }
            } while (cursor);

            return [...state.items.values()];
        }

        async function loadAll(ownerSteamId, contexts, {
            beforePage,
            onContext,
            onPage,
            signal,
        } = {}) {
            const items = new Map();
            const failures = [];

            for (let index = 0; index < contexts.length; index += 1) {
                const context = contexts[index];

                if (signal?.aborted) {
                    break;
                }

                try {
                    const loaded = await loadContext(ownerSteamId, context, {
                        beforePage,
                        onPage,
                        signal,
                    });

                    for (const item of loaded) {
                        items.set(makeAssetKey(item), item);
                    }
                } catch (error) {
                    if (
                        error.code === 'cancelled' ||
                        error.code === 'authentication'
                    ) {
                        throw error;
                    }

                    failures.push({
                        appId: context.appId,
                        contextId: context.contextId,
                        message: error.message,
                    });
                }

                onContext?.({
                    completed: index + 1,
                    context,
                    total: contexts.length,
                });
            }

            return { failures, items: [...items.values()] };
        }

        async function findAsset(ownerSteamId, item, signal) {
            const context = {
                appId: item.appId,
                appName: item.gameName,
                contextId: item.contextId,
                contextName: '',
            };
            const items = await loadContext(ownerSteamId, context, { signal });

            return items.find((candidate) => candidate.assetId === item.assetId) ||
                null;
        }

        return Object.freeze({ findAsset, loadAll, loadContext });
    }

    return Object.freeze({
        createInventoryService,
        listContexts,
        mergeInventoryPage,
        normalizeAsset,
        parseGemMetadata,
        parseMarketListingFilters,
    });
})();
