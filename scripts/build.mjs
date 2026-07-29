// Copyright (C) 2026 x0697x
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    copyFile,
    mkdir,
    readFile,
    readdir,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import {
    isAbsolute,
    relative,
    resolve,
    sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = resolve(repoRoot, 'dist');
const distributions = {
    chrome: {
        directory: resolve(distRoot, 'chrome'),
        manifest: resolve(repoRoot, 'manifests/chrome.json'),
        archive: resolve(
            distRoot,
            'steam-page-tools-chrome-v1.0.0.zip'
        ),
    },
    firefox: {
        directory: resolve(distRoot, 'firefox'),
        manifest: resolve(repoRoot, 'manifests/firefox.json'),
        archive: resolve(
            distRoot,
            'steam-page-tools-firefox-v1.0.0.zip'
        ),
    },
};
const sharedFiles = [
    'LICENSE',
    'src/content.js',
    'assets/icons/icon-16.png',
    'assets/icons/icon-32.png',
    'assets/icons/icon-48.png',
    'assets/icons/icon-128.png',
];

function assertInsideRepo(target) {
    const relativePath = relative(repoRoot, target);

    if (
        !relativePath ||
        relativePath.startsWith('..') ||
        isAbsolute(relativePath)
    ) {
        throw new Error(`Path is outside the repository: ${target}`);
    }
}

function assertKnownOutput(target) {
    const knownOutputs = new Set(
        Object.values(distributions)
            .flatMap(({ directory, archive }) => [directory, archive])
    );

    assertInsideRepo(target);

    if (!knownOutputs.has(target)) {
        throw new Error(`Refusing to clean an unknown path: ${target}`);
    }
}

async function cleanOutputs() {
    for (const { directory, archive } of Object.values(distributions)) {
        assertKnownOutput(directory);
        assertKnownOutput(archive);
        await rm(directory, { recursive: true, force: true });
        await rm(archive, { force: true });
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

function createLocalHeader(entry) {
    const header = Buffer.alloc(30);

    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0x0021, 12);
    header.writeUInt32LE(entry.crc, 14);
    header.writeUInt32LE(entry.compressed.length, 18);
    header.writeUInt32LE(entry.content.length, 22);
    header.writeUInt16LE(entry.name.length, 26);

    return header;
}

function createCentralHeader(entry, offset) {
    const header = Buffer.alloc(46);

    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(0x031e, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt16LE(0x0021, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.compressed.length, 20);
    header.writeUInt32LE(entry.content.length, 24);
    header.writeUInt16LE(entry.name.length, 28);
    header.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    header.writeUInt32LE(offset, 42);

    return header;
}

function createEndRecord(entryCount, centralSize, centralOffset) {
    const record = Buffer.alloc(22);

    record.writeUInt32LE(0x06054b50, 0);
    record.writeUInt16LE(entryCount, 8);
    record.writeUInt16LE(entryCount, 10);
    record.writeUInt32LE(centralSize, 12);
    record.writeUInt32LE(centralOffset, 16);

    return record;
}

async function collectFiles(root, current = root) {
    const entries = await readdir(current);
    const files = [];

    for (const entry of entries.sort()) {
        const target = resolve(current, entry);
        const info = await stat(target);

        if (info.isDirectory()) {
            files.push(...await collectFiles(root, target));
        } else if (info.isFile()) {
            files.push(target);
        } else {
            throw new Error(`Unsupported package entry: ${target}`);
        }
    }

    return files.sort();
}

async function writeReproducibleZip(sourceRoot, target) {
    assertInsideRepo(sourceRoot);
    assertKnownOutput(target);

    const files = await collectFiles(sourceRoot);
    const entries = [];

    for (const file of files) {
        const archivePath = relative(sourceRoot, file)
            .split(sep)
            .join('/');
        const content = await readFile(file);

        entries.push({
            name: Buffer.from(archivePath, 'utf8'),
            content,
            compressed: deflateRawSync(content, { level: 9 }),
            crc: crc32(content),
        });
    }

    const localParts = [];
    const centralParts = [];
    let localOffset = 0;

    for (const entry of entries) {
        const localHeader = createLocalHeader(entry);

        localParts.push(
            localHeader,
            entry.name,
            entry.compressed
        );
        centralParts.push(
            createCentralHeader(entry, localOffset),
            entry.name
        );
        localOffset += (
            localHeader.length +
            entry.name.length +
            entry.compressed.length
        );
    }

    const centralDirectory = Buffer.concat(centralParts);
    const archive = Buffer.concat([
        ...localParts,
        centralDirectory,
        createEndRecord(
            entries.length,
            centralDirectory.length,
            localOffset
        ),
    ]);

    await mkdir(distRoot, { recursive: true });
    await writeFile(target, archive);
}

async function buildDistribution({ directory, manifest, archive }) {
    assertInsideRepo(directory);
    assertInsideRepo(manifest);
    assertKnownOutput(archive);

    await mkdir(directory, { recursive: true });

    for (const relativePath of sharedFiles) {
        const source = resolve(repoRoot, relativePath);
        const target = resolve(directory, relativePath);

        assertInsideRepo(source);
        assertInsideRepo(target);
        await mkdir(resolve(target, '..'), { recursive: true });
        await copyFile(source, target);
    }

    await copyFile(manifest, resolve(directory, 'manifest.json'));
    await writeReproducibleZip(directory, archive);
}

await cleanOutputs();

if (globalThis.process?.argv?.includes('--clean')) {
    console.log('Cleaned the two distribution directories and known archives.');
} else {
    for (const distribution of Object.values(distributions)) {
        await buildDistribution(distribution);
    }

    console.log(
        'Built deterministic Chrome and Firefox distributions and ZIP archives.'
    );
}
