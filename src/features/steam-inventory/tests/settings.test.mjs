import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testRoot = dirname(fileURLToPath(import.meta.url));
const source = await readFile(
    resolve(testRoot, '../../../settings.js'),
    'utf8'
);
const context = vm.createContext({
    clearTimeout,
    document: {},
    setTimeout,
});

vm.runInContext(source, context, { filename: 'settings.js' });

const settingsApi = context.SteamPageToolsSettings;

test('feature settings default to every feature enabled', () => {
    assert.deepEqual(
        JSON.parse(JSON.stringify(settingsApi.normalize(null))),
        {
            badgeTools: true,
            enabled: true,
            friendsComments: true,
            inventoryTools: true,
            profileTools: true,
            storeTools: true,
        }
    );
});

test('feature settings preserve booleans and reject invalid stored values', () => {
    const normalized = settingsApi.normalize({
        badgeTools: false,
        enabled: 'false',
        friendsComments: false,
        inventoryTools: 0,
        profileTools: false,
        storeTools: false,
        unknown: false,
    });

    assert.equal(normalized.enabled, true);
    assert.equal(normalized.badgeTools, false);
    assert.equal(normalized.friendsComments, false);
    assert.equal(normalized.inventoryTools, true);
    assert.equal(normalized.profileTools, false);
    assert.equal(normalized.storeTools, false);
    assert.equal('unknown' in normalized, false);
});
