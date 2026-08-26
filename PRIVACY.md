# Privacy

> **Unofficial-project notice:** Steam Page Tools is an independent, unofficial project and is not affiliated with or endorsed by Valve Corporation. Steam and the Steam logo are trademarks of Valve Corporation.

Steam Page Tools has no telemetry, analytics, advertising, developer-operated data collection, developer-controlled server, or remote runtime code. The project developer does not receive or retain user data.

## Data read on Steam pages

On supported Steam Community profile and badge pages, the extension may read:

- The viewed profile's numeric Steam account ID used to construct a user-activated SteamSets profile link.
- Badge rows across the viewed profile's paginated results, badge and game names used for local search, app IDs, series and foil state, available crafting controls, card-drop status, pagination, and crafting responses.
- The viewed profile URL and Steam-provided signed-in account identifiers used to decide whether the page belongs to the signed-in user.
- The Steam session identifier exposed by the page or the Steam `sessionid` cookie when the user requests an account-changing action.

On the signed-in user's supported Steam Community friends page, the extension may read:

- Friend Steam IDs and display names rendered in the friends list so it can build the user-requested recipient queue and show progress.
- The profile comment entered in the extension dialog. The comment is kept only in that page's memory for the active dialog and run.
- Steam comment responses, including success, privacy-setting, cooldown, authentication, and network errors.
- The Steam session identifier exposed by the page or the `sessionid` cookie when the user starts a comment run.

On supported Steam Community inventory pages, the extension may read:

- Inventory owner, app, context, asset, class, and instance IDs; item names and market hash names; stack quantities; game and item types; icons; and Steam-provided tradable, marketable, and Gems-conversion metadata.
- Current Steam Community Market listing and buy-order data, recent price history, wallet currency and country, fee configuration exposed by Steam, and the time each result was retrieved.
- The signed-in account ID and viewed inventory owner used to keep account-changing controls limited to the user's own inventory.
- Current inventory state and a fresh market price or Gems quote immediately before a confirmed action, and inventory state after an ambiguous response.
- The Steam session identifier exposed by the page only when the user explicitly confirms a live sale or Gems conversion.

On supported Steam Store search pages, the extension may read:

- Search-result app IDs, names, purchase-package data, and the user's selected rows.
- Steam-provided account ID and country code needed to request current dynamic-store wishlist data.
- The current Steam wishlist response and cart or wishlist action responses.
- The Steam session identifier exposed by the page or the Steam `sessionid` cookie when the user requests an account-changing action.

The extension does not read browsing history outside its declared Steam match patterns.

## Data sent to Steam

All credential-bearing and programmatic requests are sent over HTTPS only to the relevant Steam origin:

- Credential-bearing Steam Community requests are pinned to `https://steamcommunity.com`.
- Steam Store requests are pinned to `https://store.steampowered.com`.

Inventory item icons may be loaded from Steam's official `community.fastly.steamstatic.com` image host with a no-referrer policy. No inventory identifiers or authentication material are added to those image URLs.

Steam session identifiers and action parameters are sent only to Steam to carry out user-requested account operations. Examples include a profile comment and recipient Steam ID; an inventory app, context, asset, quantity, reviewed seller proceeds, or expected Gems value; or an app, badge series, foil state, level count, package ID, cart action, or wishlist app ID. Browser-managed Steam cookies may accompany same-origin requests through `credentials: "include"`.

Inventory, pricing, order-book, price-history, and Gems-quote requests are also sent only to Steam Community.

The extension also sends the Steam account ID, country code, Steam Store origin, and a cache-busting value to Steam's dynamic-store endpoint to refresh the current wishlist before a bulk wishlist run.

No information is sent automatically to the project developer or to any non-Steam service. If the user activates a SteamSets shortcut, the browser opens SteamSets in a new tab. The profile shortcut includes the viewed numeric Steam account ID in the destination URL; both SteamSets shortcuts use a no-referrer policy.

## Local storage and retention

The toolbar settings popup stores one extension-owned record, `spt-feature-settings-v1`, containing only boolean on/off preferences for the master switch and five feature areas. These settings are never transmitted to Steam or the project developer.

The extension deliberately retains the existing Steam-origin storage behavior:

- `spt-search-cart-selection` stores selected Steam app IDs and display names on `store.steampowered.com` until each item succeeds or the user clears the selection.
- `dbf-search-cart-selection`, if present from an older script version, is migrated to the `spt-` key and removed when storage access permits.
- `spt-badge-auto-craft-lock` coordinates crafting tabs on `steamcommunity.com`. Its lock expires after 60 seconds and is removed when a run ends normally.
- `spt-friends-comment-lock` coordinates friends-comment runs across `steamcommunity.com` tabs. It contains only a random run owner and timestamp, expires after 30 seconds, and is removed when a run ends normally.
- `spt-inventory-price-cache-v1` stores Steam Market results and retrieval times for up to 15 minutes. Entries are separated by Steam currency, country, app, and market hash name.
- `spt-inventory-settings-v1` may contain legacy inventory preferences from an earlier extension build. Current builds ignore its former action-mode, dry-run, batch-limit, and typed-confirmation fields.
- Steam's `unUserdataVersion` value is incremented to invalidate the Store's dynamic wishlist cache.
- Steam's in-page dynamic-store wishlist object may be updated in memory after successful actions.

Submitted or uncertain operation identifiers, in-progress selections, and Gems quotes stay only in the current page's memory. Selection is disabled if the signed-in Steam account changes.

To delete feature preferences, clear this extension's stored data or uninstall it. To delete retained selection or lock data, clear site data for the applicable Steam origin in the browser. The Store selection can also be removed with the extension's clear-selection control. Uninstalling the extension does not necessarily erase Steam website `localStorage`, because that storage belongs to the Steam origin.

## Destructive operations

Badge crafting consumes trading cards and cannot be undone. Steam Page Tools asks for confirmation before crafting, but a confirmed run can craft multiple levels and can continue with badges made ready by crafting rewards.

Friends-page comment runs publish the user's entered text to other Steam profiles. Steam Page Tools asks for confirmation, paces requests, and provides a stop control, but comments posted before a stop remain visible until they are removed through Steam.

Cart and wishlist operations change the signed-in Steam account. Failed or rate-limited items remain selected when possible so the user can review or retry them.

Inventory sales and Gems conversions can remove, list, or consume items and may be irreversible. Management controls appear only for the signed-in user's own inventory and require explicit item selection, a review screen, one confirmation per batch, and sequential revalidation. A mutation is never automatically retried after a network, timeout, or server ambiguity; the extension reconciles inventory where possible and requires manual Steam verification.

## Firefox data classification

The Firefox manifest conservatively declares these data types as required because the extension transmits them to Steam for its core user-requested features:

- `authenticationInfo`: the Steam session identifier authenticates account mutations.
- `personallyIdentifyingInfo`: the Steam account ID identifies the account whose wishlist is refreshed.
- `locationInfo`: Steam's country code is sent back to Steam for country-specific dynamic-store data.
- `websiteContent`: page data, cookies/session data, links, app/package data, and Steam responses are processed and some are transmitted back to Steam.
- `websiteActivity`: selected apps or inventory items and requested cart, wishlist, badge-crafting, profile-comment, market-listing, and Gems-conversion actions are sent to Steam.

`none` is not declared. No `technicalAndInteraction` permission is requested because the extension has no analytics, usage metrics, crash reporting, or developer telemetry.

The declaration describes transmission to Steam; it does not mean the project developer collects the data.

## Changes

Material privacy changes should update this document, the Firefox manifest classification, and the browser-store disclosures before release.
