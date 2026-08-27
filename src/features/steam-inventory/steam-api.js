inventoryModules.steamApi = (() => {
    const STEAM_COMMUNITY_ORIGIN = 'https://steamcommunity.com';
    const DEFAULT_TIMEOUT_MS = 20000;
    const MAX_READ_ATTEMPTS = 3;

    function makeError(message, properties = {}) {
        return Object.assign(new Error(message), properties);
    }

    function requireSteamUrl(pathname, parameters = {}) {
        const url = new URL(pathname, STEAM_COMMUNITY_ORIGIN);

        if (url.origin !== STEAM_COMMUNITY_ORIGIN || url.protocol !== 'https:') {
            throw makeError('Refusing a request outside Steam Community', {
                code: 'invalid_origin',
            });
        }

        for (const [key, value] of Object.entries(parameters)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        }

        return url;
    }

    function retryAfterMs(response) {
        const value = response.headers.get('Retry-After');

        if (!value) {
            return 0;
        }

        const seconds = Number(value);

        if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.min(30000, Math.ceil(seconds * 1000));
        }

        const date = Date.parse(value);

        return Number.isFinite(date)
            ? Math.min(30000, Math.max(0, date - Date.now()))
            : 0;
    }

    function responseError(response, body, mutation) {
        const detail = String(body?.message || body?.error || '').trim();
        const suffix = detail ? `: ${detail}` : '';
        let code = 'steam_error';

        if (response.status === 401 || response.status === 403) {
            code = 'authentication';
        } else if (response.status === 429) {
            code = 'rate_limited';
        } else if (response.status >= 500) {
            code = 'temporarily_unavailable';
        }

        return makeError(`Steam returned HTTP ${response.status}${suffix}`, {
            ambiguous: Boolean(mutation && response.status >= 500),
            code,
            retryAfterMs: retryAfterMs(response),
            status: response.status,
        });
    }

    function createSteamApi({
        fetchImpl,
        sleepImpl,
        randomImpl = Math.random,
        timeoutMs = DEFAULT_TIMEOUT_MS,
    }) {
        if (typeof fetchImpl !== 'function') {
            throw new TypeError('A fetch implementation is required');
        }

        const wait = sleepImpl || ((ms) => new Promise((resolve) => {
            setTimeout(resolve, ms);
        }));

        async function waitWithSignal(ms, signal) {
            if (!signal) {
                await wait(ms);
                return;
            }

            if (signal.aborted) {
                throw makeError('Request cancelled', { code: 'cancelled' });
            }

            let onAbort;
            const cancelled = new Promise((resolve, reject) => {
                onAbort = () => reject(makeError(
                    'Request cancelled',
                    { code: 'cancelled' }
                ));
                signal.addEventListener('abort', onAbort, { once: true });
            });

            try {
                await Promise.race([wait(ms), cancelled]);
            } finally {
                signal.removeEventListener('abort', onAbort);
            }
        }

        async function request(url, {
            body,
            method = 'GET',
            mutation = false,
            parse = 'json',
            signal,
        } = {}) {
            const attempts = mutation ? 1 : MAX_READ_ATTEMPTS;

            for (let attempt = 0; attempt < attempts; attempt += 1) {
                if (signal?.aborted) {
                    throw makeError('Request cancelled', { code: 'cancelled' });
                }

                const controller = new AbortController();
                const onAbort = () => controller.abort();
                const timer = setTimeout(() => controller.abort(), timeoutMs);

                signal?.addEventListener('abort', onAbort, { once: true });

                try {
                    const response = await fetchImpl(url, {
                        method,
                        body,
                        credentials: 'include',
                        headers: body
                            ? {
                                'Content-Type':
                                    'application/x-www-form-urlencoded; charset=UTF-8',
                            }
                            : undefined,
                        signal: controller.signal,
                    });
                    let result = null;

                    if (parse === 'text') {
                        result = await response.text();
                    } else {
                        try {
                            result = await response.json();
                        } catch {
                            result = null;
                        }
                    }

                    if (!response.ok) {
                        throw responseError(response, result, mutation);
                    }

                    return result;
                } catch (error) {
                    const aborted = controller.signal.aborted;
                    const normalized = signal?.aborted
                        ? makeError('Request cancelled', { code: 'cancelled' })
                        : error?.code
                        ? error
                        : makeError(
                            aborted ? 'Steam request timed out' : 'Steam request failed',
                            {
                                ambiguous: mutation,
                                code: aborted ? 'timeout' : 'network',
                            }
                        );
                    const retryable = !mutation && [
                        'network',
                        'timeout',
                        'rate_limited',
                        'temporarily_unavailable',
                    ].includes(normalized.code);

                    if (!retryable || attempt === attempts - 1) {
                        throw normalized;
                    }

                    const exponential = 650 * (2 ** attempt);
                    const jitter = Math.floor(randomImpl() * 350);

                    await waitWithSignal(Math.max(
                        normalized.retryAfterMs || 0,
                        exponential + jitter
                    ), signal);
                } finally {
                    clearTimeout(timer);
                    signal?.removeEventListener('abort', onAbort);
                }
            }

            throw makeError('Steam request retry limit reached', {
                code: 'temporarily_unavailable',
            });
        }

        async function loadInventoryPage({
            ownerSteamId,
            appId,
            contextId,
            startAssetId,
            signal,
        }) {
            if (!/^\d{17}$/.test(String(ownerSteamId || ''))) {
                throw makeError('A valid inventory owner is required', {
                    code: 'invalid_owner',
                });
            }

            const url = requireSteamUrl(
                `/inventory/${ownerSteamId}/${appId}/${contextId}`,
                {
                    count: 2000,
                    l: 'english',
                    start_assetid: startAssetId,
                }
            );

            return request(url, { signal });
        }

        async function loadMarketListing({
            appId,
            marketHashName,
            marketListingFilters,
            country,
            currencyId,
            signal,
        }) {
            const path = `/market/listings/${encodeURIComponent(appId)}/` +
                encodeURIComponent(marketHashName);
            const filters = marketListingFilters &&
                typeof marketListingFilters === 'object'
                ? marketListingFilters
                : {};
            const url = requireSteamUrl(path, {
                ...filters,
                appid: Object.keys(filters).length ? appId : undefined,
                cc: String(country || '').toLowerCase(),
                currency: currencyId,
                l: 'english',
            });

            return request(url, { parse: 'text', signal });
        }

        async function loadOrderHistogram({
            country,
            currencyId,
            itemNameId,
            signal,
        }) {
            const url = requireSteamUrl('/market/itemordershistogram', {
                country,
                currency: currencyId,
                item_nameid: itemNameId,
                language: 'english',
            });

            return request(url, { signal });
        }

        async function loadPriceHistory({ appId, marketHashName, signal }) {
            const url = requireSteamUrl('/market/pricehistory/', {
                appid: appId,
                market_hash_name: marketHashName,
            });

            return request(url, { signal });
        }

        async function loadMarketEligibility({ signal } = {}) {
            const url = requireSteamUrl('/market/', { l: 'english' });
            const html = await request(url, { parse: 'text', signal });

            return inventoryModules.marketEligibility
                .parseMarketEligibilityHtml(html);
        }

        async function loadGemQuote({
            ownerSteamId,
            sessionId,
            appId,
            contextId,
            assetId,
            signal,
        }) {
            if (!/^\d{17}$/.test(String(ownerSteamId || ''))) {
                throw makeError('A valid inventory owner is required', {
                    code: 'invalid_owner',
                });
            }

            const url = requireSteamUrl(
                `/profiles/${ownerSteamId}/ajaxgetgoovalue/`,
                {
                    appid: appId,
                    assetid: assetId,
                    contextid: contextId,
                    sessionid: sessionId,
                }
            );

            return request(url, { signal });
        }

        function formBody(values) {
            const body = new URLSearchParams();

            for (const [key, value] of Object.entries(values)) {
                body.set(key, String(value));
            }

            return body;
        }

        async function sellItem({
            sessionId,
            appId,
            contextId,
            assetId,
            quantity,
            sellerNetMinor,
        }) {
            const url = requireSteamUrl('/market/sellitem/');
            const body = formBody({
                amount: quantity,
                appid: appId,
                assetid: assetId,
                contextid: contextId,
                price: sellerNetMinor,
                sessionid: sessionId,
            });

            return request(url, {
                body,
                method: 'POST',
                mutation: true,
            });
        }

        async function convertToGems({
            ownerSteamId,
            sessionId,
            appId,
            contextId,
            assetId,
            expectedGems,
        }) {
            if (!/^\d{17}$/.test(String(ownerSteamId || ''))) {
                throw makeError('A valid inventory owner is required', {
                    code: 'invalid_owner',
                });
            }

            const url = requireSteamUrl(
                `/profiles/${ownerSteamId}/ajaxgrindintogoo/`
            );
            const body = formBody({
                appid: appId,
                assetid: assetId,
                contextid: contextId,
                goo_value_expected: expectedGems,
                sessionid: sessionId,
            });

            return request(url, {
                body,
                method: 'POST',
                mutation: true,
            });
        }

        return Object.freeze({
            convertToGems,
            loadGemQuote,
            loadInventoryPage,
            loadMarketEligibility,
            loadMarketListing,
            loadOrderHistogram,
            loadPriceHistory,
            sellItem,
        });
    }

    return Object.freeze({
        DEFAULT_TIMEOUT_MS,
        MAX_READ_ATTEMPTS,
        STEAM_COMMUNITY_ORIGIN,
        createSteamApi,
        requireSteamUrl,
    });
})();
