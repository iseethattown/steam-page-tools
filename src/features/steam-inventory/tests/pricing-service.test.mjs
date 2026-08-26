import assert from 'node:assert/strict';
import test from 'node:test';

import {
    fixture,
    loadModules,
    MemoryStorage,
} from './helpers.mjs';

const modules = await loadModules([
    'types.js',
    'storage.js',
    'pricing-service.js',
]);

const exactFees = {
    marketMinimumMinor: 1,
    publisherFeeBps: 1000,
    publisherFeeMinimumMinor: 1,
    steamFeeBaseMinor: 0,
    steamFeeBps: 500,
    steamFeeMinimumMinor: 1,
};

test('parses integer order-book amounts and normalized recent history', async () => {
    const source = await fixture('market-listing.txt', false);
    const parsed = modules.pricingService.parseListingPage(source, 'EUR');

    assert.equal(parsed.currencyId, 3);
    assert.equal(parsed.lowestSellGrossMinor, 57);
    assert.equal(parsed.highestBuyGrossMinor, 55);
    assert.equal(parsed.history.length, 2);
    assert.equal(parsed.history[0].medianMinor, 57);
    assert.equal(parsed.history[1].volume, 15);
});

test('uses an exact grouped Market bucket and rejects another variant order book', async () => {
    const source = String.raw`
        {\"buckets\":[
            {\"bucket_id\":\"USP-S | Forest Leaves (Factory New)\",\"min_price\":\"730\"},
            {\"bucket_id\":\"USP-S | Forest Leaves (Well-Worn)\",\"min_price\":\"9\"}
        ]}
        {\"amtMaxBuyOrder\":728,\"amtMinSellOrder\":730,\"eCurrency\":3}
        {\"queryKey\":[\"market\",\"orderbook\",730,\"USP-S | Forest Leaves (Factory New)\"]}
    `;

    assert.equal(
        modules.pricingService.groupedBucketMinimum(
            source,
            'USP-S | Forest Leaves (Well-Worn)'
        ),
        9
    );
    assert.equal(
        modules.pricingService.embeddedOrderBookMarketName(source),
        'USP-S | Forest Leaves (Factory New)'
    );

    let request = null;
    const service = modules.pricingService.createPricingService({
        api: {
            async loadMarketListing(input) {
                request = input;
                return source;
            },
        },
        country: 'FR',
        currencyCode: 'EUR',
        currencyId: 3,
        feeConfig: exactFees,
        storage: modules.storage.createStorage(new MemoryStorage()),
    });
    const snapshot = await service.getItemPrice({
        appId: '730',
        marketHashName: 'USP-S | Forest Leaves (Well-Worn)',
        marketListingFilters: {
            category_Exterior: 'WearCategory3',
            category_Quality: 'normal',
        },
        marketable: true,
    });

    assert.equal(request.marketListingFilters.category_Exterior, 'WearCategory3');
    assert.equal(snapshot.lowestSellGrossMinor, 9);
    assert.equal(snapshot.highestBuyGrossMinor, null);
    assert.equal(snapshot.quickSaleNetMinor, null);
    assert.equal(snapshot.source, 'Steam Market variant');
});

test('calculates gross, fees, and net with currency-specific minimums', () => {
    const usd = modules.pricingService.calculateBuyerTotal(100, exactFees);
    const jpy = modules.pricingService.calculateBuyerTotal(100, {
        ...exactFees,
        marketMinimumMinor: 1,
    });
    const vnd = modules.pricingService.calculateBuyerTotal(1000, {
        ...exactFees,
        publisherFeeMinimumMinor: 100,
        steamFeeMinimumMinor: 100,
    });

    assert.equal(usd.buyerTotalMinor, 115);
    assert.equal(usd.feesMinor, 15);
    assert.equal(jpy.buyerTotalMinor, 115);
    assert.equal(vnd.buyerTotalMinor, 1200);
    assert.equal(
        modules.pricingService.calculateSellerNet(115, exactFees)
            .sellerNetMinor,
        100
    );
    assert.equal(
        modules.pricingService.decimalMajorToMinor('123.6', 0),
        124
    );
    assert.equal(modules.types.inputToMinor('123', 'JPY'), 12300);
    assert.equal(modules.types.inputToMinor('1.23', 'EUR'), 123);
});

