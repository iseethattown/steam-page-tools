inventoryModules.actionService = (() => {
    const DEFAULT_ACTION_DELAY_MS = 1500;
    const { ACTION_STATUS, isSafeMinor, makeAssetKey } = inventoryModules.types;
    const {
        validateBatch,
        validatePriceSnapshot,
    } = inventoryModules.safety;
    const {
        calculateBuyerTotal,
        calculateSellerNet,
    } = inventoryModules.pricingService;

    function exclusion(item, reason) {
        return { item, reason };
    }

    function summarizeSell(proposals) {
        return proposals.reduce((totals, proposal) => {
            totals.count += proposal.quantity;
            totals.grossMinor += proposal.buyerTotalMinor * proposal.quantity;
            totals.feesMinor += proposal.feesMinor * proposal.quantity;
            totals.netMinor += proposal.sellerNetMinor * proposal.quantity;
            return totals;
        }, { count: 0, feesMinor: 0, grossMinor: 0, netMinor: 0 });
    }

    function prepareSell({
        feeConfig,
        isOwnInventory,
        items,
        now = Date.now(),
        pricingMode = 'listing',
        settings,
    }) {
        const proposals = [];
        const exclusions = [];
        const instant = pricingMode === 'instant';
        const priceField = instant
            ? 'highestBuyGrossMinor'
            : 'lowestSellGrossMinor';

        for (const item of items) {
            if (!item.marketable) {
                exclusions.push(exclusion(item, 'Item is not marketable'));
                continue;
            }

            const priceError = validatePriceSnapshot(
                item.price,
                now,
                settings.maxSalePriceAgeMs,
                priceField
            );

            if (priceError) {
                exclusions.push(exclusion(item, priceError));
                continue;
            }

            const buyerTotalMinor = item.price[priceField];
            const fee = calculateSellerNet(
                buyerTotalMinor,
                feeConfig,
                item.marketFeeBps
            );

            if (!fee || fee.sellerNetMinor < settings.minimumSalePriceMinor) {
                exclusions.push(exclusion(item, 'Price is below Steam’s minimum'));
                continue;
            }

            proposals.push({
                buyerTotalMinor,
                feesMinor: fee.feesMinor,
                item,
                operationId: [
                    'sell',
                    makeAssetKey(item),
                    1,
                    fee.sellerNetMinor,
                ].join(':'),
                priceAgeMs: now - item.price.retrievedAt,
                pricingMode,
                priceSource: item.price.source,
                quantity: 1,
                sellerNetMinor: fee.sellerNetMinor,
                sourceHighestBuyGrossMinor: item.price.highestBuyGrossMinor,
                sourceLowestSellGrossMinor: item.price.lowestSellGrossMinor,
                sourcePriceGrossMinor: buyerTotalMinor,
            });
        }

        const totals = summarizeSell(proposals);
        const errors = validateBatch({
            count: totals.count,
            grossMinor: totals.grossMinor,
            isOwnInventory,
        });

        return { errors, exclusions, proposals, totals };
    }

    function validateEditedSell({
        feeConfig,
        isOwnInventory,
        proposals,
        settings,
    }) {
        const valid = [];
        const errors = [];

        for (const proposal of proposals) {
            const quantity = Number(proposal.quantity);
            const sellerNetMinor = Number(proposal.sellerNetMinor);

            if (
                !Number.isSafeInteger(quantity) ||
                quantity < 1 ||
                quantity > proposal.item.quantity
            ) {
                errors.push(`${proposal.item.name}: invalid quantity`);
                continue;
            }

            if (
                !isSafeMinor(sellerNetMinor) ||
                sellerNetMinor < settings.minimumSalePriceMinor
            ) {
                errors.push(`${proposal.item.name}: invalid sale price`);
                continue;
            }

            const fee = proposal.pricingMode === 'instant'
                ? calculateSellerNet(
                    proposal.sourceHighestBuyGrossMinor,
                    feeConfig,
                    proposal.item.marketFeeBps
                )
                : calculateBuyerTotal(
                    sellerNetMinor,
                    feeConfig,
                    proposal.item.marketFeeBps
                );

            if (
                !fee ||
                (
                    proposal.pricingMode === 'instant' &&
                    sellerNetMinor !== fee.sellerNetMinor
                )
            ) {
                errors.push(
                    `${proposal.item.name}: quick-sale price cannot be edited`
                );
                continue;
            }

            valid.push({
                ...proposal,
                buyerTotalMinor: fee.buyerTotalMinor,
                feesMinor: fee.feesMinor,
                operationId: [
                    'sell',
                    makeAssetKey(proposal.item),
                    quantity,
                    sellerNetMinor,
                ].join(':'),
                quantity,
                sellerNetMinor,
            });
        }

        const totals = summarizeSell(valid);

        errors.push(...validateBatch({
            count: totals.count,
            grossMinor: totals.grossMinor,
            isOwnInventory,
        }));

        return { errors, proposals: valid, totals };
    }

    function prepareGems({
        isOwnInventory,
        items,
    }) {
        const proposals = [];
        const exclusions = [];

        for (const item of items) {
            const expectedGems = Number(item.gemQuote?.expectedGems);

            if (!item.gem?.eligible) {
                exclusions.push(exclusion(item, 'Item is not eligible for Gems'));
            } else if (!Number.isSafeInteger(expectedGems) || expectedGems < 1) {
                exclusions.push(exclusion(item, 'Gem value could not be verified'));
            } else {
                proposals.push({
                    expectedGems,
                    item,
                    operationId: `gem:${makeAssetKey(item)}:${expectedGems}`,
                    quantity: 1,
                    quoteRetrievedAt: item.gemQuote.retrievedAt,
                });
            }
        }

        const count = proposals.length;
        const errors = [];

        if (!isOwnInventory) {
            errors.push('Write actions are restricted to your own inventory');
        }

        if (count < 1) {
            errors.push('Select at least one eligible item');
        }

        return {
            errors,
            exclusions,
            proposals,
            totals: {
                count,
                expectedGems: proposals.reduce(
                    (total, proposal) => total + proposal.expectedGems,
                    0
                ),
            },
        };
    }

    function createActionService({
        api,
        actionDelayMs = DEFAULT_ACTION_DELAY_MS,
        sleepImpl,
    }) {
        const operationIds = new Set();
        const wait = sleepImpl || ((ms) => new Promise((resolve) => {
            setTimeout(resolve, ms);
        }));

        async function executeSell({
            acceptedSubscriberAgreement,
            confirmation,
            onProgress,
            proposals,
            isAuthorized,
            revalidateItem,
            refreshPrice,
            sessionId,
            shouldStop,
        }) {
            if (!confirmation?.confirmed) {
                return { cancelled: true, results: [] };
            }

            if (!acceptedSubscriberAgreement) {
                throw new Error('Steam Subscriber Agreement acceptance is required');
            }

            const results = [];
            let halted = false;

            for (let index = 0; index < proposals.length; index += 1) {
                const proposal = proposals[index];
                let mutationSent = false;

                if (shouldStop?.()) {
                    halted = true;
                    break;
                }

                const base = {
                    item: proposal.item,
                    operationId: proposal.operationId,
                };

                if (!isAuthorized?.()) {
                    results.push({
                        ...base,
                        message: 'Steam account authorization changed',
                        status: ACTION_STATUS.failed,
                    });
                    halted = true;
                    onProgress?.(results.at(-1));
                    break;
                }

                if (operationIds.has(proposal.operationId)) {
                    results.push({
                        ...base,
                        message: 'Duplicate operation blocked',
                        status: ACTION_STATUS.skipped,
                    });
                    continue;
                }

                let current;

                try {
                    current = await revalidateItem(proposal.item);
                } catch (error) {
                    if (error.code === 'authentication') {
                        halted = true;
                    }

                    results.push({
                        ...base,
                        message: error.message,
                        status: ACTION_STATUS.failed,
                    });
                    onProgress?.(results.at(-1));

                    if (halted) {
                        break;
                    }
                    continue;
                }

                if (
                    !current ||
                    !current.marketable ||
                    current.quantity < proposal.quantity
                ) {
                    results.push({
                        ...base,
                        message: 'Item is no longer owned or marketable',
                        status: ACTION_STATUS.skipped,
                    });
                    onProgress?.(results.at(-1));
                    continue;
                }

                let freshPrice;

                try {
                    freshPrice = await refreshPrice(current);
                } catch (error) {
                    results.push({
                        ...base,
                        message: `Price recheck failed: ${error.message}`,
                        status: ACTION_STATUS.skipped,
                    });
                    onProgress?.(results.at(-1));

                    if (
                        error.code === 'authentication' ||
                        error.code === 'rate_limited'
                    ) {
                        halted = true;
                        break;
                    }
                    continue;
                }

                const freshGrossMinor = proposal.pricingMode === 'instant'
                    ? freshPrice.highestBuyGrossMinor
                    : freshPrice.lowestSellGrossMinor;

                if (
                    freshPrice.status !== 'priced' ||
                    freshGrossMinor !== proposal.sourcePriceGrossMinor
                ) {
                    results.push({
                        ...base,
                        message: proposal.pricingMode === 'instant'
                            ? 'Highest buy order changed before submission'
                            : 'Price changed before submission',
                        status: ACTION_STATUS.skipped,
                    });
                    onProgress?.(results.at(-1));
                    continue;
                }

                operationIds.add(proposal.operationId);
                mutationSent = true;

                try {
                    const response = await api.sellItem({
                        appId: current.appId,
                        assetId: current.assetId,
                        contextId: current.contextId,
                        quantity: proposal.quantity,
                        sellerNetMinor: proposal.sellerNetMinor,
                        sessionId,
                    });

                    if (!response?.success) {
                        operationIds.delete(proposal.operationId);
                        results.push({
                            ...base,
                            message: String(
                                response?.message || response?.error ||
                                'Steam rejected the listing'
                            ),
                            status: ACTION_STATUS.failed,
                        });
                    } else {
                        const pending = Boolean(response.requires_confirmation);

                        results.push({
                            ...base,
                            message: pending
                                ? 'Submitted; Steam confirmation is required'
                                : 'Listing submitted',
                            status: pending
                                ? ACTION_STATUS.submitted
                                : ACTION_STATUS.confirmed,
                        });
                    }
                } catch (error) {
                    let reconciled = null;

                    if (error.ambiguous) {
                        try {
                            reconciled = await revalidateItem(proposal.item);
                        } catch {
                            reconciled = null;
                        }
                    }

                    results.push({
                        ...base,
                        message: error.ambiguous
                            ? (
                                reconciled
                                    ? 'Ambiguous response; item still appears owned. Retry is blocked for this session.'
                                    : 'Ambiguous response; inventory changed. Verify Steam before retrying.'
                            )
                            : error.message,
                        status: error.ambiguous
                            ? ACTION_STATUS.uncertain
                            : ACTION_STATUS.failed,
                    });

                    if (!error.ambiguous) {
                        operationIds.delete(proposal.operationId);
                    }

                    if (
                        error.code === 'authentication' ||
                        error.code === 'rate_limited'
                    ) {
                        halted = true;
                    }
                }

                onProgress?.(results.at(-1));

                if (halted) {
                    break;
                }

                if (
                    mutationSent &&
                    index < proposals.length - 1 &&
                    !shouldStop?.() &&
                    actionDelayMs > 0
                ) {
                    await wait(actionDelayMs);
                }
            }

            return { cancelled: false, halted, results };
        }

        async function executeGems({
            confirmation,
            onProgress,
            ownerSteamId,
            proposals,
            isAuthorized,
            revalidateItem,
            refreshGemQuote,
            sessionId,
            shouldStop,
        }) {
            if (!confirmation?.confirmed) {
                return { cancelled: true, results: [] };
            }

            const results = [];
            let halted = false;

            for (let index = 0; index < proposals.length; index += 1) {
                const proposal = proposals[index];
                let mutationSent = false;

                if (shouldStop?.()) {
                    halted = true;
                    break;
                }

                const base = {
                    item: proposal.item,
                    operationId: proposal.operationId,
                };

                if (!isAuthorized?.()) {
                    results.push({
                        ...base,
                        message: 'Steam account authorization changed',
                        status: ACTION_STATUS.failed,
                    });
                    halted = true;
                    onProgress?.(results.at(-1));
                    break;
                }

                if (operationIds.has(proposal.operationId)) {
                    results.push({
                        ...base,
                        message: 'Duplicate operation blocked',
                        status: ACTION_STATUS.skipped,
                    });
                    continue;
                }

                let current;
                let quote;

                try {
                    current = await revalidateItem(proposal.item);

                    if (!current?.gem?.eligible) {
                        throw new Error('Item is no longer owned or Gems-eligible');
                    }

                    quote = await refreshGemQuote(current);
                } catch (error) {
                    results.push({
                        ...base,
                        message: error.message,
                        status: ACTION_STATUS.skipped,
                    });
                    onProgress?.(results.at(-1));

                    if (
                        error.code === 'authentication' ||
                        error.code === 'rate_limited'
                    ) {
                        halted = true;
                        break;
                    }
                    continue;
                }

                if (quote.expectedGems !== proposal.expectedGems) {
                    results.push({
                        ...base,
                        message: 'Gem value changed before conversion',
                        status: ACTION_STATUS.skipped,
                    });
                    onProgress?.(results.at(-1));
                    continue;
                }

                operationIds.add(proposal.operationId);
                mutationSent = true;

                try {
                    const response = await api.convertToGems({
                        appId: current.gem.sourceAppId,
                        assetId: current.assetId,
                        contextId: current.contextId,
                        expectedGems: proposal.expectedGems,
                        ownerSteamId,
                        sessionId,
                    });

                    const rejected =
                        response?.success === false ||
                        response?.success === 0 ||
                        response?.success === '0' ||
                        Boolean(response?.message || response?.error);
                    const confirmed = !rejected && (
                        response?.success === true ||
                        response?.success === 1 ||
                        response?.success === '1' ||
                        typeof response?.strHTML === 'string'
                    );

                    if (rejected) {
                        operationIds.delete(proposal.operationId);
                    }

                    results.push({
                        ...base,
                        message: confirmed
                            ? 'Converted to Gems'
                            : rejected
                            ? String(
                                response?.message || response?.error ||
                                'Steam rejected the conversion'
                            )
                            : 'Steam returned an unexpected response. Verify the inventory before retrying.',
                        status: confirmed
                            ? ACTION_STATUS.confirmed
                            : rejected
                            ? ACTION_STATUS.failed
                            : ACTION_STATUS.uncertain,
                    });
                } catch (error) {
                    let reconciled = null;

                    if (error.ambiguous) {
                        try {
                            reconciled = await revalidateItem(proposal.item);
                        } catch {
                            reconciled = null;
                        }
                    }

                    results.push({
                        ...base,
                        message: error.ambiguous
                            ? (
                                reconciled
                                    ? 'Ambiguous response; item still appears owned. Retry is blocked for this session.'
                                    : 'Ambiguous response; inventory changed. Verify Steam before retrying.'
                            )
                            : error.message,
                        status: error.ambiguous
                            ? ACTION_STATUS.uncertain
                            : ACTION_STATUS.failed,
                    });

                    if (!error.ambiguous) {
                        operationIds.delete(proposal.operationId);
                    }

                    if (
                        error.code === 'authentication' ||
                        error.code === 'rate_limited'
                    ) {
                        halted = true;
                    }
                }

                onProgress?.(results.at(-1));

                if (halted) {
                    break;
                }

                if (
                    mutationSent &&
                    index < proposals.length - 1 &&
                    !shouldStop?.() &&
                    actionDelayMs > 0
                ) {
                    await wait(actionDelayMs);
                }
            }

            return { cancelled: false, halted, results };
        }

        return Object.freeze({
            executeGems,
            executeSell,
            prepareGems,
            prepareSell,
            validateEditedSell,
        });
    }

    return Object.freeze({
        DEFAULT_ACTION_DELAY_MS,
        createActionService,
        prepareGems,
        prepareSell,
        summarizeSell,
        validateEditedSell,
    });
})();
