// Copyright (C) 2026 x0697x
(function () {
    'use strict';

    const STEAM_COMMUNITY_ORIGIN = 'https://steamcommunity.com';
    const STEAM_STORE_ORIGIN = 'https://store.steampowered.com';
    const STEAMSETS_PROFILE_ORIGIN = 'https://beta.steamsets.com';
    const STEAMSETS_BADGE_SEARCH_URL =
        'https://beta.steamsets.com/badges/search';
    const STEAM_ID64_ACCOUNT_BASE = 76561197960265728n;

    function parsePinnedSteamUrl(value, requiredOrigin, base = requiredOrigin) {
        try {
            const url = new URL(value, base);

            return url.origin === requiredOrigin ? url : null;
        } catch {
            return null;
        }
    }

    function requirePinnedSteamUrl(value, requiredOrigin, base) {
        const url = parsePinnedSteamUrl(value, requiredOrigin, base);

        if (!url) {
            const err = new Error(
                `Refusing a URL outside ${requiredOrigin}`
            );

            err.fatal = true;
            throw err;
        }

        return url;
    }

    function requirePinnedSteamResponseUrl(
        response,
        requiredOrigin,
        requestUrl
    ) {
        return requirePinnedSteamUrl(
            response.url || requestUrl,
            requiredOrigin,
            requestUrl
        );
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getSessionId() {
        if (window.g_sessionID) {
            return window.g_sessionID;
        }

        const match = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);

        return match ? decodeURIComponent(match[1]) : null;
    }

    function bindButtonActivation(element, handler) {
        element.addEventListener('click', handler);
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handler();
            }
        });
    }

    function buildSteamSetsProfileButton(profileUrl) {
        const promo = document.createElement('a');

        promo.id = 'spt-steamsets-profile';
        promo.href = profileUrl;
        promo.target = '_blank';
        promo.rel = 'noopener noreferrer';
        promo.referrerPolicy = 'no-referrer';
        promo.title = 'Open this Steam user on SteamSets';
        promo.setAttribute(
            'aria-label',
            'View this Steam user on SteamSets (opens in a new tab)'
        );
        promo.style.cssText =
            'display:inline-flex; align-items:center; align-self:center; gap:5px; width:auto; height:32px; box-sizing:border-box; padding:4px 7px 4px 5px; border:1px solid rgba(178,99,236,.42); border-radius:3px; background:rgba(13,12,19,.72); color:#fff; text-decoration:none; font-family:"Motiva Sans",Arial,sans-serif; flex:0 0 auto; transition:background-color .15s,border-color .15s,box-shadow .15s;';

        // Match the self-contained badge-search mark without fetching a
        // SteamSets image or other remote runtime asset.
        const icon = document.createElement('span');

        icon.setAttribute('aria-hidden', 'true');
        icon.style.cssText =
            'display:flex; width:21px; height:21px; flex:0 0 21px;';
        icon.innerHTML = `
            <svg viewBox="0 0 134 130" fill="none" style="display:block;width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
                <path d="M117.646 45.2406L133.817 107.179C134.569 110.018 132.939 112.341 130.181 112.341H65.4969C63.8671 112.341 63.7417 113.373 65.2462 114.535L66.1238 115.18C69.3835 117.89 69.0074 118.793 65.2462 117.245L33.4042 104.34C30.0191 102.92 30.0191 101.888 33.2789 101.888H72.3925C77.9089 101.888 81.1687 97.2418 79.7896 91.5636L67.7536 45.1115C67.0014 42.2724 68.6313 39.9495 71.3895 39.9495H111.506C114.136 40.0785 117.02 42.4014 117.646 45.2406Z" fill="url(#spt-steamsets-profile-gradient)"/>
                <path d="M16.3536 85.7563L.183 23.821C-.569 20.982 1.061 18.659 3.819 18.659H68.506C70.136 18.659 70.261 17.627 68.757 16.465L67.879 15.82C64.62 13.11 64.996 12.207 68.757 13.755L100.599 26.66C103.984 28.08 103.984 29.112 100.724 29.112H61.736C56.22 29.112 52.96 33.758 54.339 39.436L66.375 85.889C67.127 88.728 65.497 91.051 62.739 91.051H22.622C19.864 90.918 16.981 88.595 16.354 85.756Z" fill="url(#spt-steamsets-profile-gradient)"/>
                <defs>
                    <linearGradient id="spt-steamsets-profile-gradient" x1="0" y1="18.441" x2="133.051" y2="112.649" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#7652C9"/>
                        <stop offset="1" stop-color="#B263EC"/>
                    </linearGradient>
                </defs>
            </svg>
        `;

        const copy = document.createElement('span');

        copy.style.cssText =
            'display:flex; flex-direction:column; align-items:flex-start; line-height:1; white-space:nowrap;';

        const eyebrow = document.createElement('span');

        eyebrow.textContent = 'VIEW ON';
        eyebrow.style.cssText =
            'margin-bottom:1px; color:#9da4ad; font-size:6px; font-weight:600; line-height:6px; letter-spacing:.5px;';

        const wordmark = document.createElement('span');

        wordmark.style.cssText =
            'color:#fff; font-size:11px; font-weight:700; line-height:11px; letter-spacing:-.2px;';
        wordmark.appendChild(document.createTextNode('Steam'));

        const sets = document.createElement('span');

        sets.textContent = 'Sets';
        sets.style.color = '#a75ce5';
        wordmark.appendChild(sets);

        copy.appendChild(eyebrow);
        copy.appendChild(wordmark);
        promo.appendChild(icon);
        promo.appendChild(copy);

        function setHighlighted(isHighlighted) {
            promo.style.background = isHighlighted
                ? 'rgba(48,38,68,.92)'
                : 'rgba(13,12,19,.72)';
            promo.style.borderColor = isHighlighted
                ? 'rgba(178,99,236,.8)'
                : 'rgba(178,99,236,.42)';
            promo.style.boxShadow = isHighlighted
                ? '0 0 0 1px rgba(118,82,201,.18)'
                : '';
        }

        promo.addEventListener('mouseenter', () => setHighlighted(true));
        promo.addEventListener('mouseleave', () => setHighlighted(false));
        promo.addEventListener('focus', () => setHighlighted(true));
        promo.addEventListener('blur', () => setHighlighted(false));

        return promo;
    }

    function initSteamProfileTools() {
        if (
            !/^\/(?:id\/[^/]+|profiles\/\d+)\/?$/i
                .test(location.pathname)
        ) {
            return;
        }

        function getProfileSteamId() {
            const numericPath = location.pathname.match(
                /^\/profiles\/(\d{17})\/?$/i
            );

            if (numericPath) {
                return numericPath[1];
            }

            const pageSteamId = String(
                window.g_rgProfileData?.steamid || ''
            );

            if (/^\d{17}$/.test(pageSteamId)) {
                return pageSteamId;
            }

            const avatar = document.querySelector(
                '.profile_header [data-miniprofile]'
            );
            const accountIdText = avatar?.getAttribute('data-miniprofile')
                || '';

            if (!/^\d{1,10}$/.test(accountIdText)) {
                return null;
            }

            const accountId = BigInt(accountIdText);

            if (accountId > 0xffffffffn) {
                return null;
            }

            return (STEAM_ID64_ACCOUNT_BASE + accountId).toString();
        }

        function insertProfileButton() {
            if (document.getElementById('spt-steamsets-profile')) {
                return true;
            }

            const actions = document.querySelector(
                '.profile_header_actions'
            );
            const steamId = getProfileSteamId();

            if (!actions || !steamId) {
                return false;
            }

            const profileUrl = new URL(
                `/account/${steamId}`,
                STEAMSETS_PROFILE_ORIGIN
            );
            const button = buildSteamSetsProfileButton(profileUrl);
            const popup = actions.querySelector('.popup_block');

            actions.insertBefore(button, popup);

            return true;
        }

        // Profile metadata and actions can finish rendering after the content
        // script starts. Poll briefly and keep insertion idempotent.
        let attempts = 0;

        const interval = setInterval(() => {
            attempts += 1;

            if (insertProfileButton() || attempts > 20) {
                clearInterval(interval);
            }
        }, 250);
    }

    if (location.origin === STEAM_COMMUNITY_ORIGIN) {
        initSteamProfileTools();
        initBadgesPageTools();
        initFriendsPageTools();
    } else if (location.origin === STEAM_STORE_ORIGIN) {
        initSearchBulkCart();
    }

    // Friends page tools.
    function initFriendsPageTools() {
        if (
            !/^\/(?:my\/friends|id\/[^/]+\/friends|profiles\/\d+\/friends)\/?$/i
                .test(location.pathname)
        ) {
            return;
        }

        const COMMENT_DELAY_MS = 5 * 1000;
        const FAILURE_DELAY_MS = 20 * 1000;
        const COOLDOWN_MIN_MS = 10 * 1000;
        const COOLDOWN_MAX_MS = 15 * 1000;
        const MAX_COOLDOWN_RETRIES = 3;
        const COMMENT_LOCK_KEY = 'spt-friends-comment-lock';
        const COMMENT_LOCK_TTL_MS = 30 * 1000;
        const lockOwner =
            `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let lockHeartbeat = null;
        let stopRequested = false;

        injectFriendsCommentStyles();

        let scanAttempts = 0;
        const scanInterval = setInterval(() => {
            scanAttempts += 1;

            const titleBar = document.querySelector(
                '.profile_friends.title_bar'
            );

            if (titleBar) {
                addFriendsCommentButton(titleBar);
                clearInterval(scanInterval);
            } else if (scanAttempts >= 40) {
                clearInterval(scanInterval);
            }
        }, 250);

        function getFriends() {
            const friends = new Map();

            document
                .querySelectorAll('.friend_block_v2[data-steamid]')
                .forEach((row) => {
                    const steamid = row.dataset.steamid;

                    if (!/^\d{17}$/.test(steamid || '')) {
                        return;
                    }

                    const nameElement = row.querySelector(
                        '.friend_block_content'
                    );
                    const nameNode = nameElement
                        ? [...nameElement.childNodes].find(
                            (node) => node.nodeType === 3 &&
                                node.textContent.trim()
                        )
                        : null;
                    const name = nameNode
                        ? nameNode.textContent.trim()
                        : `Steam ${steamid}`;
                    const avatarElement = row.querySelector(
                        '.player_avatar img'
                    );
                    const avatarUrl = avatarElement
                        ? String(
                            avatarElement.currentSrc ||
                            avatarElement.getAttribute('src') ||
                            ''
                        )
                        : '';

                    friends.set(steamid, { steamid, name, avatarUrl });
                });

            return [...friends.values()];
        }

        function readCommentLock() {
            try {
                return JSON.parse(
                    localStorage.getItem(COMMENT_LOCK_KEY) || 'null'
                );
            } catch {
                return null;
            }
        }

        function writeCommentLock() {
            try {
                localStorage.setItem(
                    COMMENT_LOCK_KEY,
                    JSON.stringify({ owner: lockOwner, time: Date.now() })
                );

                return readCommentLock()?.owner === lockOwner;
            } catch (err) {
                console.error(
                    'Steam Page Tools: failed to write friends comment lock',
                    err
                );
                return false;
            }
        }

        function acquireCommentLock() {
            const lock = readCommentLock();

            if (
                lock &&
                lock.owner !== lockOwner &&
                Number.isFinite(lock.time) &&
                Date.now() - lock.time < COMMENT_LOCK_TTL_MS
            ) {
                return false;
            }

            if (!writeCommentLock()) {
                return false;
            }

            lockHeartbeat = setInterval(writeCommentLock, 10 * 1000);
            return true;
        }

        function releaseCommentLock() {
            if (lockHeartbeat !== null) {
                clearInterval(lockHeartbeat);
                lockHeartbeat = null;
            }

            try {
                if (readCommentLock()?.owner === lockOwner) {
                    localStorage.removeItem(COMMENT_LOCK_KEY);
                }
            } catch (err) {
                console.warn(
                    'Steam Page Tools: failed to release friends comment lock',
                    err
                );
            }
        }

        function getRetryAfterMs(response) {
            const value = response.headers.get('Retry-After');

            if (!value) {
                return 0;
            }

            const seconds = Number(value);

            if (Number.isFinite(seconds) && seconds >= 0) {
                return seconds * 1000;
            }

            const time = Date.parse(value);

            return Number.isFinite(time)
                ? Math.max(0, time - Date.now())
                : 0;
        }

        function isCommentDisabledError(message) {
            return /comments?.*(?:disabled|private|not\s+allowed|not\s+permitted)|(?:does\s+not|doesn't|do\s+not|don't).*allow.*comments?|settings?.*allow.*comments?|not\s+allowed\s+to\s+(?:add\s+)?comments?|permission.*comments?|comment\s+privileges?|blocked/i
                .test(message);
        }

        function isCooldownError(response, message) {
            return response.status === 429 || /too\s+many|rate[\s-]?limit|slow\s+down|too\s+(?:frequently|often)|try\s+again\s+(?:in|later)|temporarily|cooldown/i
                .test(message);
        }

        async function postProfileComment(friend, comment, sessionid) {
            const postUrl = requirePinnedSteamUrl(
                `/comment/Profile/post/${friend.steamid}/-1/`,
                STEAM_COMMUNITY_ORIGIN
            );

            // Ask Steam for stable English error strings so cooldown and
            // privacy-setting responses can be classified on any locale.
            postUrl.searchParams.set('l', 'english');

            const body = new URLSearchParams({
                comment,
                count: '6',
                sessionid,
                feature2: '-1',
            });
            const response = await fetch(postUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: body.toString(),
            });

            requirePinnedSteamResponseUrl(
                response,
                STEAM_COMMUNITY_ORIGIN,
                postUrl
            );

            let result = null;

            try {
                result = await response.json();
            } catch {
                // Steam can return an HTML error page for expired sessions.
            }

            if (response.ok && result?.success) {
                return;
            }

            const message = String(
                result?.error || `Steam returned HTTP ${response.status}`
            ).trim();
            const err = new Error(message);

            err.commentDisabled = isCommentDisabledError(message);
            err.cooldown =
                !err.commentDisabled && isCooldownError(response, message);
            err.cooldownMs = Math.max(
                getRetryAfterMs(response),
                COOLDOWN_MIN_MS + Math.floor(
                    Math.random() *
                    (COOLDOWN_MAX_MS - COOLDOWN_MIN_MS + 1)
                )
            );
            throw err;
        }

        function addFriendsCommentButton(titleBar) {
            if (document.querySelector('#spt-friends-comment-button')) {
                return;
            }

            const button = document.createElement('button');

            button.id = 'spt-friends-comment-button';
            button.type = 'button';
            button.className =
                'profile_friends manage_link ' +
                'btnv6_blue_hoverfade btn_medium';

            const label = document.createElement('span');

            label.textContent = 'Comment friends';
            button.appendChild(label);
            button.addEventListener('click', openFriendsCommentDialog);

            const addButton = titleBar.querySelector('#add_friends_button');

            titleBar.insertBefore(button, addButton || null);
        }

        function openFriendsCommentDialog() {
            if (document.querySelector('#spt-friends-comment-overlay')) {
                return;
            }

            const friends = getFriends();

            if (!friends.length) {
                window.alert(
                    'Steam Page Tools could not find any friends on this page.'
                );
                return;
            }

            stopRequested = false;

            const overlay = document.createElement('div');

            overlay.id = 'spt-friends-comment-overlay';

            const dialog = document.createElement('div');

            dialog.id = 'spt-friends-comment-dialog';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'spt-friends-comment-title');

            const header = document.createElement('div');

            header.className = 'spt-friends-comment-header';

            const title = document.createElement('div');

            title.id = 'spt-friends-comment-title';
            title.textContent = 'Post a comment to friends';

            const closeButton = document.createElement('button');

            closeButton.type = 'button';
            closeButton.className = 'spt-friends-comment-close';
            closeButton.textContent = '\u00d7';
            closeButton.title = 'Close';
            closeButton.setAttribute('aria-label', 'Close');

            header.appendChild(title);
            header.appendChild(closeButton);

            const content = document.createElement('div');

            content.className = 'spt-friends-comment-content';

            const description = document.createElement('p');

            const pace = document.createElement('p');

            pace.className = 'spt-friends-comment-note';
            pace.textContent =
                'There is a 5-second delay between comments. Profiles that ' +
                'do not accept comments are skipped automatically.';

            const selectedSteamIds = new Set();
            const selector = document.createElement('section');

            selector.className = 'spt-friends-selector';
            selector.setAttribute(
                'aria-labelledby',
                'spt-friends-selector-title'
            );

            const selectorHeader = document.createElement('div');

            selectorHeader.className = 'spt-friends-selector-header';

            const selectorTitle = document.createElement('div');

            selectorTitle.id = 'spt-friends-selector-title';
            selectorTitle.className = 'spt-friends-selector-title';
            selectorTitle.textContent = 'Choose friends';

            const selectionCount = document.createElement('div');

            selectionCount.className = 'spt-friends-selection-count';
            selectionCount.setAttribute('aria-live', 'polite');

            selectorHeader.appendChild(selectorTitle);
            selectorHeader.appendChild(selectionCount);

            const selectorControls = document.createElement('div');

            selectorControls.className = 'spt-friends-selector-controls';

            const friendSearch = document.createElement('input');

            friendSearch.type = 'search';
            friendSearch.className = 'spt-friends-search';
            friendSearch.placeholder = 'Search friends...';
            friendSearch.autocomplete = 'off';
            friendSearch.spellcheck = false;
            friendSearch.setAttribute('aria-label', 'Search friends');

            const selectShownButton = makeDialogButton(
                'Select shown',
                false
            );
            const clearShownButton = makeDialogButton(
                'Clear shown',
                false
            );

            selectShownButton.title =
                'Select every friend matching the current search';
            clearShownButton.title =
                'Clear every friend matching the current search';

            selectorControls.appendChild(friendSearch);
            selectorControls.appendChild(selectShownButton);
            selectorControls.appendChild(clearShownButton);

            const friendList = document.createElement('div');

            friendList.className = 'spt-friends-selector-list';
            friendList.setAttribute('role', 'group');
            friendList.setAttribute(
                'aria-label',
                'Friends who will receive the profile comment'
            );

            const friendOptions = friends.map((friend) => {
                const row = document.createElement('label');

                row.className = 'spt-friends-selector-row';

                const checkbox = document.createElement('input');

                checkbox.type = 'checkbox';
                checkbox.value = friend.steamid;
                checkbox.checked = false;
                checkbox.setAttribute(
                    'aria-label',
                    `Post the comment to ${friend.name}`
                );

                let avatar;

                if (friend.avatarUrl) {
                    avatar = document.createElement('img');
                    avatar.src = friend.avatarUrl;
                    avatar.alt = '';
                    avatar.loading = 'lazy';
                    avatar.referrerPolicy = 'no-referrer';
                } else {
                    avatar = document.createElement('span');
                    avatar.textContent = friend.name.slice(0, 1);
                    avatar.setAttribute('aria-hidden', 'true');
                }

                avatar.className = 'spt-friends-selector-avatar';

                const name = document.createElement('span');

                name.className = 'spt-friends-selector-name';
                name.textContent = friend.name;

                row.appendChild(checkbox);
                row.appendChild(avatar);
                row.appendChild(name);
                friendList.appendChild(row);

                return {
                    checkbox,
                    friend,
                    row,
                    searchText: normalizeFriendSearch(friend.name),
                };
            });

            const noFriendMatches = document.createElement('div');

            noFriendMatches.className = 'spt-friends-selector-empty';
            noFriendMatches.textContent = 'No friends match this search.';
            noFriendMatches.hidden = true;
            friendList.appendChild(noFriendMatches);

            selector.appendChild(selectorHeader);
            selector.appendChild(selectorControls);
            selector.appendChild(friendList);

            const textarea = document.createElement('textarea');

            textarea.id = 'spt-friends-comment-text';
            textarea.className = 'commentthread_textarea';
            textarea.rows = 5;
            textarea.maxLength = 1000;
            textarea.placeholder = 'Enter the profile comment to post';
            textarea.setAttribute('aria-label', 'Profile comment');

            const characterCount = document.createElement('div');

            characterCount.className = 'spt-friends-character-count';
            characterCount.textContent = '0 / 1000';

            const progress = document.createElement('div');

            progress.className = 'spt-friends-progress';
            progress.hidden = true;

            const progressTrack = document.createElement('div');

            progressTrack.className = 'spt-friends-progress-track';

            const progressFill = document.createElement('div');

            progressFill.className = 'spt-friends-progress-fill';
            progressTrack.appendChild(progressFill);

            const counters = document.createElement('div');

            counters.className = 'spt-friends-counters';

            const status = document.createElement('div');

            status.className = 'spt-friends-comment-status';
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');

            progress.appendChild(progressTrack);
            progress.appendChild(counters);
            progress.appendChild(status);

            const actions = document.createElement('div');

            actions.className = 'spt-friends-comment-actions';

            const cancelButton = makeDialogButton('Cancel', false);
            const startButton = makeDialogButton('Start posting', true);
            const stopButton = makeDialogButton('Stop after current', false);

            stopButton.hidden = true;
            actions.appendChild(cancelButton);
            actions.appendChild(stopButton);
            actions.appendChild(startButton);

            content.appendChild(description);
            content.appendChild(pace);
            content.appendChild(selector);
            content.appendChild(textarea);
            content.appendChild(characterCount);
            content.appendChild(progress);
            content.appendChild(actions);
            dialog.appendChild(header);
            dialog.appendChild(content);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            let running = false;

            function makeDialogButton(text, primary) {
                const button = document.createElement('button');

                button.type = 'button';
                button.className = primary
                    ? 'btnv6_blue_hoverfade btn_medium'
                    : 'btn_grey_white_innerfade btn_medium';

                const label = document.createElement('span');

                label.textContent = text;
                button.appendChild(label);
                return button;
            }

            function normalizeFriendSearch(value) {
                return String(value || '')
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLocaleLowerCase();
            }

            let visibleFriendCount = friends.length;

            function updateSelectionSummary() {
                const selectedCount = selectedSteamIds.size;

                description.textContent =
                    'The same public profile comment will be posted to ' +
                    `${selectedCount} selected friend(s), one at a time.`;
                selectionCount.textContent =
                    `${selectedCount} selected · ` +
                    `${visibleFriendCount} shown`;
                startButton.disabled = selectedCount === 0;
            }

            function applyFriendFilter() {
                const query = normalizeFriendSearch(friendSearch.value);

                visibleFriendCount = 0;

                friendOptions.forEach((option) => {
                    const isVisible =
                        !query || option.searchText.includes(query);

                    option.row.hidden = !isVisible;
                    visibleFriendCount += isVisible ? 1 : 0;
                });

                noFriendMatches.hidden = visibleFriendCount !== 0;
                updateSelectionSummary();
            }

            function setShownFriendsSelected(selected) {
                friendOptions.forEach((option) => {
                    if (option.row.hidden) {
                        return;
                    }

                    option.checkbox.checked = selected;

                    if (selected) {
                        selectedSteamIds.add(option.friend.steamid);
                    } else {
                        selectedSteamIds.delete(option.friend.steamid);
                    }
                });

                updateSelectionSummary();
            }

            function disableFriendSelector() {
                friendSearch.disabled = true;
                selectShownButton.disabled = true;
                clearShownButton.disabled = true;

                friendOptions.forEach((option) => {
                    option.checkbox.disabled = true;
                });
            }

            function closeDialog() {
                if (!running) {
                    document.removeEventListener('keydown', onKeyDown);
                    overlay.remove();
                }
            }

            function onKeyDown(event) {
                if (event.key !== 'Escape' || running) {
                    return;
                }

                closeDialog();
            }

            function setStatus(text) {
                status.textContent = text;
            }

            function setCounters(posted, skipped, failed) {
                counters.textContent =
                    `Posted: ${posted}  |  Skipped: ${skipped}  |  ` +
                    `Failed: ${failed}`;
            }

            function setProgress(completed, total) {
                const percentage = total
                    ? (completed / total) * 100
                    : 0;

                progressFill.style.width = `${percentage}%`;
            }

            async function waitWithStatus(milliseconds, label) {
                const endTime = Date.now() + milliseconds;

                while (!stopRequested && Date.now() < endTime) {
                    const seconds = Math.ceil(
                        (endTime - Date.now()) / 1000
                    );

                    setStatus(`${label} ${seconds}s...`);
                    await sleep(Math.min(1000, endTime - Date.now()));
                }

                return !stopRequested;
            }

            async function run() {
                const comment = textarea.value.trim();

                if (!comment) {
                    setStatus('Enter a comment before starting.');
                    textarea.focus();
                    return;
                }

                const selectedFriends = friends.filter((friend) =>
                    selectedSteamIds.has(friend.steamid)
                );

                if (!selectedFriends.length) {
                    setStatus('Select at least one friend before starting.');
                    friendSearch.focus();
                    return;
                }

                const sessionid = getSessionId();

                if (!sessionid) {
                    setStatus(
                        'Could not find your Steam session ID. Refresh the page and try again.'
                    );
                    return;
                }

                const confirmed = window.confirm(
                    `Post this comment publicly to ${selectedFriends.length} ` +
                    'friend profile(s)?\n\n' +
                    'The run can take a long time. You can stop it after the ' +
                    'current request, but comments already posted will remain.'
                );

                if (!confirmed) {
                    return;
                }

                if (!acquireCommentLock()) {
                    setStatus(
                        'Another friends-comment run is already active in a Steam tab.'
                    );
                    return;
                }

                running = true;
                textarea.disabled = true;
                disableFriendSelector();
                startButton.hidden = true;
                cancelButton.hidden = true;
                closeButton.disabled = true;
                stopButton.hidden = false;
                progress.hidden = false;

                let posted = 0;
                let skipped = 0;
                let failed = 0;
                let completed = 0;
                let stoppedForCooldown = false;

                setCounters(posted, skipped, failed);

                try {
                    for (
                        let index = 0;
                        index < selectedFriends.length;
                        index += 1
                    ) {
                        if (stopRequested) {
                            break;
                        }

                        const friend = selectedFriends[index];
                        let cooldownRetries = 0;
                        let handled = false;
                        let failedRequest = false;

                        while (!stopRequested && !handled) {
                            setStatus(
                                `Posting ${index + 1} of ` +
                                `${selectedFriends.length}: ` +
                                `${friend.name}...`
                            );

                            try {
                                await postProfileComment(
                                    friend,
                                    comment,
                                    sessionid
                                );
                                posted += 1;
                                handled = true;
                            } catch (err) {
                                console.error(
                                    'Steam Page Tools: failed to post profile comment',
                                    friend.steamid,
                                    err
                                );

                                if (err.cooldown) {
                                    cooldownRetries += 1;

                                    if (
                                        cooldownRetries >
                                        MAX_COOLDOWN_RETRIES
                                    ) {
                                        stoppedForCooldown = true;
                                        stopRequested = true;
                                        break;
                                    }

                                    const cooldownSeconds = Math.ceil(
                                        err.cooldownMs / 1000
                                    );
                                    const canContinue = await waitWithStatus(
                                        err.cooldownMs,
                                        `Steam requested a cooldown. Retrying ` +
                                        `${friend.name} in`
                                    );

                                    if (!canContinue) {
                                        break;
                                    }

                                    setStatus(
                                        `Cooldown of ${cooldownSeconds}s finished.`
                                    );
                                    continue;
                                }

                                if (err.commentDisabled) {
                                    skipped += 1;
                                } else {
                                    failed += 1;
                                    failedRequest = true;
                                }

                                handled = true;
                            }
                        }

                        if (handled) {
                            completed += 1;
                            setProgress(
                                completed,
                                selectedFriends.length
                            );
                            setCounters(posted, skipped, failed);
                        }

                        if (
                            !stopRequested &&
                            index < selectedFriends.length - 1
                        ) {
                            await waitWithStatus(
                                failedRequest
                                    ? FAILURE_DELAY_MS
                                    : COMMENT_DELAY_MS,
                                failedRequest
                                    ? `Failed on ${friend.name}. ` +
                                        'Continuing with the next profile in'
                                    : 'Waiting before the next profile:'
                            );
                        }
                    }

                    if (stoppedForCooldown) {
                        setStatus(
                            'Stopped after Steam kept requesting a cooldown. ' +
                            'Wait before starting a new run.'
                        );
                    } else if (stopRequested) {
                        setStatus(
                            `Stopped. ${posted} posted, ${skipped} skipped, ` +
                            `${failed} failed.`
                        );
                    } else {
                        setStatus(
                            `Finished. ${posted} posted, ${skipped} skipped, ` +
                            `${failed} failed.`
                        );
                    }
                } finally {
                    releaseCommentLock();
                    running = false;
                    stopButton.hidden = true;
                    closeButton.disabled = false;
                    cancelButton.hidden = false;
                    cancelButton.querySelector('span').textContent = 'Close';
                }
            }

            textarea.addEventListener('input', () => {
                characterCount.textContent =
                    `${textarea.value.length} / ${textarea.maxLength}`;
            });
            friendOptions.forEach((option) => {
                option.checkbox.addEventListener('change', () => {
                    if (option.checkbox.checked) {
                        selectedSteamIds.add(option.friend.steamid);
                    } else {
                        selectedSteamIds.delete(option.friend.steamid);
                    }

                    updateSelectionSummary();
                });
            });
            friendSearch.addEventListener('input', applyFriendFilter);
            selectShownButton.addEventListener('click', () => {
                setShownFriendsSelected(true);
            });
            clearShownButton.addEventListener('click', () => {
                setShownFriendsSelected(false);
            });
            closeButton.addEventListener('click', closeDialog);
            cancelButton.addEventListener('click', closeDialog);
            startButton.addEventListener('click', run);
            stopButton.addEventListener('click', () => {
                stopRequested = true;
                stopButton.disabled = true;
                stopButton.querySelector('span').textContent = 'Stopping...';
                setStatus('Stopping after the current request...');
            });
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    closeDialog();
                }
            });
            document.addEventListener('keydown', onKeyDown);

            applyFriendFilter();
            textarea.focus();
        }

        function injectFriendsCommentStyles() {
            if (document.querySelector('#spt-friends-comment-styles')) {
                return;
            }

            const style = document.createElement('style');

            style.id = 'spt-friends-comment-styles';
            style.textContent = `
                #spt-friends-comment-button {
                    flex: 0 0 auto;
                    margin-right: 10px;
                }

                #spt-friends-comment-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    box-sizing: border-box;
                    background: rgba(0, 0, 0, 0.72);
                    font-family: "Motiva Sans", Arial, sans-serif;
                }

                #spt-friends-comment-dialog {
                    display: flex;
                    flex-direction: column;
                    width: min(660px, calc(100vw - 32px));
                    max-height: calc(100vh - 32px);
                    color: #d6d7d8;
                    background: #171a21;
                    border: 1px solid #2a475e;
                    box-shadow: 0 0 18px #000000;
                }

                .spt-friends-comment-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-height: 48px;
                    padding: 0 16px;
                    color: #ffffff;
                    background: linear-gradient(
                        90deg,
                        rgba(42, 71, 94, 0.95),
                        rgba(27, 40, 56, 0.95)
                    );
                    font-size: 20px;
                    font-weight: 300;
                }

                .spt-friends-comment-close {
                    border: 0;
                    padding: 0 3px 5px;
                    color: #8f98a0;
                    background: transparent;
                    cursor: pointer;
                    font: 30px/1 Arial, sans-serif;
                }

                .spt-friends-comment-close:hover:not(:disabled) {
                    color: #ffffff;
                }

                .spt-friends-comment-close:disabled {
                    cursor: default;
                    opacity: 0.4;
                }

                .spt-friends-comment-content {
                    overflow-y: auto;
                    padding: 18px;
                    font-size: 14px;
                    line-height: 1.45;
                }

                .spt-friends-comment-content p {
                    margin: 0 0 10px;
                }

                .spt-friends-comment-note {
                    color: #8f98a0;
                    font-size: 12px;
                }

                .spt-friends-selector {
                    margin-top: 14px;
                    overflow: hidden;
                    background: #101820;
                    border: 1px solid #000000;
                    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.65);
                }

                .spt-friends-selector-header {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 9px 10px 7px;
                    background: rgba(42, 71, 94, 0.42);
                }

                .spt-friends-selector-title {
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 500;
                }

                .spt-friends-selection-count {
                    color: #8f98a0;
                    font-size: 11px;
                    text-align: right;
                }

                .spt-friends-selector-controls {
                    display: grid;
                    grid-template-columns: minmax(140px, 1fr) auto auto;
                    gap: 6px;
                    padding: 8px;
                    background: #16202b;
                    border-top: 1px solid rgba(103, 193, 241, 0.1);
                }

                .spt-friends-search {
                    box-sizing: border-box;
                    min-width: 0;
                    height: 28px;
                    padding: 4px 8px;
                    color: #d6d7d8;
                    background: #222b35;
                    border: 1px solid #000000;
                    border-radius: 2px;
                    box-shadow: inset 0 0 4px #000000;
                    font: 12px/1.4 "Motiva Sans", Arial, sans-serif;
                }

                .spt-friends-search:focus {
                    border-color: #67c1f1;
                    outline: 0;
                }

                .spt-friends-search::placeholder {
                    color: #6f7882;
                }

                .spt-friends-selector-controls .btn_medium {
                    margin: 0;
                    white-space: nowrap;
                }

                .spt-friends-selector-list {
                    max-height: 220px;
                    overflow-y: auto;
                    scrollbar-color: #4b667a #17212b;
                }

                .spt-friends-selector-row {
                    display: grid;
                    grid-template-columns: 18px 34px minmax(0, 1fr);
                    align-items: center;
                    gap: 9px;
                    min-height: 42px;
                    padding: 4px 10px;
                    color: #c7d5e0;
                    background: rgba(27, 40, 56, 0.58);
                    border-top: 1px solid rgba(255, 255, 255, 0.025);
                    cursor: pointer;
                    box-sizing: border-box;
                }

                .spt-friends-selector-row:nth-child(even) {
                    background: rgba(34, 49, 65, 0.58);
                }

                .spt-friends-selector-row:hover {
                    color: #ffffff;
                    background: rgba(42, 71, 94, 0.82);
                }

                .spt-friends-selector-row input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    margin: 0;
                    cursor: pointer;
                }

                .spt-friends-selector-row input[type="checkbox"]:disabled {
                    cursor: default;
                    opacity: 0.55;
                }

                .spt-friends-selector-avatar {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    overflow: hidden;
                    color: #67c1f1;
                    background: #1b2838;
                    border: 1px solid #3f5364;
                    object-fit: cover;
                    box-sizing: border-box;
                    font-size: 14px;
                    text-transform: uppercase;
                }

                .spt-friends-selector-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .spt-friends-selector-empty {
                    padding: 18px 10px;
                    color: #8f98a0;
                    text-align: center;
                    font-size: 12px;
                }

                .spt-friends-selector-row[hidden],
                .spt-friends-selector-empty[hidden] {
                    display: none;
                }

                #spt-friends-comment-text {
                    display: block;
                    box-sizing: border-box;
                    width: 100%;
                    min-height: 110px;
                    margin-top: 14px;
                    padding: 10px;
                    resize: vertical;
                    overflow: auto;
                    color: #d6d7d8;
                    background: #222b35;
                    border: 1px solid #000000;
                    border-radius: 2px;
                    box-shadow: inset 0 0 4px #000000;
                    font: 14px/1.4 "Motiva Sans", Arial, sans-serif;
                }

                #spt-friends-comment-text:focus {
                    border-color: #67c1f1;
                    outline: 0;
                }

                #spt-friends-comment-text:disabled {
                    opacity: 0.65;
                }

                .spt-friends-character-count {
                    margin-top: 4px;
                    color: #8f98a0;
                    text-align: right;
                    font-size: 11px;
                }

                .spt-friends-progress {
                    margin-top: 14px;
                }

                .spt-friends-progress-track {
                    height: 8px;
                    overflow: hidden;
                    background: #0e141b;
                    border: 1px solid #000000;
                }

                .spt-friends-progress-fill {
                    width: 0;
                    height: 100%;
                    background: linear-gradient(90deg, #1a9fff, #66c0f4);
                    transition: width 0.2s ease;
                }

                .spt-friends-counters {
                    margin-top: 8px;
                    color: #8f98a0;
                    font-size: 12px;
                }

                .spt-friends-comment-status {
                    min-height: 38px;
                    margin-top: 6px;
                    color: #c7d5e0;
                    font-size: 12px;
                }

                .spt-friends-comment-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 16px;
                }

                .spt-friends-comment-actions button[hidden],
                .spt-friends-progress[hidden] {
                    display: none;
                }

                @media (max-width: 600px) {
                    .spt-friends-selector-controls {
                        grid-template-columns: 1fr 1fr;
                    }

                    .spt-friends-search {
                        grid-column: 1 / -1;
                    }
                }
            `;

            document.head.appendChild(style);
        }
    }



    // Badge page tools.
    function initBadgesPageTools() {
        if (
            !/^\/(?:id\/[^/]+|profiles\/\d+)\/badges\/?$/i
                .test(location.pathname)
        ) {
            return;
        }

        // Prefer locale-independent markers; use English text only when
        // neither structural marker is available.
        const DROPS_REGEX_FALLBACK = /(\d+)\s*card drops?\s*remaining/i;

        function getRows(root = document) {
            return [...root.querySelectorAll('.badge_row')];
        }

        function normalizeBadgeSearchText(value) {
            return String(value || '')
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
        }

        function createBadgeSearchTermPattern(term) {
            const escapedTerm = term.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
            );

            return new RegExp(
                `(?:^|[^\\p{L}\\p{N}])${escapedTerm}`,
                'u'
            );
        }

        // A badge_info_title is rendered only when this profile owns the
        // badge. Index both its badge name and the parent game/event title.
        function getOwnedBadgeSearchText(row) {
            const badgeName = row.querySelector(
                '.badge_info_title'
            )?.textContent.trim();

            if (!badgeName) {
                return null;
            }

            const title = row.querySelector('.badge_title');
            const gameName = title
                ? [...title.childNodes]
                    .filter((node) => node.nodeType === 3)
                    .map((node) => node.textContent.trim())
                    .find(Boolean) || ''
                : '';

            return normalizeBadgeSearchText(
                `${gameName} ${badgeName}`
            );
        }

        // Steam renders the "Play Game" control only while a badge has card
        // drops. Its CSS class is stable across interface languages.
        function hasDropsRemaining(row) {
            if (row.querySelector('.badge_title_playgame, .badge_title_stats_playgame')) {
                return true;
            }

            if (row.querySelector('.badge_title_stats_completed')) {
                return false;
            }

            // Fall back to Steam's English status text for ambiguous rows.
            return DROPS_REGEX_FALLBACK.test(row.textContent);
        }

        function getCurrentPageNumber() {
            const page = parseInt(
                requirePinnedSteamUrl(
                    location.href,
                    STEAM_COMMUNITY_ORIGIN
                ).searchParams.get('p') || '1',
                10
            );

            return page > 0 ? page : 1;
        }

        function buildPageUrl(pageNum) {
            const url = requirePinnedSteamUrl(
                location.href,
                STEAM_COMMUNITY_ORIGIN
            );

            url.searchParams.set('p', pageNum);

            return url.toString();
        }

        async function fetchPageRows(pageNum) {
            const pageUrl = requirePinnedSteamUrl(
                buildPageUrl(pageNum),
                STEAM_COMMUNITY_ORIGIN
            );
            const res = await fetch(pageUrl, { credentials: 'include' });

            requirePinnedSteamResponseUrl(
                res,
                STEAM_COMMUNITY_ORIGIN,
                pageUrl
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            return getRows(doc);
        }

        // Read Steam's pagination instead of inferring the page count from
        // fetched content. Callers include the current page, which is a span.
        function getMaxPageFromPagination() {
            const here = requirePinnedSteamUrl(
                location.href,
                STEAM_COMMUNITY_ORIGIN
            );

            const values = [...document.querySelectorAll('a[href*="p="]')]
                .map((a) => {
                    try {
                        const url = parsePinnedSteamUrl(
                            a.href,
                            STEAM_COMMUNITY_ORIGIN,
                            location.href
                        );

                        if (!url || url.pathname !== here.pathname) {
                            return NaN;
                        }

                        return parseInt(url.searchParams.get('p'), 10);
                    } catch {
                        return NaN;
                    }
                })
                .filter((n) => Number.isFinite(n) && n > 0);

            return values.length ? Math.max(...values) : null;
        }

        // Prevent runaway scans if Steam returns malformed pagination.
        const MAX_PAGES = 200;
        const MAX_CRAFT_PASSES = 10;
        const MAX_CRAFT_BATCHES = 500;
        const CRAFT_LOCK_KEY = 'spt-badge-auto-craft-lock';
        const CRAFT_LOCK_TTL_MS = 60 * 1000;
        const craftLockOwner =
            `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let craftLockUsesStorage = true;

        async function fetchPageRowsWithRetry(pageNum) {
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    return await fetchPageRows(pageNum);
                } catch (err) {
                    console.error(
                        'Steam Page Tools: failed loading badge page',
                        pageNum,
                        err
                    );

                    if (attempt === 0) {
                        await sleep(500);
                    }
                }
            }

            return null;
        }

        function getProfileUrlFromUrl(url) {
            if (!url) {
                return null;
            }

            try {
                const parsed = parsePinnedSteamUrl(
                    url,
                    STEAM_COMMUNITY_ORIGIN,
                    location.href
                );

                if (!parsed) {
                    return null;
                }

                const match = parsed.pathname.match(
                    /^\/(?:id\/[^/]+|profiles\/\d+)/i
                );

                return match
                    ? `${STEAM_COMMUNITY_ORIGIN}${match[0]}`
                    : null;
            } catch {
                return null;
            }
        }

        function normalizeProfileUrl(url) {
            const profileUrl = getProfileUrlFromUrl(url);

            return profileUrl ? profileUrl.toLowerCase() : null;
        }

        const profileUrl =
            getProfileUrlFromUrl(window.g_strProfileURL) ||
            getProfileUrlFromUrl(location.href);

        // The metadata matches every profile, so compare numeric IDs or the
        // signed-in profile link before exposing account-specific controls.
        function isProbablyOwnProfilePage() {
            if (!profileUrl) {
                return false;
            }

            const numericMatch = new URL(profileUrl).pathname.match(
                /^\/profiles\/(\d+)$/i
            );

            if (
                numericMatch &&
                window.g_steamID &&
                numericMatch[1] === String(window.g_steamID)
            ) {
                return true;
            }

            const signedInProfileLink = document.querySelector(
                '#global_header a.user_avatar[href], ' +
                '#responsive_page_menu .persona a[data-miniprofile][href]'
            );

            return Boolean(
                signedInProfileLink &&
                normalizeProfileUrl(signedInProfileLink.href) ===
                    normalizeProfileUrl(profileUrl)
            );
        }

        // Revalidate ownership through Steam's /my/ redirect immediately
        // before consuming cards.
        async function verifyOwnProfilePage() {
            const numericMatch = profileUrl
                ? new URL(profileUrl).pathname.match(/^\/profiles\/(\d+)$/i)
                : null;

            if (
                numericMatch &&
                window.g_steamID &&
                numericMatch[1] === String(window.g_steamID)
            ) {
                return true;
            }

            try {
                const ownershipUrl = requirePinnedSteamUrl(
                    '/my/badges/',
                    STEAM_COMMUNITY_ORIGIN
                );
                const res = await fetch(ownershipUrl, {
                    credentials: 'include',
                });
                const redirectUrl = requirePinnedSteamResponseUrl(
                    res,
                    STEAM_COMMUNITY_ORIGIN,
                    ownershipUrl
                );

                return Boolean(
                    res.ok &&
                    redirectUrl &&
                    normalizeProfileUrl(redirectUrl) ===
                        normalizeProfileUrl(profileUrl)
                );
            } catch (err) {
                console.error(
                    'Steam Page Tools: failed verifying profile ownership',
                    err
                );
                return false;
            }
        }

        function getBadgeName(row, appid, borderColor) {
            const title = row.querySelector('.badge_title');

            if (title) {
                const textNode = [...title.childNodes]
                    .find((node) => (
                        node.nodeType === 3 && node.textContent.trim()
                    ));

                if (textNode) {
                    return textNode.textContent.trim();
                }
            }

            return `App ${appid}${borderColor === '1' ? ' (foil)' : ''}`;
        }

        // Steam's composite row ID keeps normal and foil badges distinct
        // without relying on localized text.
        function getCraftTarget(row) {
            const button = row.querySelector(
                '.badge_progress_info > a.badge_craft_button[href*="/gamecards/"]'
            );
            const idMatch = row.id.match(
                /^badge_gamebadge_(\d+)_(\d+)_(\d+)$/
            );

            if (!button || !idMatch) {
                return null;
            }

            const detailUrl = parsePinnedSteamUrl(
                button.href,
                STEAM_COMMUNITY_ORIGIN,
                location.href
            );

            if (!detailUrl) {
                return null;
            }

            const appMatch = detailUrl.pathname.match(
                /\/gamecards\/(\d+)(?:\/|$)/i
            );
            const [, appid, series, borderColor] = idMatch;

            if (!appMatch || appMatch[1] !== appid) {
                return null;
            }

            return {
                key: `${appid}:${series}:${borderColor}`,
                appid,
                series,
                borderColor,
                detailUrl: detailUrl.toString(),
                name: getBadgeName(row, appid, borderColor),
            };
        }

        function parseCraftCall(code) {
            if (!code) {
                return null;
            }

            const match = code.match(
                /Profile_CraftGameBadge\(\s*(['"])([^'"]+)\1\s*,\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]\s*,\s*(\d+)\s*\)/
            );

            if (!match) {
                return null;
            }

            return {
                profileUrl: match[2],
                appid: match[3],
                series: match[4],
                borderColor: match[5],
                levels: parseInt(match[6], 10),
            };
        }

        async function fetchCraftOptionOnce(target) {
            const detailUrl = requirePinnedSteamUrl(
                target.detailUrl,
                STEAM_COMMUNITY_ORIGIN
            );
            const res = await fetch(detailUrl, {
                credentials: 'include',
            });
            const responseUrl = requirePinnedSteamResponseUrl(
                res,
                STEAM_COMMUNITY_ORIGIN,
                detailUrl
            );

            if (!res.ok) {
                const err = new Error(`HTTP ${res.status}`);

                err.fatal = res.status === 401 || res.status === 403;
                throw err;
            }

            if (res.url) {
                if (/\/login(?:\/|$)/i.test(responseUrl.pathname)) {
                    const err = new Error('Steam asked you to sign in again');

                    err.fatal = true;
                    throw err;
                }
            }

            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            if (doc.querySelector('#loginForm, input[name="password"]')) {
                const err = new Error('Steam asked you to sign in again');

                err.fatal = true;
                throw err;
            }

            const options = [
                ...doc.querySelectorAll(
                    '.gamecard_badge_craftbtn_ctn ' +
                    '.badge_craft_button[onclick*="Profile_CraftGameBadge"]'
                ),
            ]
                .map((button) => parseCraftCall(button.getAttribute('onclick')))
                .filter((option) => (
                    option &&
                    option.appid === target.appid &&
                    option.series === target.series &&
                    option.borderColor === target.borderColor &&
                    normalizeProfileUrl(option.profileUrl) ===
                        normalizeProfileUrl(profileUrl) &&
                    Number.isFinite(option.levels) &&
                    option.levels >= 1 &&
                    option.levels <= 5
                ));

            if (!options.length) {
                return null;
            }

            return options.reduce((largest, option) => (
                option.levels > largest.levels ? option : largest
            ));
        }

        async function fetchCraftOption(target) {
            let lastError = null;

            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    return await fetchCraftOptionOnce(target);
                } catch (err) {
                    lastError = err;

                    if (err.fatal || attempt === 1) {
                        break;
                    }

                    await sleep(600);
                }
            }

            throw lastError;
        }

        function getRetryDelayMs(res) {
            const value = res.headers && res.headers.get('Retry-After');

            if (!value) {
                return 5000;
            }

            const seconds = parseInt(value, 10);

            if (Number.isFinite(seconds)) {
                return Math.min(Math.max(seconds * 1000, 1000), 30000);
            }

            const retryAt = Date.parse(value);

            return Number.isFinite(retryAt)
                ? Math.min(Math.max(retryAt - Date.now(), 1000), 30000)
                : 5000;
        }

        async function postCraft(target, levels, sessionid) {
            const craftUrl = requirePinnedSteamUrl(
                `${profileUrl}/ajaxcraftbadge/`,
                STEAM_COMMUNITY_ORIGIN
            );
            const body = new URLSearchParams({
                appid: target.appid,
                series: target.series,
                border_color: target.borderColor,
                levels: String(levels),
                sessionid,
            });

            let res;

            try {
                res = await fetch(craftUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: body.toString(),
                });
                requirePinnedSteamResponseUrl(
                    res,
                    STEAM_COMMUNITY_ORIGIN,
                    craftUrl
                );
            } catch (cause) {
                if (cause.fatal) {
                    throw cause;
                }

                const err = new Error('The craft response was not received');

                err.ambiguous = true;
                err.cause = cause;
                throw err;
            }

            let text;

            try {
                text = await res.text();
            } catch (cause) {
                const err = new Error('The craft response could not be read');

                err.ambiguous = true;
                err.cause = cause;
                throw err;
            }

            let data = null;

            try {
                data = JSON.parse(text);
            } catch {
                // Validation below rejects non-JSON craft responses.
            }

            if (!res.ok) {
                const message =
                    data && (data.strError || data.message);
                const err = new Error(message || `HTTP ${res.status}`);

                err.status = res.status;
                err.fatal = res.status === 401 || res.status === 403;
                err.retryAfterMs =
                    res.status === 429 ? getRetryDelayMs(res) : 0;
                err.ambiguous = res.status >= 500;
                throw err;
            }

            if (!data || !data.Badge || typeof data.Badge !== 'object') {
                const err = new Error('Steam returned an unexpected craft response');

                err.ambiguous = true;
                throw err;
            }

            return data;
        }

        function readCraftLock() {
            if (!craftLockUsesStorage) {
                return null;
            }

            let raw;

            try {
                raw = localStorage.getItem(CRAFT_LOCK_KEY);
            } catch {
                craftLockUsesStorage = false;
                return null;
            }

            if (!raw) {
                return null;
            }

            try {
                return JSON.parse(raw);
            } catch {
                // Treat malformed lock data as stale without disabling
                // storage-backed cross-tab protection.
                return null;
            }
        }

        function writeCraftLock() {
            if (!craftLockUsesStorage) {
                return true;
            }

            try {
                localStorage.setItem(CRAFT_LOCK_KEY, JSON.stringify({
                    owner: craftLockOwner,
                    expiresAt: Date.now() + CRAFT_LOCK_TTL_MS,
                }));
                return true;
            } catch {
                craftLockUsesStorage = false;
                return true;
            }
        }

        function acquireCraftLock() {
            const current = readCraftLock();

            if (
                current &&
                current.owner !== craftLockOwner &&
                current.expiresAt > Date.now()
            ) {
                return false;
            }

            writeCraftLock();

            const saved = readCraftLock();

            return !craftLockUsesStorage || (
                saved &&
                saved.owner === craftLockOwner
            );
        }

        function refreshCraftLock() {
            const current = readCraftLock();

            if (
                current &&
                current.owner !== craftLockOwner &&
                current.expiresAt > Date.now()
            ) {
                return false;
            }

            return writeCraftLock();
        }

        function releaseCraftLock() {
            const current = readCraftLock();

            if (!craftLockUsesStorage || !current) {
                return;
            }

            if (current.owner === craftLockOwner) {
                try {
                    localStorage.removeItem(CRAFT_LOCK_KEY);
                } catch {
                    craftLockUsesStorage = false;
                }
            }
        }

        // Rows parsed from fetched badge pages retain Steam's transparent
        // placeholder. Steam's page script normally promotes this attribute
        // when a row enters the viewport, but it does not observe our clones.
        function activateDelayedBadgeArtwork(row) {
            row.querySelectorAll('img[data-delayed-image]')
                .forEach((image) => {
                    const source = image.getAttribute(
                        'data-delayed-image'
                    );

                    if (!source) {
                        return;
                    }

                    image.src = source;
                    image.loading = 'lazy';
                    image.decoding = 'async';
                    image.removeAttribute('data-delayed-image');
                    image.removeAttribute('data-delayed-image-group');
                });
        }

        function insertBadgeSearch(container, currentRows) {
            const searchBar = document.createElement('div');

            searchBar.id = 'spt-owned-badge-search';
            searchBar.style.cssText =
                'display:flex; align-items:flex-start; justify-content:flex-start; gap:10px; margin:10px 0; flex-wrap:wrap;';

            const searchField = document.createElement('div');

            searchField.style.cssText =
                'display:flex; flex-direction:column; gap:3px; width:320px; max-width:100%; flex:0 1 320px; min-width:0;';

            const input = document.createElement('input');

            input.id = 'spt-owned-badge-search-input';
            input.type = 'search';
            input.placeholder = 'Search owned badges...';
            input.setAttribute(
                'aria-label',
                'Search this profile\u2019s owned badges'
            );
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.maxLength = 100;
            input.style.cssText =
                'width:100%; height:22px; box-sizing:border-box; padding:0 8px; border:1px solid #000; border-radius:3px; background:#2a3f5a; color:#fff; font-family:"Motiva Sans",Arial,sans-serif; font-size:12px; box-shadow:1px 1px 0 rgba(255,255,255,.1);';

            const searchStatus = document.createElement('span');

            searchStatus.id = 'spt-owned-badge-search-status';
            searchStatus.setAttribute('role', 'status');
            searchStatus.setAttribute('aria-live', 'polite');
            searchStatus.style.cssText =
                'display:block; color:#8f98a0; font-size:12px; line-height:14px; text-align:left;';

            searchField.appendChild(input);
            searchField.appendChild(searchStatus);
            searchBar.appendChild(searchField);
            container.insertBefore(searchBar, currentRows[0]);

            // Search aggregates every matching row onto this page. Preserve
            // Steam's inline pagination styles so the server-side pager can be
            // hidden for search mode and restored exactly when it ends.
            function getPaginationElements() {
                const pagingContainers = [
                    ...document.querySelectorAll('.profile_paging'),
                ];

                return pagingContainers.length
                    ? pagingContainers
                    : [
                        ...document.querySelectorAll(
                            '.profile_paging_summary, .profile_paging_links'
                        ),
                    ];
            }

            const paginationDisplays = new Map();
            const paginationHideReasons = new Set();
            const indexProgressListeners = new Set();
            let indexedBadges = null;
            let buildingBadgeIndex = null;
            let indexPromise = null;
            let resultClones = [];
            let searchActive = false;
            let searchVersion = 0;
            let debounceTimer = null;
            let beforeSearch = () => {};

            function setPaginationHidden(isHidden, reason = 'search') {
                if (isHidden) {
                    paginationHideReasons.add(reason);
                } else {
                    paginationHideReasons.delete(reason);
                }

                if (paginationHideReasons.size) {
                    getPaginationElements().forEach((element) => {
                        if (!paginationDisplays.has(element)) {
                            paginationDisplays.set(element, {
                                value: element.style.getPropertyValue('display'),
                                priority: element.style.getPropertyPriority(
                                    'display'
                                ),
                            });
                        }

                        element.style.setProperty(
                            'display',
                            'none',
                            'important'
                        );
                    });
                    return;
                }

                paginationDisplays.forEach((display, element) => {
                    if (display.value) {
                        element.style.setProperty(
                            'display',
                            display.value,
                            display.priority
                        );
                    } else {
                        element.style.removeProperty('display');
                    }
                });
                paginationDisplays.clear();
            }

            function removeResultClones() {
                resultClones.forEach((row) => row.remove());
                resultClones = [];
            }

            function clearSearch(resetInput = true) {
                window.clearTimeout(debounceTimer);
                searchVersion += 1;
                indexProgressListeners.clear();

                if (resetInput) {
                    input.value = '';
                }

                removeResultClones();

                if (searchActive) {
                    currentRows.forEach((row) => {
                        row.style.display = '';
                    });
                }

                searchActive = false;
                setPaginationHidden(false);
                searchStatus.textContent = '';
            }

            function notifyBadgeIndexProgress(update) {
                indexProgressListeners.forEach((listener) => {
                    listener(update);
                });
            }

            async function buildBadgeIndex() {
                const currentPage = getCurrentPageNumber();
                const detectedMaxPage = Math.max(
                    currentPage,
                    getMaxPageFromPagination() || 1
                );
                const maxPage = Math.min(detectedMaxPage, MAX_PAGES);
                const index = {
                    badges: [],
                    failedPages: 0,
                    loadingPage: null,
                    maxPage,
                    processedPages: 0,
                    truncated: detectedMaxPage > MAX_PAGES,
                };

                buildingBadgeIndex = index;

                for (let page = 1; page <= maxPage; page += 1) {
                    index.loadingPage = page;
                    notifyBadgeIndexProgress({
                        badges: [],
                        index,
                        loading: true,
                        page,
                        snapshot: false,
                    });

                    let pageRows;
                    const pageBadges = [];

                    if (page === currentPage) {
                        pageRows = currentRows;
                    } else {
                        pageRows = await fetchPageRowsWithRetry(page);
                    }

                    if (pageRows === null) {
                        index.failedPages += 1;
                    } else {
                        pageRows.forEach((row) => {
                            const text = getOwnedBadgeSearchText(row);

                            if (text) {
                                const badge = { row, text };

                                index.badges.push(badge);
                                pageBadges.push(badge);
                            }
                        });
                    }

                    index.loadingPage = null;
                    index.processedPages = page;
                    notifyBadgeIndexProgress({
                        badges: pageBadges,
                        index,
                        loading: false,
                        page,
                        snapshot: false,
                    });

                    if (page < maxPage) {
                        await sleep(100);
                    }
                }

                return index;
            }

            async function getBadgeIndex(onProgress) {
                if (indexedBadges) {
                    return indexedBadges;
                }

                const buildAlreadyRunning = Boolean(indexPromise);

                if (onProgress) {
                    indexProgressListeners.add(onProgress);
                }

                try {
                    if (!indexPromise) {
                        indexPromise = buildBadgeIndex()
                            .then((index) => {
                                indexedBadges = index;
                                return index;
                            })
                            .finally(() => {
                                buildingBadgeIndex = null;
                                indexPromise = null;
                            });
                    }

                    if (
                        buildAlreadyRunning &&
                        buildingBadgeIndex &&
                        onProgress
                    ) {
                        onProgress({
                            badges: buildingBadgeIndex.badges,
                            index: buildingBadgeIndex,
                            loading: Boolean(
                                buildingBadgeIndex.loadingPage
                            ),
                            page: buildingBadgeIndex.loadingPage ||
                                buildingBadgeIndex.processedPages,
                            snapshot: true,
                        });
                    }

                    return await indexPromise;
                } finally {
                    if (onProgress) {
                        indexProgressListeners.delete(onProgress);
                    }
                }
            }

            function appendMatchingBadges(badges, termPatterns) {
                let appended = 0;

                badges.forEach(({ row, text }) => {
                    if (
                        !termPatterns.every((pattern) => pattern.test(text))
                    ) {
                        return;
                    }

                    const clone = row.cloneNode(true);

                    clone.removeAttribute('id');
                    clone.dataset.sptBadgeSearchClone = '1';
                    clone.style.display = '';
                    activateDelayedBadgeArtwork(clone);
                    container.appendChild(clone);
                    resultClones.push(clone);
                    appended += 1;
                });

                return appended;
            }

            function renderResultSummary(index, matchCount) {
                // Steam can refresh its paging controls while results render.
                // Re-query and enforce search mode after the clones are added.
                setPaginationHidden(true);

                const countText = matchCount === 1
                    ? '1 owned badge'
                    : `${matchCount} owned badges`;
                const sourcePageText = index.maxPage === 1
                    ? '1 source page'
                    : `${index.maxPage} source pages`;
                const notes = [];

                if (index.failedPages) {
                    notes.push(
                        `${index.failedPages} page(s) could not be loaded`
                    );
                }

                if (index.truncated) {
                    notes.push(`search limited to ${MAX_PAGES} pages`);
                }

                searchStatus.textContent =
                    `Found ${countText} across ${sourcePageText}. ` +
                    'All matches are shown below.' +
                    (notes.length ? ` ${notes.join('; ')}.` : '');
            }

            async function runSearch(rawQuery) {
                const version = ++searchVersion;
                const query = normalizeBadgeSearchText(rawQuery);
                const termPatterns = query
                    .split(' ')
                    .filter(Boolean)
                    .map(createBadgeSearchTermPattern);
                let matchCount = 0;
                let renderedFromProgress = false;

                beforeSearch();
                searchActive = true;
                setPaginationHidden(true);
                removeResultClones();
                currentRows.forEach((row) => {
                    row.style.display = 'none';
                });
                searchStatus.textContent = 'Loading owned badges...';

                function handleProgress(update) {
                    if (
                        version !== searchVersion ||
                        !input.value.trim()
                    ) {
                        return;
                    }

                    if (update.snapshot || !update.loading) {
                        matchCount += appendMatchingBadges(
                            update.badges,
                            termPatterns
                        );
                        renderedFromProgress = true;
                    }

                    setPaginationHidden(true);

                    const countText = matchCount === 1
                        ? '1 owned badge'
                        : `${matchCount} owned badges`;

                    searchStatus.textContent = update.loading
                        ? `Found ${countText} so far. Loading page ` +
                            `${update.page} of ${update.index.maxPage}...`
                        : `Found ${countText} so far. Searched page ` +
                            `${update.page} of ${update.index.maxPage}...`;
                }

                let index;

                try {
                    index = await getBadgeIndex(handleProgress);
                } catch (err) {
                    if (
                        version !== searchVersion ||
                        !input.value.trim()
                    ) {
                        return;
                    }

                    throw err;
                }

                if (
                    version !== searchVersion ||
                    !input.value.trim()
                ) {
                    return;
                }

                if (!renderedFromProgress) {
                    matchCount = appendMatchingBadges(
                        index.badges,
                        termPatterns
                    );
                }

                renderResultSummary(index, matchCount);
            }

            input.addEventListener('input', () => {
                window.clearTimeout(debounceTimer);
                searchVersion += 1;
                indexProgressListeners.clear();

                if (!input.value.trim()) {
                    clearSearch(false);
                    return;
                }

                setPaginationHidden(true);
                debounceTimer = setTimeout(() => {
                    runSearch(input.value).catch((err) => {
                        console.error(
                            'Steam Page Tools: badge search failed',
                            err
                        );

                        if (input.value.trim()) {
                            removeResultClones();
                            currentRows.forEach((row) => {
                                row.style.display = '';
                            });
                            searchActive = false;
                            setPaginationHidden(false);
                            searchStatus.textContent =
                                'Badge search could not be loaded. Try again.';
                        }
                    });
                }, 200);
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && input.value) {
                    event.preventDefault();
                    clearSearch();
                    input.focus();
                }
            });

            return {
                clear: clearSearch,
                element: searchBar,
                setBeforeSearch(handler) {
                    beforeSearch = handler;
                },
                setDisabled(isDisabled) {
                    input.disabled = isDisabled;
                    input.style.opacity = isDisabled ? '0.6' : '';
                },
                setFilterPaginationHidden(isHidden) {
                    setPaginationHidden(isHidden, 'filter');
                },
            };
        }

        function buildSteamSetsPromo() {
            const promo = document.createElement('a');

            promo.id = 'spt-steamsets-promo';
            promo.href = STEAMSETS_BADGE_SEARCH_URL;
            promo.target = '_blank';
            promo.rel = 'noopener noreferrer';
            promo.referrerPolicy = 'no-referrer';
            promo.title = 'Open SteamSets badge search tools';
            promo.setAttribute(
                'aria-label',
                'Search badges with SteamSets (opens in a new tab)'
            );
            promo.style.cssText =
                'display:inline-flex; align-items:center; gap:5px; width:auto; height:22px; box-sizing:border-box; padding:1px 7px 1px 5px; border:1px solid rgba(178,99,236,.42); border-radius:3px; background:rgba(13,12,19,.72); color:#fff; text-decoration:none; font-family:"Motiva Sans",Arial,sans-serif; flex:0 0 auto; transition:background-color .15s,border-color .15s,box-shadow .15s;';

            // Keep the feature self-contained: the inline mark does not load
            // any image, stylesheet, script, or other remote resource.
            const icon = document.createElement('span');

            icon.setAttribute('aria-hidden', 'true');
            icon.style.cssText =
                'display:flex; width:17px; height:17px; flex:0 0 17px;';
            icon.innerHTML = `
                <svg viewBox="0 0 134 130" fill="none" style="display:block;width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
                    <path d="M117.646 45.2406L133.817 107.179C134.569 110.018 132.939 112.341 130.181 112.341H65.4969C63.8671 112.341 63.7417 113.373 65.2462 114.535L66.1238 115.18C69.3835 117.89 69.0074 118.793 65.2462 117.245L33.4042 104.34C30.0191 102.92 30.0191 101.888 33.2789 101.888H72.3925C77.9089 101.888 81.1687 97.2418 79.7896 91.5636L67.7536 45.1115C67.0014 42.2724 68.6313 39.9495 71.3895 39.9495H111.506C114.136 40.0785 117.02 42.4014 117.646 45.2406Z" fill="url(#spt-steamsets-gradient)"/>
                    <path d="M16.3536 85.7563L.183 23.821C-.569 20.982 1.061 18.659 3.819 18.659H68.506C70.136 18.659 70.261 17.627 68.757 16.465L67.879 15.82C64.62 13.11 64.996 12.207 68.757 13.755L100.599 26.66C103.984 28.08 103.984 29.112 100.724 29.112H61.736C56.22 29.112 52.96 33.758 54.339 39.436L66.375 85.889C67.127 88.728 65.497 91.051 62.739 91.051H22.622C19.864 90.918 16.981 88.595 16.354 85.756Z" fill="url(#spt-steamsets-gradient)"/>
                    <defs>
                        <linearGradient id="spt-steamsets-gradient" x1="0" y1="18.441" x2="133.051" y2="112.649" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#7652C9"/>
                            <stop offset="1" stop-color="#B263EC"/>
                        </linearGradient>
                    </defs>
                </svg>
            `;

            const copy = document.createElement('span');

            copy.style.cssText =
                'display:flex; flex-direction:column; align-items:flex-start; line-height:1; white-space:nowrap;';

            const eyebrow = document.createElement('span');

            eyebrow.textContent = 'BADGE SEARCH BY';
            eyebrow.style.cssText =
                'margin-bottom:1px; color:#9da4ad; font-size:6px; font-weight:600; line-height:6px; letter-spacing:.5px;';

            const wordmark = document.createElement('span');

            wordmark.style.cssText =
                'color:#fff; font-size:11px; font-weight:700; line-height:11px; letter-spacing:-.2px;';
            wordmark.appendChild(document.createTextNode('Steam'));

            const sets = document.createElement('span');

            sets.textContent = 'Sets';
            sets.style.color = '#a75ce5';
            wordmark.appendChild(sets);

            copy.appendChild(eyebrow);
            copy.appendChild(wordmark);
            promo.appendChild(icon);
            promo.appendChild(copy);

            function setHighlighted(isHighlighted) {
                promo.style.background = isHighlighted
                    ? 'rgba(48,38,68,.92)'
                    : 'rgba(13,12,19,.72)';
                promo.style.borderColor = isHighlighted
                    ? 'rgba(178,99,236,.8)'
                    : 'rgba(178,99,236,.42)';
                promo.style.boxShadow = isHighlighted
                    ? '0 0 0 1px rgba(118,82,201,.18)'
                    : '';
            }

            promo.addEventListener('mouseenter', () => setHighlighted(true));
            promo.addEventListener('mouseleave', () => setHighlighted(false));
            promo.addEventListener('focus', () => setHighlighted(true));
            promo.addEventListener('blur', () => setHighlighted(false));

            return promo;
        }

        function insertControl() {
            const rows = getRows();

            if (!rows.length) {
                return false;
            }

            const container = rows[0].parentElement;
            const badgeSearch = insertBadgeSearch(container, rows);

            // Share the search row so the SteamSets shortcut and account
            // controls align without moving the search field from the left.
            const bar = badgeSearch.element;

            const actionGroup = document.createElement('div');

            actionGroup.id = 'spt-badge-actions';
            actionGroup.style.cssText =
                'display:flex; align-items:center; justify-content:flex-end; gap:3px; flex:0 1 auto; margin-left:auto; flex-wrap:wrap;';

            const steamSetsPromo = buildSteamSetsPromo();

            // Both search options are useful on every profile. Keep
            // destructive and account-specific controls exclusive to the
            // signed-in owner.
            if (!isProbablyOwnProfilePage()) {
                actionGroup.appendChild(steamSetsPromo);
                bar.appendChild(actionGroup);
                return true;
            }

            const currentPage = getCurrentPageNumber();
            const detectedMaxPage = Math.max(
                currentPage,
                getMaxPageFromPagination() || 1
            );
            const maxPage = Math.min(detectedMaxPage, MAX_PAGES);
            const pageRowsPromises = new Map([
                [currentPage, Promise.resolve(rows)],
            ]);

            // The counter and filter scan the same pages. Cache those reads so
            // activating the filter while the count is running does not send a
            // second request for each page.
            function getPageRowsForDrops(page) {
                if (!pageRowsPromises.has(page)) {
                    const pageRowsPromise = fetchPageRowsWithRetry(page)
                        .then((pageRows) => {
                            if (pageRows === null) {
                                pageRowsPromises.delete(page);
                            }

                            return pageRows;
                        });

                    pageRowsPromises.set(page, pageRowsPromise);
                }

                return pageRowsPromises.get(page);
            }

            const statusGroup = document.createElement('div');

            statusGroup.style.cssText =
                'display:flex; align-items:center; justify-content:flex-end; gap:10px; flex:0 1 auto; min-width:0; flex-wrap:wrap;';

            const dropCounterGroup = document.createElement('span');

            dropCounterGroup.setAttribute('role', 'status');
            dropCounterGroup.setAttribute('aria-live', 'polite');
            dropCounterGroup.setAttribute('aria-busy', 'true');
            dropCounterGroup.style.cssText =
                'display:inline-flex; align-items:center; gap:3px; flex:0 0 auto; color:#8f98a0; font-size:12px; white-space:nowrap;';

            const dropCounterLabel = document.createElement('span');

            dropCounterLabel.textContent = 'Games with drops:';

            const dropCounter = document.createElement('span');

            dropCounter.id = 'spt-drops-remaining-count';
            dropCounter.setAttribute(
                'aria-label',
                '0 games with card drops remaining'
            );
            dropCounter.style.cssText =
                'display:inline-block; color:#a4d007; min-width:1ch; font-weight:600; text-align:left; font-variant-numeric:tabular-nums;';
            dropCounter.textContent = '0';
            dropCounter.title = 'Games with card drops remaining';

            const dropCounterLoader = document.createElement('span');

            dropCounterLoader.setAttribute('aria-hidden', 'true');
            dropCounterLoader.style.cssText =
                'display:inline-block; width:10px; height:10px; box-sizing:border-box; border:1.5px solid rgba(143,152,160,.35); border-top-color:#8f98a0; border-radius:50%;';

            const dropCounterLoadingAnimation = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches
                ? null
                : dropCounterLoader.animate(
                    [
                        { transform: 'rotate(0deg)' },
                        { transform: 'rotate(360deg)' },
                    ],
                    {
                        duration: 700,
                        iterations: Infinity,
                    }
                );

            dropCounterGroup.appendChild(dropCounterLabel);
            dropCounterGroup.appendChild(dropCounter);
            dropCounterGroup.appendChild(dropCounterLoader);

            const toggle = document.createElement('div');

            toggle.id = 'drop-filter-toggle';
            toggle.className = 'btnv6_blue_hoverfade btn_small';
            toggle.style.cssText = 'cursor:pointer; user-select:none;';
            toggle.setAttribute('role', 'button');
            toggle.setAttribute('aria-pressed', 'false');
            toggle.tabIndex = 0;

            toggle.innerHTML = '<span>Show only drops remaining</span>';

            const craftStatus = document.createElement('span');
            craftStatus.id = 'spt-auto-craft-status';
            craftStatus.style.cssText =
                'color:#8f98a0; font-size:12px; max-width:360px;';

            const autoCraft = document.createElement('div');
            autoCraft.id = 'spt-auto-craft';
            autoCraft.className = 'btnv6_blue_hoverfade btn_small';
            autoCraft.style.cssText = 'cursor:pointer; user-select:none;';
            autoCraft.setAttribute('role', 'button');
            autoCraft.tabIndex = 0;
            autoCraft.title =
                'Craft every complete card set across all badge pages';

            const autoCraftLabel = document.createElement('span');
            autoCraftLabel.textContent = 'Auto Craft All Badges';
            autoCraft.appendChild(autoCraftLabel);

            statusGroup.appendChild(craftStatus);
            actionGroup.appendChild(dropCounterGroup);
            actionGroup.appendChild(toggle);
            actionGroup.appendChild(autoCraft);
            actionGroup.appendChild(steamSetsPromo);
            bar.appendChild(statusGroup);
            bar.appendChild(actionGroup);

            let active = false;
            let busy = false;
            let craftBusy = false;
            let stopCrafting = false;
            let extraRows = [];

            function setBusy(isBusy) {
                busy = isBusy;

                toggle.style.pointerEvents = isBusy ? 'none' : '';
                toggle.style.opacity = isBusy ? '0.6' : '';

                if (!craftBusy) {
                    autoCraft.style.pointerEvents = isBusy ? 'none' : '';
                    autoCraft.style.opacity = isBusy ? '0.6' : '';
                }
            }

            function setCraftBusy(isBusy) {
                craftBusy = isBusy;
                badgeSearch.setDisabled(isBusy);

                toggle.style.pointerEvents = isBusy || busy ? 'none' : '';
                toggle.style.opacity = isBusy || busy ? '0.6' : '';

                autoCraft.style.pointerEvents = '';
                autoCraft.style.opacity = '';
                autoCraftLabel.textContent = isBusy
                    ? 'Stop Auto Craft'
                    : 'Auto Craft All Badges';
                autoCraft.title = isBusy
                    ? 'Stop after the current badge'
                    : 'Craft every complete card set across all badge pages';
            }

            function setCraftStatus(text, withReload = false) {
                craftStatus.textContent = text;

                if (withReload) {
                    craftStatus.appendChild(document.createTextNode(' '));

                    const link = document.createElement('a');

                    link.href = location.href;
                    link.textContent = 'Reload badges';
                    link.style.color = '#67c1f1';

                    craftStatus.appendChild(link);
                }
            }

            // Steam's button styles have no pressed state, so add an inset
            // border while the filter is active.
            function setActiveStyle(isActive) {
                toggle.style.boxShadow =
                    isActive ? 'inset 0 0 0 1px #67c1f1' : '';
                toggle.setAttribute('aria-pressed', String(isActive));
            }

            function finishDropCounterLoading(isComplete) {
                dropCounterLoadingAnimation?.cancel();
                dropCounterLoader.style.cssText =
                    `display:inline-flex; width:10px; height:10px; align-items:center; justify-content:center; color:${isComplete ? '#a4d007' : '#d9a300'}; font-size:10px; font-weight:700; line-height:1;`;
                dropCounterLoader.textContent = isComplete ? '\u2713' : '!';
                dropCounterLoader.title = isComplete
                    ? 'Scan complete'
                    : 'Scan incomplete';
                dropCounterGroup.setAttribute('aria-busy', 'false');
            }

            async function countGamesWithDropsRemaining() {
                let count = 0;
                let failedPages = 0;

                for (let page = 1; page <= maxPage; page += 1) {
                    const pageRows = await getPageRowsForDrops(page);

                    if (pageRows === null) {
                        failedPages += 1;
                    } else {
                        count += pageRows.filter(hasDropsRemaining).length;
                    }

                    const nextCount = String(count);

                    if (dropCounter.textContent !== nextCount) {
                        dropCounter.textContent = nextCount;
                    }

                    if (page < maxPage) {
                        await sleep(100);
                    }
                }

                const incomplete = (
                    failedPages > 0 || detectedMaxPage > MAX_PAGES
                );
                const gameLabel = count === 1 ? 'game' : 'games';

                dropCounter.textContent = incomplete
                    ? `${count}+`
                    : String(count);
                dropCounter.setAttribute(
                    'aria-label',
                    incomplete
                        ? `At least ${count} ${gameLabel} with card drops remaining`
                        : `${count} ${gameLabel} with card drops remaining`
                );

                const notes = [];

                if (failedPages) {
                    notes.push(`${failedPages} page(s) could not be loaded`);
                }

                if (detectedMaxPage > MAX_PAGES) {
                    notes.push(`count limited to ${MAX_PAGES} pages`);
                }

                dropCounter.title = notes.length
                    ? `${notes.join('; ')}.`
                    : 'Number of games with card drops remaining across all badge pages';
                finishDropCounterLoading(!incomplete);
            }

            function resetDropFilter() {
                active = false;
                setActiveStyle(false);
                badgeSearch.setFilterPaginationHidden(false);

                getRows().forEach((row) => {
                    row.style.display = '';
                });

                extraRows.forEach((row) => {
                    row.remove();
                });

                extraRows = [];
                setBusy(false);
            }

            badgeSearch.setBeforeSearch(() => {
                if (active || busy) {
                    resetDropFilter();
                }
            });

            async function runFilter() {
                getRows().forEach((row) => {
                    row.style.display = hasDropsRemaining(row) ? '' : 'none';
                });

                setBusy(true);

                for (let page = 1; page <= maxPage && active; page += 1) {
                    if (page === currentPage) {
                        continue;
                    }

                    const pageWasCached = pageRowsPromises.has(page);

                    const rows = await getPageRowsForDrops(page);

                    if (!active) {
                        break;
                    }

                    if (rows === null) {
                        continue;
                    }

                    // Preserve every row: normal and foil badges share an app
                    // ID and detail URL but represent separate drop states.
                    rows
                        .filter(hasDropsRemaining)
                        .forEach((row) => {
                            const clone = row.cloneNode(true);

                            clone.dataset.sptDropFilterClone = '1';
                            activateDelayedBadgeArtwork(clone);
                            container.appendChild(clone);
                            extraRows.push(clone);
                        });

                    if (!pageWasCached) {
                        await sleep(200);
                    }
                }

                setBusy(false);
            }

            countGamesWithDropsRemaining()
                .catch((err) => {
                    console.error(
                        'Steam Page Tools: failed counting games with card drops',
                        err
                    );
                    dropCounter.textContent = '?';
                    dropCounter.setAttribute(
                        'aria-label',
                        'Card-drop count unavailable'
                    );
                    dropCounter.title =
                        'Reload the page to try counting again.';
                    finishDropCounterLoading(false);
                });

            async function onToggle() {
                if (busy || craftBusy) {
                    return;
                }

                const activating = !active;

                if (activating) {
                    badgeSearch.clear();
                }

                if (!activating) {
                    resetDropFilter();
                    return;
                }

                active = true;
                setActiveStyle(true);
                badgeSearch.setFilterPaginationHidden(true);
                await runFilter();
            }

            async function collectCraftTargets(freshAllPages = false) {
                const currentPage = getCurrentPageNumber();
                const detectedMaxPage = Math.max(
                    currentPage,
                    getMaxPageFromPagination() || 1
                );

                if (detectedMaxPage > MAX_PAGES) {
                    throw new Error(
                        `Badge list has more than the ${MAX_PAGES}-page safety limit`
                    );
                }

                const targets = new Map();

                for (let page = 1; page <= detectedMaxPage; page += 1) {
                    if (stopCrafting) {
                        return {
                            targets: [...targets.values()],
                            cancelled: true,
                        };
                    }

                    setCraftStatus(
                        `Scanning badge page ${page} of ${detectedMaxPage}...`
                    );

                    let pageRows;

                    if (page === currentPage && !freshAllPages) {
                        pageRows = getRows()
                            .filter((row) => (
                                !row.dataset.sptDropFilterClone &&
                                !row.dataset.sptBadgeSearchClone
                            ));
                    } else {
                        pageRows = await fetchPageRowsWithRetry(page);

                        if (pageRows === null) {
                            throw new Error(
                                `Could not scan badge page ${page}`
                            );
                        }
                    }

                    pageRows.forEach((row) => {
                        const target = getCraftTarget(row);

                        if (target) {
                            targets.set(target.key, target);
                        }
                    });

                    if (page !== currentPage || freshAllPages) {
                        await sleep(150);
                    }
                }

                return {
                    targets: [...targets.values()],
                    cancelled: false,
                };
            }

            function requestCraftConfirmation(count) {
                const description =
                    `Found ${count} ready badge type(s). ` +
                    'Craft every complete card set available for them? ' +
                    'Steam Page Tools will use the 5x option when Steam ' +
                    'offers it and will also craft badges made ready by ' +
                    'crafting rewards. This consumes cards and cannot be undone.';

                if (typeof window.ShowConfirmDialog === 'function') {
                    try {
                        return new Promise((resolve) => {
                            window.ShowConfirmDialog(
                                'Auto Craft All Badges',
                                description,
                                'Craft All',
                                'Cancel'
                            )
                                .done(() => resolve(true))
                                .fail(() => resolve(false));
                        });
                    } catch (err) {
                        console.error(
                            'Steam Page Tools: failed opening Steam confirmation',
                            err
                        );
                    }
                }

                return Promise.resolve(window.confirm(description));
            }

            function addCraftFailure(summary, target, err) {
                if (!summary.failed.has(target.key)) {
                    summary.failed.set(target.key, {
                        name: target.name,
                        message: err.message,
                    });
                }
            }

            async function craftEveryLevel(
                target,
                sessionid,
                summary,
                position,
                total
            ) {
                let craftedForTarget = 0;
                let attemptedMutation = false;
                let consecutiveAmbiguous = 0;
                let throttleCount = 0;

                while (
                    !stopCrafting &&
                    summary.batches < MAX_CRAFT_BATCHES
                ) {
                    setCraftStatus(
                        `Checking ${position} of ${total}: ${target.name}...`
                    );

                    let option;

                    try {
                        option = await fetchCraftOption(target);
                    } catch (err) {
                        console.error(
                            'Steam Page Tools: failed checking craft state',
                            target.key,
                            err
                        );

                        if (err.fatal) {
                            throw err;
                        }

                        addCraftFailure(summary, target, err);
                        return craftedForTarget;
                    }

                    if (!option) {
                        if (
                            !craftedForTarget &&
                            !attemptedMutation &&
                            !summary.badges.has(target.key)
                        ) {
                            summary.skipped.add(target.key);
                        }

                        return craftedForTarget;
                    }

                    if (stopCrafting) {
                        return craftedForTarget;
                    }

                    if (!refreshCraftLock()) {
                        const err = new Error(
                            'Another tab took over the badge craft queue'
                        );

                        err.fatal = true;
                        throw err;
                    }

                    const levelWord =
                        option.levels === 1 ? 'level' : 'levels';

                    setCraftStatus(
                        `Crafting ${position} of ${total}: ${target.name} ` +
                        `(${option.levels} ${levelWord})...`
                    );

                    attemptedMutation = true;
                    summary.attempts += 1;

                    try {
                        await postCraft(
                            target,
                            option.levels,
                            sessionid
                        );

                        summary.batches += 1;
                        summary.levels += option.levels;
                        summary.badges.add(target.key);
                        summary.skipped.delete(target.key);
                        craftedForTarget += option.levels;
                        consecutiveAmbiguous = 0;
                        throttleCount = 0;
                    } catch (err) {
                        console.error(
                            'Steam Page Tools: failed crafting badge',
                            target.key,
                            err
                        );

                        if (err.fatal) {
                            throw err;
                        }

                        if (err.status === 429) {
                            throttleCount += 1;

                            if (throttleCount > 3) {
                                addCraftFailure(summary, target, err);
                                return craftedForTarget;
                            }

                            const waitSeconds = Math.ceil(
                                err.retryAfterMs / 1000
                            );

                            setCraftStatus(
                                `Steam is rate limiting requests. ` +
                                `Retrying ${target.name} in ` +
                                `${waitSeconds} seconds...`
                            );

                            await sleep(err.retryAfterMs);
                            continue;
                        }

                        if (err.ambiguous) {
                            summary.uncertain += 1;
                            consecutiveAmbiguous += 1;

                            if (consecutiveAmbiguous >= 3) {
                                addCraftFailure(summary, target, err);
                                return craftedForTarget;
                            }

                            // Reconcile an ambiguous mutation against fresh
                            // badge state before issuing another POST.
                            setCraftStatus(
                                `Rechecking ${target.name} after an ` +
                                'uncertain response...'
                            );
                            await sleep(1500);
                            continue;
                        }

                        addCraftFailure(summary, target, err);
                        return craftedForTarget;
                    }

                    if (!stopCrafting) {
                        await sleep(
                            800 + Math.floor(Math.random() * 401)
                        );
                    }
                }

                return craftedForTarget;
            }

            function renderCraftSummary(summary, runError) {
                const prefix = stopCrafting ? 'Stopped.' : (
                    runError ? 'Stopped after an error.' : 'Finished.'
                );
                const totals = summary.uncertain
                    ? `Confirmed ${summary.levels} level(s) across ` +
                        `${summary.badges.size} badge(s); totals may be higher.`
                    : `Crafted ${summary.levels} level(s) across ` +
                        `${summary.badges.size} badge(s).`;
                const parts = [
                    prefix,
                    totals,
                ];

                if (summary.skipped.size) {
                    parts.push(
                        `${summary.skipped.size} stale badge(s) skipped.`
                    );
                }

                if (summary.failed.size) {
                    parts.push(
                        `${summary.failed.size} badge(s) failed; ` +
                        'details are in the console.'
                    );
                }

                if (summary.uncertain) {
                    parts.push(
                        `${summary.uncertain} response(s) were uncertain; ` +
                        'fresh badge state was checked before continuing.'
                    );
                }

                if (summary.safetyLimit) {
                    parts.push('Stopped at the automatic safety limit.');
                }

                if (runError) {
                    parts.push(runError.message);
                }

                setCraftStatus(
                    parts.join(' '),
                    summary.attempts > 0
                );
            }

            async function onAutoCraft() {
                if (craftBusy) {
                    stopCrafting = true;
                    autoCraftLabel.textContent = 'Stopping...';
                    autoCraft.style.pointerEvents = 'none';
                    autoCraft.style.opacity = '0.6';
                    setCraftStatus(
                        'Stopping after the current badge request...'
                    );
                    return;
                }

                if (busy) {
                    setCraftStatus(
                        'Wait for the card-drop filter to finish first.'
                    );
                    return;
                }

                const sessionid = getSessionId();

                if (!sessionid || !profileUrl) {
                    setCraftStatus(
                        'Could not verify your Steam session. Refresh and try again.'
                    );
                    return;
                }

                stopCrafting = false;
                badgeSearch.clear();
                setCraftBusy(true);

                const summary = {
                    attempts: 0,
                    batches: 0,
                    levels: 0,
                    uncertain: 0,
                    badges: new Set(),
                    skipped: new Set(),
                    failed: new Map(),
                    safetyLimit: false,
                };
                let lockHeld = false;
                let lockHeartbeat = null;
                let runError = null;

                try {
                    setCraftStatus('Verifying this is your badges page...');

                    if (!await verifyOwnProfilePage()) {
                        setCraftStatus(
                            'Auto craft is only available on your own badges page.'
                        );
                        return;
                    }

                    const initialScan = await collectCraftTargets(false);

                    if (initialScan.cancelled || stopCrafting) {
                        setCraftStatus('Auto craft stopped before crafting.');
                        return;
                    }

                    if (!initialScan.targets.length) {
                        setCraftStatus(
                            'No badges are currently ready to craft.'
                        );
                        return;
                    }

                    const confirmed = await requestCraftConfirmation(
                        initialScan.targets.length
                    );

                    if (!confirmed) {
                        setCraftStatus('Auto craft cancelled.');
                        return;
                    }

                    if (!acquireCraftLock()) {
                        setCraftStatus(
                            'Another tab is already auto crafting badges.'
                        );
                        return;
                    }

                    lockHeld = true;
                    lockHeartbeat = setInterval(() => {
                        if (!refreshCraftLock()) {
                            stopCrafting = true;
                            setCraftStatus(
                                'Another tab took over auto craft. ' +
                                'Stopping after the current request...'
                            );
                        }
                    }, 20000);

                    let targets = initialScan.targets;

                    for (
                        let pass = 1;
                        pass <= MAX_CRAFT_PASSES && targets.length;
                        pass += 1
                    ) {
                        const attemptsBeforePass = summary.attempts;

                        for (
                            let index = 0;
                            index < targets.length;
                            index += 1
                        ) {
                            if (
                                stopCrafting ||
                                summary.batches >= MAX_CRAFT_BATCHES
                            ) {
                                break;
                            }

                            const target = targets[index];

                            if (summary.failed.has(target.key)) {
                                continue;
                            }

                            await craftEveryLevel(
                                target,
                                sessionid,
                                summary,
                                index + 1,
                                targets.length
                            );
                        }

                        if (
                            stopCrafting ||
                            summary.batches >= MAX_CRAFT_BATCHES
                        ) {
                            summary.safetyLimit =
                                summary.batches >= MAX_CRAFT_BATCHES;
                            break;
                        }

                        // A pass without mutation attempts indicates stale
                        // rows; stop instead of rescanning indefinitely.
                        if (summary.attempts === attemptsBeforePass) {
                            break;
                        }

                        setCraftStatus(
                            'Rescanning for badges made ready by rewards...'
                        );

                        const nextScan = await collectCraftTargets(true);

                        if (nextScan.cancelled || stopCrafting) {
                            break;
                        }

                        targets = nextScan.targets
                            .filter((target) => (
                                !summary.failed.has(target.key)
                            ));

                        if (
                            pass === MAX_CRAFT_PASSES &&
                            targets.length
                        ) {
                            summary.safetyLimit = true;
                        }
                    }
                } catch (err) {
                    runError = err;
                    console.error(
                        'Steam Page Tools: auto craft stopped',
                        err
                    );
                } finally {
                    if (lockHeartbeat !== null) {
                        clearInterval(lockHeartbeat);
                    }

                    if (lockHeld) {
                        releaseCraftLock();
                    }

                    if (
                        summary.attempts ||
                        summary.skipped.size ||
                        summary.failed.size ||
                        runError
                    ) {
                        renderCraftSummary(summary, runError);
                    }

                    stopCrafting = false;
                    autoCraft.style.pointerEvents = '';
                    autoCraft.style.opacity = '';
                    setCraftBusy(false);
                }
            }

            bindButtonActivation(toggle, onToggle);
            bindButtonActivation(autoCraft, onAutoCraft);

            window.addEventListener('storage', (e) => {
                if (
                    craftBusy &&
                    e.key === CRAFT_LOCK_KEY
                ) {
                    const current = readCraftLock();

                    if (
                        current &&
                        current.owner !== craftLockOwner &&
                        current.expiresAt > Date.now()
                    ) {
                        stopCrafting = true;
                        setCraftStatus(
                            'Another tab started auto craft. ' +
                            'Stopping this queue after the current request...'
                        );
                    }
                }
            });

            return true;
        }

        // Steam may render the badge list after DOMContentLoaded, so poll
        // briefly.
        let attempts = 0;

        const interval = setInterval(() => {
            attempts += 1;

            if (insertControl() || attempts > 20) {
                clearInterval(interval);
            }
        }, 250);
    }

    // Store search bulk actions.
    // Bundle results are skipped because they require bundle-package lookup.
    // Apps with multiple purchase options use Steam's first/default package,
    // matching the primary action on the app page.
    function initSearchBulkCart() {
        const STORAGE_KEY = 'spt-search-cart-selection';
        const LEGACY_STORAGE_KEY = 'dbf-search-cart-selection';

        // Map app IDs to their display names and rendered checkboxes.
        const selected = new Map();
        let busy = false;

        injectStyles();

        const bar = buildBar();
        document.body.appendChild(bar.el);

        restoreSelection();

        // Persist selections until each game succeeds or the user clears
        // them, including across navigation and browser restarts.
        function loadStoredSelection() {
            try {
                let raw = localStorage.getItem(STORAGE_KEY);

                // Migrate selections saved under the previous script name.
                if (!raw) {
                    raw = localStorage.getItem(LEGACY_STORAGE_KEY);

                    if (raw) {
                        // Restore readable legacy data even if migration is
                        // blocked by storage permissions or quota.
                        try {
                            localStorage.setItem(STORAGE_KEY, raw);
                            localStorage.removeItem(LEGACY_STORAGE_KEY);
                        } catch (err) {
                            console.warn(
                                'Steam Page Tools: could not migrate saved selection',
                                err
                            );
                        }
                    }
                }

                if (!raw) {
                    return new Map();
                }

                return new Map(Object.entries(JSON.parse(raw)));
            } catch (err) {
                console.error('Steam Page Tools: failed to read saved selection', err);
                return new Map();
            }
        }

        function saveSelection() {
            try {
                const obj = {};

                selected.forEach((info, appid) => {
                    obj[appid] = info.name;
                });

                localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
            } catch (err) {
                console.error('Steam Page Tools: failed to save selection', err);
            }
        }

        // Restored selections acquire a checkbox reference when their row is
        // rendered.
        function restoreSelection() {
            const stored = loadStoredSelection();

            if (!stored.size) {
                return;
            }

            stored.forEach((name, appid) => {
                selected.set(appid, { name, box: null });
            });

            updateBar();
            setStatus(`Restored ${stored.size} selected game(s) from before.`);
        }

        function clearSelection() {
            if (busy) {
                return;
            }

            selected.forEach((info) => {
                if (info.box) {
                    info.box.classList.remove('spt-checked');
                    info.box.setAttribute('aria-checked', 'false');
                }
            });

            selected.clear();
            saveSelection();
            updateBar();
        }

        let scanAttempts = 0;

        const scanInterval = setInterval(() => {
            scanAttempts += 1;

            const container =
                document.querySelector('#search_resultsRows') ||
                document.querySelector('.search_results_rows');

            if (container) {
                container
                    .querySelectorAll('.search_result_row')
                    .forEach(processRow);

                observeResults(container);

                clearInterval(scanInterval);
            } else if (scanAttempts > 20) {
                clearInterval(scanInterval);
            }
        }, 250);

        // Observe infinite-scroll results as well as the initial result set.
        function observeResults(container) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) {
                            return;
                        }

                        if (node.matches && node.matches('.search_result_row')) {
                            processRow(node);
                        } else if (node.querySelectorAll) {
                            node
                                .querySelectorAll('.search_result_row')
                                .forEach(processRow);
                        }
                    });
                }
            });

            observer.observe(container, { childList: true, subtree: true });
        }

        function extractAppId(row) {
            const raw = row.getAttribute('data-ds-appid');

            if (raw) {
                // Comma-separated app IDs identify an unsupported bundle.
                const appid = raw.trim();

                return !raw.includes(',') && /^\d+$/.test(appid)
                    ? appid
                    : null;
            }

            // Fall back to the app ID embedded in the result URL.
            const href = row.getAttribute('href') || '';
            const match = href.match(/\/app\/(\d+)\//);

            return match ? match[1] : null;
        }

        function processRow(row) {
            if (row.dataset.sptProcessed) {
                return;
            }

            row.dataset.sptProcessed = '1';

            const appid = extractAppId(row);

            if (!appid) {
                return;
            }

            const nameEl = row.querySelector('.title');
            const name = nameEl ? nameEl.textContent.trim() : `App ${appid}`;

            // Position against the capsule; the full row includes the price
            // column.
            const capsule = row.querySelector('.search_capsule') || row;

            if (getComputedStyle(capsule).position === 'static') {
                capsule.style.position = 'relative';
            }

            const box = document.createElement('div');

            box.className = 'spt-cart-checkbox';
            box.tabIndex = 0;
            box.setAttribute('role', 'checkbox');
            box.setAttribute('aria-checked', 'false');
            box.title = 'Select for bulk cart or wishlist actions';

            if (selected.has(appid)) {
                const info = selected.get(appid);

                info.box = box;
                box.classList.add('spt-checked');
                box.setAttribute('aria-checked', 'true');
            }

            // Prevent the checkbox from following the enclosing result link.
            box.addEventListener('mousedown', (e) => e.stopPropagation());
            box.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSelection(appid, name, box);
            });

            box.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSelection(appid, name, box);
                }
            });

            capsule.appendChild(box);
        }

        function toggleSelection(appid, name, box) {
            if (busy) {
                return;
            }

            if (selected.has(appid)) {
                selected.delete(appid);
                box.classList.remove('spt-checked');
                box.setAttribute('aria-checked', 'false');
            } else {
                selected.set(appid, { name, box });
                box.classList.add('spt-checked');
                box.setAttribute('aria-checked', 'true');
            }

            saveSelection();
            updateBar();
        }

        function updateBar() {
            const count = selected.size;

            bar.cartLabel.textContent = `Add ${count} to Cart`;
            bar.wishlistLabel.textContent = `Add ${count} to Wishlist`;

            if (count > 0) {
                bar.el.classList.add('spt-visible');
            } else if (!busy) {
                bar.el.classList.remove('spt-visible');
                setStatus('');
            }
        }

        function setStatus(text, destination) {
            bar.status.textContent = text;

            if (destination) {
                bar.status.appendChild(document.createTextNode(' '));

                const link = document.createElement('a');

                if (destination === 'wishlist') {
                    link.href = requirePinnedSteamUrl(
                        '/wishlist/',
                        STEAM_STORE_ORIGIN
                    ).href;
                    link.textContent = 'View wishlist';
                } else {
                    link.href = requirePinnedSteamUrl(
                        '/cart/',
                        STEAM_STORE_ORIGIN
                    ).href;
                    link.textContent = 'View cart';
                }

                link.style.color = '#67c1f1';

                bar.status.appendChild(link);
            }
        }

        function readStoreAccount() {
            const configEl = document.querySelector('#application_config');
            let userInfo = {};
            let appConfig = {};

            if (configEl) {
                try {
                    userInfo = JSON.parse(configEl.dataset.userinfo || '{}');
                } catch (err) {
                    console.warn(
                        'Steam Page Tools: could not read Steam user info',
                        err
                    );
                }

                try {
                    appConfig = JSON.parse(configEl.dataset.config || '{}');
                } catch (err) {
                    console.warn(
                        'Steam Page Tools: could not read Steam store config',
                        err
                    );
                }
            }

            const accountid = String(
                userInfo.accountid || window.g_AccountID || ''
            );
            const country = String(
                userInfo.country_code || appConfig.COUNTRY || ''
            ).toUpperCase();

            if (!accountid || accountid === '0' || !country) {
                throw new Error('not signed in or account data is unavailable');
            }

            return { accountid, country };
        }

        function bumpDynamicStoreVersion() {
            try {
                const current =
                    parseInt(
                        localStorage.getItem('unUserdataVersion') || '0',
                        10
                    ) || 0;
                const next = current + 1;

                localStorage.setItem('unUserdataVersion', String(next));

                return next;
            } catch {
                return Date.now();
            }
        }

        // Refresh the complete account wishlist before each run because DOM
        // state can be stale or incomplete.
        async function fetchCurrentWishlist() {
            const { accountid, country } = readStoreAccount();
            const version = bumpDynamicStoreVersion();
            const url = requirePinnedSteamUrl(
                '/dynamicstore/userdata/',
                STEAM_STORE_ORIGIN
            );

            url.searchParams.set('id', accountid);
            url.searchParams.set('cc', country);
            url.searchParams.set('origin', location.origin);
            url.searchParams.set('v', String(version));
            url.searchParams.set('_', String(Date.now()));

            const res = await fetch(url.toString(), {
                credentials: 'include',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });

            requirePinnedSteamResponseUrl(
                res,
                STEAM_STORE_ORIGIN,
                url
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json();

            if (!json || !Array.isArray(json.rgWishlist)) {
                throw new Error('Steam returned invalid wishlist data');
            }

            return new Set(json.rgWishlist.map((appid) => String(appid)));
        }

        async function addAppToWishlist(appid, sessionid) {
            const mutationUrl = requirePinnedSteamUrl(
                '/api/addtowishlist',
                STEAM_STORE_ORIGIN
            );
            const body = new URLSearchParams({
                sessionid,
                appid: String(appid),
            });

            const res = await fetch(
                mutationUrl,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    body: body.toString(),
                }
            );

            requirePinnedSteamResponseUrl(
                res,
                STEAM_STORE_ORIGIN,
                mutationUrl
            );

            if (!res.ok) {
                const err = new Error(`HTTP ${res.status}`);

                err.rateLimited = res.status === 429;
                throw err;
            }

            const json = await res.json();

            if (!json || (json.success !== true && json.success !== 1)) {
                throw new Error('Steam did not confirm the wishlist change');
            }
        }

        function removeHandledSelection(appid, info) {
            selected.delete(appid);

            if (info.box) {
                info.box.classList.remove('spt-checked');
                info.box.setAttribute('aria-checked', 'false');
            }
        }

        function syncDynamicWishlist(appids) {
            const dynamicStore = window.GDynamicStore;

            try {
                if (dynamicStore && dynamicStore.s_rgWishlist) {
                    appids.forEach((appid) => {
                        dynamicStore.s_rgWishlist[appid] = true;
                    });
                }

                if (
                    dynamicStore &&
                    typeof dynamicStore.InvalidateCache === 'function'
                ) {
                    dynamicStore.InvalidateCache();
                } else {
                    bumpDynamicStoreVersion();
                }
            } catch {
                bumpDynamicStoreVersion();
            }
        }

        // Cart mutations require a package (sub) ID, so resolve Steam's
        // default purchase option for each app.
        async function resolveSubId(appid) {
            if (!/^\d+$/.test(String(appid))) {
                throw new Error('invalid Steam app ID');
            }

            const detailsUrl = requirePinnedSteamUrl(
                '/api/appdetails',
                STEAM_STORE_ORIGIN
            );

            detailsUrl.searchParams.set('appids', String(appid));

            const res = await fetch(detailsUrl, { credentials: 'include' });

            requirePinnedSteamResponseUrl(
                res,
                STEAM_STORE_ORIGIN,
                detailsUrl
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json();
            const entry = json[appid];

            if (!entry || !entry.success || !entry.data) {
                throw new Error('no purchase data for this app');
            }

            const groups = entry.data.package_groups;

            if (groups && groups.length && groups[0].subs && groups[0].subs.length) {
                return groups[0].subs[0].packageid;
            }

            if (entry.data.packages && entry.data.packages.length) {
                return entry.data.packages[0];
            }

            throw new Error('no purchasable package found');
        }

        async function addSubToCart(subid, sessionid) {
            if (!/^\d+$/.test(String(subid))) {
                throw new Error('invalid Steam package ID');
            }

            const mutationUrl = requirePinnedSteamUrl(
                '/cart/',
                STEAM_STORE_ORIGIN
            );
            const body = new URLSearchParams({
                action: 'add_to_cart',
                sessionid,
                subid: String(subid),
            });

            const res = await fetch(mutationUrl, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });

            requirePinnedSteamResponseUrl(
                res,
                STEAM_STORE_ORIGIN,
                mutationUrl
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
        }

        function buildBar() {
            const el = document.createElement('div');

            el.id = 'spt-cart-bar';

            const status = document.createElement('span');

            status.id = 'spt-cart-status';

            const actions = document.createElement('div');

            actions.id = 'spt-store-actions';

            const addWrap = document.createElement('div');

            addWrap.className = 'btn_addtocart';

            const addBtn = document.createElement('a');

            addBtn.id = 'spt-add-to-cart-btn';
            addBtn.className = 'btnv6_green_white_innerfade btn_medium';
            addBtn.setAttribute('role', 'button');
            addBtn.tabIndex = 0;

            const cartLabel = document.createElement('span');

            cartLabel.textContent = 'Add 0 to Cart';

            addBtn.appendChild(cartLabel);
            addWrap.appendChild(addBtn);

            const wishlistWrap = document.createElement('div');

            wishlistWrap.className = 'btn_addtocart';

            const wishlistBtn = document.createElement('a');

            wishlistBtn.id = 'spt-add-to-wishlist-btn';
            wishlistBtn.className = 'btnv6_blue_hoverfade btn_medium';
            wishlistBtn.setAttribute('role', 'button');
            wishlistBtn.tabIndex = 0;
            wishlistBtn.title =
                'Already-wishlisted games are checked and skipped automatically';

            const wishlistLabel = document.createElement('span');

            wishlistLabel.textContent = 'Add 0 to Wishlist';

            wishlistBtn.appendChild(wishlistLabel);
            wishlistWrap.appendChild(wishlistBtn);
            actions.appendChild(addWrap);
            actions.appendChild(wishlistWrap);

            const closeBtn = document.createElement('span');

            closeBtn.id = 'spt-cart-close';
            closeBtn.textContent = '\u2715';
            closeBtn.title = 'Clear selection';
            closeBtn.setAttribute('role', 'button');
            closeBtn.tabIndex = 0;

            closeBtn.addEventListener('click', () => {
                clearSelection();
            });

            closeBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    closeBtn.click();
                }
            });

            el.appendChild(status);
            el.appendChild(actions);
            el.appendChild(closeBtn);

            function setActionBusy(isBusy) {
                busy = isBusy;

                [addBtn, wishlistBtn].forEach((button) => {
                    button.style.pointerEvents = isBusy ? 'none' : '';
                    button.style.opacity = isBusy ? '0.6' : '';
                    button.setAttribute(
                        'aria-disabled',
                        isBusy ? 'true' : 'false'
                    );
                });

                closeBtn.style.pointerEvents = isBusy ? 'none' : '';
                closeBtn.style.opacity = isBusy ? '0.6' : '';
            }

            async function onAddToCart() {
                if (busy || selected.size === 0) {
                    return;
                }

                const sessionid = getSessionId();

                if (!sessionid) {
                    setStatus('Could not find your session ID - try refreshing the page.');
                    return;
                }

                setActionBusy(true);

                const entries = [...selected.entries()];
                const failed = [];

                try {
                    for (let i = 0; i < entries.length; i += 1) {
                        const [appid, info] = entries[i];

                        setStatus(
                            `Adding ${i + 1} of ${entries.length} to cart: ${info.name}...`
                        );

                        try {
                            const subid = await resolveSubId(appid);

                            await addSubToCart(subid, sessionid);

                            removeHandledSelection(appid, info);
                            saveSelection();
                        } catch (err) {
                            console.error(
                                'Steam Page Tools: failed to add to cart',
                                appid,
                                err
                            );
                            failed.push(info.name);
                        }

                        updateBar();

                        if (i < entries.length - 1) {
                            await sleep(400);
                        }
                    }

                    if (failed.length) {
                        setStatus(
                            `Added ${entries.length - failed.length} of ${entries.length} to cart. ${failed.length} failed and stayed selected.`,
                            'cart'
                        );
                    } else {
                        setStatus(
                            `Added ${entries.length} game(s) to cart.`,
                            'cart'
                        );
                    }
                } finally {
                    setActionBusy(false);
                }
            }

            async function onAddToWishlist() {
                if (busy || selected.size === 0) {
                    return;
                }

                const sessionid = getSessionId();

                if (!sessionid) {
                    setStatus(
                        'Could not find your session ID - try refreshing the page.'
                    );
                    return;
                }

                setActionBusy(true);

                try {
                    setStatus('Checking your current Steam wishlist...');

                    let currentWishlist;

                    try {
                        currentWishlist = await fetchCurrentWishlist();
                    } catch (err) {
                        console.error(
                            'Steam Page Tools: failed to verify wishlist',
                            err
                        );
                        setStatus(
                            'Could not verify your current wishlist, so nothing was added. Try refreshing the page.'
                        );
                        return;
                    }

                    const entries = [...selected.entries()];
                    const pending = [];
                    const skipped = [];
                    const addedAppids = [];
                    const failed = [];
                    let rateLimited = false;

                    entries.forEach(([appid, info]) => {
                        if (currentWishlist.has(appid)) {
                            skipped.push(info.name);
                            removeHandledSelection(appid, info);
                        } else {
                            pending.push([appid, info]);
                        }
                    });

                    if (skipped.length) {
                        saveSelection();
                        updateBar();
                    }

                    for (let i = 0; i < pending.length; i += 1) {
                        const [appid, info] = pending[i];

                        setStatus(
                            `Adding ${i + 1} of ${pending.length} to wishlist: ${info.name}...`
                        );

                        try {
                            await addAppToWishlist(appid, sessionid);

                            currentWishlist.add(appid);
                            addedAppids.push(appid);
                            removeHandledSelection(appid, info);
                            saveSelection();
                        } catch (err) {
                            console.error(
                                'Steam Page Tools: failed to add to wishlist',
                                appid,
                                err
                            );
                            failed.push(info.name);

                            if (err.rateLimited) {
                                rateLimited = true;
                            }
                        }

                        updateBar();

                        if (rateLimited) {
                            break;
                        }

                        if (i < pending.length - 1) {
                            await sleep(800);
                        }
                    }

                    if (addedAppids.length) {
                        syncDynamicWishlist(addedAppids);
                    }

                    let message =
                        `Added ${addedAppids.length} game(s) to wishlist.`;

                    if (skipped.length) {
                        message +=
                            ` Skipped ${skipped.length} already wishlisted.`;
                    }

                    if (failed.length) {
                        message +=
                            ` ${failed.length} failed and stayed selected.`;
                    }

                    if (rateLimited) {
                        message +=
                            ' Steam asked to slow down; remaining games stayed selected.';
                    }

                    setStatus(message, 'wishlist');
                } finally {
                    setActionBusy(false);
                }
            }

            bindButtonActivation(addBtn, onAddToCart);
            bindButtonActivation(wishlistBtn, onAddToWishlist);

            return { el, status, cartLabel, wishlistLabel };
        }

        function injectStyles() {
            const style = document.createElement('style');

            style.textContent = `
                .spt-cart-checkbox {
                    position: absolute;
                    bottom: 4px;
                    right: 4px;
                    width: 18px;
                    height: 18px;
                    border-radius: 2px;
                    background: rgba(27, 40, 56, 0.9);
                    border: 1px solid #67c1f1;
                    cursor: pointer;
                    z-index: 5;
                }

                .spt-cart-checkbox.spt-checked {
                    background: #67c1f1;
                }

                .spt-cart-checkbox.spt-checked::after {
                    content: '';
                    position: absolute;
                    left: 5px;
                    top: 1px;
                    width: 5px;
                    height: 9px;
                    border: solid #1b2838;
                    border-width: 0 2px 2px 0;
                    transform: rotate(45deg);
                }

                #spt-cart-bar {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    z-index: 10000;
                    display: none;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                    max-width: calc(100vw - 40px);
                    background: #1b2838;
                    border: 1px solid #2a475e;
                    border-radius: 3px;
                    padding: 10px 14px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                    font-family: "Motiva Sans", Arial, sans-serif;
                }

                #spt-cart-bar.spt-visible {
                    display: flex;
                }

                #spt-cart-status {
                    color: #8f98a0;
                    font-size: 12px;
                    max-width: 280px;
                    flex: 0 1 auto;
                }

                #spt-cart-status:empty {
                    display: none;
                }

                #spt-store-actions {
                    display: flex;
                    align-items: center;
                    flex: 0 0 auto;
                    flex-wrap: nowrap;
                    gap: 4px;
                }

                #spt-store-actions .btn_addtocart {
                    float: none;
                    margin: 0;
                }

                #spt-cart-close {
                    cursor: pointer;
                    color: #8f98a0;
                    font-size: 13px;
                    padding: 2px 4px;
                }

                #spt-cart-close:hover {
                    color: #ffffff;
                }
            `;

            document.head.appendChild(style);
        }
    }
})();
