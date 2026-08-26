inventoryModules.actionPreviewDialog = (() => {
    const {
        element,
        makeModal,
        steamButton,
    } = inventoryModules.uiDom;
    const {
        inputToMinor,
        isWholeUnitCurrency,
        minorToInput,
    } = inventoryModules.types;

    function appendExclusions(body, exclusions, { open = false } = {}) {
        if (!exclusions.length) {
            return;
        }

        const details = element('details', {
            className: 'spt-inventory-exclusions',
        });
        const summary = element('summary', {
            text: `${exclusions.length} excluded item(s)`,
        });
        const list = element('ul');

        details.open = open;

        for (const entry of exclusions) {
            list.appendChild(element('li', {
                text: `${entry.item.name}: ${entry.reason}`,
            }));
        }

        details.append(summary, list);
        body.appendChild(details);
    }

    function showSellReview({
        currencyCode,
        exclusions,
        formatMinor,
        instant = false,
        proposals,
        validate,
    }) {
        return new Promise((resolve) => {
            const modal = makeModal(
                instant
                    ? 'Review quick Steam Market sales'
                    : 'Review Steam Market listings',
                { danger: true }
            );
            const warning = element('p', {
                className: 'spt-inventory-danger-text',
                text: instant
                    ? 'Quick sell requires an active buy order and targets its refreshed price for one unit per selected item. Items without a buyer are shown below and excluded. Orders can disappear, and Steam may require an additional confirmation or hold. Nothing is submitted from this review.'
                    : 'Selling can be irreversible and may require Steam Mobile or email confirmation. Nothing is submitted from this review.',
            });
            const scroll = element('div', {
                className: 'spt-inventory-preview-scroll',
            });
            const table = element('table', {
                className: 'spt-inventory-preview-table',
            });
            const head = element('thead');
            const headRow = element('tr');
            const body = element('tbody');
            const totals = element('div', {
                className: 'spt-inventory-preview-totals',
            });
            const validation = element('div', {
                className: 'spt-inventory-validation',
                attributes: { 'aria-live': 'polite' },
            });
            const agreement = element('input', {
                attributes: { type: 'checkbox' },
            });
            const agreementLabel = element('label', {
                className: 'spt-inventory-agreement',
            });
            const cancel = steamButton('Cancel', { kind: 'gray' });
            const proceed = steamButton('Continue to confirmation');
            let edited = proposals.map((proposal) => ({ ...proposal }));
            let latest = validate(edited);

            for (const label of [
                'Include',
                'Item',
                'Qty',
                'Lowest listing',
                'Highest buy',
                `Seller receives (${currencyCode})`,
                'Buyer total',
                'Fees',
                'Age / source',
            ]) {
                headRow.appendChild(element('th', { text: label }));
            }

            head.appendChild(headRow);
            table.append(head, body);
            scroll.appendChild(table);
            agreementLabel.append(
                agreement,
                element('span', {
                    text: 'I agree to the Steam Subscriber Agreement and understand that Steam may require an additional confirmation.',
                })
            );
            modal.body.append(warning, scroll, totals, validation);
            appendExclusions(modal.body, exclusions, {
                open: instant && proposals.length === 0,
            });
            modal.body.appendChild(agreementLabel);
            modal.footer.append(cancel, proceed);

            function renderRows() {
                body.replaceChildren();

                for (const proposal of edited) {
                    const row = element('tr');
                    const includeCell = element('td');
                    const include = element('input', {
                        attributes: {
                            'aria-label': `Include ${proposal.item.name}`,
                            type: 'checkbox',
                        },
                    });
                    const quantityCell = element('td');
                    const quantity = element('input', {
                        className: 'spt-inventory-small-input',
                        attributes: {
                            'aria-label': `Quantity for ${proposal.item.name}`,
                            max: proposal.item.quantity,
                            min: '1',
                            type: 'number',
                        },
                    });
                    const priceCell = element('td');
                    const price = element('input', {
                        className: 'spt-inventory-price-input',
                        attributes: {
                            'aria-label': `Seller proceeds for ${proposal.item.name}`,
                            min: '0',
                            step: isWholeUnitCurrency(currencyCode)
                                ? '1'
                                : '0.01',
                            type: 'number',
                        },
                    });

                    include.checked = true;
                    quantity.value = String(proposal.quantity);
                    price.value = minorToInput(
                        proposal.sellerNetMinor,
                        currencyCode
                    );
                    quantity.disabled = instant;
                    price.disabled = instant;
                    price.title = instant
                        ? 'Locked to the current highest buy order'
                        : '';
                    include.addEventListener('change', () => {
                        if (!include.checked) {
                            edited = edited.filter((entry) => (
                                entry.operationId !== proposal.operationId
                            ));
                            update();
                        }
                    });
                    quantity.addEventListener('input', () => {
                        proposal.quantity = Number(quantity.value);
                        update(false);
                    });
                    price.addEventListener('input', () => {
                        proposal.sellerNetMinor = inputToMinor(
                            price.value,
                            currencyCode
                        );
                        update(false);
                    });
                    includeCell.appendChild(include);
                    quantityCell.appendChild(quantity);
                    priceCell.appendChild(price);
                    row.append(
                        includeCell,
                        element('td', {
                            text: `${proposal.item.gameName} · ${proposal.item.name}`,
                        }),
                        quantityCell,
                        element('td', {
                            text: formatMinor(
                                proposal.sourceLowestSellGrossMinor
                            ),
                        }),
                        element('td', {
                            text: formatMinor(
                                proposal.sourceHighestBuyGrossMinor
                            ),
                        }),
                        priceCell,
                        element('td', {
                            text: formatMinor(proposal.buyerTotalMinor),
                        }),
                        element('td', {
                            text: formatMinor(proposal.feesMinor),
                        }),
                        element('td', {
                            text: `${Math.floor(proposal.priceAgeMs / 1000)}s · ` +
                                proposal.priceSource,
                        })
                    );
                    body.appendChild(row);
                }
            }

            function update(rebuild = true) {
                latest = validate(edited);

                if (rebuild) {
                    renderRows();
                }

                totals.textContent =
                    `${latest.totals.count} item(s) · ` +
                    `${formatMinor(latest.totals.grossMinor)} buyer total · ` +
                    `${formatMinor(latest.totals.feesMinor)} fees · ` +
                    `${formatMinor(latest.totals.netMinor)} estimated proceeds`;
                validation.textContent = latest.errors.join(' · ');
                proceed.disabled = latest.errors.length > 0 || !agreement.checked;
            }

            agreement.addEventListener('change', () => update(false));
            cancel.addEventListener('click', () => modal.destroy(null));
            proceed.addEventListener('click', () => {
                modal.destroy({
                    acceptedSubscriberAgreement: true,
                    proposals: latest.proposals,
                    totals: latest.totals,
                });
            });
            renderRows();
            update(false);
            modal.open(resolve);
        });
    }

    function showGemReview({ exclusions, proposals }) {
        return new Promise((resolve) => {
            const modal = makeModal('Review Gems conversion', { danger: true });
            const warning = element('p', {
                className: 'spt-inventory-danger-text',
                text: 'Turning items into Gems is irreversible. Nothing is converted from this review.',
            });
            const list = element('div', {
                className: 'spt-inventory-gem-list',
            });
            const totals = element('div', {
                className: 'spt-inventory-preview-totals',
            });
            const cancel = steamButton('Cancel', { kind: 'gray' });
            const proceed = steamButton('Continue to confirmation');
            let included = [...proposals];

            function render() {
                list.replaceChildren();

                for (const proposal of included) {
                    const label = element('label', {
                        className: 'spt-inventory-gem-row',
                    });
                    const checkbox = element('input', {
                        attributes: { type: 'checkbox' },
                    });

                    checkbox.checked = true;
                    checkbox.addEventListener('change', () => {
                        included = included.filter((entry) => (
                            entry.operationId !== proposal.operationId
                        ));
                        render();
                    });
                    label.append(
                        checkbox,
                        element('span', {
                            text: `${proposal.item.gameName} · ` +
                                `${proposal.item.name} — ` +
                                `${proposal.expectedGems} Gems`,
                        })
                    );
                    list.appendChild(label);
                }

                const expected = included.reduce(
                    (sum, proposal) => sum + proposal.expectedGems,
                    0
                );

                totals.textContent = `${included.length} item(s) · ` +
                    `${expected} expected Gems`;
                proceed.disabled = included.length === 0;
            }

            modal.body.append(warning, list, totals);
            appendExclusions(modal.body, exclusions);
            modal.footer.append(cancel, proceed);
            cancel.addEventListener('click', () => modal.destroy(null));
            proceed.addEventListener('click', () => modal.destroy({
                proposals: included,
                totals: {
                    count: included.length,
                    expectedGems: included.reduce(
                        (sum, proposal) => sum + proposal.expectedGems,
                        0
                    ),
                },
            }));
            render();
            modal.open(resolve);
        });
    }

    function showConfirmation({
        actionLabel,
        summary,
        warningText,
    }) {
        return new Promise((resolve) => {
            const modal = makeModal(`Confirm ${actionLabel}`, { danger: true });
            const warning = element('p', {
                className: 'spt-inventory-danger-text',
                text: warningText || 'This operation changes your Steam inventory and may be irreversible. Steam confirmations and restrictions still apply.',
            });
            const totals = element('p', { text: summary });
            const cancel = steamButton('Cancel', { kind: 'gray' });
            const confirm = steamButton(
                `Confirm ${actionLabel}`,
                { kind: 'green' }
            );

            modal.body.append(warning, totals);
            modal.footer.append(cancel, confirm);
            cancel.addEventListener('click', () => modal.destroy(null));
            confirm.addEventListener('click', () => modal.destroy({
                confirmed: true,
            }));
            modal.open(resolve);
        });
    }

    return Object.freeze({
        showConfirmation,
        showGemReview,
        showSellReview,
    });
})();