test('supports every Steam wallet currency ID and Steam minor units', () => {
    const expectedCodes = [
        'USD', 'GBP', 'EUR', 'CHF', 'RUB', 'PLN', 'BRL', 'JPY', 'NOK',
        'IDR', 'MYR', 'PHP', 'SGD', 'THB', 'VND', 'KRW', 'TRY', 'UAH',
        'MXN', 'CAD', 'AUD', 'NZD', 'CNY', 'INR', 'CLP', 'PEN', 'COP',
        'ZAR', 'HKD', 'TWD', 'SAR', 'AED', 'SEK', 'ARS', 'ILS', 'BYN',
        'KZT', 'KWD', 'QAR', 'CRC', 'UYU', 'BGN', 'HRK', 'CZK', 'DKK',
        'HUF', 'RON',
    ];

    for (const [index, code] of expectedCodes.entries()) {
        assert.equal(modules.types.getCurrencyCode(index + 1), code);
        assert.equal(modules.types.getCurrencyDigits(code), 2);
    }

    assert.equal(modules.types.minorToInput(123, 'JPY'), '1.23');
    assert.equal(modules.types.inputToMinor('1', 'JPY'), 100);
    assert.match(modules.types.formatMinor(100, 'JPY', 'en-US'), /(?:1|\u00a51)/);
    assert.equal(modules.types.isWholeUnitCurrency('JPY'), true);
    assert.equal(modules.types.isWholeUnitCurrency('EUR'), false);
});

test('legacy inventory security settings are ignored', () => {
    const local = new MemoryStorage();
    local.setItem(modules.storage.SETTINGS_KEY, JSON.stringify({
        cacheTtlMs: 30000,
        dryRun: false,
        maxBatchItems: 1,
        typedCountThreshold: 1,
    }));
    const settings = modules.storage.createStorage(local).getSettings();

    assert.equal(settings.cacheTtlMs, 30000);
    assert.equal('dryRun' in settings, false);
    assert.equal('maxBatchItems' in settings, false);
    assert.equal('typedCountThreshold' in settings, false);
});

test('rejects zero, negative, malformed, and overflow prices', () => {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
        assert.throws(() => {
            modules.pricingService.calculateBuyerTotal(value, exactFees);
        });
    }

    assert.equal(
        modules.pricingService.decimalMajorToMinor('not-a-price', 2),
        null
    );
});

test('deduplicates simultaneous reads and respects cache TTL', async () => {
    const source = await fixture('market-listing.txt', false);
    const local = new MemoryStorage();
    const storage = modules.storage.createStorage(local);
    let now = 1000;
    let calls = 0;
    const api = {
        async loadMarketListing() {
            calls += 1;
            await new Promise((resolve) => setTimeout(resolve, 5));
            return source;
        },
        async loadOrderHistogram() {
            throw new Error('not expected');
        },
        async loadPriceHistory() {
            throw new Error('not expected');
        },
    };
    const service = modules.pricingService.createPricingService({
        api,
        country: 'FR',
        currencyCode: 'EUR',
        currencyId: 3,
        feeConfig: exactFees,
        nowImpl: () => now,
        spacingMs: 0,
        storage,
    });
    const item = {
        appId: '753',
        marketFeeBps: 1000,
        marketHashName: 'Example',
        marketable: true,
    };

    const [first, second] = await Promise.all([
        service.getItemPrice(item),
        service.getItemPrice(item),
    ]);

    assert.equal(calls, 1);
    assert.equal(first.lowestSellGrossMinor, 57);
    assert.equal(second.lowestSellGrossMinor, 57);

    now += 60 * 1000;
    await service.getItemPrice(item);
    assert.equal(calls, 1);

    now += 16 * 60 * 1000;
    await service.getItemPrice(item);
    assert.equal(calls, 2);
});

test('reports each completed price snapshot for progressive rendering', async () => {
    const source = await fixture('market-listing.txt', false);
    const local = new MemoryStorage();
    const progress = [];
    const service = modules.pricingService.createPricingService({
        api: {
            async loadMarketListing() {
                return source;
            },
        },
        concurrency: 1,
        country: 'FR',
        currencyCode: 'EUR',
        currencyId: 3,
        feeConfig: exactFees,
        spacingMs: 0,
        storage: modules.storage.createStorage(local),
    });
    const item = {
        appId: '753',
        marketFeeBps: 1000,
        marketHashName: 'Progressive item',
        marketable: true,
    };

    await service.priceItems([item], {
        onProgress: (entry) => progress.push(entry),
    });

    assert.equal(progress.length, 1);
    assert.equal(progress[0].completed, 1);
    assert.equal(progress[0].total, 1);
    assert.equal(progress[0].key, '753\u001fProgressive item');
    assert.equal(progress[0].item, item);
    assert.equal(progress[0].snapshot.lowestSellGrossMinor, 57);
});

test('halts batch pricing after repeated errors', async () => {
    const local = new MemoryStorage();
    const service = modules.pricingService.createPricingService({
        api: {
            async loadMarketListing() {
                throw Object.assign(new Error('rate limited'), {
                    code: 'rate_limited',
                });
            },
        },
        concurrency: 1,
        country: 'US',
        currencyCode: 'USD',
        currencyId: 1,
        feeConfig: exactFees,
        spacingMs: 0,
        storage: modules.storage.createStorage(local),
    });
    const items = Array.from({ length: 8 }, (_, index) => ({
        appId: '753',
        marketHashName: `Item ${index}`,
        marketable: true,
    }));
    const result = await service.priceItems(items);

    assert.equal(result.halted, true);
    assert.equal(result.haltReason, 'rate_limited');
    assert.equal(result.prices.size, 5);
});
