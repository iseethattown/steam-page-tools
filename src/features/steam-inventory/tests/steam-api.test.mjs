import assert from 'node:assert/strict';
import test from 'node:test';

import { loadModules, response } from './helpers.mjs';

const modules = await loadModules(['types.js', 'steam-api.js']);

test('retries safe reads with bounded backoff and honors Retry-After', async () => {
    let calls = 0;
    const waits = [];
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async () => {
            calls += 1;

            if (calls === 1) {
                return response({
                    body: { error: 'slow down' },
                    headers: { 'Retry-After': '2' },
                    ok: false,
                    status: 429,
                });
            }

            return response({ body: { success: 1 } });
        },
        randomImpl: () => 0,
        sleepImpl: async (ms) => waits.push(ms),
    });
    const result = await api.loadInventoryPage({
        appId: 753,
        contextId: 6,
        ownerSteamId: '76561198000000000',
    });

    assert.equal(result.success, 1);
    assert.equal(calls, 2);
    assert.deepEqual(waits, [2000]);
});

test('stops safe reads after the bounded retry count', async () => {
    let calls = 0;
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async () => {
            calls += 1;
            throw new Error('offline');
        },
        randomImpl: () => 0,
        sleepImpl: async () => {},
    });

    await assert.rejects(
        api.loadInventoryPage({
            appId: 753,
            contextId: 6,
            ownerSteamId: '76561198000000000',
        }),
        { code: 'network' }
    );
    assert.equal(calls, 3);
});

test('requests the exact Steam Market bucket for grouped variants', async () => {
    let requestedUrl = '';
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async (url) => {
            requestedUrl = String(url);
            return response({ body: '<html></html>', text: true });
        },
    });

    await api.loadMarketListing({
        appId: 730,
        country: 'FR',
        currencyId: 3,
        marketHashName: 'USP-S | Forest Leaves (Well-Worn)',
        marketListingFilters: {
            category_Exterior: 'WearCategory3',
            category_Quality: 'normal',
        },
    });

    const url = new URL(requestedUrl);

    assert.equal(url.pathname,
        '/market/listings/730/USP-S%20%7C%20Forest%20Leaves%20(Well-Worn)');
    assert.equal(url.searchParams.get('appid'), '730');
    assert.equal(url.searchParams.get('category_Exterior'), 'WearCategory3');
    assert.equal(url.searchParams.get('category_Quality'), 'normal');
    assert.equal(url.searchParams.get('currency'), '3');
});

test('uses profile-scoped asset endpoints for Gems actions', async () => {
    const requests = [];
    const ownerSteamId = '76561198000000000';
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async (url, options) => {
            requests.push({
                body: options.body?.toString() || '',
                method: options.method,
                url: String(url),
            });
            return response({ body: { goo_value: 4, strHTML: 'Done' } });
        },
    });

    await api.loadGemQuote({
        appId: 440,
        assetId: '100',
        contextId: 6,
        ownerSteamId,
        sessionId: 'session-token',
    });
    await api.convertToGems({
        appId: 440,
        assetId: '100',
        contextId: 6,
        expectedGems: 4,
        ownerSteamId,
        sessionId: 'session-token',
    });

    const quoteUrl = new URL(requests[0].url);
    const conversionUrl = new URL(requests[1].url);
    const conversionBody = new URLSearchParams(requests[1].body);

    assert.equal(
        quoteUrl.pathname,
        `/profiles/${ownerSteamId}/ajaxgetgoovalue/`
    );
    assert.equal(quoteUrl.searchParams.get('appid'), '440');
    assert.equal(quoteUrl.searchParams.get('contextid'), '6');
    assert.equal(quoteUrl.searchParams.get('assetid'), '100');
    assert.equal(quoteUrl.searchParams.get('sessionid'), 'session-token');
    assert.equal(requests[0].method, 'GET');
    assert.equal(
        conversionUrl.pathname,
        `/profiles/${ownerSteamId}/ajaxgrindintogoo/`
    );
    assert.equal(requests[1].method, 'POST');
    assert.equal(conversionBody.get('appid'), '440');
    assert.equal(conversionBody.get('contextid'), '6');
    assert.equal(conversionBody.get('assetid'), '100');
    assert.equal(conversionBody.get('goo_value_expected'), '4');
    assert.equal(conversionBody.get('sessionid'), 'session-token');
});

test('external cancellation is not retried as a timeout', async () => {
    let calls = 0;
    const waits = [];
    const controller = new AbortController();
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async (_url, options) => {
            calls += 1;
            controller.abort();
            assert.equal(options.signal.aborted, true);
            throw new Error('aborted');
        },
        sleepImpl: async (ms) => waits.push(ms),
    });

    await assert.rejects(
        api.loadInventoryPage({
            appId: 753,
            contextId: 6,
            ownerSteamId: '76561198000000000',
            signal: controller.signal,
        }),
        { code: 'cancelled' }
    );
    assert.equal(calls, 1);
    assert.deepEqual(waits, []);
});

test('external cancellation interrupts a read backoff', async () => {
    let calls = 0;
    const controller = new AbortController();
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async () => {
            calls += 1;
            return response({
                body: { error: 'slow down' },
                headers: { 'Retry-After': '30' },
                ok: false,
                status: 429,
            });
        },
        sleepImpl: async () => {
            setTimeout(() => controller.abort(), 0);
            await new Promise(() => {});
        },
    });

    await assert.rejects(
        api.loadInventoryPage({
            appId: 753,
            contextId: 6,
            ownerSteamId: '76561198000000000',
            signal: controller.signal,
        }),
        { code: 'cancelled' }
    );
    assert.equal(calls, 1);
});

test('never retries a destructive request after an ambiguous failure', async () => {
    let calls = 0;
    const api = modules.steamApi.createSteamApi({
        fetchImpl: async () => {
            calls += 1;
            throw new Error('connection reset');
        },
        sleepImpl: async () => {},
    });

    await assert.rejects(
        api.sellItem({
            appId: 753,
            assetId: '100',
            contextId: 6,
            quantity: 1,
            sellerNetMinor: 10,
            sessionId: 'redacted',
        }),
        { ambiguous: true }
    );
    assert.equal(calls, 1);
});

test('pins all requests to the Steam Community HTTPS origin', () => {
    assert.throws(
        () => modules.steamApi.requireSteamUrl('https://example.com/steal'),
        { code: 'invalid_origin' }
    );
});
