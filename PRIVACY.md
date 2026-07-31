# Privacy

> **Unofficial-project notice:** Steam Page Tools is an independent, unofficial project and is not affiliated with or endorsed by Valve Corporation. Steam and the Steam logo are trademarks of Valve Corporation.

Steam Page Tools has no telemetry, analytics, advertising, developer-operated data collection, developer-controlled server, or remote runtime code. The project developer does not receive or retain user data.

## Data read on Steam pages

On supported Steam Community badge pages, the extension may read:

- Badge rows across the viewed profile's paginated results, badge and game names used for local search, app IDs, series and foil state, available crafting controls, card-drop status, pagination, and crafting responses.
- The viewed profile URL and Steam-provided signed-in account identifiers used to decide whether the page belongs to the signed-in user.
- The Steam session identifier exposed by the page or the Steam `sessionid` cookie when the user requests an account-changing action.

On supported Steam Store search pages, the extension may read:

- Search-result app IDs, names, purchase-package data, and the user's selected rows.
- Steam-provided account ID and country code needed to request current dynamic-store wishlist data.
- The current Steam wishlist response and cart or wishlist action responses.
- The Steam session identifier exposed by the page or the Steam `sessionid` cookie when the user requests an account-changing action.

The extension does not read browsing history outside the three declared match patterns.

## Data sent to Steam

All network requests are sent over HTTPS only to the relevant Steam origin:

- Credential-bearing Steam Community requests are pinned to `https://steamcommunity.com`.
- Steam Store requests are pinned to `https://store.steampowered.com`.

Steam session identifiers and action parameters are sent only to Steam to carry out user-requested account operations. Examples include the app, badge series, foil state, level count, package ID, cart action, or wishlist app ID. Browser-managed Steam cookies may accompany same-origin requests through `credentials: "include"`.

The extension also sends the Steam account ID, country code, Steam Store origin, and a cache-busting value to Steam's dynamic-store endpoint to refresh the current wishlist before a bulk wishlist run.

No information is sent to the project developer or to any non-Steam service.

## Local storage and retention

The extension deliberately retains the existing Steam-origin storage behavior:

- `spt-search-cart-selection` stores selected Steam app IDs and display names on `store.steampowered.com` until each item succeeds or the user clears the selection.
- `dbf-search-cart-selection`, if present from an older script version, is migrated to the `spt-` key and removed when storage access permits.
- `spt-badge-auto-craft-lock` coordinates crafting tabs on `steamcommunity.com`. Its lock expires after 60 seconds and is removed when a run ends normally.
- Steam's `unUserdataVersion` value is incremented to invalidate the Store's dynamic wishlist cache.
- Steam's in-page dynamic-store wishlist object may be updated in memory after successful actions.

The extension does not use extension-owned storage.

To delete retained selection or lock data, clear site data for the applicable Steam origin in the browser. The Store selection can also be removed with the extension's clear-selection control. Uninstalling the extension does not necessarily erase Steam website `localStorage`, because that storage belongs to the Steam origin.

## Destructive operations

Badge crafting consumes trading cards and cannot be undone. Steam Page Tools asks for confirmation before crafting, but a confirmed run can craft multiple levels and can continue with badges made ready by crafting rewards.

Cart and wishlist operations change the signed-in Steam account. Failed or rate-limited items remain selected when possible so the user can review or retry them.

## Firefox data classification

The Firefox manifest conservatively declares these data types as required because the extension transmits them to Steam for its core user-requested features:

- `authenticationInfo`: the Steam session identifier authenticates account mutations.
- `personallyIdentifyingInfo`: the Steam account ID identifies the account whose wishlist is refreshed.
- `locationInfo`: Steam's country code is sent back to Steam for country-specific dynamic-store data.
- `websiteContent`: page data, cookies/session data, links, app/package data, and Steam responses are processed and some are transmitted back to Steam.
- `websiteActivity`: selected apps and requested cart, wishlist, and badge-crafting actions are sent to Steam.

`none` is not declared. No `technicalAndInteraction` permission is requested because the extension has no analytics, usage metrics, crash reporting, or developer telemetry.

The declaration describes transmission to Steam; it does not mean the project developer collects the data.

## Changes

Material privacy changes should update this document, the Firefox manifest classification, and the browser-store disclosures before release.
