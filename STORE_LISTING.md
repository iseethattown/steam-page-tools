# Browser Store Listing Draft

> **Unofficial-project notice:** Steam Page Tools is an independent, unofficial project and is not affiliated with or endorsed by Valve Corporation. Steam and the Steam logo are trademarks of Valve Corporation.

These drafts are not approved or published listings.

## Shared listing content

**Name:** Steam Page Tools

**Short summary:** Unofficial cross-page Steam badge search, filtering, safe bulk crafting, and bulk Store cart and wishlist tools.

**Full description:**

An unofficial Chrome and Firefox extension that adds cross-page badge search, badge filtering, safe bulk badge crafting, and bulk Steam Store cart and wishlist tools.

Steam Page Tools adds focused workflow controls to Steam Community badge pages and Steam Store search results.

On every Steam profile badge page, search owned badges by game or badge name across all paginated results. Matches are collected into one clear result view while Steam's unrelated server-side pagination is hidden. On your own badge pages, filter paginated results to games with card drops remaining or review and confirm a paced bulk-crafting queue. The crafting flow includes live status, reward rescans, cross-tab protection, stop controls, safety limits, and rate-limit/error handling.

On Steam Store search results, select individual games and add them to the cart or wishlist in a paced run. Wishlist actions refresh the account's current Steam wishlist first and automatically skip games already present. Bundle rows are not supported, and cart actions use Steam's first/default package.

Auto crafting consumes Steam trading cards and cannot be undone. Steam Page Tools asks for confirmation before crafting begins.

The extension runs only on the declared Steam Community badge and Steam Store search page patterns. It has no telemetry, analytics, ads, remote code, or developer-operated server.

Steam Page Tools is an independent, unofficial project and is not affiliated with or endorsed by Valve Corporation. Steam and the Steam logo are trademarks of Valve Corporation.

**Single purpose:** Improve badge management and bulk selection workflows directly on the supported Steam badge and Store search pages.

## Chrome Web Store

### Site-access rationale

The content script needs access to:

- `https://steamcommunity.com/id/*/badges*`
- `https://steamcommunity.com/profiles/*/badges*`
- `https://store.steampowered.com/search*`

This access lets the extension read and update those pages, use Steam's existing signed-in session for user-requested actions, and communicate only with the matching Steam origin. No other host or browser API permission is requested.

The script uses the Manifest V3 main execution world because the converted userscript relies on Steam page globals for signed-in profile, session, and dynamic-store state. It is statically declared and runs at `document_idle`.

### Privacy disclosure

No user data is collected by or sent to the developer. Steam page/account data is processed locally. Session identifiers, account/action parameters, and browser-managed Steam cookies are sent only to Steam over HTTPS when needed to read account state or perform a user-requested action. Steam-origin `localStorage` retains Store selections and a short-lived cross-tab crafting lock.

## Firefox Add-ons

### Required site access

Use the same three match patterns and rationale as the Chrome listing. There are no optional host permissions and no WebExtension API permissions.

### Data collection and transmission disclosure

The Firefox manifest declares the following required categories:

- Authentication information
- Personally identifying information
- Location information
- Website content
- Website activity

These categories cover the Steam session identifier, Steam account ID, country code, relevant Steam page/response data, selected apps, and user-requested mutations transmitted back to Steam. The developer receives none of this data. There is no technical/interaction analytics category and no claim of `none`.

The conservative taxonomy was rechecked against Mozilla's current definitions on 2026-07-29 as described in `RELEASING.md`. Firefox 140 or later is required so Mozilla's built-in data-transmission consent UI can cover these declared categories.

## Screenshot checklist

Capture only accounts and content safe for public display. Redact usernames, account IDs, wallet balances, personalized recommendations, session values, and unrelated browser UI.

- Own-profile badge page showing the search, filter, and auto-craft controls.
- Another profile's badge page showing only the badge search.
- Filtered badge results with the status text visible.
- Craft confirmation dialog using a non-sensitive demonstration account or staged mock; do not actually craft for the screenshot.
- Craft queue status and stop control using staged/mock content.
- Store search result checkboxes.
- Bulk action bar with cart and wishlist buttons.
- Already-wishlisted skip/result state using non-sensitive content.
- Chrome and Firefox screenshots at each store's required dimensions.
- A screenshot or listing graphic using only the supplied project artwork; do not use the official Steam logo.
