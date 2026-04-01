function getCurrentChatSettings(roleId) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = roleId || window.currentChatRole || '';
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
    const id = roleId || window.currentChatRole || '';
    if (!id) return;
    allSettings[id] = Object.assign({}, allSettings[id] || {}, settings || {});
    localStorage.setItem('chat_settings_by_role', JSON.stringify(allSettings));
}

function applyChatBubbleCssFromSettings(roleId) {
    const id = roleId || window.currentChatRole || '';
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
    const roleId = window.currentChatRole || '';
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const momentsPostingSwitch = document.getElementById('setting-moments-posting-enabled');
    const allowOfflineInviteSwitch = document.getElementById('setting-allow-offline-invite');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
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
    if (autoSummarySwitch) {
        settings.autoSummary = !!autoSummarySwitch.checked;
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
    applyChatBubbleCssFromSettings(roleId);
    applyChatFontSizeFromSettings(roleId);
}

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
    const id = roleId || window.currentChatRole || '';
    if (!id) return;
    const settings = getCurrentChatSettings(id);
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const momentsPostingSwitch = document.getElementById('setting-moments-posting-enabled');
    const allowOfflineInviteSwitch = document.getElementById('setting-allow-offline-invite');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
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
    if (autoSummarySwitch && typeof settings.autoSummary === 'boolean') {
        autoSummarySwitch.checked = settings.autoSummary;
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
    const id = roleId || window.currentChatRole || '';
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
window.initChatSettingsUI = initChatSettingsUI;
window.applyChatFontSizeFromSettings = applyChatFontSizeFromSettings;
window.updateChatFontSizePreview = updateChatFontSizePreview;
window.openRoleApiPresetModal = openRoleApiPresetModal;
window.closeRoleApiPresetModal = closeRoleApiPresetModal;
window.clearRoleApiPresetBinding = clearRoleApiPresetBinding;
window.getEffectiveChatMemoryLimit = getEffectiveChatMemoryLimit;
window.getEffectiveChatSummaryFreq = getEffectiveChatSummaryFreq;
window.isChatAutoSummaryEnabled = isChatAutoSummaryEnabled;

