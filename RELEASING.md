# Releasing

This repository does not publish automatically. CI validates and packages only.

## Remaining store-release blockers for 1.0.0

Resolve the outstanding items in `TESTING.md` before store submission or a tagged release.

The repository may be public while this work is in progress. Do not present an unverified package as the final 1.0.0 store release.

The Firefox consent blocker is resolved by requiring Firefox 140 or later. The manifest's `strict_min_version` is `140.0`, where Mozilla's built-in data-transmission consent UI is available for the declared required categories.

The Firefox data taxonomy was rechecked against Mozilla's current definitions on 2026-07-29. The conservative required categories remain `authenticationInfo`, `personallyIdentifyingInfo`, `locationInfo`, `websiteContent`, and `websiteActivity`, covering the Steam session identifier, account ID, country code, relevant Steam page/request/response data, selected apps, and user-requested actions. Do not replace them with `none`.

The license decision is resolved for the extension edition: the project owner selected `GPL-3.0-or-later`. The complete canonical GPLv3 text is in `LICENSE`, project-authored JavaScript files carry SPDX identifiers, and every browser package includes `LICENSE`.

The icon decision is resolved for the local release: the project owner supplied the artwork now retained as `assets/icon-source.png`, approved using it for the packaged 16, 32, 48, and 128 pixel variants, and included the project artwork in the GPL-licensed extension edition. Continue to avoid the official Steam logo or presentation that suggests Valve affiliation.

Mozilla's current built-in consent documentation is:

- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings

## Local release checks

Use Node.js 24 or later from a clean checkout:

```text
npm ci --ignore-scripts
npm audit --audit-level=high
npm run check
git status --short
```

`npm run check` performs ESLint, source/manifest/icon/security validation, two deterministic builds, byte-for-byte archive comparison, and final package inspection.

Inspect the archives independently:

```text
tar -tf dist/steam-page-tools-chrome-v1.0.0.zip
tar -tf dist/steam-page-tools-firefox-v1.0.0.zip
```

The expected entries in each archive are:

```text
LICENSE
assets/icons/icon-16.png
assets/icons/icon-32.png
assets/icons/icon-48.png
assets/icons/icon-128.png
manifest.json
src/content.js
```

Confirm there are no source maps, absolute paths, secrets, userscript metadata/update URLs, remote runtime resources, or unexpected permissions.

Before distributing either store package, publish the exact corresponding source and build instructions under the same GPL terms, and provide a clear source link alongside the downloadable package.

The manifest description is intentionally shorter than the full project description because Chrome enforces a 132-character maximum. Do not replace it with the 141-character full description; keep the full wording in README/listing copy instead.

## Version bumping

Update all of the following together:

- `package.json` and `package-lock.json`
- `manifests/chrome.json`
- `manifests/firefox.json`
- `CHANGELOG.md`
- The two archive names in `scripts/build.mjs`, `scripts/validate.mjs`, and `scripts/verify-reproducible.mjs`
- Package names and commands in the documentation

Run `npm run check` after the bump and verify both manifests report the same version.

## Chrome upload and review

1. Resolve all blockers above and complete `TESTING.md`.
2. Build from the exact release commit with `npm ci --ignore-scripts && npm run check`.
3. Upload `dist/steam-page-tools-chrome-v1.0.0.zip` in the Chrome Web Store developer dashboard.
4. Paste the reviewed Chrome content from `STORE_LISTING.md`, publish the privacy policy, and upload approved screenshots/assets.
5. Recheck the permission warning and the requested site patterns in the dashboard.
6. Submit for review manually. Do not automate publishing.

## Firefox linting and signing

The repo does not pin Mozilla `web-ext` because its latest compatible dependency tree had unresolved high-severity audit advisories during the 1.0.0 conversion. Recheck the current release and advisories before using it:

```text
npm view web-ext version
npm audit
```

Run current Mozilla linting in a disposable environment or rely on AMO's upload validator; do not add a vulnerable tool to the lockfile merely to satisfy this step. With a reviewed safe version, the lint command is:

```text
web-ext lint --source-dir dist/firefox --warnings-as-errors
```

Then:

1. Upload `dist/steam-page-tools-firefox-v1.0.0.zip` to the Firefox Add-on Developer Hub.
2. Resolve every validator warning.
3. Confirm the extension ID and data-collection permissions.
4. Provide source/build instructions if AMO requests them.
5. Submit for listed signing/review manually.
6. Download and test the signed artifact before linking it publicly.

## GitHub release

After store publication and the final release commit are explicitly approved:

1. Tag the reviewed release commit as `v1.0.0`.
2. Create a GitHub release from that tag.
3. Use the matching `CHANGELOG.md` entry as release notes.
4. Attach both byte-for-byte verified ZIP archives.
5. Do not attach `node_modules` or the unpacked `dist/chrome` and `dist/firefox` directories.
6. Verify the public tag, source tree, checksums, and archive contents.
