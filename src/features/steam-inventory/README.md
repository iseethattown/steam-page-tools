# Steam inventory feature architecture

The inventory feature is kept separate from the extension's legacy content script. The build concatenates the ordered modules into one deterministic main-world content-script bundle and invokes `index.init()` after every module is registered.

## Modules

- `types.js` defines normalized identifiers, integer parsing, asset keys, and fee-safe primitives.
- `storage.js` owns versioned Steam-origin price-cache records and compatible legacy settings reads.
- `safety.js` validates fresh price snapshots, inventory ownership, explicit selections, and integer totals.
- `steam-api.js` is the only network adapter. It pins every request to the HTTPS Steam Community origin, bounds retries for reads, and never retries mutations.
- `inventory-service.js` enumerates concrete app/context inventories, follows pagination, deduplicates assets, preserves stacks, and normalizes Steam descriptions.
- `pricing-service.js` queues and caches current listing, buy-order, and history reads and performs integer fee calculations.
- `valuation-service.js` produces listing and quick-sale totals, price coverage, and per-game summaries without including invalid or stale prices.
- `action-service.js` separates prepare, review, confirm, execute, and reconcile stages for sales and Gems conversions.
- `ui/` contains the compact valuation strip, native Steam tile annotations, selected-item price details, collapsed filtering and selection tools, previews, confirmations, progress, and CSS. Untrusted Steam item text is assigned through `textContent`.
- `index.js` binds the services to an exact inventory-page route and halts actions when ownership, account state, or session authorization changes.

## Steam interfaces and permissions

The content script runs in the page's main world because Steam exposes inventory context, wallet configuration, and authenticated same-origin interfaces there. This follows the extension's existing architecture and avoids cookie, host, background, and broad WebExtension permissions.

Read adapters cover Steam inventory pages, Market listing data, order histograms, price history, and Gems quotes. The two mutation adapters cover Market listings and conversion to Gems. Request shapes were checked against Steam's first-party Community JavaScript and live public Market responses during implementation. No third-party price service or remote runtime code is used.

Steam's undocumented page variables, rendered Market payloads, and profile/Gems endpoints can change without notice. Parse failures remain unpriced or ineligible rather than guessing. Live actions therefore require fresh revalidation, and Steam's own final UI, fees, eligibility, restrictions, and confirmations remain authoritative.

## Action integrity

- Management is available directly on the signed-in user's own inventory. Another user's inventory never receives selectable write controls.
- No action can begin without an explicit tile selection, a review, and one batch confirmation.
- Quick sell uses the current highest buy order for one unit per selected asset or stack. Items without a buy order are explained and excluded in review, and a changed order is skipped before submission.
- Pricing uses the signed-in account's wallet currency ID. All 47 Steam currency IDs use Steam's hundredths-based Market amounts, with whole-unit display rules applied separately.
- Each item is reloaded and its price or Gems quote refreshed immediately before mutation.
- Valuation waits for Steam’s native initial inventory load and yields to any later native inventory request; native DOM changes only resynchronize tile annotations and never trigger another full valuation pass.
- Mutations are sequential, paced 1.5 seconds apart, stop on Steam rate limits, and carry stable in-session operation identifiers.
- Deterministic rejections may be reviewed and retried. Network, timeout, or server ambiguity is never retried; it is reconciled where possible and blocked for the rest of the page session.
- Only prices are cached, with currency/country/app/name keys and retrieval timestamps. Session identifiers, quotes, selections, and operation state are not persisted.

Automated tests use local fixtures and mocked adapters only. They never contact Steam or send a real mutation. See the repository-level `INVENTORY_TESTING.md` for the manual browser checklist.
