// Copyright (C) 2026 x0697x
(function () {
    'use strict';

    if (globalThis.SteamPageToolsSettings) {
        return;
    }

    const STORAGE_KEY = 'spt-feature-settings-v1';
    const PAGE_ATTRIBUTE = 'data-spt-feature-settings';
    const CHANGE_EVENT = 'spt-feature-settings-changed';
    const FEATURE_KEYS = Object.freeze([
        'profileTools',
        'badgeTools',
        'friendsComments',
        'inventoryTools',
        'storeTools',
    ]);
    const DEFAULTS = Object.freeze({
        enabled: true,
        profileTools: true,
        badgeTools: true,
        friendsComments: true,
        inventoryTools: true,
        storeTools: true,
    });

    function normalize(value) {
        const candidate = value && typeof value === 'object' ? value : {};

        return Object.freeze(Object.fromEntries(
            Object.entries(DEFAULTS).map(([key, fallback]) => [
                key,
                typeof candidate[key] === 'boolean'
                    ? candidate[key]
                    : fallback,
            ])
        ));
    }

    function readPublished() {
        const serialized = document.documentElement?.getAttribute(
            PAGE_ATTRIBUTE
        );

        if (!serialized) {
            return null;
        }

        try {
            return normalize(JSON.parse(serialized));
        } catch {
            return null;
        }
    }

    function waitForPageSettings(timeoutMs = 2000) {
        const published = readPublished();

        if (published) {
            return Promise.resolve(published);
        }

        return new Promise((resolve) => {
            let timeout;

            function finish(value) {
                document.documentElement?.removeEventListener(
                    CHANGE_EVENT,
                    onChange
                );
                clearTimeout(timeout);
                resolve(value || DEFAULTS);
            }

            function onChange() {
                const current = readPublished();

                if (current) {
                    finish(current);
                }
            }

            document.documentElement?.addEventListener(
                CHANGE_EVENT,
                onChange
            );
            timeout = setTimeout(() => finish(readPublished()), timeoutMs);
        });
    }

    globalThis.SteamPageToolsSettings = Object.freeze({
        CHANGE_EVENT,
        DEFAULTS,
        FEATURE_KEYS,
        PAGE_ATTRIBUTE,
        STORAGE_KEY,
        normalize,
        readPublished,
        waitForPageSettings,
    });
})();
