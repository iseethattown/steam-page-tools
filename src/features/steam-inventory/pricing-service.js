inventoryModules.pricingService = (() => {
    const {
        getCurrencyDigits,
        isSafeMinor,
        makeMarketKey,
    } = inventoryModules.types;
    const DEFAULT_CONCURRENCY = 2;
    const DEFAULT_SPACING_MS = 350;
    const MAX_CONSECUTIVE_ERRORS = 5;

    function safeInteger(value, fallback) {
        const number = Number(value);

        return Number.isSafeInteger(number) && number >= 0
            ? number
            : fallback;
    }

    function normalizeFeeConfig(candidate = {}) {
        const required = [
            'steamFeeBps',
            'publisherFeeBps',
            'steamFeeMinimumMinor',
            'publisherFeeMinimumMinor',
            'steamFeeBaseMinor',
            'marketMinimumMinor',
        ];
        const config = {
            steamFeeBps: safeInteger(candidate.steamFeeBps, 500),
            publisherFeeBps: safeInteger(candidate.publisherFeeBps, 1000),
            steamFeeMinimumMinor: safeInteger(
                candidate.steamFeeMinimumMinor,
                1
            ),
            publisherFeeMinimumMinor: safeInteger(
                candidate.publisherFeeMinimumMinor,
                1
            ),
            steamFeeBaseMinor: safeInteger(candidate.steamFeeBaseMinor, 0),
            marketMinimumMinor: safeInteger(candidate.marketMinimumMinor, 1),
            exact: required.every((field) => Number.isSafeInteger(
                candidate[field]
            )),
        };

        return Object.freeze(config);
    }

    function percentageFee(amountMinor, basisPoints) {
        const result = (BigInt(amountMinor) * BigInt(basisPoints)) / 10000n;

        if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new RangeError('Fee calculation overflow');
        }

        return Number(result);
    }

    function calculateBuyerTotal(
        sellerNetMinor,
        feeConfig,
        publisherFeeBps
    ) {
        if (!isSafeMinor(sellerNetMinor)) {
            throw new TypeError('Seller proceeds must be a positive minor amount');
        }

        const config = normalizeFeeConfig(feeConfig);
        const publisherBps = Number.isSafeInteger(publisherFeeBps)
            ? publisherFeeBps
            : config.publisherFeeBps;
        const steamFeeMinor = Math.max(
            config.steamFeeMinimumMinor,
            percentageFee(sellerNetMinor, config.steamFeeBps)
        ) + config.steamFeeBaseMinor;
        const publisherFeeMinor = publisherBps > 0
            ? Math.max(
                config.publisherFeeMinimumMinor,
                percentageFee(sellerNetMinor, publisherBps)
            )
            : 0;
        const feesMinor = steamFeeMinor + publisherFeeMinor;
        const buyerTotalMinor = sellerNetMinor + feesMinor;

        if (!Number.isSafeInteger(buyerTotalMinor)) {
            throw new RangeError('Buyer total overflow');
        }

        return {
            approximate: !config.exact,
            buyerTotalMinor,
            feesMinor,
            publisherFeeMinor,
            sellerNetMinor,
            steamFeeMinor,
        };
    }

    function calculateSellerNet(
        buyerTotalMinor,
        feeConfig,
        publisherFeeBps
    ) {
        if (!isSafeMinor(buyerTotalMinor)) {
            throw new TypeError('Buyer total must be a positive minor amount');
        }

        let low = 1;
        let high = buyerTotalMinor;
        let best = null;

        while (low <= high) {
            const candidate = low + Math.floor((high - low) / 2);
            const result = calculateBuyerTotal(
                candidate,
                feeConfig,
                publisherFeeBps
            );

            if (result.buyerTotalMinor <= buyerTotalMinor) {
                best = result;
                low = candidate + 1;
            } else {
                high = candidate - 1;
            }
        }

        if (!best) {
            return null;
        }

        return {
            ...best,
            buyerTotalMinor,
            feesMinor: buyerTotalMinor - best.sellerNetMinor,
        };
    }

    function embeddedInteger(source, field) {
        const match = String(source || '').match(
            new RegExp(`${field}[^0-9-]{1,32}(-?\\d+)`)
        );
        const value = match ? Number(match[1]) : null;

        return Number.isSafeInteger(value) ? value : null;
    }

    function decimalMajorToMinor(value, digits) {
        const match = String(value || '').match(/^(\d+)(?:\.(\d+))?$/);

        if (!match) {
            return null;
        }

        const scale = 10n ** BigInt(digits);
        const whole = BigInt(match[1]);
        const fraction = match[2] || '';
        const padded = `${fraction}${'0'.repeat(digits + 1)}`;
        const kept = padded.slice(0, digits) || '0';
        const next = Number(padded[digits] || '0');
        let minor = (whole * scale) + BigInt(kept);

        if (next >= 5) {
            minor += 1n;
        }

        return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
    }

    function parseModernHistory(source, currencyCode) {
        const history = [];
        const digits = getCurrencyDigits(currencyCode);
        const pattern = /time[^0-9]{1,32}(\d+)[^{}]{0,240}?price_median[^0-9-]{1,32}([0-9]+(?:\.[0-9]+)?)[^{}]{0,240}?purchases[^0-9]{1,32}(\d+)/g;
        let match = pattern.exec(source);

        while (match && history.length < 200) {
            const seconds = Number(match[1]);
            const medianMinor = decimalMajorToMinor(match[2], digits);
            const volume = Number(match[3]);

            if (
                Number.isSafeInteger(seconds) &&
                isSafeMinor(medianMinor) &&
                Number.isSafeInteger(volume) &&
                volume >= 0
            ) {
                history.push({
                    medianMinor,
                    timestampMs: seconds * 1000,
                    volume,
                });
            }

            match = pattern.exec(source);
        }

        return history.slice(-30);
    }

    function parseListingPage(source, currencyCode) {
        const lowestSellGrossMinor = embeddedInteger(
            source,
            'amtMinSellOrder'
        );
        const highestBuyGrossMinor = embeddedInteger(
            source,
            'amtMaxBuyOrder'
        );
        const currencyId = embeddedInteger(source, 'eCurrency');
        const legacyNameMatch = String(source || '').match(
            /Market_LoadOrderSpread\(\s*(\d+)\s*\)/
        );

        return {
            currencyId,
            highestBuyGrossMinor: isSafeMinor(highestBuyGrossMinor)
                ? highestBuyGrossMinor
                : null,
            history: parseModernHistory(String(source || ''), currencyCode),
            itemNameId: legacyNameMatch?.[1] || '',
            lowestSellGrossMinor: isSafeMinor(lowestSellGrossMinor)
                ? lowestSellGrossMinor
                : null,
        };
    }

    function parseLegacyHistory(response, currencyCode) {
        const digits = getCurrencyDigits(currencyCode);

        if (!response?.success || !Array.isArray(response.prices)) {
            return [];
        }

        return response.prices.slice(-30).flatMap((entry) => {
            if (!Array.isArray(entry) || entry.length < 3) {
                return [];
            }

            const timestamp = Date.parse(entry[0]);
            const medianMinor = decimalMajorToMinor(String(entry[1]), digits);
            const volumeText = String(entry[2]).replace(/[^0-9]/g, '');
            const volume = Number(volumeText);

            if (
                !Number.isFinite(timestamp) ||
                !isSafeMinor(medianMinor) ||
                !Number.isSafeInteger(volume)
            ) {
                return [];
            }

            return [{ medianMinor, timestampMs: timestamp, volume }];
        });
    }

    function embeddedOrderBookMarketName(source) {
        const orderPosition = String(source || '').indexOf('amtMinSellOrder');

        if (orderPosition < 0) {
            return '';
        }

        const queryPosition = String(source).indexOf('queryKey', orderPosition);

        if (queryPosition < 0) {
            return '';
        }

        const normalized = String(source)
            .slice(queryPosition, queryPosition + 1000)
            .replace(/\\+"/g, '"');
        const match = normalized.match(
            /queryKey":\["market","orderbook",\d+,"([^"]+)"\]/
        );

        return match?.[1] || '';
    }

    function groupedBucketMinimum(source, marketHashName) {
        const text = String(source || '');
        const name = String(marketHashName || '');
        let position = name ? text.indexOf(name) : -1;

        while (position >= 0) {
            const normalized = text
                .slice(Math.max(0, position - 160), position + name.length + 700)
                .replace(/\\+"/g, '"');
            const bucketMarker = `"bucket_id":"${name}"`;
            const bucketPosition = normalized.indexOf(bucketMarker);

            if (bucketPosition >= 0) {
                const match = normalized
                    .slice(bucketPosition + bucketMarker.length)
                    .match(/"min_price":"?(\d+)"?/);
                const value = match ? Number(match[1]) : null;

                return isSafeMinor(value) ? value : null;
            }

            position = text.indexOf(name, position + name.length);
        }

        return null;
    }

    function createPricingService({
        api,
        storage,
        feeConfig,
        currencyId,
        currencyCode,
        country,
        nowImpl = Date.now,
        sleepImpl,
        concurrency = DEFAULT_CONCURRENCY,
        spacingMs = DEFAULT_SPACING_MS,
    }) {
        const inFlight = new Map();
        const wait = sleepImpl || ((ms) => new Promise((resolve) => {
            setTimeout(resolve, ms);
        }));

        async function retrieve(item, signal) {
            const listingPage = await api.loadMarketListing({
                appId: item.appId,
                country,
                currencyId,
                marketHashName: item.marketHashName,
                marketListingFilters: item.marketListingFilters,
                signal,
            });
            const parsed = parseListingPage(listingPage, currencyCode);
            const groupedMinimum = groupedBucketMinimum(
                listingPage,
                item.marketHashName
            );
            const orderBookMarketName = embeddedOrderBookMarketName(listingPage);
            const mismatchedGroupedOrderBook = Boolean(
                groupedMinimum &&
                orderBookMarketName !== item.marketHashName
            );

            if (parsed.currencyId && parsed.currencyId !== currencyId) {
                throw Object.assign(
                    new Error('Steam returned pricing in a different currency'),
                    { code: 'currency_unavailable' }
                );
            }
            let lowestSellGrossMinor = groupedMinimum ||
                parsed.lowestSellGrossMinor;
            let highestBuyGrossMinor = mismatchedGroupedOrderBook
                ? null
                : parsed.highestBuyGrossMinor;
            let history = parsed.history;
            let source = groupedMinimum
                ? 'Steam Market variant'
                : 'Steam Market listing';

            if (
                (!lowestSellGrossMinor || !highestBuyGrossMinor) &&
                parsed.itemNameId
            ) {
                const orders = await api.loadOrderHistogram({
                    country,
                    currencyId,
                    itemNameId: parsed.itemNameId,
                    signal,
                });

                lowestSellGrossMinor = isSafeMinor(
                    Number(orders?.lowest_sell_order)
                ) ? Number(orders.lowest_sell_order) : lowestSellGrossMinor;
                highestBuyGrossMinor = isSafeMinor(
                    Number(orders?.highest_buy_order)
                ) ? Number(orders.highest_buy_order) : highestBuyGrossMinor;
                source = 'Steam Market order book';
            }

            if (!history.length) {
                try {
                    const response = await api.loadPriceHistory({
                        appId: item.appId,
                        marketHashName: item.marketHashName,
                        signal,
                    });

                    history = parseLegacyHistory(response, currencyCode);
                } catch (error) {
                    if (error.code === 'authentication' || error.code === 'cancelled') {
                        throw error;
                    }
                }
            }

            const publisherFeeBps = Number.isSafeInteger(item.marketFeeBps)
                ? item.marketFeeBps
                : undefined;
            const listing = lowestSellGrossMinor
                ? calculateSellerNet(
                    lowestSellGrossMinor,
                    feeConfig,
                    publisherFeeBps
                )
                : null;
            const quick = highestBuyGrossMinor
                ? calculateSellerNet(
                    highestBuyGrossMinor,
                    feeConfig,
                    publisherFeeBps
                )
                : null;
            const retrievedAt = nowImpl();

            return {
                approximateFees: Boolean(
                    listing?.approximate || quick?.approximate
                ),
                currencyCode,
                currencyId,
                highestBuyGrossMinor,
                history,
                listingNetMinor: listing?.sellerNetMinor || null,
                lowestSellGrossMinor,
                quickSaleNetMinor: quick?.sellerNetMinor || null,
                retrievedAt,
                source,
                status: lowestSellGrossMinor || highestBuyGrossMinor
                    ? 'priced'
                    : 'unpriced',
            };
        }

        function getItemPrice(item, { force = false, signal } = {}) {
            if (!item.marketable || !item.marketHashName) {
                return Promise.resolve({
                    retrievedAt: nowImpl(),
                    status: 'unpriced',
                    source: 'Not marketable',
                });
            }

            const key = makeMarketKey(item, currencyId, country);
            const cached = force ? null : storage.getPrice(key, nowImpl());

            if (cached) {
                return Promise.resolve(cached);
            }

            if (inFlight.has(key)) {
                return inFlight.get(key);
            }

            const stale = storage.getPriceEntry(key);
            const promise = retrieve(item, signal)
                .then((snapshot) => {
                    storage.setPrice(key, snapshot);
                    return snapshot;
                })
                .catch((error) => {
                    if (
                        stale &&
                        !['authentication', 'cancelled'].includes(error.code)
                    ) {
                        return {
                            ...stale,
                            error: error.message,
                            errorCode: error.code,
                            status: 'stale',
                        };
                    }

                    throw error;
                })
                .finally(() => {
                    inFlight.delete(key);
                });

            inFlight.set(key, promise);
            return promise;
        }

        async function priceItems(items, {
            force = false,
            onProgress,
            signal,
        } = {}) {
            const marketItems = [];
            const seen = new Set();

            for (const item of items) {
                if (!item.marketable || !item.marketHashName) {
                    continue;
                }

                const key = `${item.appId}\u001f${item.marketHashName}`;

                if (!seen.has(key)) {
                    seen.add(key);
                    marketItems.push(item);
                }
            }

            const prices = new Map();
            let cursor = 0;
            let completed = 0;
            let consecutiveErrors = 0;
            let halted = false;
            let haltReason = '';

            async function worker() {
                while (!halted && cursor < marketItems.length) {
                    const item = marketItems[cursor];
                    const key = `${item.appId}\u001f${item.marketHashName}`;

                    cursor += 1;

                    if (signal?.aborted) {
                        return;
                    }

                    try {
                        const snapshot = await getItemPrice(item, {
                            force,
                            signal,
                        });

                        prices.set(key, snapshot);
                        consecutiveErrors = snapshot.status === 'stale'
                            ? consecutiveErrors + 1
                            : 0;
                        haltReason = snapshot.status === 'stale'
                            ? snapshot.errorCode || 'steam_error'
                            : '';
                    } catch (error) {
                        if (
                            error.code === 'authentication' ||
                            error.code === 'cancelled'
                        ) {
                            halted = true;
                            throw error;
                        }

                        consecutiveErrors += 1;
                        haltReason = error.code || 'steam_error';
                        prices.set(key, {
                            error: error.message,
                            retrievedAt: nowImpl(),
                            source: 'Steam Market',
                            status: 'error',
                        });
                    }

                    completed += 1;
                    onProgress?.({
                        completed,
                        item,
                        key,
                        snapshot: prices.get(key),
                        total: marketItems.length,
                    });

                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        halted = true;
                        return;
                    }

                    if (cursor < marketItems.length && spacingMs > 0) {
                        await wait(spacingMs);
                    }
                }
            }

            await Promise.all(
                Array.from(
                    { length: Math.min(concurrency, marketItems.length || 1) },
                    () => worker()
                )
            );

            return { halted, haltReason, prices };
        }

        return Object.freeze({
            clearCache: storage.clearPrices,
            getItemPrice,
            priceItems,
        });
    }

    return Object.freeze({
        DEFAULT_CONCURRENCY,
        DEFAULT_SPACING_MS,
        MAX_CONSECUTIVE_ERRORS,
        calculateBuyerTotal,
        calculateSellerNet,
        createPricingService,
        decimalMajorToMinor,
        normalizeFeeConfig,
        parseLegacyHistory,
        parseListingPage,
        embeddedOrderBookMarketName,
        groupedBucketMinimum,
    });
})();
