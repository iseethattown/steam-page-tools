# Changelog

All notable changes to the browser-extension edition are documented here.

## Unreleased

## 1.3.0 - 2026-08-27

### Added

- Inventory manager and prices

### Changed

- Reduced the normal delay between friends-page profile comments from five seconds to three seconds. Failure recovery and Steam cooldown waits are unchanged.

## 1.2.1 - 2026-08-23

### Changed

- Grouped the friends-page action buttons with consistent spacing.

## 1.2.0 - 2026-08-22

### Added

- A searchable, Steam-styled friend selector for choosing the recipients of a bulk profile comment.

### Changed

- Friends now start unselected in the bulk-comment dialog so checking one friend cannot leave hidden recipients selected accidentally.

## 1.1.0 - 2026-08-21

### Added

- A SteamSets shortcut on Steam profile pages that opens the viewed numeric account in a new tab.
- A SteamSets badge-search shortcut alongside the extension's local cross-page badge search.
- Cross-page search for owned badges by game or badge name on every Steam profile badge page, ported from userscript version 1.10.1.
- Automatic count of games with card drops remaining across all pages of the signed-in user's badge library.
- Steam-styled friends-page dialog for posting one reviewed comment to every friend profile, with confirmation, live progress, five-second pacing, disabled-profile skips, 20-second failure recovery, bounded cooldown retries, safe stopping, and cross-tab locking.

### Changed

- Renamed the repository and package slug from `steam-page-tools-extension` to `steam-page-tools`.
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

### Changed

- Set Firefox's minimum supported version to 140 so Mozilla's built-in data-transmission consent UI can cover the required data categories.

### Preserved

- Badge filtering, crafting confirmations, request pacing, rate-limit handling, uncertain-response reconciliation, reward rescans, safety limits, stop controls, and cross-tab crafting locking.
- Store selection persistence, cart package resolution, fresh wishlist checks, already-wishlisted skips, and Steam-origin `localStorage` behavior.
