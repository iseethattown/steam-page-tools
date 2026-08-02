# Steam Page Tools

<p align="center">
  <img src="assets/icon-source.png" width="160" alt="Steam Page Tools icon">
</p>

Steam Page Tools is an unofficial browser extension for Chrome and Firefox that adds cross-page badge search, focused badge-management, and bulk Store actions directly to Steam.

It is designed for people who manage large badge libraries, compare card-drop status across many pages, or want to select several Store results before adding them to a cart or wishlist.

> **Project status:** Version 1.0.0 is being prepared for its first Chrome Web Store and Firefox Add-ons submissions. Official store links will be added here after publication.

> **Unofficial project:** Steam Page Tools is independent and is not affiliated with or endorsed by Valve Corporation. Steam and the Steam logo are trademarks of Valve Corporation.

## Features

### Badge pages

On every Steam Community profile badge page:

- Search owned badges by game or badge name across every paginated result. Matching badges appear progressively as each source page is scanned, and Steam's original pagination is hidden until the search is cleared.

On the signed-in user's own badge pages:

- Count games with card drops remaining across every paginated badge result.
- Show only games with card drops remaining across paginated badge results.
- Auto-craft complete card sets across your badge pages, with confirmation, live progress, request pacing, rate-limit handling, cross-tab protection, safety limits, and a stop-after-current-request control.

> [!WARNING]
> Auto-crafting consumes cards and cannot be undone. The extension asks for confirmation before crafting begins.

<img src="https://i.ibb.co/v6NzND7w/Screenshot-2026-08-02-140336.png" alt="Steam badge">

### Steam Store search results

- Select games directly from the search results.
- Add selected games to the cart in one run.
- Add selected games to the wishlist after refreshing the account's current wishlist; games already on it are skipped automatically.

Bundle rows are not supported. When a game has multiple purchase options, the cart action uses Steam's first/default package.

<img src="https://i.ibb.co/wFfwYrVW/Screenshot-2026-07-26-012816.png" alt="Selection checkboxes on Steam search results"><img src="https://i.ibb.co/yc324R1q/image.png" alt="Bulk cart and wishlist action bar">

## Where it runs

The extension is limited to these Steam page patterns:

```text
https://steamcommunity.com/id/*/badges*
https://steamcommunity.com/profiles/*/badges*
https://store.steampowered.com/search*
```

It does not request access to every website, WebExtension API permissions, a toolbar action, a background process, or a service worker.

| Browser | Minimum version |
| --- | ---: |
| Chrome | 111 |
| Firefox | 140 |

Firefox 140 or later is required so Firefox can display its built-in consent UI for the data categories declared by the extension.

## Safety model

Account-changing actions use Steam's existing signed-in session and are sent only after a user starts the corresponding operation.

- Community requests are restricted to `https://steamcommunity.com`.
- Store requests are restricted to `https://store.steampowered.com`.
- Constructed profile, game-card, redirect, and mutation URLs are rejected if they leave the expected Steam origin.
- Crafting uses confirmation, request pacing, rate-limit handling, fresh-state reconciliation, batch limits, and a short-lived cross-tab lock.
- Failed or rate-limited Store items remain selected when possible so they can be reviewed or retried.

These safeguards reduce accidental or duplicate operations, but users should still review every destructive confirmation carefully.

## Privacy

Steam Page Tools has:

- no telemetry or usage analytics;
- no advertising;
- no remote JavaScript;
- no developer-operated server; and
- no developer collection or retention of Steam account data.

The extension processes relevant Steam page and account state locally. Session identifiers and action parameters are transmitted only to Steam when needed for a user-requested operation. Store selections and the short-lived crafting lock use storage owned by the corresponding Steam origin.

See [PRIVACY.md](PRIVACY.md) for the complete disclosure.

## Verification

The project includes deterministic packaging, manifest and permission validation, secret and private-path checks, ESLint, archive inspection, and reproducibility checks.

Authenticated, non-destructive Chrome scenarios have been exercised against live Steam pages. Firefox smoke testing and account-changing mutation scenarios remain part of the release checklist.

See [TESTING.md](TESTING.md) for the verified behavior and remaining release tests.

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
- [TESTING.md](TESTING.md) — verification status and release checklist

The separately maintained [userscript edition](https://github.com/x0697x/steam-page-tools) is available for Violentmonkey and Tampermonkey.

## License

Copyright (C) 2026 x0697x.

The extension source, documentation, and bundled project artwork are free software licensed under the [GNU General Public License version 3 or later](LICENSE) (`GPL-3.0-or-later`).

The GPL does not grant rights to Valve Corporation's trademarks. Steam Page Tools must not be presented as affiliated with or endorsed by Valve.
