inventoryModules.inventoryStyles = (() => {
    const STYLE_ID = 'spt-inventory-economy-styles';

    function inject() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');

        style.id = STYLE_ID;
        style.textContent = `
            #spt-inventory-economy {
                box-sizing: border-box;
                width: calc(100% - 20px);
                max-width: 940px;
                margin: 0 auto 10px;
                color: #d6d7d8;
                border: 1px solid #1b4055;
                background: #101923;
                font-family: "Motiva Sans", Arial, sans-serif;
                font-size: 12px;
            }

            #spt-inventory-economy.native {
                width: 100%;
                max-width: none;
                margin: 0 0 10px;
            }

            #spt-inventory-economy *,
            #spt-inventory-economy *::before,
            #spt-inventory-economy *::after {
                box-sizing: border-box;
            }

            .spt-inventory-header,
            .spt-inventory-toolbar,
            .spt-inventory-action-row,
            .spt-inventory-modal-footer,
            .spt-inventory-detail-heading {
                display: flex;
                align-items: center;
                gap: 7px;
            }

            .spt-inventory-header {
                min-height: 42px;
                justify-content: space-between;
                padding: 6px 8px 6px 11px;
                background: #162b3b;
            }

            .spt-inventory-identity {
                display: flex;
                min-width: 0;
                flex-direction: column;
                gap: 2px;
            }

            .spt-inventory-status-row {
                display: flex;
                min-width: 0;
                align-items: center;
                gap: 6px;
            }

            .spt-inventory-loading-spinner {
                display: none;
                width: 12px;
                height: 12px;
                flex: 0 0 12px;
                border: 2px solid #31576f;
                border-top-color: #67c1f5;
                border-radius: 50%;
                animation: spt-inventory-spin .7s linear infinite;
            }

            #spt-inventory-economy.loading
            .spt-inventory-loading-spinner {
                display: block;
            }

            .spt-inventory-title {
                color: #fff;
                font-size: 14px;
                font-weight: 400;
            }

            .spt-inventory-status,
            .spt-inventory-note,
            .spt-inventory-filter-status,
            .spt-inventory-detail-note {
                color: #7f98aa;
                font-size: 11px;
            }

            .spt-inventory-status {
                overflow: hidden;
                max-width: 520px;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .spt-inventory-status.error,
            .spt-inventory-validation,
            .spt-inventory-danger-text {
                color: #ff9b8d;
            }

            @keyframes spt-inventory-spin {
                to { transform: rotate(360deg); }
            }

            @media (prefers-reduced-motion: reduce) {
                .spt-inventory-loading-spinner {
                    animation: none;
                }
            }

            .spt-inventory-summary {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                min-height: 42px;
                border-top: 1px solid #0b1219;
                background: #0d1721;
            }

            .spt-inventory-metric {
                display: grid;
                grid-template-columns: auto 1fr;
                grid-template-rows: 1fr 1fr;
                min-width: 0;
                padding: 6px 11px;
                border-right: 1px solid #223648;
            }

            .spt-inventory-metric:last-child {
                border-right: 0;
            }

            .spt-inventory-metric-label {
                grid-row: 1 / 3;
                align-self: center;
                margin-right: 8px;
                color: #7f98aa;
                font-size: 10px;
                text-transform: uppercase;
            }

            .spt-inventory-metric-value {
                overflow: hidden;
                color: #67c1f5;
                font-size: 14px;
                font-weight: 400;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .spt-inventory-metric-detail {
                overflow: hidden;
                color: #8f98a0;
                font-size: 10px;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .spt-inventory-drawer {
                padding: 8px 10px 9px;
                border-top: 1px solid #29445c;
            }

            .spt-inventory-drawer[hidden] {
                display: none;
            }

            .spt-inventory-action-row {
                min-height: 32px;
                flex-wrap: wrap;
            }

            .spt-inventory-agreement,
            .spt-inventory-gem-row {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .spt-inventory-selection-summary {
                margin-right: auto;
                color: #a9b8c4;
            }

            .spt-inventory-filters-panel {
                margin-top: 7px;
                padding: 7px 8px;
                color: #b8b6b4;
                background: #0b141d;
            }

            .spt-inventory-filters-panel > summary {
                color: #d6d7d8;
                cursor: pointer;
                user-select: none;
            }

            .spt-inventory-filters {
                display: grid;
                grid-template-columns: minmax(160px, 2fr) repeat(6, minmax(92px, 1fr));
                gap: 6px;
                margin-top: 7px;
            }

            .spt-inventory-filter-footer {
                display: flex;
                min-height: 29px;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-top: 6px;
            }

            .spt-inventory-filter-reset {
                min-height: 27px;
                flex: 0 0 auto;
                white-space: nowrap;
            }

            .spt-inventory-field {
                display: flex;
                min-width: 0;
                flex-direction: column;
                gap: 2px;
                color: #7f98aa;
                font-size: 10px;
            }

            #spt-inventory-economy input,
            #spt-inventory-economy select,
            .spt-inventory-modal input,
            .spt-inventory-modal select {
                min-height: 27px;
                padding: 4px 6px;
                color: #d6d7d8;
                border: 1px solid #000;
                border-radius: 0;
                outline: none;
                background: #192532;
            }

            #spt-inventory-economy input:focus,
            #spt-inventory-economy select:focus,
            .spt-inventory-modal input:focus,
            .spt-inventory-modal select:focus {
                border-color: #67c1f5;
            }

            #spt-inventory-economy input[type="checkbox"],
            .spt-inventory-modal input[type="checkbox"] {
                min-height: 0;
                accent-color: #67c1f5;
            }

            .spt-inventory-filter-status {
                min-width: 0;
            }

            .spt-inventory-note {
                margin: 7px 0 0;
            }

            #inventories .itemHolder.spt-inventory-annotated {
                position: relative !important;
            }

            #inventories .itemHolder.spt-inventory-filter-hidden {
                display: none !important;
            }

            #inventories .itemHolder.spt-inventory-tile-selected {
                box-shadow:
                    inset 0 0 0 2px #67c1f5,
                    0 0 6px rgba(103, 193, 245, .55) !important;
            }

            #inventories .itemHolder.spt-inventory-tile-selectable {
                cursor: pointer;
            }

            .spt-inventory-tile-selection {
                position: absolute;
                inset: 0;
                z-index: 19;
                display: none;
                padding: 4px 6px;
                justify-content: flex-end;
                color: #fff;
                border: 2px solid #67c1f5;
                background: rgba(42, 101, 137, .32);
                font-size: 16px;
                font-weight: 700;
                line-height: 18px;
                pointer-events: none;
                text-shadow: 0 1px 2px #000;
            }

            #inventories .itemHolder.spt-inventory-tile-selected
            .spt-inventory-tile-selection {
                display: flex;
            }

            .spt-inventory-tile-price {
                position: absolute;
                right: 4px;
                bottom: 4px;
                left: 4px;
                z-index: 20;
                overflow: hidden;
                padding: 2px 3px;
                color: #d6f0ff;
                background: rgba(8, 19, 28, .88);
                font-size: 10px;
                line-height: 13px;
                pointer-events: none;
                text-align: center;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .spt-inventory-detail-price {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1px;
                margin-top: 10px;
                padding: 8px;
                border: 1px solid #29445c;
                background: #0d1721;
            }

            .spt-inventory-detail-heading,
            .spt-inventory-detail-note {
                grid-column: 1 / -1;
            }

            .spt-inventory-detail-heading {
                justify-content: space-between;
                margin-bottom: 4px;
                color: #d6d7d8;
            }

            .spt-inventory-detail-heading span {
                color: #7f98aa;
                font-size: 10px;
            }

            .spt-inventory-detail-metric {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                padding: 4px 6px;
                background: #142331;
            }

            .spt-inventory-detail-metric span {
                color: #7f98aa;
            }

            .spt-inventory-detail-metric strong {
                color: #67c1f5;
                font-weight: 400;
            }

            .spt-inventory-detail-note {
                margin-top: 5px;
            }

            .spt-inventory-modal-overlay {
                position: fixed;
                inset: 0;
                z-index: 100001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgba(0, 0, 0, .75);
                font-family: "Motiva Sans", Arial, sans-serif;
            }

            .spt-inventory-modal {
                display: flex;
                flex-direction: column;
                width: min(920px, calc(100vw - 32px));
                max-height: calc(100vh - 32px);
                color: #d6d7d8;
                border: 1px solid #2a475e;
                outline: none;
                background: #171a21;
                box-shadow: 0 0 18px #000;
            }

            .spt-inventory-modal.compact {
                width: min(440px, calc(100vw - 32px));
            }

            .spt-inventory-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 11px 14px;
                background: #20364a;
            }

            .spt-inventory-modal-header.danger {
                border-left: 4px solid #d79922;
            }

            .spt-inventory-modal-header h2 {
                margin: 0;
                color: #fff;
                font-size: 19px;
                font-weight: 400;
            }

            .spt-inventory-modal-close {
                padding: 0;
                color: #8f98a0;
                border: 0;
                background: transparent;
                font-size: 28px;
                cursor: pointer;
            }

            .spt-inventory-modal-body {
                overflow: auto;
                padding: 13px 15px;
            }

            .spt-inventory-modal-loading {
                display: flex;
                min-height: 42px;
                align-items: center;
                gap: 12px;
                color: #d6d7d8;
            }

            .spt-inventory-modal-loading
            .spt-inventory-loading-spinner {
                display: block;
                width: 20px;
                height: 20px;
                flex-basis: 20px;
                border-width: 3px;
            }

            .spt-inventory-modal-footer {
                justify-content: flex-end;
                padding: 10px 15px;
                background: #101319;
            }

            .spt-inventory-preview-scroll {
                overflow: auto;
                max-height: 430px;
                border: 1px solid #000;
            }

            .spt-inventory-preview-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }

            .spt-inventory-preview-table th {
                position: sticky;
                top: 0;
                z-index: 1;
                padding: 7px;
                color: #fff;
                background: #20364a;
                text-align: left;
            }

            .spt-inventory-preview-table td {
                padding: 6px 7px;
                border-top: 1px solid #26384a;
                vertical-align: middle;
            }

            .spt-inventory-preview-table tbody tr:nth-child(even) {
                background: #192635;
            }

            .spt-inventory-preview-totals,
            .spt-inventory-validation {
                margin-top: 10px;
            }

            .spt-inventory-small-input { width: 65px; }
            .spt-inventory-price-input { width: 105px; }

            .spt-inventory-agreement {
                margin-top: 12px;
                align-items: flex-start;
            }

            .spt-inventory-gem-list,
            .spt-inventory-progress-list {
                overflow: auto;
                max-height: 430px;
            }

            .spt-inventory-gem-row,
            .spt-inventory-progress-row {
                display: flex;
                gap: 9px;
                padding: 7px;
                border-top: 1px solid #26384a;
            }

            .spt-inventory-progress-row {
                flex-direction: column;
            }

            .spt-inventory-progress-row.confirmed { color: #a4d007; }

            .spt-inventory-progress-row.failed,
            .spt-inventory-progress-row.uncertain { color: #ff9b8d; }

            @media (max-width: 900px) {
                .spt-inventory-status { max-width: 300px; }
                .spt-inventory-summary { grid-template-columns: repeat(2, 1fr); }
                .spt-inventory-metric:nth-child(2) { border-right: 0; }
                .spt-inventory-metric:nth-child(-n + 2) {
                    border-bottom: 1px solid #223648;
                }
                .spt-inventory-filters { grid-template-columns: repeat(2, 1fr); }
            }
        `;
        document.head.appendChild(style);
    }

    return Object.freeze({ inject });
})();
