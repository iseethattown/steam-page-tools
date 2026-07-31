# Verification and Release Testing

This document records completed verification and the scenarios that remain before the 1.0.0 store submissions. Manual tests use a signed-in Steam account controlled by the tester. Account-changing actions are never approved unless a deliberate mutation test is intended.

## Verified on 2026-07-29

### Automated validation

- [x] Run the complete clean, ESLint, manifest/source/icon validation, reproducible-build comparison, rebuild, and final-validation pipeline with Node.js 24.
- [x] Confirm both browser ZIPs contain exactly the seven expected files.
- [x] Confirm the Firefox package declares `strict_min_version` as `140.0`.
- [x] Confirm the build is deterministic and the independently produced archives are byte-for-byte identical.
- [x] Scan tracked source for common credentials, private keys, absolute private paths, source maps, remote runtime code, and unexpected package entries.

### Chrome page scope

- [x] Load the unpacked extension in Chrome.
- [x] Confirm the controls initialize on an owned vanity `/id/.../badges` page.
- [x] Confirm the numeric `/profiles/.../badges` form resolves to the owned profile and initializes once.
- [x] Confirm Store controls initialize on Steam search results.
- [x] Confirm account-specific badge controls do not appear on another user's badge page.
- [x] Confirm the extension does not initialize on the Steam Community home page, a profile home page, a game-card detail page, a Steam Store app page, or a non-Steam page.

### Badge filtering

- [x] Confirm both owned-profile badge controls appear exactly once.
- [x] Scan a 24-page badge library with **Show only drops remaining** enabled and confirm the final count completes.
- [x] Disable the filter and confirm all 150 original rows return with no hidden or cloned rows remaining.

### Badge search

- [ ] Confirm the search field appears exactly once on owned and non-owned profile badge pages.
- [ ] Search by game name and badge name across a multi-page profile and confirm all matches appear in one result view.
- [ ] Confirm the native page summary and navigation are hidden while a query is active, including while results are loading.
- [ ] Clear with the input control and Escape; confirm the original rows and native pagination return exactly as rendered by Steam.
- [ ] Confirm accented text, multiple search terms, zero matches, delayed badge artwork, a failed page fetch, and the 200-page safety limit behave as documented.

### Store selection

- [x] Confirm 100 normal Store search rows receive exactly one selection control each.
- [x] Select and deselect a normal app row and confirm the bulk-action bar and count update.
- [x] Reload the page and confirm the selected app ID and name restore from Steam Store `localStorage`.
- [x] Confirm keyboard Enter and Space update the checkbox state exposed through `aria-checked`.
- [x] Clear the test selection and confirm the page returns to its unselected state.

No cart, wishlist, or badge-crafting mutation was sent during these checks.

## Outstanding before 1.0.0

### Browser coverage

- [ ] Load and smoke-test the packaged extension in Firefox 140 or later.
- [ ] Confirm Chrome and Firefox display only the intended Steam site access and no unexpected permissions.
- [ ] Confirm all packaged icons render correctly in both browsers.

### Badge edge cases and crafting

- [ ] Check an empty or single-page badge library and a transient badge-page fetch failure.
- [ ] With at least one craftable badge, inspect the complete confirmation and cancel it; confirm no craft POST is sent.
- [ ] In a deliberate minimal mutation test, verify ownership is rechecked immediately before crafting.
- [ ] Confirm live scan/craft status, request pacing, reward rescans, and the stop-after-current-request control during an intentional run.
- [ ] Confirm the cross-tab lock prevents concurrent runs and expires after its 60-second TTL.
- [ ] In a safe mock or staged setup, verify HTTP 429, network-drop, HTTP 5xx, 401/403, and login-redirect handling.
- [ ] Confirm malformed or repeating responses cannot bypass pass and batch limits.

### Store edge cases and mutations

- [ ] Confirm bundle rows and comma-separated app IDs are not selectable.
- [ ] Confirm controls added by infinite scrolling are initialized once.
- [ ] Deliberately test **Add to Cart** and verify default-package resolution, success cleanup, failure retention, and pacing.
- [ ] Confirm an invalid or unavailable purchase reports failure without a malformed mutation.
- [ ] Deliberately test the wishlist flow with one existing and one new item.
- [ ] Confirm a fresh wishlist is loaded before mutation, existing items are skipped, successful items are removed from the selection, and failed items remain.
- [ ] In a safe mock or staged setup, verify Store HTTP 429 and missing-session handling.

### Origin and packaging defense

- [ ] In a local harness, substitute off-origin profile, game-card, redirect, and mutation URLs and confirm each is rejected.
- [ ] Inspect live credentialed requests and confirm Community traffic remains on `https://steamcommunity.com`.
- [ ] Inspect live Store requests and confirm Store traffic remains on `https://store.steampowered.com`.
- [ ] Confirm at runtime that no request targets an image host, GitHub raw content, or a developer-controlled server.
