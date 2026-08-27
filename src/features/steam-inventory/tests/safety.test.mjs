import assert from 'node:assert/strict';
import test from 'node:test';

import { loadModules } from './helpers.mjs';

const modules = await loadModules(['types.js', 'safety.js']);

test('inventory management has no action-mode or configured batch cap', () => {
    const errors = modules.safety.validateBatch({
        count: 500,
        grossMinor: 1000000,
        isOwnInventory: true,
    });

    assert.equal(errors.length, 0);
});

test('rejects stale, future, zero, missing, and malformed price snapshots', () => {
    const now = 10000;
    const maxAge = 1000;
    const invalid = [
        null,
        { status: 'unpriced' },
        { status: 'priced', lowestSellGrossMinor: 0, retrievedAt: now },
        { status: 'priced', lowestSellGrossMinor: -1, retrievedAt: now },
        { status: 'priced', lowestSellGrossMinor: 10.5, retrievedAt: now },
        { status: 'priced', lowestSellGrossMinor: 10, retrievedAt: now - 1001 },
        { status: 'priced', lowestSellGrossMinor: 10, retrievedAt: now + 1 },
    ];

    for (const snapshot of invalid) {
        assert.notEqual(
            modules.safety.validatePriceSnapshot(snapshot, now, maxAge),
            ''
        );
    }

    assert.equal(
        modules.safety.validatePriceSnapshot({
            lowestSellGrossMinor: 10,
            retrievedAt: now,
            status: 'priced',
        }, now, maxAge),
        ''
    );
    assert.equal(
        modules.safety.validatePriceSnapshot({
            highestBuyGrossMinor: 10,
            retrievedAt: now,
            status: 'priced',
        }, now, maxAge, 'highestBuyGrossMinor'),
        ''
    );
});

test('requires an owned inventory, an explicit selection, and valid totals', () => {
    const errors = modules.safety.validateBatch({
        count: 0,
        grossMinor: -1,
        isOwnInventory: false,
    });

    assert.equal(errors.length, 3);
});

test('price cache keys include app, name, currency, and country', () => {
    const item = { appId: 753, marketHashName: 'Card' };

    assert.notEqual(
        modules.types.makeMarketKey(item, 1, 'US'),
        modules.types.makeMarketKey(item, 3, 'US')
    );
    assert.notEqual(
        modules.types.makeMarketKey(item, 1, 'US'),
        modules.types.makeMarketKey(item, 1, 'FR')
    );
});

test('HTML-like remote names are assigned as text, never markup', async () => {
    let innerHtmlAssigned = false;
    const fakeDocument = {
        createElement() {
            const attributes = new Map();

            return {
                className: '',
                id: '',
                set innerHTML(value) {
                    innerHtmlAssigned = Boolean(value);
                },
                set textContent(value) {
                    this.renderedText = String(value);
                },
                setAttribute(name, value) {
                    attributes.set(name, value);
                },
            };
        },
    };
    const uiModules = await loadModules(
        ['ui/dom.js'],
        { document: fakeDocument }
    );
    const node = uiModules.uiDom.element('div', {
        text: '<img src=x onerror=alert(1)>',
    });

    assert.equal(node.renderedText, '<img src=x onerror=alert(1)>');
    assert.equal(innerHtmlAssigned, false);
});

test('maps Steam native item tiles by app, context, and asset ID', async () => {
    const tileModules = await loadModules([
        'types.js',
        'ui/dom.js',
        'ui/inventory-table.js',
    ], { document: {} });
    const holder = {
        id: '',
        matches() {
            return false;
        },
        querySelector() {
            return { id: '753_6_123456789' };
        },
    };

    assert.equal(
        tileModules.inventoryTable.parseHolderKey(holder),
        '753:6:123456789'
    );
    assert.equal(
        tileModules.inventoryTable.parseHolderKey({
            id: 'item753_6_42',
            matches: () => true,
            querySelector: () => null,
        }),
        '753:6:42'
    );
    assert.equal(
        tileModules.inventoryTable.parseHolderKey({
            id: 'item_440_2_99',
            matches: () => false,
            querySelector: () => null,
        }),
        '440:2:99'
    );
});

test('clicking the same Steam tile toggles its selection', async () => {
    const tileModules = await loadModules([
        'types.js',
        'ui/dom.js',
        'ui/inventory-table.js',
    ], { document: {} });
    const selected = new Set();

    assert.equal(
        tileModules.inventoryTable.toggleSelection(selected, '753:6:42'),
        true
    );
    assert.equal(selected.has('753:6:42'), true);
    assert.equal(
        tileModules.inventoryTable.toggleSelection(selected, '753:6:42'),
        false
    );
    assert.equal(selected.has('753:6:42'), false);
});

test('resets every Steam inventory filter without touching selection', async () => {
    const tileModules = await loadModules([
        'types.js',
        'ui/dom.js',
        'ui/inventory-table.js',
    ], { document: {} });
    const controls = {
        game: { value: '730' },
        gems: { value: 'yes' },
        marketable: { value: 'no' },
        maxPrice: { value: '10.00' },
        minPrice: { value: '1.00' },
        pricing: { value: 'priced' },
        search: { value: 'case' },
    };

    tileModules.inventoryTable.resetFilterControls(controls);

    assert.deepEqual(
        Object.fromEntries(Object.entries(controls).map(([key, control]) => (
            [key, control.value]
        ))),
        {
            game: 'all',
            gems: 'all',
            marketable: 'all',
            maxPrice: '',
            minPrice: '',
            pricing: 'all',
            search: '',
        }
    );
});

test('detects active inventory changes that require selection clearing', async () => {
    const indexModules = await loadModules(['index.js']);

    assert.equal(
        indexModules.index.inventoryKeyChanged('753:6', '753:6'),
        false
    );
    assert.equal(
        indexModules.index.inventoryKeyChanged('753:6', '440:2'),
        true
    );
    assert.equal(indexModules.index.inventoryKeyChanged('', '440:2'), false);
});

test('detects Steam native inventory readiness without a fixed delay', async () => {
    const indexModules = await loadModules(['index.js']);
    const emptyRoot = {
        querySelector: () => null,
        querySelectorAll: () => [],
    };

    assert.equal(
        indexModules.index.nativeInventoryState(null, emptyRoot),
        'loading'
    );
    assert.equal(
        indexModules.index.nativeInventoryState({
            m_ActivePromise: null,
            m_bPerformedInitialLoad: true,
            m_tsLastError: 0,
        }, emptyRoot),
        'ready'
    );
    assert.equal(
        indexModules.index.nativeInventoryState({
            m_ActivePromise: null,
            m_bPerformedInitialLoad: false,
            m_tsLastError: 123,
        }, emptyRoot),
        'error'
    );
    assert.equal(
        indexModules.index.nativeInventoryState(null, {
            querySelector: () => null,
            querySelectorAll: () => [{
                getClientRects: () => [{}],
            }],
        }),
        'error'
    );
});

test('yields inventory reads to Steam’s active native request', async () => {
    const indexModules = await loadModules(['index.js']);
    let release;
    let finished = false;
    const nativeInventory = {
        m_ActivePromise: {
            always(callback) {
                release = () => {
                    nativeInventory.m_ActivePromise = null;
                    callback();
                };
            },
        },
    };
    const waiting = indexModules.index.waitForNativeInventoryIdle(
        null,
        () => nativeInventory
    ).then(() => {
        finished = true;
    });

    await Promise.resolve();
    assert.equal(finished, false);
    release();
    await waiting;
    assert.equal(finished, true);
});
