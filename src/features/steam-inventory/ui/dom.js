inventoryModules.uiDom = (() => {
    function element(tagName, options = {}) {
        const node = document.createElement(tagName);

        if (options.className) {
            node.className = options.className;
        }

        if (options.id) {
            node.id = options.id;
        }

        if (options.text !== undefined) {
            node.textContent = String(options.text);
        }

        for (const [name, value] of Object.entries(options.attributes || {})) {
            if (value !== undefined && value !== null) {
                node.setAttribute(name, String(value));
            }
        }

        return node;
    }

    function steamButton(label, { kind = 'blue', type = 'button' } = {}) {
        const button = element('button', {
            className: kind === 'green'
                ? 'btnv6_green_white_innerfade btn_medium'
                : kind === 'gray'
                    ? 'btnv6_grey_black btn_medium'
                    : 'btnv6_blue_hoverfade btn_medium',
        });
        const text = element('span', { text: label });

        button.type = type;
        button.appendChild(text);
        return button;
    }

    function makeModal(title, {
        compact = false,
        danger = false,
        dismissible = true,
    } = {}) {
        const overlay = element('div', {
            className: 'spt-inventory-modal-overlay',
        });
        const dialog = element('div', {
            className: compact
                ? 'spt-inventory-modal compact'
                : 'spt-inventory-modal',
            attributes: {
                'aria-labelledby': `spt-modal-title-${Date.now()}`,
                'aria-modal': 'true',
                role: 'dialog',
                tabindex: '-1',
            },
        });
        const header = element('div', {
            className: danger
                ? 'spt-inventory-modal-header danger'
                : 'spt-inventory-modal-header',
        });
        const heading = element('h2', { text: title });
        const close = element('button', {
            className: 'spt-inventory-modal-close',
            attributes: { 'aria-label': 'Close' },
            text: '×',
        });
        const body = element('div', {
            className: 'spt-inventory-modal-body',
        });
        const footer = element('div', {
            className: 'spt-inventory-modal-footer',
        });
        const previousFocus = document.activeElement;
        let onClose = () => {};

        heading.id = dialog.getAttribute('aria-labelledby');
        close.type = 'button';
        header.append(heading, close);
        dialog.append(header, body, footer);
        overlay.appendChild(dialog);

        function destroy(value = null) {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            if (previousFocus && typeof previousFocus.focus === 'function') {
                previousFocus.focus();
            }
            onClose(value);
        }

        function onKeyDown(event) {
            if (event.key === 'Escape' && dismissible) {
                event.preventDefault();
                destroy(null);
            }

            if (event.key === 'Tab') {
                const focusable = [...dialog.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), ' +
                    'select:not([disabled]), [tabindex="0"]'
                )];

                if (!focusable.length) {
                    event.preventDefault();
                    return;
                }

                const first = focusable[0];
                const last = focusable.at(-1);

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        }

        close.hidden = !dismissible;
        close.addEventListener('click', () => {
            if (dismissible) {
                destroy(null);
            }
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay && dismissible) {
                destroy(null);
            }
        });

        return Object.freeze({
            body,
            destroy,
            footer,
            open(resolve) {
                onClose = resolve;
                document.body.appendChild(overlay);
                document.addEventListener('keydown', onKeyDown);
                dialog.focus();
            },
        });
    }

    function labelControl(label, control) {
        const wrapper = element('label', {
            className: 'spt-inventory-field',
        });

        wrapper.append(element('span', { text: label }), control);
        return wrapper;
    }

    return Object.freeze({ element, labelControl, makeModal, steamButton });
})();
