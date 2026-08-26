inventoryModules.actionProgressDialog = (() => {
    const { element, makeModal, steamButton } = inventoryModules.uiDom;

    function showLoading(title, {
        message = 'Loading current Steam Market data...',
        onCancel,
    } = {}) {
        const modal = makeModal(title, {
            compact: true,
            dismissible: false,
        });
        const content = element('div', {
            className: 'spt-inventory-modal-loading',
        });
        const spinner = element('span', {
            className: 'spt-inventory-loading-spinner',
            attributes: { 'aria-hidden': 'true' },
        });
        const summary = element('span', {
            attributes: { 'aria-live': 'polite' },
            text: message,
        });
        let closed = false;

        content.append(spinner, summary);
        modal.body.appendChild(content);

        if (typeof onCancel === 'function') {
            const cancel = steamButton('Cancel', { kind: 'gray' });

            cancel.addEventListener('click', () => {
                cancel.disabled = true;
                cancel.querySelector('span').textContent = 'Cancelling...';
                summary.textContent = 'Cancelling price refresh...';
                onCancel();
            }, { once: true });
            modal.footer.appendChild(cancel);
        }

        modal.open(() => {});

        return Object.freeze({
            close() {
                if (!closed) {
                    closed = true;
                    modal.destroy();
                }
            },
            update(messageText) {
                if (!closed) {
                    summary.textContent = messageText;
                }
            },
        });
    }

    function showProgress(title) {
        const modal = makeModal(title, { dismissible: false });
        const summary = element('div', {
            className: 'spt-inventory-progress-summary',
            attributes: { 'aria-live': 'polite' },
            text: 'Preparing…',
        });
        const list = element('div', {
            className: 'spt-inventory-progress-list',
        });
        const stop = steamButton('Stop after current item', { kind: 'gray' });
        const close = steamButton('Close');
        let stopped = false;
        let completed = false;

        close.disabled = true;
        stop.addEventListener('click', () => {
            stopped = true;
            stop.disabled = true;
            stop.querySelector('span').textContent = 'Stopping…';
            summary.textContent = 'Stopping after the current item…';
        });
        close.addEventListener('click', () => modal.destroy());
        modal.body.append(summary, list);
        modal.footer.append(stop, close);
        modal.open(() => {});

        return Object.freeze({
            finish(message) {
                completed = true;
                summary.textContent = message;
                stop.disabled = true;
                close.disabled = false;
                close.focus();
            },
            isStopped() {
                return stopped;
            },
            update(result) {
                if (completed) {
                    return;
                }

                const row = element('div', {
                    className: `spt-inventory-progress-row ${result.status}`,
                });

                row.append(
                    element('strong', { text: result.item.name }),
                    element('span', {
                        text: `${result.status}: ${result.message}`,
                    })
                );
                list.appendChild(row);
                summary.textContent = `${list.children.length} item(s) processed`;
            },
        });
    }

    return Object.freeze({ showLoading, showProgress });
})();
