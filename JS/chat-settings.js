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
    if (busyReplySwitch) {
        settings.busyReplyEnabled = !!busyReplySwitch.checked;
    }
    let busyReplyMode = 'system';
    if (busyReplyModeInputs && busyReplyModeInputs.length) {
        busyReplyModeInputs.forEach(function (input) {
            if (input && input.checked) {
                busyReplyMode = String(input.value || '').trim() === 'auto' ? 'auto' : 'system';
            }
        });
    }
    settings.busyReplyMode = busyReplyMode;
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
    if (enabledSwitch.checked) {
        box.hidden = false;
    } else {
        box.hidden = true;
    }
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
    const busyBlocks = Array.isArray(src.busyBlocks) ? src.busyBlocks : [];
    return {
        rawText: String(src.rawText || rawText || ''),
        sleepStart: String(src.sleepStart || '').trim(),
        sleepEnd: String(src.sleepEnd || '').trim(),
        busyBlocks: busyBlocks.map(function (block) {
            if (!block || typeof block !== 'object') return null;
            const start = String(block.start || '').trim();
            const end = String(block.end || '').trim();
            const reason = String(block.reason || '').trim();
            if (!start && !end && !reason) return null;
            return {
                start: start,
                end: end,
                reason: reason,
                source: String(block.source || 'explicit').trim() || 'explicit',
                sourceText: String(block.sourceText || '').trim()
            };
        }).filter(Boolean),
        notes: String(src.notes || '').trim(),
        confidence: Number.isFinite(Number(src.confidence)) ? Math.max(0, Math.min(1, Number(src.confidence))) : 0,
        summary: String(src.summary || '').trim(),
        updatedAt: Number(src.updatedAt) || Date.now()
    };
}

function buildScheduleParsePanelHtml(prefix, plan) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const normalized = ensureScheduleParsePlan(plan, plan && plan.rawText ? plan.rawText : '');
    const busyBlocks = Array.isArray(normalized.busyBlocks) && normalized.busyBlocks.length
        ? normalized.busyBlocks
        : [{ start: '', end: '', reason: '', source: 'explicit', sourceText: '' }];
    const summaryText = normalized.summary || '未识别到明确作息，可以手动补充。';
    const confidenceText = normalized.confidence ? Math.round(normalized.confidence * 100) + '%' : '--';
    const busyRows = busyBlocks.map(function (block, index) {
        const start = escapeScheduleParseHtml(block.start || '');
        const end = escapeScheduleParseHtml(block.end || '');
        const reason = escapeScheduleParseHtml(block.reason || '');
        return [
            '<div class="schedule-parse-busy-item" data-busy-index="' + index + '">',
            '<input type="time" data-schedule-field="busy-start" value="' + start + '" aria-label="忙碌开始时间">',
            '<input type="time" data-schedule-field="busy-end" value="' + end + '" aria-label="忙碌结束时间">',
            '<input type="text" data-schedule-field="busy-reason" value="' + reason + '" placeholder="忙碌原因" aria-label="忙碌原因">',
            '<button type="button" class="schedule-parse-busy-remove" onclick="removeScheduleParseBusyRow(\'' + safePrefix + '\', ' + index + ')">×</button>',
            '</div>'
        ].join('');
    }).join('');

    return [
        '<div class="schedule-parse-panel-header">',
        '  <div>',
        '    <div class="schedule-parse-panel-title">解析结果</div>',
        '    <div class="schedule-parse-panel-subtitle">置信度 ' + confidenceText + '，你可以直接改下面的时间和忙碌段。</div>',
        '  </div>',
        '  <button type="button" class="schedule-parse-add-btn" onclick="openScheduleParsePanel(\'' + safePrefix + '\')">重新解析</button>',
        '</div>',
        '<div class="schedule-parse-summary">',
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
        '<button type="button" class="schedule-parse-add-btn" onclick="addScheduleParseBusyRow(\'' + safePrefix + '\')">+ 添加忙碌时段</button>',
        '<div class="schedule-parse-field" style="margin-top: 12px;">',
        '  <label>备注</label>',
        '  <textarea data-schedule-field="notes" placeholder="可写上未能自动识别的说明，保存时会一并记录。">' + escapeScheduleParseHtml(normalized.notes || '') + '</textarea>',
        '</div>',
        '<div class="schedule-parse-footnote">修改后记得点底部的保存按钮。这个面板会把结果存成结构化作息，供忙时不回消息或自动回复使用。</div>'
    ].join('');
}

function renderScheduleParsePanel(prefix, plan, rawText) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return null;
    const normalized = ensureScheduleParsePlan(plan, rawText != null ? rawText : (plan && plan.rawText ? plan.rawText : ''));
    panel.dataset.schedulePrefix = cfg.prefix;
    panel.dataset.scheduleRaw = String(rawText != null ? rawText : normalized.rawText || '');
    panel.innerHTML = buildScheduleParsePanelHtml(cfg.prefix, normalized);
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

function openScheduleParsePanel(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const textarea = document.getElementById(cfg.textareaId);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || !textarea) return null;
    const rawText = String(textarea.value || '').trim();
    const parsed = typeof window.parseRoleSchedulePlan === 'function'
        ? window.parseRoleSchedulePlan(rawText)
        : null;
    const normalized = renderScheduleParsePanel(cfg.prefix, parsed || {
        rawText: rawText,
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: rawText ? '已打开作息解析面板，请在这里手动补充。' : '请先输入作息文本。'
    }, rawText);
    panel.hidden = false;
    return normalized;
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
    state.busyBlocks = Array.isArray(state.busyBlocks) ? state.busyBlocks.slice() : [];
    state.busyBlocks.push({ start: '', end: '', reason: '', source: 'explicit' });
    renderScheduleParsePanel(cfg.prefix, state, state.rawText);
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
        busyReplySwitch.checked = settings.busyReplyEnabled === true;
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
window.renderScheduleParsePanel = renderScheduleParsePanel;
window.collectScheduleParsePanelState = collectScheduleParsePanelState;
window.openScheduleParsePanel = openScheduleParsePanel;
window.addScheduleParseBusyRow = addScheduleParseBusyRow;
window.removeScheduleParseBusyRow = removeScheduleParseBusyRow;
