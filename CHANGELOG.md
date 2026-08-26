# Changelog

All notable changes to the browser-extension edition are documented here.

## Unreleased

### Added

- A Steam-styled toolbar settings popup with a master switch and separate default-enabled toggles for the SteamSets profile link, badge tools, friends comments, inventory tools, and Store bulk actions.
- A compact read-only Steam inventory valuation strip with paginated loading, normalized stack-aware items, prices attached to Steam's native item tiles and details pane, listing and quick-sale estimates, fee and seller-net calculations, recent price history, pricing coverage, per-game totals, collapsed filters and selection tools, a bounded request queue, and a currency-aware local price cache.
- Direct bulk listing and Gems-conversion workflows for the signed-in user's own inventory, using click-to-toggle selections with a blue overlay and checkmark on Steam's native item tiles, a review screen, one batch confirmation, immediate revalidation, sequential requests, stop controls, and uncertain-result reconciliation without automatic mutation retries.
- Inventory action selections are cleared when switching Steam inventory game or context tabs so hidden items cannot remain selected accidentally.
- Inventory and Market loading status now includes a visible Steam-blue spinner.
- Marketable item badges show `Loading…` instead of `Unpriced` until their current Market lookup finishes.
- A reviewed `Quick sell` action targets refreshed highest buy orders, excludes items without an order, locks quantity and price, and skips submission if an order changes.
- `Quick sell` remains reviewable when selected items have no active buyers, so Steam's unavailable-order reason is visible instead of leaving an unexplained disabled button.
- Sale and quick-sale preparation now opens a compact loading window with live Market-price refresh progress and a cancel control before the review appears.
- The inventory header and overall listing metric now explicitly identify the total inventory value, and the valuation clock has been removed.
- Gems quotes now parse Steam's current five-argument `GetGooValue` action correctly while retaining compatibility with older three-argument inventory payloads.
- Inventory tiles can be selected only while `Show tools` is open; hiding the tools clears the batch, and the current item’s Market estimate stays above Steam’s visible details panel.
- Gems reviews and conversions now use Steam’s profile-scoped, asset-specific quote and conversion endpoints, and successful responses containing Steam’s confirmation HTML are recognized correctly.
- Confirmed inventory sales and Gems conversions are shown in Steam green instead of the error color.
- Inventory valuation now waits for Steam’s native initial inventory request, yields whenever Steam starts another native inventory request, and no longer launches a full valuation refresh from generic DOM mutations.
- Each discovered or cached Market price now appears immediately on matching Steam item tiles and in valuation totals while the remaining lookups continue.
- Grouped Steam Market items now use their exact variant filters, preventing another exterior or quality (such as Factory New) from being shown for the selected item and from affecting Quick sell.
- Inventory filters now include a Steam-styled reset button that clears the search, dropdown, and price-range filters without changing the selected-item batch.
- Inventory Market prices use the signed-in account's wallet currency across all 47 Steam currency IDs, including correct hundredths conversion and whole-unit display for currencies such as JPY, KRW, and VND.
- Unit and fixture tests for pagination, normalization, price parsing, integer fee calculations, cache behavior, cancellation and retry limits, selection requirements, duplicate blocking, action revalidation, and ambiguous outcomes.
- Inventory-specific architecture notes and a manual test checklist.

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
