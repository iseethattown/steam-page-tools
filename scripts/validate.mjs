// Copyright (C) 2026 x0697x
import assert from 'node:assert/strict';
import {
    access,
    readFile,
    readdir,
    stat,
} from 'node:fs/promises';
import {
    basename,
    relative,
    resolve,
    sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const manifestDescription =
    'Unofficial Steam profile, badge, friends, inventory valuation, ' +
    'and bulk Store tools.';
const executableUrlAllowlist = new Set([
    'https://steamcommunity.com',
    'https://store.steampowered.com',
    'https://help.steampowered.com/en/faqs/view/451E-96B3-D194-50FC',
    'https://beta.steamsets.com',
    'https://beta.steamsets.com/badges/search',
    'https://community.fastly.steamstatic.com/economy/image/',
]);
const matches = [
    'https://steamcommunity.com/my/friends*',
    'https://steamcommunity.com/id/*',
    'https://steamcommunity.com/profiles/*',
    'https://store.steampowered.com/search*',
];
const icons = {
    16: 'assets/icons/icon-16.png',
    32: 'assets/icons/icon-32.png',
    48: 'assets/icons/icon-48.png',
    128: 'assets/icons/icon-128.png',
};
const action = {
    default_icon: icons,
    default_popup: 'src/popup.html',
    default_title: 'Steam Page Tools settings',
};
const settingsMatches = [
    'https://steamcommunity.com/my/friends*',
    'https://steamcommunity.com/my/inventory*',
    'https://steamcommunity.com/id/*',
    'https://steamcommunity.com/profiles/*',
    'https://store.steampowered.com/search*',
];
const settingsContentScript = {
    matches: settingsMatches,
    js: ['src/settings.js', 'src/settings-bridge.js'],
    run_at: 'document_start',
};
const contentScript = {
    matches,
    js: ['src/settings.js', 'src/content.js'],
    run_at: 'document_idle',
    world: 'MAIN',
};
const inventoryBundlePath =
    'src/features/steam-inventory/inventory.bundle.js';
const inventoryMatches = [
    'https://steamcommunity.com/my/inventory*',
    'https://steamcommunity.com/id/*/inventory*',
    'https://steamcommunity.com/profiles/*/inventory*',
];
const inventoryContentScript = {
    matches: inventoryMatches,
    js: ['src/settings.js', inventoryBundlePath],
    run_at: 'document_idle',
    world: 'MAIN',
};
const inventorySourceFiles = [
    'src/features/steam-inventory/types.js',
    'src/features/steam-inventory/storage.js',
    'src/features/steam-inventory/safety.js',
    'src/features/steam-inventory/market-eligibility.js',
    'src/features/steam-inventory/steam-api.js',
    'src/features/steam-inventory/inventory-service.js',
    'src/features/steam-inventory/pricing-service.js',
    'src/features/steam-inventory/valuation-service.js',
    'src/features/steam-inventory/action-service.js',
    'src/features/steam-inventory/ui/dom.js',
    'src/features/steam-inventory/ui/inventory-summary.js',
    'src/features/steam-inventory/ui/inventory-table.js',
    'src/features/steam-inventory/ui/action-preview-dialog.js',
    'src/features/steam-inventory/ui/action-progress-dialog.js',
    'src/features/steam-inventory/ui/styles.js',
    'src/features/steam-inventory/ui/index.js',
    'src/features/steam-inventory/index.js',
];
const expectedPackageFiles = [
    'assets/icons/icon-128.png',
    'assets/icons/icon-16.png',
    'assets/icons/icon-32.png',
    'assets/icons/icon-48.png',
    'manifest.json',
    'src/content.js',
    inventoryBundlePath,
    'src/popup.css',
    'src/popup.html',
    'src/popup.js',
    'src/settings-bridge.js',
    'src/settings.js',
];

async function buildExpectedInventoryBundle() {
    const sources = await Promise.all(
        inventorySourceFiles.map((relativePath) => (
            readFile(resolve(repoRoot, relativePath), 'utf8')
        ))
    );

    return Buffer.from([
        '// Copyright (C) 2026 x0697x',
        '(function () {',
        "    'use strict';",
        '    const inventoryModules = Object.create(null);',
        ...sources,
        '    globalThis.SteamPageToolsSettings.waitForPageSettings()',
        '        .then((settings) => {',
        '            if (settings.enabled && settings.inventoryTools) {',
        '                inventoryModules.index.init();',
        '            }',
        '        });',
        '})();',
        '',
    ].join('\n'));
}

function sortObject(value) {
    if (Array.isArray(value)) {
        return value.map(sortObject);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, child]) => [key, sortObject(child)])
        );
    }

    return value;
}

