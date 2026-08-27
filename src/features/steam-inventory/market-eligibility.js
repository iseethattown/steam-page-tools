inventoryModules.marketEligibility = (() => {
    const SUPPORT_URL =
        'https://help.steampowered.com/en/faqs/view/451E-96B3-D194-50FC';
    const REASON_KEYS = [
        'g_strMarketNotAllowedReason',
        'g_strMarketRestrictionReason',
        'g_strMarketRestrictionMessage',
    ];
    const END_TIME_KEYS = [
        'g_nMarketRestrictionEndTime',
        'g_rtMarketRestrictionEndTime',
        'g_timeMarketRestrictionEnd',
        'g_unMarketRestrictionEndTime',
        'g_nMarketRestrictionExpiration',
        'g_unMarketRestrictionExpiration',
    ];

    function readableText(value) {
        return String(value || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    function timestampMs(value) {
        if (value instanceof Date) {
            return Number.isFinite(value.getTime()) ? value.getTime() : null;
        }

        const numeric = Number(value);

        if (Number.isFinite(numeric) && numeric > 0) {
            return numeric < 100000000000 ? numeric * 1000 : numeric;
        }

        if (typeof value === 'string' && value.trim()) {
            const parsed = Date.parse(value);

            return Number.isFinite(parsed) ? parsed : null;
        }

        return null;
    }

    function dataProperties(source) {
        try {
            return Object.getOwnPropertyDescriptors(source || {});
        } catch {
            return {};
        }
    }

    function firstDataValue(descriptors, keys) {
        for (const key of keys) {
            const descriptor = descriptors[key];

            if (descriptor && 'value' in descriptor) {
                return descriptor.value;
            }
        }

        return undefined;
    }

    function matchingDataValue(descriptors, pattern, predicate) {
        for (const [key, descriptor] of Object.entries(descriptors)) {
            if (
                pattern.test(key) &&
                descriptor &&
                'value' in descriptor &&
                predicate(descriptor.value)
            ) {
                return descriptor.value;
            }
        }

        return undefined;
    }

    function classifyReason(reason) {
        if (/steam\s*guard|mobile\s+authenticator|authenticator/i.test(reason)) {
            return 'steam_guard';
        }

        if (/password/i.test(reason)) {
            return 'password';
        }

        if (/payment|credit\s*card|paypal/i.test(reason)) {
            return 'payment';
        }

        return 'other';
    }

    function numericDateMs(text, nowMs) {
        const match = text.match(
            /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i
        );

        if (!match) {
            return null;
        }

        const first = Number(match[1]);
        const second = Number(match[2]);
        const year = Number(match[3]);
        let hour = Number(match[4]);
        const minute = Number(match[5]);
        const secondValue = Number(match[6] || 0);
        const period = String(match[7] || '').toUpperCase();

        if (period === 'PM' && hour < 12) {
            hour += 12;
        } else if (period === 'AM' && hour === 12) {
            hour = 0;
        }

        const candidates = [];

        for (const [day, month] of [
            [first, second],
            [second, first],
        ]) {
            const date = new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                secondValue
            );

            if (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day
            ) {
                candidates.push(date.getTime());
            }
        }

        const future = candidates
            .filter((value) => value >= nowMs)
            .sort((left, right) => left - right);

        if (future.length === 1) {
            return future[0];
        }

        return candidates.length === 1 ? candidates[0] : null;
    }

    function restrictionEndFromText(text, nowMs) {
        const timestampMatch = text.match(
            /market.{0,80}(?:end|expir|until)[^\d]{0,30}(\d{10,13})/i
        );

        if (timestampMatch) {
            return timestampMs(timestampMatch[1]);
        }

        const dateMatch = text.match(
            /(?:able to use (?:the )?(?:community )?market|market access)[^\n.]{0,50}(?:on|after)\s+([^\n]{4,100})/i
        );

        if (!dateMatch) {
            return null;
        }

        const candidates = [
            dateMatch[1],
            dateMatch[1].replace(/\.$/, ''),
        ];

        for (const candidate of candidates) {
            const value = numericDateMs(candidate, nowMs) ??
                timestampMs(candidate);

            if (value !== null) {
                return value;
            }
        }

        return null;
    }

    function parseMarketEligibilityHtml(html, nowMs = Date.now()) {
        const source = String(html || '');
        const visibleSource = source
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
        const text = readableText(visibleSource);
        const flagMatch = source.match(
            /\bg_bMarketAllowed\s*=\s*(true|false)\b/i
        );
        const restrictionStart = text.search(
            /(?:the\s+)?(?:community\s+)?market is (?:currently )?unavailable|not (?:currently )?(?:allowed|eligible) to (?:use|access).{0,30}(?:community )?market/i
        );

        if (restrictionStart < 0 && flagMatch?.[1].toLowerCase() !== 'false') {
            return Object.freeze({
                allowed: flagMatch ? true : null,
                checkedAt: nowMs,
            });
        }

        const reason = restrictionStart >= 0
            ? text.slice(restrictionStart, restrictionStart + 1200)
                .split(/(?:Search for Items|Popular Items|Read the Community Market FAQ)/i)[0]
                .trim()
            : '';

        return Object.freeze({
            allowed: false,
            category: classifyReason(reason),
            checkedAt: nowMs,
            endsAt: restrictionEndFromText(reason || source, nowMs),
            reason,
        });
    }

    function readPageEligibility(source, nowMs = Date.now()) {
        const descriptors = dataProperties(source);
        const allowed = firstDataValue(descriptors, ['g_bMarketAllowed']);

        if (allowed !== false) {
            return Object.freeze({
                allowed: allowed === true ? true : null,
                checkedAt: nowMs,
            });
        }

        const reasonValue = firstDataValue(descriptors, REASON_KEYS) ??
            matchingDataValue(
                descriptors,
                /^g_.*market.*(?:reason|message|restriction)/i,
                (value) => typeof value === 'string' && value.trim()
            );
        const endValue = firstDataValue(descriptors, END_TIME_KEYS) ??
            matchingDataValue(
                descriptors,
                /^g_.*market.*(?:end|expir|until)/i,
                (value) => timestampMs(value) !== null
            );
        const reason = readableText(reasonValue);
        const endsAt = timestampMs(endValue);

        return Object.freeze({
            allowed: false,
            category: classifyReason(reason),
            checkedAt: nowMs,
            endsAt,
            reason,
        });
    }

    function readPageHold(root) {
        const noticeElement = root?.querySelector?.(
            '#market_sell_dialog_item_availability_hint'
        );
        const rawText = String(noticeElement?.textContent || '');
        const durationMatch = rawText.match(
            /Market listing will be held for:\s*([^\r\n<]+)/i
        );

        if (!durationMatch) {
            return null;
        }

        const notice = readableText(rawText);
        const reasonMatch = notice.match(
            /(?:You|Your|Steam)[^.]*?(?:Steam Guard|Authenticator|password)[^.]*\.?/i
        );

        return Object.freeze({
            active: true,
            category: classifyReason(notice),
            durationText: readableText(durationMatch[1]),
            notice,
            reason: readableText(reasonMatch?.[0]),
        });
    }

    function formatRemaining(endsAt, nowMs = Date.now()) {
        if (!Number.isFinite(endsAt) || endsAt <= nowMs) {
            return '';
        }

        const totalMinutes = Math.max(
            1,
            Math.ceil((endsAt - nowMs) / 60000)
        );
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];

        if (days) {
            parts.push(`${days} day${days === 1 ? '' : 's'}`);
        }

        if (hours) {
            parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        }

        if (!days && minutes) {
            parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
        }

        return parts.slice(0, 2).join(' ');
    }

    return Object.freeze({
        SUPPORT_URL,
        formatRemaining,
        parseMarketEligibilityHtml,
        readPageEligibility,
        readPageHold,
    });
})();
