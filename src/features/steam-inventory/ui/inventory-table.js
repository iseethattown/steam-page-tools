inventoryModules.inventoryTable = (() => {
    const { element, labelControl, steamButton } = inventoryModules.uiDom;
    const { inputToMinor, makeAssetKey } = inventoryModules.types;

    function parseHolderKey(holder) {
        const itemElement = holder?.matches?.('.item[id]')
            ? holder
            : holder?.querySelector?.('.item[id]');
        const match = String(itemElement?.id || holder?.id || '').match(
            /^(?:item_?)?(\d+)_(\d+)_(\d+)$/
        );

        return match ? `${match[1]}:${match[2]}:${match[3]}` : '';
    }

    function toggleSelection(selected, key) {
        if (selected.has(key)) {
            selected.delete(key);
            return false;
        }

        selected.add(key);
        return true;
    }

    function createSelect(options) {
        const select = element('select');

        for (const [value, label] of options) {
            const option = element('option', { text: label });

            option.value = value;
            select.appendChild(option);
        }

        return select;
    }

    function resetFilterControls({
        game,
        gems,
        marketable,
        maxPrice,
        minPrice,
        pricing,
        search,
    }) {
        search.value = '';
        game.value = 'all';
        marketable.value = 'all';
        gems.value = 'all';
        pricing.value = 'all';
        minPrice.value = '';
        maxPrice.value = '';
    }

    function createTable({
        currencyCode,
        formatMinor,
        onSelectionChange,
    }) {
        const root = element('details', {
            className: 'spt-inventory-filters-panel',
        });
        const summary = element('summary', {
            text: 'Filter Steam inventory tiles',
        });
        const controls = element('div', {
            className: 'spt-inventory-filters',
        });
        const search = element('input', {
            attributes: {
                'aria-label': 'Search annotated Steam inventory items',
                placeholder: 'Search items or games…',
                type: 'search',
            },
        });
        const game = createSelect([['all', 'All games']]);
        const marketable = createSelect([
            ['all', 'All items'],
            ['yes', 'Marketable'],
            ['no', 'Not marketable'],
        ]);
        const gems = createSelect([
            ['all', 'Any Gems status'],
            ['yes', 'Gems eligible'],
            ['no', 'Not Gems eligible'],
        ]);
        const pricing = createSelect([
            ['all', 'Any price status'],
            ['priced', 'Priced'],
            ['unpriced', 'Unpriced'],
            ['stale', 'Stale or failed'],
        ]);
        const minPrice = element('input', {
            attributes: {
                'aria-label': 'Minimum listing price',
                min: '0',
                placeholder: `Min ${currencyCode || 'price'}`,
                step: '0.01',
                type: 'number',
            },
        });
        const maxPrice = element('input', {
            attributes: {
                'aria-label': 'Maximum listing price',
                min: '0',
                placeholder: `Max ${currencyCode || 'price'}`,
                step: '0.01',
                type: 'number',
            },
        });
        const resetFilters = steamButton('Reset filters', { kind: 'gray' });

        resetFilters.classList.add('spt-inventory-filter-reset');
        resetFilters.disabled = true;
        const status = element('div', {
            className: 'spt-inventory-filter-status',
            attributes: { 'aria-live': 'polite' },
        });
        const filterFooter = element('div', {
            className: 'spt-inventory-filter-footer',
        });
        const itemsByKey = new Map();
        const selected = new Set();
        let selectionEnabled = false;
        let loading = false;
        let activeDetailKey = '';

        controls.append(
            labelControl('Search', search),
            labelControl('Game', game),
            labelControl('Market', marketable),
            labelControl('Gems', gems),
            labelControl('Pricing', pricing),
            labelControl(`Min ${currencyCode || 'price'}`, minPrice),
            labelControl(`Max ${currencyCode || 'price'}`, maxPrice)
        );
        filterFooter.append(status, resetFilters);
        root.append(summary, controls, filterFooter);

        function currentSelection() {
            return [...selected].flatMap((key) => {
                const item = itemsByKey.get(key);

                return item ? [item] : [];
            });
        }

        function notifySelection() {
            onSelectionChange?.(currentSelection());
        }

        function priceLabel(item) {
            if (Number.isSafeInteger(item.price?.lowestSellGrossMinor)) {
                return formatMinor(item.price.lowestSellGrossMinor);
            }

            if (Number.isSafeInteger(item.price?.highestBuyGrossMinor)) {
                return `Buy ${formatMinor(item.price.highestBuyGrossMinor)}`;
            }

            if (loading && item.marketable) {
                return 'Loading…';
            }

            return item.marketable ? 'Unpriced' : '';
        }

        function priceTitle(item) {
            if (
                loading &&
                item.marketable &&
                !Number.isSafeInteger(item.price?.lowestSellGrossMinor) &&
                !Number.isSafeInteger(item.price?.highestBuyGrossMinor)
            ) {
                return `Loading the current Steam Market price for ${item.name}`;
            }

            const recent = Array.isArray(item.price?.history)
                ? item.price.history.at(-1)
                : null;
            const parts = [
                `Steam Page Tools estimate for ${item.name}`,
                `Lowest listing: ${formatMinor(
                    item.price?.lowestSellGrossMinor
                )}`,
                `Estimated listing net: ${formatMinor(
                    item.price?.listingNetMinor
                )}`,
                `Highest buy order: ${formatMinor(
                    item.price?.highestBuyGrossMinor
                )}`,
                `Estimated quick-sale net: ${formatMinor(
                    item.price?.quickSaleNetMinor
                )}`,
            ];

            if (Number.isSafeInteger(recent?.medianMinor)) {
                parts.push(
                    `Recent median: ${formatMinor(recent.medianMinor)} ` +
                    `(${recent.volume} sold)`
                );
            }

            return parts.join('\n');
        }

        function matches(item) {
            const query = search.value.trim().toLowerCase();
            const min = inputToMinor(minPrice.value, currencyCode);
            const max = inputToMinor(maxPrice.value, currencyCode);
            const gross = item.price?.lowestSellGrossMinor;

            if (
                query &&
                !`${item.name} ${item.gameName} ${item.type}`
                    .toLowerCase()
                    .includes(query)
            ) {
                return false;
            }

            if (game.value !== 'all' && item.gameAppId !== game.value) {
                return false;
            }

            if (
                marketable.value !== 'all' &&
                item.marketable !== (marketable.value === 'yes')
            ) {
                return false;
            }

            if (
                gems.value !== 'all' &&
                Boolean(item.gem?.eligible) !== (gems.value === 'yes')
            ) {
                return false;
            }

            if (pricing.value === 'priced' && item.price?.status !== 'priced') {
                return false;
            }

            if (
                pricing.value === 'unpriced' &&
                item.price?.status !== 'unpriced'
            ) {
                return false;
            }

            if (
                pricing.value === 'stale' &&
                !['stale', 'error'].includes(item.price?.status)
            ) {
                return false;
            }

            if (
                Number.isSafeInteger(min) && min > 0 &&
                (!Number.isSafeInteger(gross) || gross < min)
            ) {
                return false;
            }

            return !(
                Number.isSafeInteger(max) && max > 0 &&
                (!Number.isSafeInteger(gross) || gross > max)
            );
        }

        function annotateHolder(holder) {
            const key = parseHolderKey(holder);
            const item = itemsByKey.get(key);

            if (!item) {
                holder.querySelector('.spt-inventory-tile-price')?.remove();
                holder.querySelector(
                    '.spt-inventory-tile-selection'
                )?.remove();
                holder.classList.remove(
                    'spt-inventory-annotated',
                    'spt-inventory-filter-hidden',
                    'spt-inventory-tile-selected',
                    'spt-inventory-tile-selectable'
                );
                return false;
            }

            holder.classList.add('spt-inventory-annotated');
            holder.classList.toggle(
                'spt-inventory-filter-hidden',
                !matches(item)
            );
            holder.classList.toggle(
                'spt-inventory-tile-selected',
                selected.has(key)
            );
            holder.classList.toggle(
                'spt-inventory-tile-selectable',
                selectionEnabled && Boolean(
                    item.marketable || item.gem?.eligible
                )
            );

            if (!holder.querySelector('.spt-inventory-tile-selection')) {
                holder.appendChild(element('span', {
                    className: 'spt-inventory-tile-selection',
                    text: '✓',
                    attributes: { 'aria-hidden': 'true' },
                }));
            }

            let badge = holder.querySelector('.spt-inventory-tile-price');

            if (!badge) {
                badge = element('span', {
                    className: 'spt-inventory-tile-price',
                });
                holder.appendChild(badge);
            }

            const label = priceLabel(item);

            if (badge.textContent !== label) {
                badge.textContent = label;
            }

            badge.title = priceTitle(item);
            badge.hidden = !badge.textContent;

            return true;
        }

        function detailMetric(label, value) {
            const metric = element('div', {
                className: 'spt-inventory-detail-metric',
            });

            metric.append(
                element('span', { text: label }),
                element('strong', { text: value })
            );
            return metric;
        }

        function renderItemDetail(key = activeDetailKey) {
            const activeSteamItem = document.querySelector(
                '#inventories .item.activeInfo[id]'
            );
            const currentKey = parseHolderKey(activeSteamItem) || key;

            activeDetailKey = currentKey;

            for (const existing of document.querySelectorAll(
                '.spt-inventory-detail-price'
            )) {
                existing.remove();
            }

            const item = itemsByKey.get(currentKey);

            if (!item) {
                return;
            }

            const containers = [...document.querySelectorAll(
                '#iteminfo0 .item_desc_content, ' +
                '#iteminfo1 .item_desc_content, ' +
                '.inventory_iteminfo .item_desc_content'
            )];
            const contentTarget = containers.find((candidate) => (
                candidate.getClientRects().length > 0
            )) || containers.at(-1);
            const roots = [...document.querySelectorAll(
                '#iteminfo0, #iteminfo1'
            )];
            const rootTarget = roots.find((candidate) => (
                candidate.getClientRects().length > 0
            )) || roots.at(-1);

            if (!contentTarget && !rootTarget?.parentElement) {
                return;
            }

            const recent = Array.isArray(item.price?.history)
                ? item.price.history.at(-1)
                : null;
            const panel = element('section', {
                className: 'spt-inventory-detail-price',
            });
            const heading = element('div', {
                className: 'spt-inventory-detail-heading',
            });

            heading.append(
                element('strong', { text: 'Market estimate' }),
                element('span', {
                    text: item.price?.retrievedAt
                        ? new Date(item.price.retrievedAt).toLocaleTimeString()
                        : 'Unavailable',
                })
            );
            panel.append(
                heading,
                detailMetric(
                    'Lowest listing',
                    formatMinor(item.price?.lowestSellGrossMinor)
                ),
                detailMetric(
                    'Est. received',
                    formatMinor(item.price?.listingNetMinor)
                ),
                detailMetric(
                    'Highest buy',
                    formatMinor(item.price?.highestBuyGrossMinor)
                ),
                detailMetric(
                    'Recent median',
                    Number.isSafeInteger(recent?.medianMinor)
                        ? formatMinor(recent.medianMinor)
                        : 'Unavailable'
                )
            );
            panel.appendChild(element('div', {
                className: 'spt-inventory-detail-note',
                text: 'Steam Page Tools estimate · fees and final proceeds are not guaranteed.',
            }));
            if (contentTarget) {
                contentTarget.prepend(panel);
            } else {
                rootTarget.parentElement.insertBefore(
                    panel,
                    rootTarget
                );
            }
        }

        function syncSteamItems() {
            const holders = document.querySelectorAll(
                '#inventories .itemHolder'
            );
            let annotated = 0;
            let visible = 0;

            for (const holder of holders) {
                const didAnnotate = annotateHolder(holder);

                if (didAnnotate) {
                    annotated += 1;

                    if (!holder.classList.contains(
                        'spt-inventory-filter-hidden'
                    )) {
                        visible += 1;
                    }
                }
            }

            status.textContent = annotated
                ? `${visible} of ${annotated} loaded Steam tile(s) match.`
                : 'Steam will annotate item tiles as they are rendered.';
            resetFilters.disabled = !(
                search.value ||
                game.value !== 'all' ||
                marketable.value !== 'all' ||
                gems.value !== 'all' ||
                pricing.value !== 'all' ||
                minPrice.value ||
                maxPrice.value
            );
            renderItemDetail();
        }

        function setItems(items) {
            itemsByKey.clear();

            for (const item of items) {
                itemsByKey.set(makeAssetKey(item), item);
            }

            for (const key of selected) {
                if (!itemsByKey.has(key)) {
                    selected.delete(key);
                }
            }

            const previousGame = game.value;
            const gamesById = new Map();

            for (const item of items) {
                gamesById.set(item.gameAppId, item.gameName);
            }

            game.replaceChildren();
            const all = element('option', { text: 'All games' });

            all.value = 'all';
            game.appendChild(all);

            for (const [appId, name] of [...gamesById.entries()].sort(
                (left, right) => left[1].localeCompare(right[1])
            )) {
                const option = element('option', { text: name });

                option.value = appId;
                game.appendChild(option);
            }

            game.value = [...game.options].some((option) => (
                option.value === previousGame
            )) ? previousGame : 'all';
            syncSteamItems();
            notifySelection();
        }

        for (const control of [
            search,
            game,
            marketable,
            gems,
            pricing,
            minPrice,
            maxPrice,
        ]) {
            control.addEventListener('input', syncSteamItems);
            control.addEventListener('change', syncSteamItems);
        }

        resetFilters.addEventListener('click', () => {
            resetFilterControls({
                game,
                gems,
                marketable,
                maxPrice,
                minPrice,
                pricing,
                search,
            });
            syncSteamItems();
        });

        document.addEventListener('click', (event) => {
            const holder = event.target.closest(
                '#inventories .itemHolder'
            );
            const key = parseHolderKey(holder);

            if (key) {
                activeDetailKey = key;

                const item = itemsByKey.get(key);

                if (
                    selectionEnabled &&
                    item &&
                    (item.marketable || item.gem?.eligible)
                ) {
                    holder.classList.toggle(
                        'spt-inventory-tile-selected',
                        toggleSelection(selected, key)
                    );
                    notifySelection();
                }

                setTimeout(() => renderItemDetail(key), 80);
            }
        }, true);

        return Object.freeze({
            clearSelection() {
                selected.clear();
                syncSteamItems();
                notifySelection();
            },
            getSelected: currentSelection,
            root,
            setItems,
            setLoading(value) {
                loading = Boolean(value);
                syncSteamItems();
            },
            setSelectionEnabled(value) {
                selectionEnabled = Boolean(value);
                syncSteamItems();
            },
            syncSteamItems,
        });
    }

    return Object.freeze({
        createTable,
        parseHolderKey,
        resetFilterControls,
        toggleSelection,
    });
})();
