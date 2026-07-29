# Changelog

All notable changes to the browser-extension edition are documented here.

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