function assertDeepEqual(actual, expected, message) {
    assert.deepEqual(
        sortObject(actual),
        sortObject(expected),
        message
    );
}

async function readJson(relativePath) {
    const content = await readFile(resolve(repoRoot, relativePath), 'utf8');

    return JSON.parse(content);
}

function validateCommonManifest(manifest) {
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.name, 'Steam Page Tools');
    assert.equal(manifest.version, '1.3.0');
    assert.equal(manifest.description, manifestDescription);
    assert.equal(
        [...manifest.description].length <= 132,
        true,
        'Manifest description exceeds the Chrome 132-character limit'
    );
    assert.equal(
        manifest.homepage_url,
        'https://github.com/ju6697/steam-page-tools'
    );
    assertDeepEqual(manifest.icons, icons, 'Unexpected icon declaration');
    assertDeepEqual(manifest.action, action, 'Unexpected toolbar action');
    assertDeepEqual(
        manifest.content_scripts,
        [settingsContentScript, contentScript, inventoryContentScript],
        'Unexpected content script declaration'
    );
    assertDeepEqual(manifest.permissions, ['storage']);
    assert.equal('optional_permissions' in manifest, false);
    assert.equal('host_permissions' in manifest, false);
    assert.equal('optional_host_permissions' in manifest, false);
    assert.equal('background' in manifest, false);
}

async function validateManifests() {
    const chrome = await readJson('manifests/chrome.json');
    const firefox = await readJson('manifests/firefox.json');

    validateCommonManifest(chrome);
    validateCommonManifest(firefox);

    assertDeepEqual(
        Object.keys(chrome).sort(),
        [
            'action',
            'content_scripts',
            'description',
            'homepage_url',
            'icons',
            'manifest_version',
            'minimum_chrome_version',
            'name',
            'permissions',
            'version',
        ].sort(),
        'Chrome manifest contains unexpected fields'
    );
    assert.equal(chrome.minimum_chrome_version, '111');

    assertDeepEqual(
        Object.keys(firefox).sort(),
        [
            'action',
            'browser_specific_settings',
            'content_scripts',
            'description',
            'homepage_url',
            'icons',
            'manifest_version',
            'name',
            'permissions',
            'version',
        ].sort(),
        'Firefox manifest contains unexpected fields'
    );
    assertDeepEqual(
        firefox.browser_specific_settings,
        {
            gecko: {
                id: 'steam-page-tools@x0697x.github.io',
                strict_min_version: '140.0',
                data_collection_permissions: {
                    required: [
                        'authenticationInfo',
                        'locationInfo',
                        'personallyIdentifyingInfo',
                        'websiteActivity',
                        'websiteContent',
                    ],
                },
            },
        },
        'Unexpected Firefox-specific settings'
    );
}

async function validateIcons(root = repoRoot) {
    const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    for (const size of Object.keys(icons).map(Number)) {
        const relativePath = icons[size];
        const content = await readFile(resolve(root, relativePath));

        assert.equal(
            content.subarray(0, 8).equals(pngSignature),
            true,
            `${relativePath} is not a PNG`
        );
        assert.equal(content.toString('ascii', 12, 16), 'IHDR');
        assert.equal(
            content.readUInt32BE(16),
            size,
            `${relativePath} has the wrong width`
        );
        assert.equal(
            content.readUInt32BE(20),
            size,
            `${relativePath} has the wrong height`
        );
    }
}

