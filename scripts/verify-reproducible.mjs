// Copyright (C) 2026 x0697x
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const buildScript = resolve(repoRoot, 'scripts/build.mjs');
const archives = [
    resolve(
        repoRoot,
        'dist/steam-page-tools-chrome-v1.2.0.zip'
    ),
    resolve(
        repoRoot,
        'dist/steam-page-tools-firefox-v1.2.0.zip'
    ),
];

function runBuild() {
    const result = spawnSync(
        process.execPath,
        [buildScript],
        {
            cwd: repoRoot,
            encoding: 'utf8',
        }
    );

    if (result.status !== 0) {
        throw new Error(
            [
                'Build failed during reproducibility verification.',
                result.stdout,
                result.stderr,
            ].filter(Boolean).join('\n')
        );
    }
}

async function getHashes() {
    return Promise.all(
        archives.map(async (archive) => (
            createHash('sha256')
                .update(await readFile(archive))
                .digest('hex')
        ))
    );
}

runBuild();
const firstHashes = await getHashes();
runBuild();
const secondHashes = await getHashes();

if (firstHashes.some((hash, index) => hash !== secondHashes[index])) {
    throw new Error('Repeated builds produced different ZIP archives.');
}

console.log('Repeated builds produced byte-for-byte identical ZIP archives.');
