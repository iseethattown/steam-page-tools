inventoryModules.storage = (() => {
    const PRICE_CACHE_KEY = 'spt-inventory-price-cache-v2';
    const SETTINGS_KEY = 'spt-inventory-settings-v1';
    const DEFAULT_PRICE_TTL_MS = 15 * 60 * 1000;
    const DEFAULT_SETTINGS = Object.freeze({
        cacheTtlMs: DEFAULT_PRICE_TTL_MS,
        minimumSalePriceMinor: 1,
        maxSalePriceAgeMs: 5 * 60 * 1000,
    });

    function safeParse(raw, fallback) {
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function sanitizeSettings(candidate = {}) {
        const settings = { ...DEFAULT_SETTINGS };
        const integerFields = [
            'cacheTtlMs',
            'minimumSalePriceMinor',
            'maxSalePriceAgeMs',
        ];

        for (const field of integerFields) {
            if (Number.isSafeInteger(candidate[field]) && candidate[field] > 0) {
                settings[field] = candidate[field];
            }
        }

        return settings;
    }

    function createStorage(storageArea) {
        function readObject(key) {
            const raw = storageArea?.getItem(key);

            return raw ? safeParse(raw, {}) : {};
        }

        function writeObject(key, value) {
            storageArea?.setItem(key, JSON.stringify(value));
        }

        function getSettings() {
            return sanitizeSettings(readObject(SETTINGS_KEY));
        }

        function getPrice(key, now = Date.now(), ttlMs) {
            const entry = getPriceEntry(key);
            const ttl = Number.isSafeInteger(ttlMs) && ttlMs > 0
                ? ttlMs
                : getSettings().cacheTtlMs;

            if (
                !entry ||
                !Number.isSafeInteger(entry.retrievedAt) ||
                now - entry.retrievedAt > ttl
            ) {
                return null;
            }

            return entry;
        }

        function getPriceEntry(key) {
            return readObject(PRICE_CACHE_KEY)[key] || null;
        }

        function setPrice(key, value) {
            const cache = readObject(PRICE_CACHE_KEY);

            cache[key] = value;
            writeObject(PRICE_CACHE_KEY, cache);
        }

        function clearPrices() {
            storageArea?.removeItem(PRICE_CACHE_KEY);
        }

        return Object.freeze({
            clearPrices,
            getPrice,
            getPriceEntry,
            getSettings,
            setPrice,
        });
    }

    return Object.freeze({
        DEFAULT_PRICE_TTL_MS,
        DEFAULT_SETTINGS,
        PRICE_CACHE_KEY,
        SETTINGS_KEY,
        createStorage,
        sanitizeSettings,
    });
})();
