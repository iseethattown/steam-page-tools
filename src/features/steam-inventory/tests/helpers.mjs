import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const testRoot = dirname(fileURLToPath(import.meta.url));
const featureRoot = resolve(testRoot, '..');

export class MemoryStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    removeItem(key) {
        this.values.delete(key);
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

export async function fixture(name, parse = true) {
    const value = await readFile(resolve(testRoot, 'fixtures', name), 'utf8');

    return parse ? JSON.parse(value) : value;
}

export async function loadModules(files, additions = {}) {
    const context = vm.createContext({
        AbortController,
        URL,
        URLSearchParams,
        clearTimeout,
        inventoryModules: {},
        setTimeout,
        ...additions,
    });

    for (const file of files) {
        const source = await readFile(resolve(featureRoot, file), 'utf8');

        vm.runInContext(source, context, { filename: file });
    }

    return context.inventoryModules;
}

export function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

export function response({
    body,
    headers = {},
    ok = true,
    status = 200,
}) {
    return {
        headers: {
            get(name) {
                return headers[name] || headers[name.toLowerCase()] || null;
            },
        },
        json: async () => body,
        ok,
        status,
        text: async () => String(body || ''),
    };
}
