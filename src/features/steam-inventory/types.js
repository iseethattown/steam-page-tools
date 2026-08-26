inventoryModules.types = (() => {
    const PRICE_STATUS = Object.freeze({
        idle: 'idle',
        loading: 'loading',
        priced: 'priced',
        stale: 'stale',
        unpriced: 'unpriced',
        error: 'error',
    });
    const ACTION_STATUS = Object.freeze({
        pending: 'pending',
        submitted: 'submitted',
        confirmed: 'confirmed',
        skipped: 'skipped',
        uncertain: 'uncertain',
        failed: 'failed',
    });
    const CURRENCY_CODES = Object.freeze({
        1: 'USD',
        2: 'GBP',
        3: 'EUR',
        4: 'CHF',
        5: 'RUB',
        6: 'PLN',
        7: 'BRL',
        8: 'JPY',
        9: 'NOK',
        10: 'IDR',
        11: 'MYR',
        12: 'PHP',
        13: 'SGD',
        14: 'THB',
        15: 'VND',
        16: 'KRW',
        17: 'TRY',
        18: 'UAH',
        19: 'MXN',
        20: 'CAD',
        21: 'AUD',
        22: 'NZD',
        23: 'CNY',
        24: 'INR',
        25: 'CLP',
        26: 'PEN',
        27: 'COP',
        28: 'ZAR',
        29: 'HKD',
        30: 'TWD',
        31: 'SAR',
        32: 'AED',
        33: 'SEK',
        34: 'ARS',
        35: 'ILS',
        36: 'BYN',
        37: 'KZT',
        38: 'KWD',
        39: 'QAR',
        40: 'CRC',
        41: 'UYU',
        42: 'BGN',
        43: 'HRK',
        44: 'CZK',
        45: 'DKK',
        46: 'HUF',
        47: 'RON',
    });
    // Steam's market API always transports prices in hundredths, including
    // currencies whose storefront UI normally displays whole units. This set
    // mirrors Steam's current bWholeUnitsOnly display flag (except RUB, which
    // Steam's own IsCurrencyWholeUnits helper explicitly excludes).
    const WHOLE_UNIT_CURRENCIES = new Set([
        'CLP',
        'COP',
        'CRC',
        'IDR',
        'INR',
        'JPY',
        'KZT',
        'KRW',
        'TWD',
        'UAH',
        'UYU',
        'VND',
    ]);

    function isSafeMinor(value, { allowZero = false } = {}) {
        return Number.isSafeInteger(value) && (
            allowZero ? value >= 0 : value > 0
        );
    }

    function requireSafeMinor(value, label, options) {
        if (!isSafeMinor(value, options)) {
            throw new TypeError(`${label} must be a safe integer minor amount`);
        }

        return value;
    }

    function parsePositiveInteger(value, fallback = 0) {
        const parsed = Number.parseInt(String(value ?? ''), 10);

        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    }

    function parseDecimalToBasisPoints(value, fallback) {
        const match = String(value ?? '').trim().match(/^(\d+)(?:\.(\d+))?$/);

        if (!match) {
            return fallback;
        }

        const whole = Number.parseInt(match[1], 10);
        const fraction = `${match[2] || ''}0000`.slice(0, 4);
        const result = (whole * 10000) + Number.parseInt(fraction, 10);

        return Number.isSafeInteger(result) ? result : fallback;
    }

    function getCurrencyCode(currencyId, explicitCode = '') {
        const normalized = String(explicitCode || '').trim().toUpperCase();

        if (/^[A-Z]{3}$/.test(normalized)) {
            return normalized;
        }

        return CURRENCY_CODES[Number(currencyId)] || '';
    }

    function getCurrencyDigits() {
        return 2;
    }

    function isWholeUnitCurrency(code) {
        return WHOLE_UNIT_CURRENCIES.has(
            String(code || '').trim().toUpperCase()
        );
    }

    function formatMinor(value, currencyCode, locale) {
        if (!Number.isSafeInteger(value)) {
            return 'Unpriced';
        }

        const digits = getCurrencyDigits(currencyCode);
        const displayDigits = isWholeUnitCurrency(currencyCode) &&
            value % 100 === 0 ? 0 : digits;

        try {
            return new Intl.NumberFormat(locale || undefined, {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: displayDigits,
                maximumFractionDigits: displayDigits,
            }).format(value / (10 ** digits));
        } catch {
            return `${value} ${currencyCode || 'minor units'}`;
        }
    }

    function minorToInput(value, currencyCode) {
        if (!Number.isSafeInteger(value) || value < 0) {
            return '';
        }

        const digits = getCurrencyDigits(currencyCode);

        if (digits === 0) {
            return String(value);
        }

        const text = String(value).padStart(digits + 1, '0');

        return `${text.slice(0, -digits)}.${text.slice(-digits)}`;
    }

    function inputToMinor(value, currencyCode) {
        const digits = getCurrencyDigits(currencyCode);
        const normalized = String(value || '').trim().replace(',', '.');
        const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);

        if (!match) {
            return null;
        }

        const fraction = match[2] || '';

        if (fraction.length > digits) {
            return null;
        }

        const scale = 10n ** BigInt(digits);
        const minor = (BigInt(match[1]) * scale) + BigInt(
            `${fraction}${'0'.repeat(digits)}`.slice(0, digits) || '0'
        );

        return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
    }

    function makeAssetKey({ appId, contextId, assetId }) {
        return `${appId}:${contextId}:${assetId}`;
    }

    function makeMarketKey({ appId, marketHashName }, currencyId, country) {
        return [
            appId,
            marketHashName,
            currencyId,
            String(country || '').toUpperCase(),
        ].join('\u001f');
    }

    return Object.freeze({
        ACTION_STATUS,
        PRICE_STATUS,
        formatMinor,
        getCurrencyCode,
        getCurrencyDigits,
        isSafeMinor,
        isWholeUnitCurrency,
        inputToMinor,
        makeAssetKey,
        makeMarketKey,
        minorToInput,
        parseDecimalToBasisPoints,
        parsePositiveInteger,
        requireSafeMinor,
    });
})();
