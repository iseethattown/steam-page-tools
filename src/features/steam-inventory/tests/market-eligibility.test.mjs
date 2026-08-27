import assert from 'node:assert/strict';
import test from 'node:test';

import { loadModules, plain } from './helpers.mjs';

const modules = await loadModules(['market-eligibility.js']);

test('uses Steam own Market eligibility flag', () => {
    assert.deepEqual(
        plain(modules.marketEligibility.readPageEligibility({
            g_bMarketAllowed: true,
        }, 1000)),
        { allowed: true, checkedAt: 1000 }
    );
    assert.deepEqual(
        plain(modules.marketEligibility.readPageEligibility({}, 1000)),
        { allowed: null, checkedAt: 1000 }
    );
});

test('reports a Steam Guard restriction and its supplied end time', () => {
    const now = Date.UTC(2026, 7, 27, 12);
    const result = plain(modules.marketEligibility.readPageEligibility({
        g_bMarketAllowed: false,
        g_strMarketNotAllowedReason:
            '<b>Steam Guard authenticator transfer restriction.</b>',
        g_unMarketRestrictionEndTime: (now + 2 * 86400000) / 1000,
    }, now));

    assert.equal(result.allowed, false);
    assert.equal(result.category, 'steam_guard');
    assert.equal(
        result.reason,
        'Steam Guard authenticator transfer restriction.'
    );
    assert.equal(result.endsAt, now + 2 * 86400000);
    assert.equal(
        modules.marketEligibility.formatRemaining(result.endsAt, now),
        '2 days'
    );
});

test('does not invent a reason or duration Steam did not supply', () => {
    const result = plain(modules.marketEligibility.readPageEligibility({
        g_bMarketAllowed: false,
    }, 1000));

    assert.equal(result.allowed, false);
    assert.equal(result.category, 'other');
    assert.equal(result.reason, '');
    assert.equal(result.endsAt, null);
    assert.equal(modules.marketEligibility.formatRemaining(null, 1000), '');
});

test('parses Steam Market restriction copy and an exact end date', () => {
    const now = Date.UTC(2026, 7, 27, 12);
    const html = `
        <script>var g_bMarketAllowed = false;</script>
        <div class="market_banned_notice">
            The Market is unavailable for the following reason(s):
            After transferring the Steam Guard Mobile Authenticator, access is
            restricted. If nothing further occurs, you'll be able to use the
            Community Market on August 29, 2026 12:00 PM GMT.
        </div>
        <div>Search for Items</div>
    `;
    const result = plain(
        modules.marketEligibility.parseMarketEligibilityHtml(html, now)
    );

    assert.equal(result.allowed, false);
    assert.equal(result.category, 'steam_guard');
    assert.match(result.reason, /August 29, 2026/);
    assert.equal(result.endsAt, Date.UTC(2026, 7, 29, 12));
    assert.equal(
        modules.marketEligibility.formatRemaining(result.endsAt, now),
        '2 days'
    );
});

test('treats an unrestricted Steam Market page as allowed', () => {
    const result = plain(
        modules.marketEligibility.parseMarketEligibilityHtml(
            '<script>var g_bMarketAllowed = true;</script><div>Market</div>',
            1000
        )
    );

    assert.deepEqual(result, { allowed: true, checkedAt: 1000 });
});

test('parses Steam numeric restriction dates in the account locale', () => {
    const now = new Date(2026, 7, 27, 20, 25, 40).getTime();
    const html = `
        <div class="market_banned_notice">
            The Market is unavailable. You'll be able to use the Community
            Market on 29/08/2026, 20:25:40.
        </div>
    `;
    const result = plain(
        modules.marketEligibility.parseMarketEligibilityHtml(html, now)
    );

    assert.equal(
        result.endsAt,
        new Date(2026, 7, 29, 20, 25, 40).getTime()
    );
    assert.equal(
        modules.marketEligibility.formatRemaining(result.endsAt, now),
        '2 days'
    );
});

test('reads Steam own Mobile Authenticator Market hold notice', () => {
    const result = plain(modules.marketEligibility.readPageHold({
        querySelector(selector) {
            assert.equal(
                selector,
                '#market_sell_dialog_item_availability_hint'
            );
            return {
                textContent: `
                    Market listing will be held for: 2 days
                    You have recently transferred the Mobile Authenticator to
                    a new device.
                `,
            };
        },
    }));

    assert.equal(result.active, true);
    assert.equal(result.category, 'steam_guard');
    assert.equal(result.durationText, '2 days');
    assert.match(result.reason, /transferred the Mobile Authenticator/i);
});

test('does not report a Market hold without Steam hold copy', () => {
    assert.equal(modules.marketEligibility.readPageHold({
        querySelector: () => ({ textContent: 'No hold' }),
    }), null);
});
