import assert from 'node:assert/strict';
import test from 'node:test';

import { loadModules } from './helpers.mjs';

const modules = await loadModules([
    'types.js',
    'safety.js',
    'pricing-service.js',
    'action-service.js',
]);

const feeConfig = {
    marketMinimumMinor: 1,
    publisherFeeBps: 1000,
    publisherFeeMinimumMinor: 1,
    steamFeeBaseMinor: 0,
    steamFeeBps: 500,
    steamFeeMinimumMinor: 1,
};
const settings = {
    maxSalePriceAgeMs: 60000,
    minimumSalePriceMinor: 1,
};

function item(assetId, overrides = {}) {
    return {
        appId: '753',
        assetId,
        contextId: '6',
        gameName: 'Game',
        marketFeeBps: 1000,
        marketable: true,
        name: `Item ${assetId}`,
        price: {
            highestBuyGrossMinor: 100,
            lowestSellGrossMinor: 115,
            retrievedAt: 1000,
            source: 'fixture',
            status: 'priced',
        },
        quantity: 1,
        ...overrides,
    };
}

function prepared(items, pricingMode = 'listing') {
    return modules.actionService.prepareSell({
        feeConfig,
        isOwnInventory: true,
        items,
        now: 1000,
        pricingMode,
        settings,
    });
}

function confirmation() {
    return {
        confirmed: true,
    };
}

test('rejects sale preparation for another user inventory', () => {
    const result = modules.actionService.prepareSell({
        feeConfig,
        isOwnInventory: false,
        items: [item('1')],
        now: 1000,
        settings,
    });

    assert.equal(result.errors.some((error) => error.includes('own inventory')), true);
});

test('quick sales target the highest buy order instead of undercutting', () => {
    const current = item('1');
    const result = prepared([current], 'instant');
    const expected = modules.pricingService.calculateSellerNet(
        current.price.highestBuyGrossMinor,
        feeConfig,
        current.marketFeeBps
    );

    assert.equal(result.proposals.length, 1);
    assert.equal(result.proposals[0].pricingMode, 'instant');
    assert.equal(result.proposals[0].buyerTotalMinor, 100);
    assert.equal(result.proposals[0].sellerNetMinor, expected.sellerNetMinor);
    assert.equal(result.proposals[0].sourcePriceGrossMinor, 100);

    const missing = prepared([item('2', {
        price: {
            ...current.price,
            highestBuyGrossMinor: null,
        },
    })], 'instant');

    assert.equal(missing.proposals.length, 0);
    assert.match(missing.exclusions[0].reason, /buy order/i);
});

test('confirmation cancellation produces no mutation', async () => {
    let mutations = 0;
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
            },
        },
    });
    const result = await service.executeSell({
        acceptedSubscriberAgreement: true,
        confirmation: { confirmed: false },
        isAuthorized: () => true,
        proposals: prepared([item('1')]).proposals,
    });

    assert.equal(result.cancelled, true);
    assert.equal(mutations, 0);
});

test('executes destructive sales sequentially and blocks duplicates', async () => {
    let active = 0;
    let maxActive = 0;
    let mutations = 0;
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
                active += 1;
                maxActive = Math.max(maxActive, active);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active -= 1;
                return { success: true };
            },
        },
    });
    const items = [item('1'), item('2')];
    const proposals = prepared(items).proposals;
    const options = {
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals,
        refreshPrice: async (current) => current.price,
        revalidateItem: async (current) => current,
        sessionId: 'redacted',
    };
    const first = await service.executeSell(options);
    const second = await service.executeSell(options);

    assert.equal(first.results.length, 2);
    assert.equal(first.results.every((entry) => entry.status === 'confirmed'), true);
    assert.equal(maxActive, 1);
    assert.equal(mutations, 2);
    assert.equal(second.results.every((entry) => entry.status === 'skipped'), true);
    assert.equal(mutations, 2);
});

test('paces live mutations and halts the batch on a rate limit', async () => {
    const waits = [];
    let mutations = 0;
    const service = modules.actionService.createActionService({
        actionDelayMs: 1500,
        api: {
            async sellItem() {
                mutations += 1;

                if (mutations === 2) {
                    throw Object.assign(new Error('Steam rate limited the batch'), {
                        code: 'rate_limited',
                    });
                }

                return { success: true };
            },
        },
        sleepImpl: async (ms) => waits.push(ms),
    });
    const selected = [item('1'), item('2'), item('3')];
    const result = await service.executeSell({
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals: prepared(selected).proposals,
        refreshPrice: async (current) => current.price,
        revalidateItem: async (current) => current,
        sessionId: 'redacted',
    });

    assert.equal(result.halted, true);
    assert.equal(result.results.length, 2);
    assert.equal(result.results[1].status, 'failed');
    assert.equal(mutations, 2);
    assert.deepEqual(waits, [1500]);
});

test('price changes before submission are skipped', async () => {
    let mutations = 0;
    const current = item('1');
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
            },
        },
    });
    const result = await service.executeSell({
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals: prepared([current]).proposals,
        refreshPrice: async () => ({
            ...current.price,
            lowestSellGrossMinor: 116,
        }),
        revalidateItem: async () => current,
        sessionId: 'redacted',
    });

    assert.equal(result.results[0].status, 'skipped');
    assert.match(result.results[0].message, /Price changed/);
    assert.equal(mutations, 0);
});

