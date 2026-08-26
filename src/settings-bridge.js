// Copyright (C) 2026 x0697x
(function () {
    'use strict';

    const settingsApi = globalThis.SteamPageToolsSettings;
    const extensionApi = globalThis.browser || globalThis.chrome;

    if (!settingsApi || !extensionApi?.storage?.local) {
        return;
    }

    function publish(value) {
        const settings = settingsApi.normalize(value);
        const root = document.documentElement;

        if (!root) {
            document.addEventListener(
                'readystatechange',
                () => publish(settings),
                { once: true }
            );
            return;
        }

        root.setAttribute(
            settingsApi.PAGE_ATTRIBUTE,
            JSON.stringify(settings)
        );
        root.dispatchEvent(new CustomEvent(settingsApi.CHANGE_EVENT));
    }

    async function load() {
        try {
            const stored = await extensionApi.storage.local.get(
                settingsApi.STORAGE_KEY
            );

            publish(stored[settingsApi.STORAGE_KEY]);
        } catch {
            publish(settingsApi.DEFAULTS);
        }
    }

    extensionApi.storage.onChanged.addListener((changes, areaName) => {
        if (
            areaName === 'local' &&
            changes[settingsApi.STORAGE_KEY]
        ) {
            publish(changes[settingsApi.STORAGE_KEY].newValue);
        }
    });

    load();
})();
