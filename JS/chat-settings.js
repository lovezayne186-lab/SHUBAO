function resolveChatSettingsRoleId(roleId) {
    const explicit = String(roleId || '').trim();
    if (explicit) return explicit;
    try {
        const modal = document.getElementById('settings-menu-modal');
        const modalRoleId = modal && modal.dataset ? String(modal.dataset.roleId || '').trim() : '';
        if (modalRoleId) return modalRoleId;
    } catch (e) { }
    const current = String(window.currentChatRole || '').trim();
    if (current) return current;
    return String(localStorage.getItem('currentChatId') || '').trim();
}

function getCurrentChatSettings(roleId) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = resolveChatSettingsRoleId(roleId);
    return allSettings[id] || {};
}

function saveCurrentChatSettings(roleId, settings) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    allSettings[id] = Object.assign({}, allSettings[id] || {}, settings || {});
    localStorage.setItem('chat_settings_by_role', JSON.stringify(allSettings));
}

function applyChatBubbleCssFromSettings(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    const settings = getCurrentChatSettings(id);
    const cssText = settings.bubbleCss || '';
    const styleId = 'chat-bubble-css-style';
    let styleEl = document.getElementById(styleId);
    const trimmed = String(cssText || '').trim();
    if (!trimmed) {
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }
        return;
    }
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    const looksLikeFullCss = /[{}]/.test(trimmed);
    if (looksLikeFullCss) {
        styleEl.textContent = trimmed;
        return;
    }
    styleEl.textContent = `.msg-bubble { ${trimmed} }
.msg-left .msg-bubble { ${trimmed} }
.msg-right .msg-bubble { ${trimmed} }`;
}

function updateBubblePreview() {
    const textarea = document.getElementById('setting-bubble-css');
    const preview = document.getElementById('bubble-preview');
    if (!textarea || !preview) return;
    const cssText = textarea.value || '';
    const trimmed = String(cssText || '').trim();
    if (!trimmed) {
        const left = preview.querySelector('.preview-bubble-left');
        const right = preview.querySelector('.preview-bubble-right');
        if (left) {
            left.setAttribute('style', 'background: #ffffff; padding: 8px 12px; border-radius: 4px; font-size: 14px; max-width: 70%; color: #000;');
        }
        if (right) {
            right.setAttribute('style', 'background: #95ec69; padding: 8px 12px; border-radius: 4px; font-size: 14px; max-width: 70%; color: #000; margin-right:8px;');
        }
        return;
    }
    if (/[{}]/.test(trimmed)) {
        return;
    }
    const temp = document.createElement('div');
    document.body.appendChild(temp);
    temp.setAttribute('style', trimmed);
    const applied = temp.getAttribute('style') || '';
    document.body.removeChild(temp);
    const left = preview.querySelector('.preview-bubble-left');
    const right = preview.querySelector('.preview-bubble-right');
    if (left) left.setAttribute('style', applied);
    if (right) right.setAttribute('style', applied);
}

function saveChatSettings() {
    const roleId = resolveChatSettingsRoleId('');
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const momentsPostingSwitch = document.getElementById('setting-moments-posting-enabled');
    const allowOfflineInviteSwitch = document.getElementById('setting-allow-offline-invite');
    const autoTranslateSwitch = document.getElementById('setting-auto-translate-switch');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const busyReplySwitch = document.getElementById('setting-busy-reply-enabled');
    const busyReplyModeInputs = document.querySelectorAll('input[name="setting-busy-reply-mode"]');
    const summaryFreqInput = document.getElementById('setting-summary-freq');
    const fontSizeInput = document.getElementById('setting-font-size');
    const bubbleCssInput = document.getElementById('setting-bubble-css');
    const settings = {};
    if (memoryLimitInput) {
        settings.memoryLimit = parseInt(memoryLimitInput.value, 10) || 0;
    }
    if (momentsPostingSwitch) {
        settings.momentsPostingEnabled = !!momentsPostingSwitch.checked;
    }
    if (allowOfflineInviteSwitch) {
        settings.allowOfflineInvite = !!allowOfflineInviteSwitch.checked;
    }
    if (autoTranslateSwitch) {
        settings.autoTranslate = !!autoTranslateSwitch.checked;
    }
    if (autoSummarySwitch) {
        settings.autoSummary = !!autoSummarySwitch.checked;
    }
    const busyReplyEnabledUi = busyReplySwitch ? !!busyReplySwitch.checked : false;
    if (busyReplySwitch) settings.busyReplyEnabled = busyReplyEnabledUi;
    let busyReplyMode = 'system';
    if (busyReplyModeInputs && busyReplyModeInputs.length) {
        busyReplyModeInputs.forEach(function (input) {
            if (input && input.checked) {
                busyReplyMode = String(input.value || '').trim() === 'auto' ? 'auto' : 'system';
            }
        });
    }
    settings.busyReplyMode = busyReplyMode;
    if (busyReplyMode === 'auto') {
        settings.busyReplyEnabled = true;
        if (busyReplySwitch) busyReplySwitch.checked = true;
    }
    if (summaryFreqInput) {
        settings.summaryFreq = parseInt(summaryFreqInput.value, 10) || 0;
    }
    if (fontSizeInput) {
        settings.fontSize = parseInt(fontSizeInput.value, 10) || 0;
    }
    if (bubbleCssInput) {
        settings.bubbleCss = bubbleCssInput.value || '';
    }
    saveCurrentChatSettings(roleId, settings);
    if (typeof settings.memoryLimit === 'number' && settings.memoryLimit > 0) {
        localStorage.setItem('chat_memory_limit', String(settings.memoryLimit));
    }
    if (typeof settings.autoSummary === 'boolean') {
        localStorage.setItem('chat_auto_summary', settings.autoSummary ? 'true' : 'false');
    }
    if (typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
        localStorage.setItem('chat_summary_freq', String(settings.summaryFreq));
    }
    if (typeof settings.autoTranslate === 'boolean') {
        localStorage.setItem('chat_auto_translate', settings.autoTranslate ? 'true' : 'false');
    }
    applyChatBubbleCssFromSettings(roleId);
    applyChatFontSizeFromSettings(roleId);
    toggleBusyReplyModeBox();
    renderBusyReplyAutoLibraryPanel(roleId);
}

window.__chatSettingsSaveCore = saveChatSettings;
window.__chatSettingsInitCore = initChatSettingsUI;
window.__chatSettingsToggleSummaryCore = toggleSummaryInput;
window.__chatSettingsBubblePreviewCore = updateBubblePreview;

function toggleSummaryInput() {
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const box = document.getElementById('setting-summary-freq-box');
    if (!autoSummarySwitch || !box) return;
    if (autoSummarySwitch.checked) {
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
    }
}

function toggleBusyReplyModeBox() {
    const enabledSwitch = document.getElementById('setting-busy-reply-enabled');
    const box = document.getElementById('setting-busy-reply-mode-box');
    if (!enabledSwitch || !box) return;
    const roleId = resolveChatSettingsRoleId('');
    if (enabledSwitch.checked) {
        box.hidden = false;
    } else {
        box.hidden = true;
    }
    renderBusyReplyAutoLibraryPanel(roleId);
}

function getBusyReplySetting(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const enabled = settings && typeof settings.busyReplyEnabled === 'boolean'
        ? settings.busyReplyEnabled
        : false;
    const mode = settings && String(settings.busyReplyMode || '').trim() === 'auto' ? 'auto' : 'system';
    return {
        enabled: enabled,
        mode: enabled ? mode : 'system'
    };
}

function isBusyReplyEnabled(roleId) {
    return !!getBusyReplySetting(roleId).enabled;
}

function getBusyReplyMode(roleId) {
    return getBusyReplySetting(roleId).mode;
}

function notifyBusyReplyAction(text) {
    const message = String(text || '').trim();
    if (!message) return;
    try {
        if (typeof showTopNotification === 'function') {
            if (showTopNotification.length >= 2) {
                showTopNotification(window.currentChatRole || '', message, 1800);
            } else {
                showTopNotification(message);
            }
            return;
        }
    } catch (e) { }
    try {
        alert(message);
    } catch (e2) { }
}

