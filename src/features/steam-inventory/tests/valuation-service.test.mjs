import assert from 'node:assert/strict';
import test from 'node:test';

import { loadModules } from './helpers.mjs';

const modules = await loadModules(['types.js', 'valuation-service.js']);

test('aggregates per-game and overall priced versus unpriced quantities', () => {
    const result = modules.valuationService.aggregate([
        {
            appId: '753',
            contextId: '6',
            gameAppId: '440',
            marketable: true,
            price: {
                highestBuyGrossMinor: 90,
                listingNetMinor: 85,
                lowestSellGrossMinor: 100,
                quickSaleNetMinor: 76,
                status: 'priced',
            },
            quantity: 2,
        },
        {
            appId: '753',
            contextId: '6',
            gameAppId: '570',
            marketable: true,
            price: { status: 'unpriced' },
            quantity: 3,
        },
        {
            appId: '730',
            contextId: '2',
            gameAppId: '730',
            marketable: false,
            price: { status: 'unpriced' },
            quantity: 1,
        },
    ]);

    assert.equal(result.overall.itemCount, 6);
    assert.equal(result.overall.marketableCount, 5);
    assert.equal(result.overall.pricedCount, 2);
    assert.equal(result.overall.unpricedCount, 3);
    assert.equal(result.overall.listingGrossMinor, 200);
    assert.equal(result.overall.listingFeesMinor, 30);
    assert.equal(result.overall.listingNetMinor, 170);
    assert.equal(result.overall.quickSaleGrossMinor, 180);
    assert.equal(result.overall.pricingCoveragePercent, 40);
    assert.equal(result.byGame.get('440').listingGrossMinor, 200);
    assert.equal(result.byGame.get('570').unpricedCount, 3);
});

test('never includes stale or malformed prices in monetary totals', () => {
    const result = modules.valuationService.aggregate([
        {
            appId: '1',
            contextId: '1',
            marketable: true,
            price: {
                listingNetMinor: 50,
                lowestSellGrossMinor: 0,
                status: 'priced',
            },
            quantity: 1,
        },
        {
            appId: '1',
            contextId: '1',
            marketable: true,
            price: {
                listingNetMinor: 50,
                lowestSellGrossMinor: 60,
                status: 'stale',
            },
            quantity: 1,
        },
    ]);

    assert.equal(result.overall.listingGrossMinor, 0);
    assert.equal(result.overall.pricedCount, 0);
    assert.equal(result.overall.unpricedCount, 2);
});

test('includes a reliable buy order when no sell listing is available', () => {
    const result = modules.valuationService.aggregate([{
        appId: '753',
        contextId: '6',
        gameAppId: '440',
        marketable: true,
        price: {
            highestBuyGrossMinor: 90,
            quickSaleNetMinor: 78,
            status: 'priced',
        },
        quantity: 1,
    }]).overall;

    assert.equal(result.pricedCount, 1);
    assert.equal(result.unpricedCount, 0);
    assert.equal(result.listingGrossMinor, 0);
    assert.equal(result.quickSaleGrossMinor, 90);
    assert.equal(result.quickSaleFeesMinor, 12);
    assert.equal(result.quickSaleNetMinor, 78);
});
