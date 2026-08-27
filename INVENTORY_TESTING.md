# Steam inventory manual test checklist

Use a signed-in test account and disposable, low-value inventory items. Inventory-management confirmations submit live actions, so never test with a valuable or unique item.

## Package setup

1. Run `npm run check` and confirm both browser archives are reproducible.
2. Load `dist/chrome` as an unpacked extension in Chrome or `dist/firefox` as a temporary add-on in Firefox.
3. Open `https://steamcommunity.com/my/inventory` and confirm one compact valuation strip appears above Steam's inventory without changing the official inventory width.
4. Confirm Steam's rendered item tiles receive small price badges and clicking a tile adds a Market estimate section to Steam's item-details pane.
5. Refresh prices and confirm a blue loading spinner remains visible beside the changing status text until loading finishes or is cancelled.
6. While Market prices are unresolved, confirm marketable tile badges show `Loading…`; after loading finishes, confirm they show a price, buy-order estimate, or `Unpriced`.
7. Open unrelated Steam and non-Steam pages and confirm the inventory feature does not appear.

## Valuation and selection behavior

- Reload the page and confirm Steam’s native active inventory finishes before valuation starts. While valuation is running, switch to a not-yet-loaded Steam inventory tab and confirm valuation yields to Steam without showing its native “inventory is not available” error.
- During Market pricing, confirm each completed price appears immediately on every matching native item tile and in the running totals instead of waiting for all lookups to finish.
- Confirm all visible inventory app/context tabs load, paginated items are not duplicated, and stacks show their quantities.
- Compare a sample of lowest-listing and highest-buy-order values with the Steam Community Market in the same wallet currency.
- Confirm totals label price coverage and exclude unpriced, zero, malformed, or stale data.
- Open `Show tools`, exercise search, game, marketability, Gems, pricing-state, and min/max price filters together, then collapse it again. Confirm item clicks select only while tools are shown and hiding tools clears the selection.
- Confirm there is no action-mode, dry-run, typed-phrase, or safety-settings gate.
- With tools shown, click Steam's item tiles to select and deselect them, confirm the blue overlay and checkmark follow the selection while Steam's normal item details still open, change filters, and confirm the explicit selection is preserved without selecting hidden items automatically.
- Switch to another Steam inventory game/context tab and confirm the previous tab's selection is cleared. Clicking different items within the same tab must not clear the existing selection.
- Cancel a refresh and confirm it stops without retrying as an error, then refresh current prices.
- If practical, test an empty inventory, a private/unavailable tab, and a temporarily failing price response; successful tabs and prices should remain usable and partial failures should be visible.
- Visit another user's inventory and confirm all sell and Gems controls stay disabled.
- Sign out or switch accounts in another tab and confirm the page disables selection and requires a reload.

## Review behavior

- Select marketable items, open the sell review, change quantities or seller-net amounts within the valid range, and remove/re-add proposals before continuing.
- Confirm the review shows the lowest listing, highest buy order, buyer total, fees, seller net, source age, exclusions, and Steam Subscriber Agreement acknowledgement.
- Open `Quick sell` with selected items that do and do not have buy orders. Confirm unavailable items are excluded, quantity and price are locked to one unit and the current highest buy order, and the final confirmation remains required.
- Select Gems-eligible items and confirm the review shows a freshly loaded asset-specific Gems quote before the final confirmation.
- Cancel from each review and final-confirmation dialog and confirm no Steam mutation request is sent.

## Optional live smoke test

This section is optional and must be initiated knowingly by the tester. Use at most one disposable, lowest-value item.

1. Select only one disposable, lowest-value item and review its final proceeds carefully. Accept the Steam Subscriber Agreement only if appropriate.
2. Continue to the final dialog and confirm once. Confirm progress is sequential and the extension reports any Steam confirmation requirement.
3. Confirm the inventory and prices refresh afterward and no mutation request is retried automatically.
4. For a quick-sale smoke test, use one disposable item with a visible buy order and confirm the reviewed buyer total matches that order. If the order changes, confirm the item is skipped.
5. If the response is ambiguous, inspect Steam inventory, Market listings, email, and mobile confirmations manually. Do not retry from the same page session.
6. For a stop-control check, use only disposable items and confirm processing ends after the current request.

Record the browser/version, account ownership case, currency, tested inventory tabs, observed Steam confirmation behavior, console errors, and screenshots with account-sensitive details removed.