function setBusyReplyGenerationLoading(isLoading) {
    const loading = !!isLoading;
    const panel = document.getElementById('setting-busy-auto-reply-box');
    const genBtn = document.getElementById('busy-auto-reply-generate-btn');
    const refreshBtn = document.getElementById('busy-auto-reply-refresh-btn');
    if (panel) {
        panel.classList.toggle('busy-auto-reply-loading', loading);
    }
    const setButtonState = function (btn, text, disabled) {
        if (!btn) return;
        if (btn.dataset && !btn.dataset.originalHtml) {
            btn.dataset.originalHtml = btn.innerHTML;
        }
        btn.disabled = !!disabled;
        if (text) {
            btn.innerHTML = text;
        } else if (!disabled && btn.dataset && btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
        }
    };
    if (loading) {
        setButtonState(genBtn, '生成中...', true);
        setButtonState(refreshBtn, '请稍候', true);
    } else {
        if (genBtn && genBtn.dataset && genBtn.dataset.originalHtml) {
            genBtn.innerHTML = genBtn.dataset.originalHtml;
        }
        if (refreshBtn && refreshBtn.dataset && refreshBtn.dataset.originalHtml) {
            refreshBtn.innerHTML = refreshBtn.dataset.originalHtml;
        }
        if (genBtn) genBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

function getBusyReplyAutoLibrarySetting(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const settings = getCurrentChatSettings(id);
    const stored = (settings && typeof settings === 'object')
        ? (settings['busyReplyAutoLibrary'] || settings['busyReplyAutoLibrary'.replace('Auto', '')] || null)
        : null;
    return typeof window.normalizeBusyReplyAutoLibrary === 'function'
        ? window.normalizeBusyReplyAutoLibrary(stored)
        : { version: 1, events: {} };
}

function getBusyReplyScheduleEventList(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const plan = typeof window.getRoleSchedulePlan === 'function'
        ? window.getRoleSchedulePlan(id)
        : null;
    const events = [];
    if (!plan || typeof plan !== 'object') return events;

    if (plan.sleepStart && plan.sleepEnd) {
        events.push({
            eventKey: typeof window.getBusyReplyScheduleEventKey === 'function'
                ? window.getBusyReplyScheduleEventKey('sleep', {
                    sleepStart: plan.sleepStart,
                    sleepEnd: plan.sleepEnd
                })
                : ['sleep', plan.sleepStart, plan.sleepEnd].join('|'),
            kind: 'sleep',
            title: '睡觉时段',
            reason: '睡觉',
            start: String(plan.sleepStart || '').trim(),
            end: String(plan.sleepEnd || '').trim()
        });
    }

    const busyBlocks = Array.isArray(plan.busyBlocks) ? plan.busyBlocks : [];
    busyBlocks.forEach(function (block, index) {
        if (!block || typeof block !== 'object') return;
        const start = String(block.start || '').trim();
        const end = String(block.end || '').trim();
        const reason = String(block.reason || '').trim() || '忙碌';
        events.push({
            eventKey: typeof window.getBusyReplyScheduleEventKey === 'function'
                ? window.getBusyReplyScheduleEventKey('busy', {
                    start: start,
                    end: end,
                    reason: reason
                })
                : ['busy', start, end, reason].join('|'),
            kind: 'busy',
            title: reason || ('忙碌时段 ' + (index + 1)),
            reason: reason,
            start: start,
            end: end
        });
    });

    return events;
}

function getBusyReplyAutoEventList(roleId) {
    const library = getBusyReplyAutoLibrarySetting(roleId);
    const disabledKeys = Array.isArray(library && (library.disabledEventKeys || library.disabledEvents))
        ? (library.disabledEventKeys || library.disabledEvents).map(function (k) { return String(k || '').trim(); }).filter(Boolean)
        : [];
    const disabledMap = {};
    disabledKeys.forEach(function (k) { disabledMap[k] = true; });
    const scheduleEvents = getBusyReplyScheduleEventList(roleId);
    const out = [];
    const seen = {};
    scheduleEvents.forEach(function (event) {
        if (!event || !event.eventKey) return;
        if (disabledMap[String(event.eventKey || '').trim()]) return;
        out.push(event);
        seen[event.eventKey] = true;
    });
    const storedEvents = library && library.events ? library.events : {};
    Object.keys(storedEvents).forEach(function (key) {
        if (seen[key]) return;
        if (disabledMap[String(key || '').trim()]) return;
        const ev = storedEvents[key];
        if (!ev || typeof ev !== 'object') return;
        out.push({
            eventKey: String(key || '').trim(),
            kind: String(ev.kind || '').trim() || 'busy',
            title: String(ev.title || '').trim() || String(ev.reason || '忙碌').trim() || '忙碌',
            reason: String(ev.reason || '').trim() || String(ev.title || '忙碌').trim() || '忙碌',
            start: String(ev.start || '').trim(),
            end: String(ev.end || '').trim()
        });
    });
    return out;
}

function getBusyReplyAutoActiveRoleId(roleId) {
    const explicit = String(roleId || '').trim();
    if (explicit) return resolveChatSettingsRoleId(explicit);
    try {
        const listEl = document.getElementById('setting-busy-auto-reply-list');
        const fromList = listEl && listEl.dataset ? String(listEl.dataset.activeRoleId || '').trim() : '';
        if (fromList) return fromList;
    } catch (e0) { }
    try {
        const panel = document.getElementById('setting-busy-auto-reply-box');
        const fromPanel = panel && panel.dataset ? String(panel.dataset.activeRoleId || '').trim() : '';
        if (fromPanel) return fromPanel;
    } catch (e1) { }
    try {
        const modal = document.getElementById('settings-menu-modal');
        const fromModal = modal && modal.dataset ? String(modal.dataset.roleId || '').trim() : '';
        if (fromModal) return fromModal;
    } catch (e2) { }
    return resolveChatSettingsRoleId('');
}

function buildBusyReplyAutoEntryRowHtml(entry) {
    const src = entry && typeof entry === 'object' ? entry : {};
    const entryId = escapeScheduleParseHtml(String(src.id || ('entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7))));
    const text = escapeScheduleParseHtml(String(src.text || ''));
    const source = escapeScheduleParseHtml(String(src.source || 'user'));
    const createdAt = escapeScheduleParseHtml(String(src.createdAt || Date.now()));
    return [
        '<div class="busy-auto-entry-row" data-entry-id="' + entryId + '" data-entry-source="' + source + '" data-entry-created-at="' + createdAt + '">',
        '<textarea data-busy-auto-entry-text placeholder="请输入自动回复词条">' + text + '</textarea>',
        '<button type="button" class="busy-auto-entry-remove" data-busy-action="remove-entry">删除</button>',
        '</div>'
    ].join('');
}

function findBusyReplyAutoEventCard(eventKey) {
    const key = String(eventKey || '').trim();
    if (!key) return null;
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    if (!listEl) return null;
    const cards = listEl.querySelectorAll('.busy-auto-event-card');
    for (let i = 0; i < cards.length; i += 1) {
        const card = cards[i];
        if (!card) continue;
        if (String(card.dataset.eventKey || '').trim() === key) {
            return card;
        }
    }
    return null;
}

function appendBusyReplyAutoEntryRow(card) {
    if (!card) return null;
    const entryList = card.querySelector('.busy-auto-entry-list');
    if (!entryList) return null;
    const emptyHint = entryList.querySelector('.busy-auto-empty-hint');
    if (emptyHint && emptyHint.parentNode) {
        emptyHint.parentNode.removeChild(emptyHint);
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildBusyReplyAutoEntryRowHtml({
        id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        text: '',
        source: 'user',
        createdAt: Date.now()
    });
    const row = wrapper.firstElementChild;
    if (!row) return null;
    entryList.appendChild(row);
    const textarea = row.querySelector('textarea[data-busy-auto-entry-text]');
    if (textarea) {
        textarea.focus();
        try { textarea.setSelectionRange(0, 0); } catch (eFocus) { }
    }
    try {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (eScroll) { }
    return row;
}

function addBusyReplyAutoEntry(eventKey, roleId) {
    const activeRoleId = getBusyReplyAutoActiveRoleId(roleId);
    if (!activeRoleId) return false;
    const card = findBusyReplyAutoEventCard(eventKey);
    if (!card) return false;
    appendBusyReplyAutoEntryRow(card);
    return true;
}

function triggerBusyReplyAutoGeneration(eventKey, roleId) {
    const activeRoleId = getBusyReplyAutoActiveRoleId(roleId);
    if (!activeRoleId) return false;
    generateBusyReplyAutoLibrary(activeRoleId, eventKey);
    return true;
}

function removeBusyReplyAutoEvent(eventKey, roleId) {
    const activeRoleId = getBusyReplyAutoActiveRoleId(roleId);
    const key = String(eventKey || '').trim();
    if (!activeRoleId || !key) return false;
    const ok = confirm('确认删除这个自动回复事件，并清空它下面的所有词条？');
    if (!ok) return false;
    const lib = getBusyReplyAutoLibrarySetting(activeRoleId);
    const next = {
        version: 1,
        events: Object.assign({}, (lib && lib.events ? lib.events : {})),
        disabledEventKeys: Array.isArray(lib && (lib.disabledEventKeys || lib.disabledEvents))
            ? (lib.disabledEventKeys || lib.disabledEvents).map(function (k) { return String(k || '').trim(); }).filter(Boolean)
            : []
    };
    if (next.disabledEventKeys.indexOf(key) === -1) {
        next.disabledEventKeys.push(key);
    }
    try { delete next.events[key]; } catch (eDel) { }
    if (typeof window.saveBusyReplyAutoLibrary === 'function') {
        window.saveBusyReplyAutoLibrary(activeRoleId, next);
    } else {
        saveCurrentChatSettings(activeRoleId, { busyReplyAutoLibrary: next });
    }
    renderBusyReplyAutoLibraryPanel(activeRoleId);
    return true;
}

function collectBusyReplyAutoLibraryFromPanel(roleId) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    const current = getBusyReplyAutoLibrarySetting(id);
    const preservedDisabled = Array.isArray(current && (current.disabledEventKeys || current.disabledEvents))
        ? (current.disabledEventKeys || current.disabledEvents).map(function (k) { return String(k || '').trim(); }).filter(Boolean)
        : [];
    const next = { version: 1, events: {}, disabledEventKeys: preservedDisabled };
    if (!id || !listEl) return next;
    const cards = listEl.querySelectorAll('.busy-auto-event-card');
    cards.forEach(function (card) {
        if (!card) return;
        const eventKey = String(card.dataset.eventKey || '').trim();
        if (!eventKey) return;
        const kind = String(card.dataset.eventKind || '').trim() || 'busy';
        const title = String(card.dataset.eventTitle || '').trim() || '忙碌';
        const reason = String(card.dataset.eventReason || '').trim() || title;
        const start = String(card.dataset.eventStart || '').trim();
        const end = String(card.dataset.eventEnd || '').trim();
        const rows = card.querySelectorAll('.busy-auto-entry-row');
        const entries = [];
        rows.forEach(function (row) {
            if (!row) return;
            const textarea = row.querySelector('textarea[data-busy-auto-entry-text]');
            const text = textarea ? String(textarea.value || '').trim() : '';
            if (!text) return;
            const entryId = String(row.dataset.entryId || '').trim();
            entries.push({
                id: entryId,
                text: text,
                source: String(row.dataset.entrySource || 'user'),
                createdAt: Number(row.dataset.entryCreatedAt) || Date.now(),
                updatedAt: Date.now()
            });
        });
        next.events[eventKey] = {
            eventKey: eventKey,
            kind: kind,
            title: title,
            reason: reason,
            start: start,
            end: end,
            updatedAt: Date.now(),
            entries: entries
        };
    });
    return next;
}

function saveBusyReplyAutoLibraryFromPanel(roleId) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    if (!id) return null;
    const next = collectBusyReplyAutoLibraryFromPanel(id);
    if (typeof window.saveBusyReplyAutoLibrary === 'function') {
        return window.saveBusyReplyAutoLibrary(id, next);
    }
    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
    return next;
}

function renderBusyReplyAutoLibraryPanel(roleId) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    const panel = document.getElementById('setting-busy-auto-reply-box');
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    if (!panel || !listEl) return;
    const enabledSwitch = document.getElementById('setting-busy-reply-enabled');
    const modeInputs = document.querySelectorAll('input[name="setting-busy-reply-mode"]');
    const enabledFromUi = enabledSwitch ? !!enabledSwitch.checked : null;
    let modeFromUi = null;
    if (modeInputs && modeInputs.length) {
        modeInputs.forEach(function (input) {
            if (!input || !input.checked) return;
            modeFromUi = String(input.value || '').trim() === 'auto' ? 'auto' : 'system';
        });
    }
    const enabled = enabledFromUi == null ? isBusyReplyEnabled(id) : enabledFromUi;
    const mode = modeFromUi == null ? getBusyReplyMode(id) : modeFromUi;
    const show = enabled && mode === 'auto';
    panel.hidden = !show;
    if (!show) {
        try { panel.dataset.activeRoleId = ''; } catch (e00) { }
        try { listEl.dataset.activeRoleId = ''; } catch (e0) { }
        return;
    }

    if (!id) {
        try { panel.dataset.activeRoleId = ''; } catch (e10) { }
        try { listEl.dataset.activeRoleId = ''; } catch (e0) { }
        listEl.innerHTML = '<div class="busy-auto-empty-hint">当前未绑定聊天对象，无法生成词条。请从聊天页打开设置。</div>';
        return;
    }
    try { panel.dataset.activeRoleId = String(id || '').trim(); } catch (e11) { }
    try { listEl.dataset.activeRoleId = String(id || '').trim(); } catch (e1) { }

    const library = getBusyReplyAutoLibrarySetting(id);
    const events = getBusyReplyAutoEventList(id);
    const eventMap = library && library.events ? library.events : {};
    const mergedEvents = events.map(function (event) {
        const stored = eventMap[event.eventKey] && typeof eventMap[event.eventKey] === 'object'
            ? eventMap[event.eventKey]
            : null;
        return {
            eventKey: event.eventKey,
            kind: event.kind,
            title: event.title,
            reason: event.reason,
            start: event.start,
            end: event.end,
            entries: stored && Array.isArray(stored.entries)
                ? stored.entries
                : []
        };
    });

    listEl.innerHTML = mergedEvents.map(function (event) {
        const title = escapeScheduleParseHtml(event.title || '忙碌');
        const reason = escapeScheduleParseHtml(event.reason || '');
        const timeText = escapeScheduleParseHtml((event.start || event.end) ? ((event.start || '--') + ' - ' + (event.end || '--')) : '');
        const entries = Array.isArray(event.entries) ? event.entries : [];
        const entryHtml = entries.length ? entries.map(function (entry, index) {
            const entryObj = typeof window.normalizeBusyReplyAutoLibrary === 'function'
                ? window.normalizeBusyReplyAutoLibrary({ events: { temp: { entries: [entry] } } }).events.temp.entries[0]
                : null;
            return buildBusyReplyAutoEntryRowHtml(entryObj || {
                id: String(entry && entry.id || ('entry_' + index)),
                text: String(entry && entry.text || ''),
                source: String(entry && entry.source || 'user'),
                createdAt: Number(entry && entry.createdAt) || Date.now()
            });
        }).join('') : '<div class="busy-auto-empty-hint">还没有词条，先点生成或手动添加。</div>';
        return [
            '<div class="busy-auto-event-card" data-event-key="' + escapeScheduleParseHtml(event.eventKey || '') + '" data-event-kind="' + escapeScheduleParseHtml(event.kind || '') + '" data-event-title="' + title + '" data-event-reason="' + reason + '" data-event-start="' + escapeScheduleParseHtml(event.start || '') + '" data-event-end="' + escapeScheduleParseHtml(event.end || '') + '">',
            '<div class="busy-auto-event-head">',
            '<div>',
            '<div class="busy-auto-event-title">' + title + '</div>',
            '<div class="busy-auto-event-meta">' + (timeText || '无时间') + (reason ? (' · ' + reason) : '') + '</div>',
            '</div>',
            '<div class="busy-auto-event-actions">',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="generate-event" onclick="event.stopPropagation(); triggerBusyReplyAutoGeneration(' + JSON.stringify(String(event.eventKey || '')) + ');">重新生成</button>',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="add-entry" onclick="event.stopPropagation(); addBusyReplyAutoEntry(' + JSON.stringify(String(event.eventKey || '')) + ');">+ 添加词条</button>',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="remove-event" onclick="event.stopPropagation(); removeBusyReplyAutoEvent(' + JSON.stringify(String(event.eventKey || '')) + ');">删除事件</button>',
            '</div>',
            '</div>',
            '<div class="busy-auto-entry-list">' + entryHtml + '</div>',
            '</div>'
        ].join('');
    }).join('') || '<div class="busy-auto-empty-hint">当前没有可用的作息事件，请先解析作息表。</div>';

    if (listEl.dataset.bound !== '1') {
        listEl.dataset.bound = '1';
        const readActiveRoleId = function () {
            return getBusyReplyAutoActiveRoleId('');
        };
        listEl.addEventListener('click', function (e) {
            const target = e.target && e.target.closest ? e.target.closest('[data-busy-action]') : null;
            if (!target) return;
            const action = String(target.dataset.busyAction || '').trim();
            const card = target.closest('.busy-auto-event-card');
            const eventKey = card ? String(card.dataset.eventKey || '').trim() : '';
            if (!eventKey) return;
            const activeRoleId = readActiveRoleId();
            if (!activeRoleId) return;
            if (action === 'add-entry') {
                appendBusyReplyAutoEntryRow(card);
                return;
            }
            if (action === 'remove-event') {
                removeBusyReplyAutoEvent(eventKey, activeRoleId);
                return;
            }
            if (action === 'remove-entry') {
                const row = target.closest('.busy-auto-entry-row');
                if (!row) return;
                const next = collectBusyReplyAutoLibraryFromPanel(activeRoleId);
                const event = next.events[eventKey];
                if (!event || !Array.isArray(event.entries)) return;
                const entryId = String(row.dataset.entryId || '').trim();
                event.entries = event.entries.filter(function (entry) {
                    return String(entry && entry.id || '') !== entryId;
                });
                if (typeof window.saveBusyReplyAutoLibrary === 'function') {
                    window.saveBusyReplyAutoLibrary(activeRoleId, next);
                } else {
                    saveCurrentChatSettings(activeRoleId, { busyReplyAutoLibrary: next });
                }
                renderBusyReplyAutoLibraryPanel(activeRoleId);
                return;
            }
            if (action === 'generate-event') {
                generateBusyReplyAutoLibrary(activeRoleId, eventKey);
            }
        });
        listEl.addEventListener('input', function () {
            const activeRoleId = readActiveRoleId();
            if (!activeRoleId) return;
            saveBusyReplyAutoLibraryFromPanel(activeRoleId);
        });
        listEl.addEventListener('change', function () {
            const activeRoleId = readActiveRoleId();
            if (!activeRoleId) return;
            saveBusyReplyAutoLibraryFromPanel(activeRoleId);
        });
    }
}

function renderBusyReplyAutoLibraryVisibility(roleId) {
    renderBusyReplyAutoLibraryPanel(roleId);
}

function getBusyReplyAutoGenerationPrompt(roleId, events, library) {
    const id = resolveChatSettingsRoleId(roleId);
    const profile = (window.charProfiles && window.charProfiles[id] && typeof window.charProfiles[id] === 'object')
        ? window.charProfiles[id]
        : {};
    const plan = typeof window.getRoleSchedulePlan === 'function' ? window.getRoleSchedulePlan(id) : null;
    const worldbookPrompt = typeof window.buildWorldBookPrompt === 'function' && profile.worldbookId
        ? window.buildWorldBookPrompt(profile.worldbookId)
        : '';
    const currentLib = library && library.events ? library.events : {};
    const eventLines = (events || []).map(function (event) {
        return [
            '- eventKey: ' + event.eventKey,
            '  kind: ' + event.kind,
            '  title: ' + event.title,
            '  reason: ' + event.reason,
            '  time: ' + (event.start || '--') + ' - ' + (event.end || '--')
        ].join('\n');
    }).join('\n');
    const existingLines = Object.keys(currentLib).map(function (key) {
        const ev = currentLib[key];
        const entryCount = Array.isArray(ev && ev.entries) ? ev.entries.length : 0;
        return '- ' + key + ' / ' + String(ev && ev.title || '') + ' / existing=' + String(entryCount);
    }).join('\n');
    const busyRows = plan && Array.isArray(plan.busyBlocks) ? plan.busyBlocks.map(function (block, index) {
        if (!block || typeof block !== 'object') return '';
        return (index + 1) + '. ' + String(block.start || '--') + ' - ' + String(block.end || '--') + ' / ' + String(block.reason || '忙碌');
    }).filter(Boolean).join('\n') : '';
    return [
        '你现在要批量生成“忙时自动回复词条”。',
        '要求：',
        '1. 每个事件至少生成 2 条，建议 3 到 5 条。',
        '2. 必须使用第一人称，口吻自然、像角色本人真的在聊天框里临时回消息。',
        '3. 不要输出 [自动回复] 前缀，运行时会自动加。',
        '4. 不要输出 Markdown、解释、编号说明之外的文字，只输出严格 JSON。',
        '5. 如果事件已经有旧词条，请避免重复，尽量生成新的表达。',
        '6. 不要写客服式、机器人式套话，不要只写“我在忙”“稍后回复”“晚点聊”这种空泛句子。',
        '7. 每条都要带出角色口吻、情绪、习惯用语或说话节奏，但不能脱离角色设定。',
        '8. 要让人一眼感觉这是这个角色本人发出来的，不是通用模板。',
        '9. 同一事件里的词条彼此要有明显区别，不能只是换几个近义词。',
        '10. 必须覆盖我给你的每一个 eventKey，一个都不能漏。',
        '输出格式必须固定为：{"events":[{"eventKey":"...","entries":["...","..."]}]}',
        '',
        '【角色信息】',
        '角色名称：' + String(profile.nickName || profile.name || profile.remark || id || 'TA'),
        '角色备注：' + String(profile.remark || ''),
        '角色人设：' + String(profile.desc || ''),
        '聊天风格：' + String(profile.style || ''),
        '作息原文：' + String(profile.schedule || ''),
        '作息解析：' + (plan && plan.summary ? String(plan.summary) : ''),
        '结构化作息：' + (busyRows || '(无)'),
        '世界书：' + String(worldbookPrompt || ''),
        '',
        '【当前要生成的事件列表】',
        eventLines || '(无)',
        '',
        '【已有词条概要】',
        existingLines || '(无)',
        '',
        '请严格根据上面的角色信息、世界书和作息来写，不要脱离角色。',
        '把每一条都当成“用户刚刚发来消息后，角色在当前场景下会顺手回的一句真话”。',
        '宁可更像真人聊天，也不要写成统一模板。'
    ].join('\n');
}

function parseBusyReplyGenerationResult(text) {
    const parsed = parseLooseJsonFromText(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
}

function normalizeBusyReplyAutoEntryLocal(entry) {
    if (entry == null) return null;
    const src = typeof entry === 'string' ? { text: entry } : (typeof entry === 'object' ? entry : null);
    if (!src) return null;
    const text = String(src.text || src.content || src.reply || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return {
        id: String(src.id || ('entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7))),
        text: text,
        source: String(src.source || 'user'),
        createdAt: Number(src.createdAt) || Date.now(),
        updatedAt: Number(src.updatedAt) || Date.now()
    };
}

function inferBusyReplyFallbackTone(profile) {
    const desc = String(profile && profile.desc || '').trim();
    const style = String(profile && profile.style || '').trim();
    const text = (desc + '\n' + style).toLowerCase();
    if (/傲娇|嘴硬/.test(text)) return 'tsundere';
    if (/高冷|冷淡|冷静|疏离|克制/.test(text)) return 'cool';
    if (/强势|霸道|占有|掌控/.test(text)) return 'assertive';
    if (/温柔|体贴|治愈|软|甜|奶|可爱|黏|乖/.test(text)) return 'gentle';
    return 'natural';
}

function buildBusyReplyAutoFallbackEntries(event, profile) {
    const src = event && typeof event === 'object' ? event : {};
    const tone = inferBusyReplyFallbackTone(profile);
    const kind = String(src.kind || '').trim() === 'sleep' ? 'sleep' : 'busy';
    const reason = String(src.reason || src.title || (kind === 'sleep' ? '睡觉' : '忙碌')).trim() || (kind === 'sleep' ? '睡觉' : '忙碌');
    const returnText = kind === 'sleep'
        ? (typeof window.formatScheduleClockForDisplay === 'function' ? window.formatScheduleClockForDisplay(src.end || '') : String(src.end || '').trim())
        : (typeof window.formatScheduleClockForDisplay === 'function' ? window.formatScheduleClockForDisplay(src.end || '') : String(src.end || '').trim());
    const toneMap = {
        gentle: kind === 'sleep'
            ? [
                '我已经缩进被子里了，等我睡醒再好好回你。',
                '先让我补一觉，醒来第一时间看你的消息。'
            ]
            : [
                '我这会儿正卡在' + reason + '里，等我腾出手就回你。',
                '先让我把' + reason + '处理完，我不想随便敷衍你。'
            ],
        cool: kind === 'sleep'
            ? [
                '我已经睡了，醒来再回。',
                '先放着，等我睡醒再看。'
            ]
            : [
                '我现在在处理' + reason + '，晚点回你。',
                '这会儿抽不开身，等' + (returnText || '忙完') + '再说。'
            ],
        tsundere: kind === 'sleep'
            ? [
                '我都已经躺下了，你还来找我，醒了再说。',
                '先让我睡，等我醒了再回你，也不是不理你。'
            ]
            : [
                '我正被' + reason + '绊住呢，哪有空立刻回你。',
                '先等我把' + reason + '弄完，再来跟你说。'
            ],
        assertive: kind === 'sleep'
            ? [
                '我先睡，等我醒了会找你。',
                '先别催，我睡醒之后自然会回。'
            ]
            : [
                '我现在正忙' + reason + '，等我结束了再回你。',
                '先让我把' + reason + '收尾，处理完我就来找你。'
            ],
        natural: kind === 'sleep'
            ? [
                '我这会儿已经睡下了，醒来再慢慢回你。',
                '先让我补个觉，等我醒了就看消息。'
            ]
            : [
                '我现在正卡在' + reason + '里，等我缓过来就回你。',
                '先让我把' + reason + '处理完，我一会儿再认真跟你聊。'
            ]
    };
    const lines = toneMap[tone] || toneMap.natural;
    if (returnText && kind === 'busy') {
        lines.push('我大概' + returnText + '之后能看手机，到时候回你。');
    }
    return lines.map(function (text) {
        return normalizeBusyReplyAutoText(text);
    }).filter(Boolean);
}

function generateBusyReplyAutoLibrary(roleId, targetEventKey) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    if (!id) return;
    const events = getBusyReplyAutoEventList(id);
    const eventList = targetEventKey ? events.filter(function (event) {
        return String(event.eventKey || '') === String(targetEventKey || '');
    }) : events;
    if (!eventList.length) {
        notifyBusyReplyAction('先解析作息后再生成词条。');
        return;
    }
    if (typeof window.callAI !== 'function') {
        notifyBusyReplyAction('当前没有可用的大模型接口。');
        return;
    }
    const library = getBusyReplyAutoLibrarySetting(id);
    const systemPrompt = typeof window.buildToolJsonPrompt === 'function'
        ? window.buildToolJsonPrompt('busy_auto_reply_generation', {
            sceneIntro: '当前任务是根据角色设定、世界书和作息事件，生成忙时自动回复词条。',
            taskGuidance: [
                '你不是客服模板生成器，也不是通知文案生成器。',
                '你要写的是角色本人在聊天界面里会发出来的简短回复。',
                '必须让每个事件的词条都带有鲜明角色口吻，不要写空泛套话。'
            ].join('\n'),
            outputInstructions: '只输出严格 JSON：{"events":[{"eventKey":"...","entries":["...","..."]}]}，不要输出解释、Markdown 或额外文字。'
        })
        : '你是一个自动回复词条生成器。你不是客服模板生成器。只输出严格 JSON，不要输出任何解释或 Markdown。';
    const userPrompt = getBusyReplyAutoGenerationPrompt(id, eventList, library);
    setBusyReplyGenerationLoading(true);
    const prevRoleId = window.currentChatRole;
    window.currentChatRole = id;
    try {
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseBusyReplyGenerationResult(resultText);
                const produced = parsed && Array.isArray(parsed.events) ? parsed.events : [];
                const next = getBusyReplyAutoLibrarySetting(id);
                const profile = (window.charProfiles && window.charProfiles[id] && typeof window.charProfiles[id] === 'object')
                    ? window.charProfiles[id]
                    : {};
                eventList.forEach(function (event) {
                    if (!event || !event.eventKey) return;
                    const existing = next.events[event.eventKey] && Array.isArray(next.events[event.eventKey].entries)
                        ? next.events[event.eventKey].entries.slice()
                        : [];
                    const hit = produced.find(function (item) {
                        return String(item && item.eventKey || '') === String(event.eventKey || '');
                    });
                    const generatedTexts = Array.isArray(hit && (hit.entries || hit.replies || hit.items))
                        ? (hit.entries || hit.replies || hit.items)
                        : [];
                    const merged = [];
                    const seen = {};
                    existing.forEach(function (item) {
                        const normalized = normalizeBusyReplyAutoEntryLocal(item);
                        const text = normalized ? normalized.text : normalizeBusyReplyAutoText(item && item.text ? item.text : item);
                        if (!text || seen[text]) return;
                        seen[text] = true;
                        merged.push(normalized || {
                            id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            text: text,
                            source: String(item && item.source || 'user'),
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    });
                    generatedTexts.forEach(function (item) {
                        const normalized = normalizeBusyReplyAutoEntryLocal(item);
                        const text = normalized ? normalized.text : normalizeBusyReplyAutoText(item && item.text ? item.text : item);
                        if (!text || seen[text]) return;
                        seen[text] = true;
                        merged.push(normalized || {
                            id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            text: text,
                            source: 'ai',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    });
                    if (!merged.length) {
                        buildBusyReplyAutoFallbackEntries(event, profile).forEach(function (text) {
                            if (!text || seen[text]) return;
                            seen[text] = true;
                            merged.push({
                                id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                                text: text,
                                source: 'ai_fallback',
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            });
                        });
                    }
                    next.events[event.eventKey] = {
                        eventKey: event.eventKey,
                        kind: event.kind,
                        title: event.title,
                        reason: event.reason,
                        start: event.start,
                        end: event.end,
                        updatedAt: Date.now(),
                        entries: merged
                    };
                });
                if (typeof window.saveBusyReplyAutoLibrary === 'function') {
                    window.saveBusyReplyAutoLibrary(id, next);
                } else {
                    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
                }
                renderBusyReplyAutoLibraryPanel(id);
                notifyBusyReplyAction(produced.length ? '自动回复词条已生成。' : 'AI 返回格式不完整，已用角色化后备词条补齐。');
            } finally {
                setBusyReplyGenerationLoading(false);
            }
        }, function () {
            setBusyReplyGenerationLoading(false);
            notifyBusyReplyAction('生成失败，请检查 API 配置。');
        });
    } catch (e) {
        setBusyReplyGenerationLoading(false);
        notifyBusyReplyAction('生成失败，请检查 API 配置。');
    } finally {
        window.currentChatRole = prevRoleId;
    }
}

function escapeScheduleParseHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getScheduleParserConfig(prefix) {
    const safe = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    return safe === 'editor'
        ? { prefix: 'editor', textareaId: 'edit-ai-schedule', panelId: 'edit-schedule-parse-panel' }
        : { prefix: 'creator', textareaId: 'ai-schedule', panelId: 'creator-schedule-parse-panel' };
}

function ensureScheduleParsePlan(plan, rawText) {
    const src = plan && typeof plan === 'object' ? plan : {};
    const sleep = src.sleep && typeof src.sleep === 'object' ? src.sleep : {};
    const resolvedSleepStart = String(
        (src.sleepStart != null ? src.sleepStart : (sleep.start != null ? sleep.start : sleep.sleepStart))
        || src.sleepBegin
        || src.sleepFrom
        || ''
    ).trim();
    const resolvedSleepEnd = String(
        (src.sleepEnd != null ? src.sleepEnd : (sleep.end != null ? sleep.end : sleep.sleepEnd))
        || src.sleepFinish
        || src.sleepTo
        || ''
    ).trim();
    const busyBlocks = Array.isArray(src.busyBlocks)
        ? src.busyBlocks
        : (Array.isArray(src.blocks) ? src.blocks : []);
    return {
        rawText: String(src.rawText || rawText || ''),
        sleepStart: resolvedSleepStart,
        sleepEnd: resolvedSleepEnd,
        busyBlocks: busyBlocks.map(function (block) {
            if (!block || typeof block !== 'object') return null;
            const start = String(block.start || block.startTime || block.startText || block.from || block.begin || '').trim();
            const end = String(block.end || block.endTime || block.endText || block.to || block.finish || '').trim();
            const reason = String(block.reason || block.title || block.label || block.name || '').trim();
            const source = String(block.source || 'explicit').trim() || 'explicit';
            const isUiPlaceholder = source === 'ui';
            if (!start && !end && !reason && !isUiPlaceholder) return null;
            return {
                start: start,
                end: end,
                reason: reason,
                source: source,
                sourceText: String(block.sourceText || block.rawText || block.raw || '').trim()
            };
        }).filter(Boolean),
        notes: String(src.notes || '').trim(),
        confidence: Number.isFinite(Number(src.confidence)) ? Math.max(0, Math.min(1, Number(src.confidence))) : 0,
        summary: String(src.summary || '').trim(),
        updatedAt: Number(src.updatedAt) || Date.now()
    };
}

function getScheduleParseEmptyPlan(rawText) {
    return ensureScheduleParsePlan({
        rawText: String(rawText || ''),
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: String(rawText || '').trim() ? '先选择 AI 解析或自动解析，再在这里继续调整。' : '先输入作息文本，再选择解析方式。',
        updatedAt: Date.now()
    }, rawText);
}

function notifyScheduleParseAction(text) {
    const message = String(text || '').trim();
    if (!message) return;
    try {
        if (typeof showTopNotification === 'function') {
            if (showTopNotification.length >= 2) {
                showTopNotification(window.currentChatRole || '', message, 1800);
            } else {
                showTopNotification(message);
            }
            return;
        }
    } catch (e) { }
    try {
        alert(message);
    } catch (e2) { }
}

function setScheduleParseLoading(prefix, mode, loading) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return;
    const generateBtn = panel.querySelector('[data-schedule-click="generate-schedule"]');
    const aiBtn = panel.querySelector('[data-schedule-click="ai-parse"]');
    const autoBtn = panel.querySelector('[data-schedule-click="auto-parse"]');
    const statusEl = panel.querySelector('[data-schedule-parse-status]');
    const isLoading = !!loading;
    panel.classList.toggle('is-loading', isLoading);
    const setBtn = function (btn, text, disabled) {
        if (!btn) return;
        btn.disabled = !!disabled;
        if (text) {
            const label = btn.querySelector('.schedule-parse-action-btn-title');
            const sub = btn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = text;
            if (sub) sub.textContent = disabled ? '请稍候...' : sub.textContent;
        }
    };
    if (isLoading) {
        if (statusEl) {
            statusEl.textContent = mode === 'generate'
                ? 'AI 正在生成人设作息...'
                : (mode === 'ai' ? 'AI 正在解析作息...' : '正在自动解析作息...');
            statusEl.hidden = false;
        }
        setBtn(generateBtn, '生成中', true);
        setBtn(aiBtn, 'AI解析中', true);
        setBtn(autoBtn, '自动解析中', true);
    } else {
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.hidden = true;
        }
        if (generateBtn) {
            generateBtn.disabled = false;
            const label = generateBtn.querySelector('.schedule-parse-action-btn-title');
            const sub = generateBtn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = '生成作息表';
            if (sub) sub.textContent = '消耗一次API，按人设生成并解析';
        }
        if (aiBtn) {
            aiBtn.disabled = false;
            const label = aiBtn.querySelector('.schedule-parse-action-btn-title');
            const sub = aiBtn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = 'AI解析';
            if (sub) sub.textContent = '消耗一次API，解析更精准';
        }
        if (autoBtn) {
            autoBtn.disabled = false;
            const label = autoBtn.querySelector('.schedule-parse-action-btn-title');
            const sub = autoBtn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = '自动解析';
            if (sub) sub.textContent = '不消耗API，准确度较低';
        }
    }
}

function parseSchedulePlanFromAiText(text, rawText) {
    const parsed = parseLooseJsonFromText(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed.plan && typeof parsed.plan === 'object'
        ? parsed.plan
        : (parsed.result && typeof parsed.result === 'object' ? parsed.result : parsed);
    return ensureScheduleParsePlan(candidate, rawText);
}

function parseLooseJsonFromText(text) {
    let raw = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!raw) return null;
    raw = raw.replace(/```[a-z0-9]*\s*/gi, '').trim();
    let candidate = raw;
    const firstObj = candidate.indexOf('{');
    const lastObj = candidate.lastIndexOf('}');
    const firstArr = candidate.indexOf('[');
    const lastArr = candidate.lastIndexOf(']');
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr && (firstObj === -1 || firstArr < firstObj)) {
        candidate = candidate.slice(firstArr, lastArr + 1);
    } else if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
        candidate = candidate.slice(firstObj, lastObj + 1);
    }
    candidate = candidate.replace(/,\s*([}\]])/g, '$1').trim();
    try {
        return JSON.parse(candidate);
    } catch (e) {
        return null;
    }
}

function getScheduleParseAiPrompt(roleId, rawText) {
    return [
        '你是一个作息表解析器，只输出严格 JSON，不要输出任何解释、Markdown 或代码块。',
        '请从用户给出的作息文本里解析出睡眠时间和忙碌时段。',
        '输出结构必须固定为：{"sleepStart":"HH:MM","sleepEnd":"HH:MM","busyBlocks":[{"start":"HH:MM","end":"HH:MM","reason":"事件名称"}],"notes":"可选备注","confidence":0.0,"summary":"一句话概括"}',
        '规则：',
        '1. busyBlocks 至少尽量找出能明确识别的时段，无法识别时就留空数组。',
        '2. 时间统一用 24 小时制 HH:MM。',
        '3. reason 请写成事件名称，例如 上班、开会、上课、通勤、健身。',
        '4. 如果只知道大概时间，也请尽量给出最合理的结果。',
        '5. 不要输出多余字段，不要输出说明文字。',
        '',
        '【需要解析的作息文本】',
        String(rawText || '').trim() || '(空)',
        '',
        '请直接输出 JSON。'
    ].join('\n');
}

function collectScheduleGeneratorWorldBookIds(prefix) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const containerId = safePrefix === 'editor' ? 'edit-ai-worldbook-container' : 'ai-worldbook-container';
    const container = document.getElementById(containerId);
    if (!container) return [];
    const checked = container.querySelectorAll('input[name="wb-checkbox"]:checked');
    return Array.from(checked).map(function (input) {
        return String(input && input.value || '').trim();
    }).filter(Boolean);
}

function readScheduleGeneratorContext(prefix) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const roleId = safePrefix === 'editor' ? String(window.currentChatRole || '').trim() : '';
    const profile = roleId && window.charProfiles && window.charProfiles[roleId] && typeof window.charProfiles[roleId] === 'object'
        ? window.charProfiles[roleId]
        : {};
    const textareaId = safePrefix === 'editor' ? 'edit-ai-schedule' : 'ai-schedule';
    const nameId = safePrefix === 'editor' ? 'edit-ai-name' : 'ai-name';
    const remarkId = safePrefix === 'editor' ? 'edit-ai-remark' : '';
    const descId = safePrefix === 'editor' ? 'edit-ai-personality' : 'ai-personality';
    const styleId = safePrefix === 'editor' ? 'edit-ai-style' : 'ai-style';
    const textarea = document.getElementById(textareaId);
    const nameEl = document.getElementById(nameId);
    const remarkEl = remarkId ? document.getElementById(remarkId) : null;
    const descEl = document.getElementById(descId);
    const styleEl = document.getElementById(styleId);
    const worldbookIds = collectScheduleGeneratorWorldBookIds(safePrefix);
    const worldbookPrompt = typeof window.buildWorldBookPrompt === 'function'
        ? window.buildWorldBookPrompt(worldbookIds)
        : '';
    return {
        prefix: safePrefix,
        roleId: roleId,
        textarea: textarea,
        name: String(nameEl && nameEl.value || profile.nickName || profile.name || roleId || 'TA').trim(),
        remark: String(remarkEl && remarkEl.value || profile.remark || '').trim(),
        desc: String(descEl && descEl.value || profile.desc || '').trim(),
        style: String(styleEl && styleEl.value || profile.style || '').trim(),
        scheduleText: String(textarea && textarea.value || profile.schedule || '').trim(),
        worldbookPrompt: String(worldbookPrompt || '').trim(),
        worldbookIds: worldbookIds
    };
}

function getScheduleDraftGenerationPrompt(prefix) {
    const ctx = readScheduleGeneratorContext(prefix);
    return [
        '你现在要为一个聊天角色生成“日常作息表”，并同时给出结构化解析结果。',
        '要求：',
        '1. 作息必须贴合角色人设、聊天风格和世界书，不要写成普通学生/普通上班族通用模板。',
        '2. 时间安排要自然可信，必须包含睡眠时段，并且 busyBlocks 至少输出 5 个不重叠的事件块（覆盖早/中/晚不同阶段，不要把“上课/上班”整段写成一个大块）。',
        '3. busyBlocks 的 reason 必须是简短事件名，例如 上课、练琴、开会、通勤、兼职、训练、排练。',
        '4. scheduleText 要写成人类能直接读懂的作息表原文，建议按行列出每个时段（例如 “07:30 起床洗漱”“08:10 早餐”“08:40 通勤/到校”…）。',
        '5. 时间统一使用 24 小时制 HH:MM。',
        '6. 只输出严格 JSON，不要输出解释、Markdown、代码块或额外文字。',
        '输出结构固定为：{"scheduleText":"...","sleepStart":"HH:MM","sleepEnd":"HH:MM","busyBlocks":[{"start":"HH:MM","end":"HH:MM","reason":"事件名称"}],"notes":"可选备注","confidence":0.0,"summary":"一句话概括"}',
        '',
        '【角色名称】' + (ctx.name || 'TA'),
        '【角色备注】' + (ctx.remark || ''),
        '【角色人设】' + (ctx.desc || ''),
        '【聊天风格】' + (ctx.style || ''),
        '【世界书】' + (ctx.worldbookPrompt || ''),
        '【现有作息】' + (ctx.scheduleText || '(空)'),
        '',
        '请直接输出 JSON。'
    ].join('\n');
}

function parseScheduleDraftGenerationResult(text) {
    const parsed = parseLooseJsonFromText(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed.result && typeof parsed.result === 'object' ? parsed.result : parsed;
    const scheduleText = String(candidate.scheduleText || candidate.schedule || candidate.rawText || '').trim();
    const plan = ensureScheduleParsePlan(candidate, scheduleText);
    return {
        scheduleText: scheduleText,
        plan: plan
    };
}

function runScheduleDraftGeneration(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const ctx = readScheduleGeneratorContext(cfg.prefix);
    if (typeof window.callAI !== 'function') {
        notifyScheduleParseAction('当前没有可用的大模型接口。');
        return;
    }
    if (!ctx.name && !ctx.desc && !ctx.style && !ctx.worldbookPrompt) {
        notifyScheduleParseAction('先填一点人设或世界书，再生成作息会更准。');
        return;
    }
    const panel = document.getElementById(cfg.panelId);
    if (panel) panel.classList.add('is-loading');
    setScheduleParseLoading(cfg.prefix, 'generate', true);
    const systemPrompt = typeof window.buildToolJsonPrompt === 'function'
        ? window.buildToolJsonPrompt('schedule_generation', {
            sceneIntro: '当前任务是为角色生成日常作息，并同时给出结构化解析结果。',
            taskGuidance: '你必须让作息贴合角色设定与世界观，不能写成通用模板。',
            outputInstructions: '只输出严格 JSON，不要解释、Markdown 或额外文字。'
        })
        : '你是一个角色作息生成器，只输出严格 JSON，不要输出任何解释、Markdown 或代码块。';
    const userPrompt = getScheduleDraftGenerationPrompt(cfg.prefix);
    try {
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseScheduleDraftGenerationResult(resultText);
                if (!parsed || !parsed.plan) {
                    notifyScheduleParseAction('AI 生成失败，返回内容无法识别。');
                    return;
                }
                const nextText = String(parsed.scheduleText || '').trim();
                if (ctx.textarea && nextText) {
                    ctx.textarea.value = nextText;
                }
                const rawText = nextText || ctx.scheduleText || '';
                renderScheduleParsePanel(cfg.prefix, parsed.plan, rawText, {
                    mode: 'generate',
                    statusText: 'AI 已生成并解析作息'
                });
                notifyScheduleParseAction('已生成作息表，并自动解析到下面的时段。');
            } finally {
                setScheduleParseLoading(cfg.prefix, 'generate', false);
                if (panel) panel.classList.remove('is-loading');
            }
        }, function () {
            setScheduleParseLoading(cfg.prefix, 'generate', false);
            if (panel) panel.classList.remove('is-loading');
            notifyScheduleParseAction('生成失败，请检查 API 配置。');
        });
    } catch (e) {
        setScheduleParseLoading(cfg.prefix, 'generate', false);
        if (panel) panel.classList.remove('is-loading');
        notifyScheduleParseAction('生成失败，请检查 API 配置。');
    }
}

function buildScheduleParsePanelHtml(prefix, plan, options) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const normalized = ensureScheduleParsePlan(plan, plan && plan.rawText ? plan.rawText : '');
    const busyBlocks = Array.isArray(normalized.busyBlocks) && normalized.busyBlocks.length
        ? normalized.busyBlocks
        : [{ start: '', end: '', reason: '', source: 'explicit', sourceText: '' }];
    const summaryText = normalized.summary || '未识别到明确作息，可以手动补充。';
    const confidenceText = normalized.confidence ? Math.round(normalized.confidence * 100) + '%' : '--';
    const opts = options && typeof options === 'object' ? options : {};
    const emptyHint = normalized.rawText ? '' : '先输入作息文本，再点上面的解析按钮。';
    const busyRows = busyBlocks.map(function (block, index) {
        const start = escapeScheduleParseHtml(block.start || '');
        const end = escapeScheduleParseHtml(block.end || '');
        const reason = escapeScheduleParseHtml(block.reason || '');
        return [
            '<div class="schedule-parse-busy-item" data-busy-index="' + index + '">',
            '<input type="time" data-schedule-field="busy-start" value="' + start + '" aria-label="忙碌开始时间">',
            '<input type="time" data-schedule-field="busy-end" value="' + end + '" aria-label="忙碌结束时间">',
            '<input type="text" data-schedule-field="busy-reason" value="' + reason + '" placeholder="事件名称" aria-label="事件名称">',
            '<button type="button" class="schedule-parse-busy-remove" data-schedule-click="remove-busy-row" data-busy-index="' + index + '">×</button>',
            '</div>'
        ].join('');
    }).join('');

    return [
        '<div class="schedule-parse-panel-header">',
        '  <div class="schedule-parse-panel-copy">',
        '    <div class="schedule-parse-panel-title">解析结果</div>',
        '    <div class="schedule-parse-panel-subtitle">可以先生成作息，也可以直接解析现有文本。解析后能继续手动改下面的时间和事件名称。</div>',
        '  </div>',
        '  <div class="schedule-parse-panel-actions">',
        '    <button type="button" class="schedule-parse-action-btn" data-schedule-click="generate-schedule">',
        '      <span class="schedule-parse-action-btn-title">生成作息表</span>',
        '      <span class="schedule-parse-action-btn-sub">消耗一次API，按人设生成并解析</span>',
        '    </button>',
        '    <button type="button" class="schedule-parse-action-btn primary" data-schedule-click="ai-parse">',
        '      <span class="schedule-parse-action-btn-title">AI解析</span>',
        '      <span class="schedule-parse-action-btn-sub">消耗一次API，解析更精准</span>',
        '    </button>',
        '    <button type="button" class="schedule-parse-action-btn" data-schedule-click="auto-parse">',
        '      <span class="schedule-parse-action-btn-title">自动解析</span>',
        '      <span class="schedule-parse-action-btn-sub">不消耗API，准确度较低</span>',
        '    </button>',
        '  </div>',
        '</div>',
        '<div class="schedule-parse-status" data-schedule-parse-status' + (opts.loading ? '' : ' hidden') + '>' + escapeScheduleParseHtml(String(opts.statusText || '')) + '</div>',
        emptyHint ? '<div class="schedule-parse-empty-hint">' + escapeScheduleParseHtml(emptyHint) + '</div>' : '',
        '<div class="schedule-parse-summary">',
        '  <div class="schedule-parse-summary-top">',
        '    <div class="schedule-parse-summary-label">当前解析</div>',
        '    <div class="schedule-parse-summary-score">置信度 ' + confidenceText + '</div>',
        '  </div>',
        '  <div class="schedule-parse-summary-text">' + escapeScheduleParseHtml(summaryText) + '</div>',
        '</div>',
        '<div class="schedule-parse-grid">',
        '  <div class="schedule-parse-field">',
        '    <label>睡眠开始</label>',
        '    <input type="time" data-schedule-field="sleep-start" value="' + escapeScheduleParseHtml(normalized.sleepStart || '') + '">',
        '  </div>',
        '  <div class="schedule-parse-field">',
        '    <label>睡眠结束</label>',
        '    <input type="time" data-schedule-field="sleep-end" value="' + escapeScheduleParseHtml(normalized.sleepEnd || '') + '">',
        '  </div>',
        '</div>',
        '<div class="schedule-parse-section-title">忙碌时段</div>',
        '<div class="schedule-parse-busy-list" data-schedule-field="busy-list">',
        busyRows,
        '</div>',
        '<button type="button" class="schedule-parse-add-btn" data-schedule-click="add-busy-row">+ 添加忙碌时段</button>',
        '<div class="schedule-parse-field" style="margin-top: 12px;">',
        '  <label>备注</label>',
        '  <textarea data-schedule-field="notes" placeholder="可写上未能自动识别的说明，保存时会一并记录。">' + escapeScheduleParseHtml(normalized.notes || '') + '</textarea>',
        '</div>',
        '<div class="schedule-parse-footnote">修改后记得点底部的保存按钮。这个面板会把结果存成结构化作息，供忙时不回消息或自动回复使用。</div>'
    ].join('');
}

function bindScheduleParsePanelEvents(panel, prefix) {
    if (!panel || panel.dataset.scheduleBound === '1') return;
    panel.dataset.scheduleBound = '1';
    panel.addEventListener('click', function (e) {
        const target = e.target && e.target.closest ? e.target.closest('[data-schedule-click]') : null;
        if (!target) return;
        const action = String(target.dataset.scheduleClick || '').trim();
        if (!action) return;
        if (action === 'generate-schedule') {
            runScheduleDraftGeneration(prefix);
            return;
        }
        if (action === 'ai-parse') {
            runScheduleParse(prefix, 'ai');
            return;
        }
        if (action === 'auto-parse') {
            runScheduleParse(prefix, 'auto');
            return;
        }
        if (action === 'add-busy-row') {
            addScheduleParseBusyRow(prefix);
            return;
        }
        if (action === 'remove-busy-row') {
            const index = parseInt(String(target.dataset.busyIndex || ''), 10);
            if (!Number.isFinite(index)) return;
            removeScheduleParseBusyRow(prefix, index);
        }
    });
}

function renderScheduleParsePanel(prefix, plan, rawText, options) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return null;
    const normalized = ensureScheduleParsePlan(plan, rawText != null ? rawText : (plan && plan.rawText ? plan.rawText : ''));
    panel.dataset.schedulePrefix = cfg.prefix;
    panel.dataset.scheduleRaw = String(rawText != null ? rawText : normalized.rawText || '');
    panel.dataset.scheduleMode = String(options && options.mode ? options.mode : '');
    panel.innerHTML = buildScheduleParsePanelHtml(cfg.prefix, normalized, options);
    bindScheduleParsePanelEvents(panel, cfg.prefix);
    panel.hidden = false;
    return normalized;
}

function collectScheduleParsePanelState(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || panel.hidden) return null;
    const sleepStartInput = panel.querySelector('[data-schedule-field="sleep-start"]');
    const sleepEndInput = panel.querySelector('[data-schedule-field="sleep-end"]');
    const notesInput = panel.querySelector('[data-schedule-field="notes"]');
    const rawText = String(panel.dataset.scheduleRaw || '').trim();
    const busyList = Array.from(panel.querySelectorAll('.schedule-parse-busy-item')).map(function (row) {
        if (!row) return null;
        const startInput = row.querySelector('[data-schedule-field="busy-start"]');
        const endInput = row.querySelector('[data-schedule-field="busy-end"]');
        const reasonInput = row.querySelector('[data-schedule-field="busy-reason"]');
        const start = String(startInput && startInput.value || '').trim();
        const end = String(endInput && endInput.value || '').trim();
        const reason = String(reasonInput && reasonInput.value || '').trim();
        if (!start && !end && !reason) return null;
        return { start: start, end: end, reason: reason, source: 'explicit' };
    }).filter(Boolean);

    const payload = {
        rawText: rawText,
        sleepStart: String(sleepStartInput && sleepStartInput.value || '').trim(),
        sleepEnd: String(sleepEndInput && sleepEndInput.value || '').trim(),
        busyBlocks: busyList,
        notes: String(notesInput && notesInput.value || '').trim(),
        confidence: 0,
        summary: '',
        updatedAt: Date.now()
    };
    if (!payload.sleepStart && !payload.sleepEnd && !payload.busyBlocks.length && !payload.notes) {
        return null;
    }
    if (typeof window.parseRoleSchedulePlan === 'function') {
        const parsed = window.parseRoleSchedulePlan(rawText);
        if (parsed && typeof parsed === 'object') {
            payload.confidence = parsed.confidence || 0;
            payload.summary = parsed.summary || '';
        }
    }
    return ensureScheduleParsePlan(payload, rawText);
}

function collectScheduleParseBusyRowsFromPanel(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || panel.hidden) return [];
    return Array.from(panel.querySelectorAll('.schedule-parse-busy-item')).map(function (row) {
        if (!row) return null;
        const startInput = row.querySelector('[data-schedule-field="busy-start"]');
        const endInput = row.querySelector('[data-schedule-field="busy-end"]');
        const reasonInput = row.querySelector('[data-schedule-field="busy-reason"]');
        const start = String(startInput && startInput.value || '').trim();
        const end = String(endInput && endInput.value || '').trim();
        const reason = String(reasonInput && reasonInput.value || '').trim();
        if (!start && !end && !reason) return null;
        return { start: start, end: end, reason: reason, source: 'explicit' };
    }).filter(Boolean);
}

function openScheduleParsePanel(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const textarea = document.getElementById(cfg.textareaId);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || !textarea) return null;
    const rawText = String(textarea.value || '').trim();
    const current = collectScheduleParsePanelState(cfg.prefix);
    const fallback = current || (typeof window.parseRoleSchedulePlan === 'function'
        ? window.parseRoleSchedulePlan(rawText)
        : getScheduleParseEmptyPlan(rawText));
    const normalized = renderScheduleParsePanel(cfg.prefix, fallback || getScheduleParseEmptyPlan(rawText), rawText);
    panel.hidden = false;
    return normalized;
}

function runScheduleParse(prefix, mode) {
    const cfg = getScheduleParserConfig(prefix);
    const textarea = document.getElementById(cfg.textareaId);
    const rawText = String(textarea && textarea.value || '').trim();
    if (!rawText) {
        notifyScheduleParseAction('请先输入作息文本。');
        return;
    }
    const hasParsedAnyScheduleField = function (plan) {
        const src = plan && typeof plan === 'object' ? plan : {};
        const blocks = Array.isArray(src.busyBlocks) ? src.busyBlocks : [];
        const hasSleep = !!(String(src.sleepStart || '').trim() && String(src.sleepEnd || '').trim());
        const hasBlocks = blocks.some(function (b) {
            if (!b || typeof b !== 'object') return false;
            return !!(String(b.start || '').trim() || String(b.end || '').trim() || String(b.reason || '').trim());
        });
        const hasNotes = !!String(src.notes || '').trim();
        return hasSleep || hasBlocks || hasNotes;
    };
    const safeMode = String(mode || '').trim() === 'ai' ? 'ai' : 'auto';
    if (safeMode === 'auto') {
        const parsed = typeof window.parseRoleSchedulePlan === 'function'
            ? window.parseRoleSchedulePlan(rawText)
            : null;
        const statusText = hasParsedAnyScheduleField(parsed) ? '自动解析完成' : '自动解析完成（未识别到时段）';
        const normalized = renderScheduleParsePanel(cfg.prefix, parsed || getScheduleParseEmptyPlan(rawText), rawText, {
            mode: 'auto',
            statusText: statusText
        });
        if (!normalized) {
            notifyScheduleParseAction('自动解析失败。');
            return;
        }
        notifyScheduleParseAction(hasParsedAnyScheduleField(normalized) ? '自动解析完成。' : '解析完成，但没有识别到任何时段。');
        return normalized;
    }
    if (typeof window.callAI !== 'function') {
        notifyScheduleParseAction('当前没有可用的大模型接口。');
        return;
    }
    const panel = document.getElementById(cfg.panelId);
    if (panel) panel.classList.add('is-loading');
    setScheduleParseLoading(cfg.prefix, 'ai', true);
    try {
        const systemPrompt = '你是一个作息表解析器，只输出严格 JSON，不要输出解释、Markdown 或代码块。';
        const userPrompt = getScheduleParseAiPrompt('', rawText);
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseSchedulePlanFromAiText(resultText, rawText);
                if (!parsed) {
                    notifyScheduleParseAction('AI 解析失败，返回内容无法识别。');
                    return;
                }
                const statusText = hasParsedAnyScheduleField(parsed) ? 'AI 解析完成' : 'AI 解析完成（未识别到时段）';
                const normalized = renderScheduleParsePanel(cfg.prefix, parsed, rawText, {
                    mode: 'ai',
                    statusText: statusText
                });
                if (!normalized) {
                    notifyScheduleParseAction('AI 解析失败。');
                    return;
                }
                notifyScheduleParseAction(hasParsedAnyScheduleField(normalized) ? 'AI 解析完成。' : '解析完成，但没有识别到任何时段。');
            } finally {
                setScheduleParseLoading(cfg.prefix, 'ai', false);
                if (panel) panel.classList.remove('is-loading');
            }
        }, function () {
            setScheduleParseLoading(cfg.prefix, 'ai', false);
            if (panel) panel.classList.remove('is-loading');
            notifyScheduleParseAction('AI 解析失败，请检查 API 配置。');
        });
    } catch (e) {
        setScheduleParseLoading(cfg.prefix, 'ai', false);
        if (panel) panel.classList.remove('is-loading');
        notifyScheduleParseAction('AI 解析失败。');
    }
}

function addScheduleParseBusyRow(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return;
    const state = collectScheduleParsePanelState(cfg.prefix) || {
        rawText: String(panel.dataset.scheduleRaw || ''),
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: ''
    };
    const visibleRows = collectScheduleParseBusyRowsFromPanel(cfg.prefix);
    state.busyBlocks = visibleRows.length
        ? visibleRows.slice()
        : (Array.isArray(state.busyBlocks) ? state.busyBlocks.slice() : []);
    state.busyBlocks.push({ start: '', end: '', reason: '', source: 'ui' });
    renderScheduleParsePanel(cfg.prefix, state, state.rawText);
    setTimeout(function () {
        const nextPanel = document.getElementById(cfg.panelId);
        if (!nextPanel) return;
        const rows = nextPanel.querySelectorAll('.schedule-parse-busy-item');
        if (!rows || !rows.length) return;
        const lastRow = rows[rows.length - 1];
        const focusTarget = lastRow.querySelector('[data-schedule-field="busy-reason"]')
            || lastRow.querySelector('[data-schedule-field="busy-start"]');
        if (focusTarget) focusTarget.focus();
        try {
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (eScroll) { }
    }, 0);
}

function removeScheduleParseBusyRow(prefix, index) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return;
    const state = collectScheduleParsePanelState(cfg.prefix) || {
        rawText: String(panel.dataset.scheduleRaw || ''),
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: ''
    };
    const nextBlocks = Array.isArray(state.busyBlocks) ? state.busyBlocks.slice() : [];
    nextBlocks.splice(index, 1);
    state.busyBlocks = nextBlocks;
    renderScheduleParsePanel(cfg.prefix, state, state.rawText);
}

function isAutoTranslateEnabled(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return false;
    const settings = getCurrentChatSettings(id);
    if (settings && typeof settings.autoTranslate === 'boolean') {
        return settings.autoTranslate;
    }
    return localStorage.getItem('chat_auto_translate') === 'true';
}

function readApiPresetListForRoleBinding() {
    try {
        const raw = localStorage.getItem('api_settings_presets_v1') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function getRoleBoundApiPresetId(roleId) {
    const id = roleId || window.currentChatRole || '';
    if (!id) return '';
    const settings = getCurrentChatSettings(id);
    return String(settings && settings.apiPresetId ? settings.apiPresetId : '').trim();
}

function resolveApiPresetNameById(presetId) {
    const id = String(presetId || '').trim();
    if (!id) return '';
    const presets = readApiPresetListForRoleBinding();
    const hit = presets.find(function (p) { return p && String(p.id || '').trim() === id; });
    return hit ? String(hit.name || '').trim() : '';
}

function updateRoleApiPresetValueUI(roleId) {
    const valueEl = document.getElementById('setting-role-api-preset-value');
    if (!valueEl) return;
    const id = roleId || window.currentChatRole || '';
    const presetId = getRoleBoundApiPresetId(id);
    if (!presetId) {
        valueEl.textContent = '全局';
        return;
    }
    const name = resolveApiPresetNameById(presetId);
    valueEl.textContent = name || '预设已删除';
}

function openRoleApiPresetModal() {
    const modal = document.getElementById('role-api-preset-modal');
    if (!modal) return;
    renderRoleApiPresetList();
    modal.style.display = 'flex';
}

function closeRoleApiPresetModal() {
    const modal = document.getElementById('role-api-preset-modal');
    if (!modal) return;
    modal.style.display = 'none';
}

function clearRoleApiPresetBinding() {
    const roleId = window.currentChatRole || '';
    if (!roleId) return;
    saveCurrentChatSettings(roleId, { apiPresetId: '' });
    updateRoleApiPresetValueUI(roleId);
    closeRoleApiPresetModal();
}

function renderRoleApiPresetList() {
    const listEl = document.getElementById('role-api-preset-list');
    if (!listEl) return;
    const roleId = window.currentChatRole || '';
    const currentPresetId = getRoleBoundApiPresetId(roleId);
    const presets = readApiPresetListForRoleBinding();
    listEl.innerHTML = '';

    function addRow(label, sub, presetId) {
        const row = document.createElement('div');
        row.className = 'settings-item';
        row.style.marginLeft = '15px';
        row.style.paddingLeft = '0';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '4px';

        const title = document.createElement('div');
        title.className = 'item-label';
        title.textContent = label;

        left.appendChild(title);
        if (sub) {
            const desc = document.createElement('div');
            desc.className = 'item-value';
            desc.textContent = sub;
            left.appendChild(desc);
        }

        const right = document.createElement('div');
        right.className = 'settings-item-right';

        const selected = String(currentPresetId || '') === String(presetId || '');
        if (selected) {
            const check = document.createElement('div');
            check.className = 'item-check';
            check.textContent = '✓';
            right.appendChild(check);
        }

        row.appendChild(left);
        row.appendChild(right);
        row.addEventListener('click', function () {
            if (!roleId) return;
            saveCurrentChatSettings(roleId, { apiPresetId: String(presetId || '') });
            updateRoleApiPresetValueUI(roleId);
            closeRoleApiPresetModal();
        });
        listEl.appendChild(row);
    }

    addRow('跟随系统全局', '使用系统设置里的全局 API', '');
    presets.forEach(function (p) {
        if (!p) return;
        const pid = String(p.id || '').trim();
        if (!pid) return;
        const name = String(p.name || '').trim() || '未命名预设';
        const model = String(p.model || '').trim();
        const baseUrl = String(p.baseUrl || '').trim();
        const sub = [model, baseUrl ? baseUrl.replace(/^https?:\/\//i, '') : ''].filter(Boolean).join(' · ');
        addRow(name, sub, pid);
    });
}

function initChatSettingsUI(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    try {
        const modal = document.getElementById('settings-menu-modal');
        if (modal && modal.dataset) modal.dataset.roleId = id;
    } catch (e) { }
    const settings = getCurrentChatSettings(id);
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const momentsPostingSwitch = document.getElementById('setting-moments-posting-enabled');
    const allowOfflineInviteSwitch = document.getElementById('setting-allow-offline-invite');
    const autoTranslateSwitch = document.getElementById('setting-auto-translate-switch');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const busyReplySwitch = document.getElementById('setting-busy-reply-enabled');
    const busyReplyModeBox = document.getElementById('setting-busy-reply-mode-box');
    const busyReplyModeInputs = document.querySelectorAll('input[name="setting-busy-reply-mode"]');
    const summaryFreqInput = document.getElementById('setting-summary-freq');
    const fontSizeInput = document.getElementById('setting-font-size');
    const bubbleCssInput = document.getElementById('setting-bubble-css');
    if (memoryLimitInput && typeof settings.memoryLimit === 'number' && settings.memoryLimit > 0) {
        memoryLimitInput.value = String(settings.memoryLimit);
    }
    if (momentsPostingSwitch) {
        momentsPostingSwitch.checked = settings.momentsPostingEnabled !== false;
    }
    if (allowOfflineInviteSwitch) {
        allowOfflineInviteSwitch.checked = settings.allowOfflineInvite !== false;
    }
    if (autoTranslateSwitch) {
        autoTranslateSwitch.checked = typeof settings.autoTranslate === 'boolean'
            ? settings.autoTranslate
            : localStorage.getItem('chat_auto_translate') === 'true';
    }
    if (autoSummarySwitch && typeof settings.autoSummary === 'boolean') {
        autoSummarySwitch.checked = settings.autoSummary;
    }
    if (busyReplySwitch) {
        busyReplySwitch.checked = settings.busyReplyEnabled === true || String(settings.busyReplyMode || '').trim() === 'auto';
    }
    if (busyReplyModeInputs && busyReplyModeInputs.length) {
        const mode = String(settings.busyReplyMode || 'system').trim() === 'auto' ? 'auto' : 'system';
        busyReplyModeInputs.forEach(function (input) {
            if (!input) return;
            input.checked = String(input.value || '').trim() === mode;
        });
    }
    if (summaryFreqInput && typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
        summaryFreqInput.value = String(settings.summaryFreq);
    }
    if (fontSizeInput) {
        const raw = typeof settings.fontSize === 'number' ? settings.fontSize : 15;
        fontSizeInput.value = String(clampChatFontSize(raw));
    }
    if (bubbleCssInput && typeof settings.bubbleCss === 'string') {
        bubbleCssInput.value = settings.bubbleCss;
    }
    toggleSummaryInput();
    if (busyReplyModeBox) {
        busyReplyModeBox.hidden = !(busyReplySwitch && busyReplySwitch.checked);
    }
    renderBusyReplyAutoLibraryPanel(id);
    updateChatFontSizePreview();
    applyChatFontSizeFromSettings(id);
    updateBubblePreview();
    updateRoleApiPresetValueUI(id);
}

function clampChatFontSize(value) {
    const n = parseInt(String(value || ''), 10);
    if (!n || !isFinite(n)) return 15;
    return Math.max(12, Math.min(20, n));
}

function applyChatFontSizeFromSettings(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const chatRoom = document.getElementById('chat-room-layer');
    if (!chatRoom) return;
    const settings = id ? getCurrentChatSettings(id) : {};
    const size = clampChatFontSize(settings && typeof settings.fontSize === 'number' ? settings.fontSize : 15);
    const scale = size / 15;
    chatRoom.style.setProperty('--chat-font-scale', String(scale));
    chatRoom.style.setProperty('--chat-font-size', size + 'px');
}

function updateChatFontSizePreview() {
    const input = document.getElementById('setting-font-size');
    const label = document.getElementById('setting-font-size-value');
    if (!input || !label) return;
    const size = clampChatFontSize(input.value);
    label.textContent = size + 'px';
}

function parsePositiveInt(value) {
    const n = parseInt(String(value == null ? '' : value), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function clampInt(value, min, max, fallback) {
    const n = parsePositiveInt(value);
    if (!n) return fallback;
    return Math.max(min, Math.min(max, n));
}

function getEffectiveChatMemoryLimit(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const settingsLimit = settings && typeof settings.memoryLimit === 'number' ? settings.memoryLimit : 0;
    const legacyLimit = parsePositiveInt(localStorage.getItem('chat_memory_limit'));
    return clampInt(settingsLimit || legacyLimit, 6, 300, 50);
}

function getEffectiveChatSummaryFreq(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const settingsFreq = settings && typeof settings.summaryFreq === 'number' ? settings.summaryFreq : 0;
    const legacyFreq = parsePositiveInt(localStorage.getItem('chat_summary_freq'));
    return clampInt(settingsFreq || legacyFreq, 5, 500, 20);
}

function isChatAutoSummaryEnabled(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    if (settings && typeof settings.autoSummary === 'boolean') return settings.autoSummary;
    return localStorage.getItem('chat_auto_summary') === 'true';
}

window.getCurrentChatSettings = getCurrentChatSettings;
window.saveCurrentChatSettings = saveCurrentChatSettings;
window.applyChatBubbleCssFromSettings = applyChatBubbleCssFromSettings;
window.updateBubblePreview = updateBubblePreview;
window.saveChatSettings = saveChatSettings;
window.toggleSummaryInput = toggleSummaryInput;
window.isAutoTranslateEnabled = isAutoTranslateEnabled;
window.initChatSettingsUI = initChatSettingsUI;
window.applyChatFontSizeFromSettings = applyChatFontSizeFromSettings;
window.updateChatFontSizePreview = updateChatFontSizePreview;
window.openRoleApiPresetModal = openRoleApiPresetModal;
window.closeRoleApiPresetModal = closeRoleApiPresetModal;
window.clearRoleApiPresetBinding = clearRoleApiPresetBinding;
window.getEffectiveChatMemoryLimit = getEffectiveChatMemoryLimit;
window.getEffectiveChatSummaryFreq = getEffectiveChatSummaryFreq;
window.isChatAutoSummaryEnabled = isChatAutoSummaryEnabled;
window.toggleBusyReplyModeBox = toggleBusyReplyModeBox;
window.getBusyReplySetting = getBusyReplySetting;
window.isBusyReplyEnabled = isBusyReplyEnabled;
window.getBusyReplyMode = getBusyReplyMode;
window.getBusyReplyAutoLibrarySetting = getBusyReplyAutoLibrarySetting;
window.getBusyReplyScheduleEventList = getBusyReplyScheduleEventList;
window.getBusyReplyAutoEventList = getBusyReplyAutoEventList;
window.collectBusyReplyAutoLibraryFromPanel = collectBusyReplyAutoLibraryFromPanel;
window.saveBusyReplyAutoLibraryFromPanel = saveBusyReplyAutoLibraryFromPanel;
window.renderBusyReplyAutoLibraryPanel = renderBusyReplyAutoLibraryPanel;
window.renderBusyReplyAutoLibraryVisibility = renderBusyReplyAutoLibraryVisibility;
window.addBusyReplyAutoEntry = addBusyReplyAutoEntry;
window.triggerBusyReplyAutoGeneration = triggerBusyReplyAutoGeneration;
window.removeBusyReplyAutoEvent = removeBusyReplyAutoEvent;
window.generateBusyReplyAutoLibrary = generateBusyReplyAutoLibrary;
window.renderScheduleParsePanel = renderScheduleParsePanel;
window.collectScheduleParsePanelState = collectScheduleParsePanelState;
window.openScheduleParsePanel = openScheduleParsePanel;
window.runScheduleDraftGeneration = runScheduleDraftGeneration;
window.runScheduleParse = runScheduleParse;
window.addScheduleParseBusyRow = addScheduleParseBusyRow;
window.removeScheduleParseBusyRow = removeScheduleParseBusyRow;
