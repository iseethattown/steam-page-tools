inventoryModules.safety = (() => {
    const { isSafeMinor } = inventoryModules.types;

    function validatePriceSnapshot(
        snapshot,
        now,
        maxAgeMs,
        amountField = 'lowestSellGrossMinor'
    ) {
        if (!snapshot || snapshot.status !== 'priced') {
            return 'A reliable price is unavailable';
        }

        if (!isSafeMinor(snapshot[amountField])) {
            return amountField === 'highestBuyGrossMinor'
                ? 'A current buy order is unavailable'
                : 'The listing price is missing or invalid';
        }

        if (!Number.isSafeInteger(snapshot.retrievedAt)) {
            return 'The price timestamp is invalid';
        }

        if (snapshot.retrievedAt > now || now - snapshot.retrievedAt > maxAgeMs) {
            return 'The price is stale';
        }

        return '';
    }

    function validateBatch({
        count,
        grossMinor,
        isOwnInventory,
    }) {
        const errors = [];

        if (!isOwnInventory) {
            errors.push('Write actions are restricted to your own inventory');
        }

        if (!Number.isSafeInteger(count) || count < 1) {
            errors.push('Select at least one eligible item');
        }

        if (!isSafeMinor(grossMinor)) {
            errors.push('The batch value is missing or invalid');
        }

        return errors;
    }

    return Object.freeze({
        validateBatch,
        validatePriceSnapshot,
    });
})();
