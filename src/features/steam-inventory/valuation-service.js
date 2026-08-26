inventoryModules.valuationService = (() => {
    const { isSafeMinor } = inventoryModules.types;

    function emptyTotals() {
        return {
            itemCount: 0,
            marketableCount: 0,
            pricedCount: 0,
            unpricedCount: 0,
            listingGrossMinor: 0,
            listingFeesMinor: 0,
            listingNetMinor: 0,
            quickSaleGrossMinor: 0,
            quickSaleFeesMinor: 0,
            quickSaleNetMinor: 0,
            pricingCoveragePercent: 0,
        };
    }

    function addItem(totals, item) {
        const quantity = Number.isSafeInteger(item.quantity) && item.quantity > 0
            ? item.quantity
            : 1;

        totals.itemCount += quantity;

        if (!item.marketable) {
            return;
        }

        totals.marketableCount += quantity;

        const price = item.price;

        if (!price || price.status !== 'priced') {
            totals.unpricedCount += quantity;
            return;
        }

        const hasListing = isSafeMinor(price.lowestSellGrossMinor) &&
            isSafeMinor(price.listingNetMinor);
        const hasQuickSale = isSafeMinor(price.highestBuyGrossMinor) &&
            isSafeMinor(price.quickSaleNetMinor);

        if (!hasListing && !hasQuickSale) {
            totals.unpricedCount += quantity;
            return;
        }

        totals.pricedCount += quantity;

        if (hasListing) {
            totals.listingGrossMinor += price.lowestSellGrossMinor * quantity;
            totals.listingNetMinor += price.listingNetMinor * quantity;
            totals.listingFeesMinor += (
                price.lowestSellGrossMinor - price.listingNetMinor
            ) * quantity;
        }

        if (hasQuickSale) {
            totals.quickSaleGrossMinor += price.highestBuyGrossMinor * quantity;
            totals.quickSaleNetMinor += price.quickSaleNetMinor * quantity;
            totals.quickSaleFeesMinor += (
                price.highestBuyGrossMinor - price.quickSaleNetMinor
            ) * quantity;
        }
    }

    function finalize(totals) {
        totals.pricingCoveragePercent = totals.marketableCount > 0
            ? Math.floor((totals.pricedCount * 10000) / totals.marketableCount) / 100
            : 100;
        return totals;
    }

    function aggregate(items) {
        const overall = emptyTotals();
        const byInventory = new Map();
        const byGame = new Map();

        for (const item of items) {
            const inventoryKey = `${item.appId}:${item.contextId}`;

            if (!byInventory.has(inventoryKey)) {
                byInventory.set(inventoryKey, emptyTotals());
            }

            const gameKey = item.gameAppId || item.appId;

            if (!byGame.has(gameKey)) {
                byGame.set(gameKey, emptyTotals());
            }

            addItem(overall, item);
            addItem(byInventory.get(inventoryKey), item);
            addItem(byGame.get(gameKey), item);
        }

        for (const totals of byInventory.values()) {
            finalize(totals);
        }

        for (const totals of byGame.values()) {
            finalize(totals);
        }

        return {
            overall: finalize(overall),
            byGame,
            byInventory,
        };
    }

    return Object.freeze({ aggregate, emptyTotals });
})();
