inventoryModules.inventorySummary = (() => {
    const { element } = inventoryModules.uiDom;

    function createMetric(label) {
        const root = element('div', { className: 'spt-inventory-metric' });
        const name = element('span', {
            className: 'spt-inventory-metric-label',
            text: label,
        });
        const value = element('strong', {
            className: 'spt-inventory-metric-value',
            text: '—',
        });
        const detail = element('span', {
            className: 'spt-inventory-metric-detail',
        });

        root.append(name, value, detail);
        return { detail, root, value };
    }

    function createSummary(formatMinor, currencyCode) {
        const root = element('section', {
            className: 'spt-inventory-summary',
            attributes: { 'aria-label': 'Inventory valuation summary' },
        });
        const currency = currencyCode ? ` · ${currencyCode}` : '';
        const listing = createMetric(`Total listing${currency}`);
        const quick = createMetric('Quick sale');
        const active = createMetric('Current tab');
        const coverage = createMetric('Coverage');

        root.append(
            listing.root,
            quick.root,
            active.root,
            coverage.root
        );

        function render({ overall, active: activeTotals, activeLabel, approximate }) {
            listing.value.textContent = formatMinor(overall.listingGrossMinor);
            listing.detail.textContent =
                `${formatMinor(overall.listingNetMinor)} net`;
            quick.value.textContent = formatMinor(overall.quickSaleGrossMinor);
            quick.detail.textContent =
                `${formatMinor(overall.quickSaleNetMinor)} net`;
            active.value.textContent = formatMinor(
                activeTotals.listingGrossMinor
            );
            active.detail.textContent = activeLabel || 'Current inventory';
            coverage.value.textContent =
                `${overall.pricedCount}/${overall.marketableCount}`;
            coverage.detail.textContent =
                `${overall.pricingCoveragePercent}% priced`;
            root.classList.toggle('approximate', Boolean(approximate));
            root.title = approximate
                ? 'Fee estimates are approximate because Steam did not expose complete wallet fee settings.'
                : (
                    `${overall.itemCount} items · ` +
                    `${formatMinor(overall.listingFeesMinor)} listing fees · ` +
                    `${formatMinor(overall.quickSaleFeesMinor)} quick-sale fees`
                );
        }

        return Object.freeze({ render, root });
    }

    return Object.freeze({ createSummary });
})();
