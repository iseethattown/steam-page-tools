inventoryModules.inventoryUi = (() => {
    const {
        element,
        steamButton,
    } = inventoryModules.uiDom;
    const { createSummary } = inventoryModules.inventorySummary;
    const { createTable } = inventoryModules.inventoryTable;

    function createUi({
        callbacks,
        currencyCode,
        formatMinor,
        isOwnInventory,
    }) {
        const root = element('section', {
            className: 'spt-inventory-root',
            id: 'spt-inventory-economy',
        });
        const header = element('div', {
            className: 'spt-inventory-header',
        });
        const identity = element('div', {
            className: 'spt-inventory-identity',
        });
        const title = element('strong', {
            className: 'spt-inventory-title',
            text: 'Total inventory value',
        });
        const statusRow = element('div', {
            className: 'spt-inventory-status-row',
        });
        const loadingSpinner = element('span', {
            className: 'spt-inventory-loading-spinner',
            attributes: { 'aria-hidden': 'true' },
        });
        const status = element('span', {
            className: 'spt-inventory-status',
            attributes: { 'aria-live': 'polite' },
            text: 'Waiting for Steam…',
        });
        const toolbar = element('div', {
            className: 'spt-inventory-toolbar',
        });
        const refresh = steamButton('Refresh');
        const cancelRead = steamButton('Cancel', { kind: 'gray' });
        const tools = steamButton('Show tools', { kind: 'gray' });
        const summary = createSummary(formatMinor, currencyCode);
        const drawer = element('div', {
            className: 'spt-inventory-drawer',
        });
        const actions = element('div', {
            className: 'spt-inventory-action-row',
        });
        const selection = element('span', {
            className: 'spt-inventory-selection-summary',
            text: '0 selected',
        });
        const sell = steamButton('Review sales');
        const instantSell = steamButton('Quick sell', { kind: 'green' });
        const gems = steamButton('Review Gems', { kind: 'gray' });
        const table = createTable({
            currencyCode,
            formatMinor,
            onSelectionChange: updateActionButtons,
        });
        const note = element('p', {
            className: 'spt-inventory-note',
            text: isOwnInventory
                ? 'Click Steam’s item tiles to select them, review the batch, then confirm. Requests are sequential and paced.'
                : 'Prices are estimates. Item management is available only on your own inventory.',
        });

        statusRow.append(loadingSpinner, status);
        identity.append(title, statusRow);
        cancelRead.hidden = true;
        tools.setAttribute('aria-expanded', 'false');
        toolbar.append(refresh, cancelRead, tools);
        header.append(identity, toolbar);
        actions.append(
            selection,
            sell,
            instantSell,
            gems
        );
        drawer.hidden = true;
        drawer.append(
            actions,
            table.root,
            note
        );
        root.append(header, summary.root, drawer);
        table.setSelectionEnabled(false);
        let managementEnabled = isOwnInventory;

        function setDrawer(open) {
            drawer.hidden = !open;
            tools.setAttribute('aria-expanded', String(open));
            tools.querySelector('span').textContent = open
                ? 'Hide tools'
                : 'Show tools';
            table.setSelectionEnabled(open && managementEnabled);

            if (open) {
                table.syncSteamItems();
            } else {
                table.clearSelection();
            }
        }

        function updateActionButtons(selected = table.getSelected()) {
            const count = selected.length;
            const listingGross = selected.reduce((total, item) => (
                total + (
                    Number.isSafeInteger(item.price?.lowestSellGrossMinor)
                        ? item.price.lowestSellGrossMinor
                        : 0
                )
            ), 0);
            const enabled = isOwnInventory && count > 0;
            const instantEligible = selected.some((item) => (
                Number.isSafeInteger(item.price?.highestBuyGrossMinor) &&
                Number.isSafeInteger(item.price?.quickSaleNetMinor)
            ));

            selection.textContent = count
                ? `${count} selected · ${formatMinor(listingGross)} listing`
                : '0 selected';
            sell.disabled = !enabled;
            instantSell.disabled = !enabled;
            instantSell.title = instantEligible
                ? 'Review sales matched to current highest buy orders'
                : 'Review buy-order availability for selected items';
            gems.disabled = !enabled;
        }

        refresh.addEventListener('click', () => callbacks.onRefresh(true));
        cancelRead.addEventListener('click', callbacks.onCancelRead);
        tools.addEventListener('click', () => setDrawer(drawer.hidden));
        sell.addEventListener('click', () => callbacks.onSell(
            table.getSelected()
        ));
        instantSell.addEventListener('click', () => callbacks.onInstantSell(
            table.getSelected()
        ));
        gems.addEventListener('click', () => callbacks.onGems(
            table.getSelected()
        ));

        if (!isOwnInventory) {
            tools.title =
                'Selection is unavailable when viewing another user’s inventory.';
        }

        updateActionButtons();

        return Object.freeze({
            clearSelection: table.clearSelection,
            root,
            setManagementEnabled(enabled) {
                managementEnabled = Boolean(enabled);
                table.setSelectionEnabled(
                    managementEnabled && !drawer.hidden
                );

                if (!managementEnabled) {
                    table.clearSelection();
                }

                updateActionButtons();
            },
            setLoading(value) {
                const loading = Boolean(value);

                root.classList.toggle('loading', loading);
                refresh.disabled = loading;
                cancelRead.hidden = !loading;
                table.setLoading(loading);
            },
            setStatus(message, { error = false } = {}) {
                status.textContent = message;
                status.title = message;
                status.classList.toggle('error', error);
            },
            syncSteamItems: table.syncSteamItems,
            update({
                activeLabel,
                activeTotals,
                approximateFees,
                items,
                overallTotals,
            }) {
                table.setItems(items);
                summary.render({
                    active: activeTotals,
                    activeLabel,
                    approximate: approximateFees,
                    overall: overallTotals,
                });
                updateActionButtons();
            },
        });
    }

    return Object.freeze({ createUi });
})();
