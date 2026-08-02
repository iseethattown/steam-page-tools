# Changelog

All notable changes to the browser-extension edition are documented here.

## Unreleased

### Added

- Cross-page search for owned badges by game or badge name on every Steam profile badge page, ported from userscript version 1.10.1.
- Automatic count of games with card drops remaining across all pages of the signed-in user's badge library.

### Changed

- Cross-page badge-search results are presented in one aggregated view; Steam's server-side pagination and page summary are hidden while a query is active and restored when it is cleared.
- Matching badge-search results appear progressively as each source page finishes loading instead of waiting for the complete badge index.
- Badge-search loading and result status appears directly below the search field so it cannot displace the badge action controls.
- The badge-search input uses the same compact height as the adjacent badge controls.

## 1.0.0 - 2026-07-29

### Added

- Initial Chrome and Firefox Manifest V3 edition, derived from Steam Page Tools userscript version 1.9.0.
- Shared main-world content script for the existing Steam Community badge tools and Steam Store bulk cart and wishlist tools.
- Explicit Steam-origin checks for profile, game-card, redirect, and mutation URLs.
- Browser-specific manifests, locally packaged project artwork in all required icon sizes, deterministic packaging, validation, documentation, and non-publishing CI.
- GNU General Public License version 3 or later coverage for the extension source, documentation, and bundled project artwork, with the complete license included in browser packages.

### Changed

- Set Firefox's minimum supported version to 140 so Mozilla's built-in data-transmission consent UI can cover the required data categories.

### Preserved

- Badge filtering, crafting confirmations, request pacing, rate-limit handling, uncertain-response reconciliation, reward rescans, safety limits, stop controls, and cross-tab crafting locking.
- Store selection persistence, cart package resolution, fresh wishlist checks, already-wishlisted skips, and Steam-origin `localStorage` behavior.
