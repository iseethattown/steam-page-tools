// Copyright (C) 2026 x0697x
(function () {
    'use strict';

    const settingsApi = globalThis.SteamPageToolsSettings;
    const extensionApi = globalThis.browser || globalThis.chrome;
    const form = document.getElementById('settings-form');
    const featureSettings = document.getElementById('feature-settings');
    const status = document.getElementById('save-status');
    const controls = [...form.querySelectorAll('[data-setting]')];
    let current = settingsApi.DEFAULTS;
    let saveQueue = Promise.resolve();

    function render(settings) {
        current = settingsApi.normalize(settings);

        for (const control of controls) {
            control.checked = current[control.dataset.setting];
            control.disabled = (
                control.dataset.setting !== 'enabled' &&
                !current.enabled
            );
        }

        featureSettings.classList.toggle('disabled', !current.enabled);
        featureSettings.setAttribute(
            'aria-disabled',
            String(!current.enabled)
        );
    }

    function readControls() {
        return settingsApi.normalize(Object.fromEntries(
            controls.map((control) => [
                control.dataset.setting,
                control.checked,
            ])
        ));
    }

    function setStatus(message, error = false) {
        status.textContent = message;
        status.classList.toggle('error', error);
    }

    function save(settings) {
        saveQueue = saveQueue.then(async () => {
            await extensionApi.storage.local.set({
                [settingsApi.STORAGE_KEY]: settings,
            });
            setStatus('Saved.');
        }).catch((error) => {
            setStatus(`Could not save: ${error.message}`, true);
        });
    }

    form.addEventListener('change', () => {
        const next = readControls();

        render(next);
        setStatus('Saving...');
        save(next);
    });

    async function init() {
        try {
            const stored = await extensionApi.storage.local.get(
                settingsApi.STORAGE_KEY
            );

            render(stored[settingsApi.STORAGE_KEY]);
            setStatus('Settings loaded.');
        } catch (error) {
            render(settingsApi.DEFAULTS);
            setStatus(`Could not load: ${error.message}`, true);
        }
    }

    init();
})();