test('quick sale is skipped if the highest buy order changes', async () => {
    let mutations = 0;
    const current = item('1');
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
            },
        },
    });
    const result = await service.executeSell({
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals: prepared([current], 'instant').proposals,
        refreshPrice: async () => ({
            ...current.price,
            highestBuyGrossMinor: 99,
        }),
        revalidateItem: async () => current,
        sessionId: 'redacted',
    });

    assert.equal(result.results[0].status, 'skipped');
    assert.match(result.results[0].message, /buy order changed/i);
    assert.equal(mutations, 0);
});

test('an authentication failure during price recheck halts the batch', async () => {
    let mutations = 0;
    let priceChecks = 0;
    const selected = [item('1'), item('2')];
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
                return { success: true };
            },
        },
    });
    const result = await service.executeSell({
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals: prepared(selected).proposals,
        refreshPrice: async () => {
            priceChecks += 1;
            throw Object.assign(new Error('signed out'), {
                code: 'authentication',
            });
        },
        revalidateItem: async (current) => current,
        sessionId: 'redacted',
    });

    assert.equal(result.halted, true);
    assert.equal(result.results.length, 1);
    assert.equal(priceChecks, 1);
    assert.equal(mutations, 0);
});

test('ambiguous sale results reconcile inventory and are never retried', async () => {
    let mutations = 0;
    let validations = 0;
    const current = item('1');
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
                throw Object.assign(new Error('timeout'), {
                    ambiguous: true,
                    code: 'timeout',
                });
            },
        },
    });
    const options = {
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals: prepared([current]).proposals,
        refreshPrice: async () => current.price,
        revalidateItem: async () => {
            validations += 1;
            return validations === 1 ? current : null;
        },
        sessionId: 'redacted',
    };
    const first = await service.executeSell(options);
    const second = await service.executeSell(options);

    assert.equal(first.results[0].status, 'uncertain');
    assert.match(first.results[0].message, /Verify Steam/);
    assert.equal(second.results[0].status, 'skipped');
    assert.equal(mutations, 1);
});

test('a deterministic Steam rejection can be reviewed and retried', async () => {
    let mutations = 0;
    const current = item('1');
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async sellItem() {
                mutations += 1;
                return mutations === 1
                    ? { message: 'Listing rejected', success: false }
                    : { success: true };
            },
        },
    });
    const options = {
        acceptedSubscriberAgreement: true,
        confirmation: confirmation(),
        isAuthorized: () => true,
        proposals: prepared([current]).proposals,
        refreshPrice: async () => current.price,
        revalidateItem: async () => current,
        sessionId: 'redacted',
    };

    const first = await service.executeSell(options);
    const second = await service.executeSell(options);

    assert.equal(first.results[0].status, 'failed');
    assert.equal(second.results[0].status, 'confirmed');
    assert.equal(mutations, 2);
});

test('executes Gems conversions sequentially and rechecks the quote', async () => {
    let active = 0;
    let maxActive = 0;
    const sourceAppIds = [];
    const ownerSteamIds = [];
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async convertToGems({ appId, ownerSteamId }) {
                sourceAppIds.push(appId);
                ownerSteamIds.push(ownerSteamId);
                active += 1;
                maxActive = Math.max(maxActive, active);
                await new Promise((resolve) => setTimeout(resolve, 5));
                active -= 1;
                return { strHTML: 'Converted' };
            },
        },
    });
    const gemItems = [item('1'), item('2')].map((entry) => ({
        ...entry,
        gem: { eligible: true, sourceAppId: '440' },
        gemQuote: { expectedGems: 20, retrievedAt: 1000 },
    }));
    const proposals = modules.actionService.prepareGems({
        isOwnInventory: true,
        items: gemItems,
    }).proposals;
    const result = await service.executeGems({
        confirmation: confirmation(),
        isAuthorized: () => true,
        ownerSteamId: '76561198000000000',
        proposals,
        refreshGemQuote: async () => ({ expectedGems: 20 }),
        revalidateItem: async (current) => current,
        sessionId: 'redacted',
    });

    assert.equal(result.results.every((entry) => entry.status === 'confirmed'), true);
    assert.equal(maxActive, 1);
    assert.deepEqual(sourceAppIds, ['440', '440']);
    assert.deepEqual(ownerSteamIds, [
        '76561198000000000',
        '76561198000000000',
    ]);
});

test('blocks a Gems retry after an unexpected mutation response', async () => {
    let mutations = 0;
    const service = modules.actionService.createActionService({
        actionDelayMs: 0,
        api: {
            async convertToGems() {
                mutations += 1;
                return {};
            },
        },
    });
    const current = {
        ...item('1'),
        gem: { eligible: true, sourceAppId: '440' },
        gemQuote: { expectedGems: 20, retrievedAt: 1000 },
    };
    const proposals = modules.actionService.prepareGems({
        isOwnInventory: true,
        items: [current],
    }).proposals;
    const options = {
        confirmation: confirmation(),
        isAuthorized: () => true,
        ownerSteamId: '76561198000000000',
        proposals,
        refreshGemQuote: async () => ({ expectedGems: 20 }),
        revalidateItem: async () => current,
        sessionId: 'redacted',
    };

    const first = await service.executeGems(options);
    const second = await service.executeGems(options);

    assert.equal(first.results[0].status, 'uncertain');
    assert.equal(second.results[0].status, 'skipped');
    assert.equal(mutations, 1);
});
