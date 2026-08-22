# Steam Page Tools

<p align="center">
  <img src="assets/icon-source.png" width="160" alt="Steam Page Tools icon">
</p>

Steam Page Tools is an unofficial browser extension for Chrome and Firefox that adds cross-page badge tools, paced friends-page comments, and bulk Store actions directly to Steam.

It is designed for people who manage large badge libraries, compare card-drop status across many pages, or want to select several Store results before adding them to a cart or wishlist.

> **Unofficial project:** Steam Page Tools is independent and is not affiliated with or endorsed by Valve Corporation. Steam and the Steam logo are trademarks of Valve Corporation.

## Features

### Badge pages

On every Steam Community profile badge page:

- Search owned badges by game or badge name across every paginated result. Matching badges appear progressively as each source page is scanned, and Steam's original pagination is hidden until the search is cleared.
- Open the SteamSets badge-search page in a new tab from the badge toolbar.

On the signed-in user's own badge pages:

- Count games with card drops remaining across every paginated badge result.
- Show only games with card drops remaining across paginated badge results.
- Auto-craft complete card sets across your badge pages, with confirmation, live progress, request pacing, rate-limit handling, cross-tab protection, safety limits, and a stop-after-current-request control.

> [!WARNING]
> Auto-crafting consumes cards and cannot be undone. The extension asks for confirmation before crafting begins.

<img src="https://i.ibb.co/fdgkZdkp/image.png" alt="Steam badge">

### Friends page

On the signed-in user's friends page:

- Open a Steam-styled dialog, search the friends list, and explicitly choose which profiles should receive the reviewed comment; no recipient is selected by default.
- Follow live posted, skipped, and failed counts, progress, and the current profile.
- Wait five seconds between comments, skip profiles that do not allow comments, wait 20 seconds after other failures before continuing, and retry bounded cooldown responses after a randomized 10-to-15-second delay (or Steam's longer `Retry-After` value).
- Stop safely after the current request and prevent duplicate runs across Steam tabs.

The extension asks for confirmation before a run begins. Comments already posted remain on the recipient profiles if a run is stopped.

<img src="https://i.ibb.co/fYfRQKbq/Capture-d-cran-2026-08-22-231750.png" alt="Button">

<img src="https://i.ibb.co/j9jYqjPq/Capture-d-cran-2026-08-22-231800.png" width="500" alt="Friends selector">

### Steam Store search results

- Select games directly from the search results.<>
- Add selected games to the cart in one run.
- Add selected games to the wishlist after refreshing the account's current wishlist; games already on it are skipped automatically.

Bundle rows are not supported. When a game has multiple purchase options, the cart action uses Steam's first/default package.

<img src="https://i.ibb.co/wFfwYrVW/Screenshot-2026-07-26-012816.png" alt="Selection checkboxes on Steam search results">

<img src="https://i.ibb.co/yc324R1q/image.png" alt="Bulk cart and wishlist action bar">

## Where it runs

The extension is limited to these Steam page patterns:

```text
https://steamcommunity.com/my/friends*
https://steamcommunity.com/id/*
https://steamcommunity.com/profiles/*
https://store.steampowered.com/search*
```

It does not request access to every website, WebExtension API permissions, a toolbar action, a background process, or a service worker.

| Browser | Minimum version |
| --- | ---: |
| Chrome | 111 |
| Firefox | 140 |

Firefox 140 or later is required so Firefox can display its built-in consent UI for the data categories declared by the extension.

## Privacy

Steam Page Tools has:

- no telemetry or usage analytics;
- no advertising;
- no remote JavaScript;
- no developer-operated server; and
- no developer collection or retention of Steam account data.

The extension processes relevant Steam page and account state locally. Session identifiers and action parameters are transmitted only to Steam when needed for a user-requested operation. Store selections and the short-lived crafting and friends-comment locks use storage owned by the corresponding Steam origin.

See [PRIVACY.md](PRIVACY.md) for the complete disclosure.

## Source and development

The Chrome and Firefox packages are built from the same readable source file. The build uses Node.js built-ins for staging and ZIP creation and does not download or generate runtime code.

For contributors:

```text
npm ci --ignore-scripts
npm run check
```

Node.js 24 or later is required. `npm run check` lints the source, validates manifests and packaged contents, builds both browser archives twice, compares them byte-for-byte, and performs a final validation pass.

Generated `dist/` content and installed dependencies are intentionally not committed.

Additional project documentation:

- [CHANGELOG.md](CHANGELOG.md) — version history
- [PRIVACY.md](PRIVACY.md) — data handling and retention