async function validateIconSource() {
    const sourcePath = 'assets/icon-source.png';
    const content = await readFile(resolve(repoRoot, sourcePath));
    const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    assert.equal(
        content.subarray(0, 8).equals(pngSignature),
        true,
        `${sourcePath} is not a PNG`
    );
    assert.equal(content.toString('ascii', 12, 16), 'IHDR');
    assert.equal(content.readUInt32BE(16), 512);
    assert.equal(content.readUInt32BE(20), 512);
}

async function validateContentSource() {
    const source = await readFile(
        resolve(repoRoot, 'src/content.js'),
        'utf8'
    );

    for (const forbidden of [
        '==UserScript==',
        '@updateURL',
        '@downloadURL',
        'raw.githubusercontent.com',
        '<all_urls>',
        'chrome.tabs',
        'browser.tabs',
        'chrome.cookies',
        'browser.cookies',
        'eval(',
        'new Function(',
    ]) {
        assert.equal(
            source.includes(forbidden),
            false,
            `content.js contains forbidden text: ${forbidden}`
        );
    }

    for (const required of [
        'initEnabledFeatures',
        'settings.profileTools',
        'settings.badgeTools',
        'settings.friendsComments',
        'settings.storeTools',
        "const STEAM_COMMUNITY_ORIGIN = 'https://steamcommunity.com';",
        "const STEAM_STORE_ORIGIN = 'https://store.steampowered.com';",
        'requirePinnedSteamUrl',
        'requirePinnedSteamResponseUrl',
        "credentials: 'include'",
        'document.cookie',
        'localStorage',
        "const STEAMSETS_PROFILE_ORIGIN = 'https://beta.steamsets.com';",
        "'https://beta.steamsets.com/badges/search'",
        'spt-steamsets-profile',
        'spt-steamsets-promo',
        'spt-badge-auto-craft-lock',
        'spt-friends-comment-lock',
        'spt-search-cart-selection',
        'Comment friends',
        'spt-friends-selector',
        'Search friends...',
        'Select shown',
        'Clear shown',
        'const selectedSteamIds = new Set();',
        'checkbox.checked = false;',
        '/comment/Profile/post/',
        'COMMENT_DELAY_MS = 3 * 1000',
        'FAILURE_DELAY_MS = 20 * 1000',
        'COOLDOWN_MIN_MS = 10 * 1000',
        'COOLDOWN_MAX_MS = 15 * 1000',
        'spt-owned-badge-search',
        'Search owned badges...',
        "document.querySelectorAll('.profile_paging')",
        'setPaginationHidden(true);',
        'setPaginationHidden(false);',
        'sptBadgeSearchClone',
        'notifyBadgeIndexProgress',
        'appendMatchingBadges',
        'so far. Loading page',
        'All matches are shown below.',
    ]) {
        assert.equal(
            source.includes(required),
            true,
            `content.js is missing required behavior: ${required}`
        );
    }

    const urls = source.match(/https:\/\/[^\s'"`)]+/g) || [];

    for (const url of urls) {
        assert.equal(
            executableUrlAllowlist.has(url),
            true,
            `Executable source contains an unapproved URL: ${url}`
        );
    }

    assert.equal(
        /(?:src|href)\s*=\s*['"]https?:\/\//i.test(source),
        false,
        'Executable source loads a remote runtime resource'
    );
}

async function validateSettingsAndPopup() {
    const settings = await readFile(resolve(repoRoot, 'src/settings.js'), 'utf8');
    const bridge = await readFile(
        resolve(repoRoot, 'src/settings-bridge.js'),
        'utf8'
    );
    const popupScript = await readFile(
        resolve(repoRoot, 'src/popup.js'),
        'utf8'
    );
    const popupHtml = await readFile(
        resolve(repoRoot, 'src/popup.html'),
        'utf8'
    );
    const popupCss = await readFile(
        resolve(repoRoot, 'src/popup.css'),
        'utf8'
    );
    const combined = [settings, bridge, popupScript, popupHtml, popupCss]
        .join('\n');

    for (const forbidden of [
        'eval(',
        'new Function(',
        'http://',
        'https://',
        'innerHTML',
        'chrome.tabs',
        'browser.tabs',
    ]) {
        assert.equal(
            combined.includes(forbidden),
            false,
            `Settings UI contains forbidden text: ${forbidden}`
        );
    }

    for (const required of [
        "STORAGE_KEY = 'spt-feature-settings-v1'",
        "PAGE_ATTRIBUTE = 'data-spt-feature-settings'",
        'waitForPageSettings',
        'extensionApi.storage.local.get',
        'extensionApi.storage.local.set',
        'extensionApi.storage.onChanged.addListener',
        'data-setting="enabled"',
        'data-setting="profileTools"',
        'data-setting="badgeTools"',
        'data-setting="friendsComments"',
        'data-setting="inventoryTools"',
        'data-setting="storeTools"',
        'Reload open Steam pages to apply changes.',
    ]) {
        assert.equal(
            combined.includes(required),
            true,
            `Settings UI is missing required behavior: ${required}`
        );
    }

    assert.equal(
        /<script(?![^>]+src=)[^>]*>/i.test(popupHtml),
        false,
        'Popup HTML contains an inline script'
    );
    assert.equal(
        /\son[a-z]+\s*=/i.test(popupHtml),
        false,
        'Popup HTML contains an inline event handler'
    );
}

async function validateInventorySource() {
    const entries = await Promise.all(
        inventorySourceFiles.map(async (relativePath) => ({
            relativePath,
            source: await readFile(resolve(repoRoot, relativePath), 'utf8'),
        }))
    );
    const combined = entries.map(({ source }) => source).join('\n');

    for (const forbidden of [
        '==UserScript==',
        '@require',
        '<all_urls>',
        'chrome.cookies',
        'browser.cookies',
        'innerHTML',
        'eval(',
        'new Function(',
        'document.createElement(\'script\')',
        'document.createElement("script")',
    ]) {
        assert.equal(
            combined.includes(forbidden),
            false,
            `Inventory feature contains forbidden text: ${forbidden}`
        );
    }

    for (const required of [
        '/inventory/${ownerSteamId}/${appId}/${contextId}',
        '/market/listings/${encodeURIComponent(appId)}/',
        '/market/itemordershistogram',
        '/market/pricehistory/',
        '/market/sellitem/',
        '/profiles/${ownerSteamId}/ajaxgetgoovalue/',
        '/profiles/${ownerSteamId}/ajaxgrindintogoo/',
        'credentials: \'include\'',
        'MAX_READ_ATTEMPTS = 3',
        'DEFAULT_CONCURRENCY = 2',
        'MAX_CONSECUTIVE_ERRORS = 5',
        'Show tools',
        'Quick sell',
        'Select at least one eligible item',
        'spt-inventory-tile-selection',
        'spt-inventory-loading-spinner',
        'Loading…',
        'Duplicate operation blocked',
        'Price changed before submission',
        'Highest buy order changed before submission',
        'Steam account authorization changed',
        'Confirm ${actionLabel}',
        'textContent',
    ]) {
        assert.equal(
            combined.includes(required),
            true,
            `Inventory feature is missing required behavior: ${required}`
        );
    }

    for (const { relativePath, source } of entries) {
        if (!relativePath.endsWith('steam-api.js')) {
            assert.equal(
                /\bfetchImpl\s*\(/.test(source),
                false,
                `${relativePath} performs a Steam request outside steam-api`
            );
        }
    }

    const storageSource = entries.find(({ relativePath }) => (
        relativePath.endsWith('/storage.js')
    )).source;

    for (const sensitive of ['sessionid', 'cookie', 'authorization']) {
        assert.equal(
            storageSource.toLowerCase().includes(sensitive),
            false,
            `Inventory storage references sensitive data: ${sensitive}`
        );
    }

    const urls = combined.match(/https:\/\/[^\s'"`)]+/g) || [];

    for (const url of urls) {
        assert.equal(
            executableUrlAllowlist.has(url),
            true,
            `Inventory source contains an unapproved URL: ${url}`
        );
    }
}

async function walkFiles(root, excludedNames = new Set()) {
    const files = [];

    async function walk(current) {
        const entries = await readdir(current);

        for (const entry of entries.sort()) {
            if (excludedNames.has(entry)) {
                continue;
            }

            const target = resolve(current, entry);
            const info = await stat(target);

            if (info.isDirectory()) {
                await walk(target);
            } else if (info.isFile()) {
                files.push(target);
            } else {
                throw new Error(`Unsupported filesystem entry: ${target}`);
            }
        }
    }

    await walk(root);

    return files;
}

async function validateRepositoryHygiene() {
    const files = await walkFiles(
        repoRoot,
        new Set(['.git', 'dist', 'node_modules'])
    );
    const textExtensions = new Set([
        '.css', '.html', '.js', '.json', '.md', '.mjs', '.yml', '.yaml',
        '.gitignore',
    ]);
    const secretPatterns = [
        /github_pat_[A-Za-z0-9_]+/,
        /ghp_[A-Za-z0-9]+/,
        /AKIA[0-9A-Z]{16}/,
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    ];
    const privatePathPatterns = [
        /[A-Za-z]:\\Users\\/i,
        /\/Users\/[^/\s]+/i,
        /\/home\/[^/\s]+/i,
    ];

    for (const file of files) {
        assert.equal(
            file.endsWith('.map'),
            false,
            `Source map must not be committed: ${file}`
        );

        const extension = file.endsWith('.gitignore')
            ? '.gitignore'
            : file.slice(file.lastIndexOf('.'));

        if (!textExtensions.has(extension)) {
            continue;
        }

        const content = await readFile(file, 'utf8');

        for (const pattern of secretPatterns) {
            assert.equal(
                pattern.test(content),
                false,
                `Possible secret in ${relative(repoRoot, file)}`
            );
        }

        for (const pattern of privatePathPatterns) {
            assert.equal(
                pattern.test(content),
                false,
                `Absolute private path in ${relative(repoRoot, file)}`
            );
        }
    }
}

function makeCrc32Table() {
    const table = new Uint32Array(256);

    for (let value = 0; value < table.length; value += 1) {
        let crc = value;

        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (
                (crc & 1) ? 0xedb88320 : 0
            );
        }

        table[value] = crc >>> 0;
    }

    return table;
}

const crc32Table = makeCrc32Table();

function crc32(buffer) {
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function findEndRecord(archive) {
    for (
        let offset = archive.length - 22;
        offset >= Math.max(0, archive.length - 65557);
        offset -= 1
    ) {
        if (archive.readUInt32LE(offset) === 0x06054b50) {
            return offset;
        }
    }

    throw new Error('ZIP end record not found');
}

function readZipEntries(archive) {
    const endOffset = findEndRecord(archive);
    const entryCount = archive.readUInt16LE(endOffset + 10);
    const centralOffset = archive.readUInt32LE(endOffset + 16);
    const entries = new Map();
    let offset = centralOffset;

    for (let index = 0; index < entryCount; index += 1) {
        assert.equal(
            archive.readUInt32LE(offset),
            0x02014b50,
            'Invalid ZIP central directory entry'
        );

        const method = archive.readUInt16LE(offset + 10);
        const expectedCrc = archive.readUInt32LE(offset + 16);
        const compressedSize = archive.readUInt32LE(offset + 20);
        const size = archive.readUInt32LE(offset + 24);
        const nameLength = archive.readUInt16LE(offset + 28);
        const extraLength = archive.readUInt16LE(offset + 30);
        const commentLength = archive.readUInt16LE(offset + 32);
        const localOffset = archive.readUInt32LE(offset + 42);
        const name = archive
            .subarray(offset + 46, offset + 46 + nameLength)
            .toString('utf8');

        assert.equal(
            name.startsWith('/') ||
                name.includes('../') ||
                name.includes('..\\') ||
                /^[A-Za-z]:/.test(name),
            false,
            `Unsafe ZIP path: ${name}`
        );
        assert.equal(entries.has(name), false, `Duplicate ZIP entry: ${name}`);
        assert.equal(
            archive.readUInt32LE(localOffset),
            0x04034b50,
            `Invalid local ZIP header: ${name}`
        );

        const localNameLength = archive.readUInt16LE(localOffset + 26);
        const localExtraLength = archive.readUInt16LE(localOffset + 28);
        const dataOffset = (
            localOffset +
            30 +
            localNameLength +
            localExtraLength
        );
        const compressed = archive.subarray(
            dataOffset,
            dataOffset + compressedSize
        );
        const content = method === 8
            ? inflateRawSync(compressed)
            : compressed;

        assert.equal(content.length, size, `Wrong ZIP size: ${name}`);
        assert.equal(crc32(content), expectedCrc, `Wrong ZIP CRC: ${name}`);
        entries.set(name, content);

        offset += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
}

async function exists(target) {
    try {
        await access(target);
        return true;
    } catch {
        return false;
    }
}

async function validateDistribution(browser) {
    const directory = resolve(repoRoot, `dist/${browser}`);
    const archive = resolve(
        repoRoot,
        `dist/steam-page-tools-${browser}-v1.3.0.zip`
    );
    const manifestSource = resolve(repoRoot, `manifests/${browser}.json`);

    for (const relativePath of expectedPackageFiles) {
        const packaged = resolve(directory, relativePath);
        const expectedContent = relativePath === 'manifest.json'
            ? await readFile(manifestSource)
            : relativePath === inventoryBundlePath
                ? await buildExpectedInventoryBundle()
                : await readFile(resolve(repoRoot, relativePath));

        assert.equal(
            (await readFile(packaged)).equals(expectedContent),
            true,
            `${browser} distribution differs at ${relativePath}`
        );
    }

    const distFiles = (await walkFiles(directory))
        .map((file) => relative(directory, file).split(sep).join('/'))
        .sort();

    assertDeepEqual(
        distFiles,
        expectedPackageFiles,
        `${browser} distribution has unexpected files`
    );
    await validateIcons(directory);

    const zipEntries = readZipEntries(await readFile(archive));

    assertDeepEqual(
        [...zipEntries.keys()].sort(),
        expectedPackageFiles,
        `${basename(archive)} has unexpected entries`
    );

    for (const relativePath of expectedPackageFiles) {
        assert.equal(
            zipEntries.get(relativePath).equals(
                await readFile(resolve(directory, relativePath))
            ),
            true,
            `${basename(archive)} differs at ${relativePath}`
        );
    }
}

async function validateBuildOutputsWhenPresent() {
    const expected = [
        resolve(repoRoot, 'dist/chrome'),
        resolve(repoRoot, 'dist/firefox'),
        resolve(
            repoRoot,
            'dist/steam-page-tools-chrome-v1.3.0.zip'
        ),
        resolve(
            repoRoot,
            'dist/steam-page-tools-firefox-v1.3.0.zip'
        ),
    ];
    const present = await Promise.all(expected.map(exists));

    if (present.every((value) => !value)) {
        return;
    }

    assert.equal(
        present.every(Boolean),
        true,
        'Build outputs are incomplete'
    );
    await validateDistribution('chrome');
    await validateDistribution('firefox');
}

await validateManifests();
await validateIcons();
await validateIconSource();
await validateContentSource();
await validateSettingsAndPopup();
await validateInventorySource();
await validateRepositoryHygiene();
await validateBuildOutputsWhenPresent();

console.log('Validated manifests, source, icons, security constraints, and packages.');
