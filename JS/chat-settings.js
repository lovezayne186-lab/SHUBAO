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
    if (busyReplyMode === 'auto' && busyReplyEnabledUi) {
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
    return typeof window.normalizeBusyReplyAutoLibrary === 'function'
        ? window.normalizeBusyReplyAutoLibrary(settings.busyReplyAutoLibrary || null)
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
    const scheduleEvents = getBusyReplyScheduleEventList(roleId);
    const out = [];
    const seen = {};
    scheduleEvents.forEach(function (event) {
        if (!event || !event.eventKey) return;
        out.push(event);
        seen[event.eventKey] = true;
    });
    const storedEvents = library && library.events ? library.events : {};
    Object.keys(storedEvents).forEach(function (key) {
        if (seen[key]) return;
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

function collectBusyReplyAutoLibraryFromPanel(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    const next = { version: 1, events: {} };
    if (!listEl) return next;
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
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return null;
    const next = collectBusyReplyAutoLibraryFromPanel(id);
    if (typeof window.saveBusyReplyAutoLibrary === 'function') {
        return window.saveBusyReplyAutoLibrary(id, next);
    }
    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
    return next;
}

function renderBusyReplyAutoLibraryPanel(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
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
    if (!show) return;

    if (!id) {
        listEl.innerHTML = '<div class="busy-auto-empty-hint">当前未绑定聊天对象，无法生成词条。请从聊天页打开设置。</div>';
        return;
    }

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
            const text = escapeScheduleParseHtml(entryObj ? entryObj.text : String(entry && entry.text || ''));
            const entryId = escapeScheduleParseHtml(entryObj ? entryObj.id : String(entry && entry.id || ('entry_' + index)));
            const entrySource = escapeScheduleParseHtml(entryObj ? entryObj.source : String(entry && entry.source || 'user'));
            const createdAt = escapeScheduleParseHtml(String(entry && entry.createdAt || Date.now()));
            return [
                '<div class="busy-auto-entry-row" data-entry-id="' + entryId + '" data-entry-source="' + entrySource + '" data-entry-created-at="' + createdAt + '">',
                '<textarea data-busy-auto-entry-text placeholder="请输入自动回复词条">' + text + '</textarea>',
                '<button type="button" class="busy-auto-entry-remove" data-busy-action="remove-entry">删除</button>',
                '</div>'
            ].join('');
        }).join('') : '<div class="busy-auto-empty-hint">还没有词条，先点生成或手动添加。</div>';
        return [
            '<div class="busy-auto-event-card" data-event-key="' + escapeScheduleParseHtml(event.eventKey || '') + '" data-event-kind="' + escapeScheduleParseHtml(event.kind || '') + '" data-event-title="' + title + '" data-event-reason="' + reason + '" data-event-start="' + escapeScheduleParseHtml(event.start || '') + '" data-event-end="' + escapeScheduleParseHtml(event.end || '') + '">',
            '<div class="busy-auto-event-head">',
            '<div>',
            '<div class="busy-auto-event-title">' + title + '</div>',
            '<div class="busy-auto-event-meta">' + (timeText || '无时间') + (reason ? (' · ' + reason) : '') + '</div>',
            '</div>',
            '<div class="busy-auto-event-actions">',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="generate-event">重新生成</button>',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="add-entry">+ 添加词条</button>',
            '</div>',
            '</div>',
            '<div class="busy-auto-entry-list">' + entryHtml + '</div>',
            '</div>'
        ].join('');
    }).join('') || '<div class="busy-auto-empty-hint">当前没有可用的作息事件，请先解析作息表。</div>';

    if (listEl.dataset.bound !== '1') {
        listEl.dataset.bound = '1';
        listEl.addEventListener('click', function (e) {
            const target = e.target && e.target.closest ? e.target.closest('[data-busy-action]') : null;
            if (!target) return;
            const action = String(target.dataset.busyAction || '').trim();
            const card = target.closest('.busy-auto-event-card');
            const eventKey = card ? String(card.dataset.eventKey || '').trim() : '';
            if (!eventKey) return;
            if (action === 'add-entry') {
                const next = collectBusyReplyAutoLibraryFromPanel(id);
                const event = next.events[eventKey] || {
                    eventKey: eventKey,
                    kind: String(card.dataset.eventKind || 'busy'),
                    title: String(card.dataset.eventTitle || '忙碌'),
                    reason: String(card.dataset.eventReason || '忙碌'),
                    start: String(card.dataset.eventStart || ''),
                    end: String(card.dataset.eventEnd || ''),
                    entries: []
                };
                event.entries = Array.isArray(event.entries) ? event.entries : [];
                event.entries.push({
                    id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                    text: '',
                    source: 'user',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                next.events[eventKey] = event;
                if (typeof window.saveBusyReplyAutoLibrary === 'function') {
                    window.saveBusyReplyAutoLibrary(id, next);
                } else {
                    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
                }
                renderBusyReplyAutoLibraryPanel(id);
                return;
            }
            if (action === 'remove-entry') {
                const row = target.closest('.busy-auto-entry-row');
                if (!row) return;
                const next = collectBusyReplyAutoLibraryFromPanel(id);
                const event = next.events[eventKey];
                if (!event || !Array.isArray(event.entries)) return;
                const entryId = String(row.dataset.entryId || '').trim();
                event.entries = event.entries.filter(function (entry) {
                    return String(entry && entry.id || '') !== entryId;
                });
                if (typeof window.saveBusyReplyAutoLibrary === 'function') {
                    window.saveBusyReplyAutoLibrary(id, next);
                } else {
                    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
                }
                renderBusyReplyAutoLibraryPanel(id);
                return;
            }
            if (action === 'generate-event') {
                generateBusyReplyAutoLibrary(id, eventKey);
            }
        });
        listEl.addEventListener('input', function () {
            saveBusyReplyAutoLibraryFromPanel(id);
        });
        listEl.addEventListener('change', function () {
            saveBusyReplyAutoLibraryFromPanel(id);
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
    return [
        '你现在要批量生成“忙时自动回复词条”。',
        '要求：',
        '1. 每个事件至少生成 2 条，建议 3 到 5 条。',
        '2. 必须使用第一人称，口吻自然、像角色本人说话。',
        '3. 不要输出 [自动回复] 前缀，运行时会自动加。',
        '4. 不要输出 Markdown、解释、编号说明之外的文字，只输出严格 JSON。',
        '5. 如果事件已经有旧词条，请避免重复，尽量生成新的表达。',
        '输出格式必须固定为：{"events":[{"eventKey":"...","entries":["...","..."]}]}',
        '',
        '【角色信息】',
        '角色名称：' + String(profile.nickName || profile.name || profile.remark || id || 'TA'),
        '角色备注：' + String(profile.remark || ''),
        '角色人设：' + String(profile.desc || ''),
        '聊天风格：' + String(profile.style || ''),
        '作息原文：' + String(profile.schedule || ''),
        '作息解析：' + (plan && plan.summary ? String(plan.summary) : ''),
        '世界书：' + String(worldbookPrompt || ''),
        '',
        '【当前要生成的事件列表】',
        eventLines || '(无)',
        '',
        '【已有词条概要】',
        existingLines || '(无)',
        '',
        '请严格根据上面的角色信息、世界书和作息来写，不要脱离角色。'
    ].join('\n');
}

function parseBusyReplyGenerationResult(text) {
    let raw = String(text || '').trim();
    if (!raw) return null;
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            const parsed = JSON.parse(match[0]);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e2) {
            return null;
        }
    }
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

function generateBusyReplyAutoLibrary(roleId, targetEventKey) {
    const id = resolveChatSettingsRoleId(roleId);
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
    const systemPrompt = '你是一个自动回复词条生成器。只输出严格 JSON，不要输出任何解释或 Markdown。';
    const userPrompt = getBusyReplyAutoGenerationPrompt(id, eventList, library);
    setBusyReplyGenerationLoading(true);
    const prevRoleId = window.currentChatRole;
    window.currentChatRole = id;
    try {
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseBusyReplyGenerationResult(resultText);
                const produced = parsed && Array.isArray(parsed.events) ? parsed.events : [];
                if (!produced.length) {
                    notifyBusyReplyAction('没有解析到可用的词条结果。');
                    return;
                }
                const next = getBusyReplyAutoLibrarySetting(id);
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
                        merged.push({
                            id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            text: '我现在有点忙，晚点再回你。',
                            source: 'ai',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                        merged.push({
                            id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            text: '这会儿不太方便，等我忙完再说。',
                            source: 'ai',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
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
                notifyBusyReplyAction('自动回复词条已生成。');
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
    const aiBtn = panel.querySelector('[data-schedule-action="ai-parse"]');
    const autoBtn = panel.querySelector('[data-schedule-action="auto-parse"]');
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
            statusEl.textContent = mode === 'ai' ? 'AI 正在解析作息...' : '正在自动解析作息...';
            statusEl.hidden = false;
        }
        setBtn(aiBtn, 'AI解析中', true);
        setBtn(autoBtn, '自动解析中', true);
    } else {
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.hidden = true;
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
    let raw = String(text || '').trim();
    if (!raw) return null;
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            parsed = JSON.parse(match[0]);
        } catch (e2) {
            return null;
        }
    }
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed.plan && typeof parsed.plan === 'object'
        ? parsed.plan
        : (parsed.result && typeof parsed.result === 'object' ? parsed.result : parsed);
    return ensureScheduleParsePlan(candidate, rawText);
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
            '<button type="button" class="schedule-parse-busy-remove" onclick="removeScheduleParseBusyRow(\'' + safePrefix + '\', ' + index + ')">×</button>',
            '</div>'
        ].join('');
    }).join('');

    return [
        '<div class="schedule-parse-panel-header">',
        '  <div class="schedule-parse-panel-copy">',
        '    <div class="schedule-parse-panel-title">解析结果</div>',
        '    <div class="schedule-parse-panel-subtitle">AI 解析更准，自动解析更快。解析后可以直接改下面的时间和事件名称。</div>',
        '  </div>',
        '  <div class="schedule-parse-panel-actions">',
        '    <button type="button" class="schedule-parse-action-btn primary" data-schedule-action="ai-parse" onclick="runScheduleParse(\'' + safePrefix + '\', \'ai\')">',
        '      <span class="schedule-parse-action-btn-title">AI解析</span>',
        '      <span class="schedule-parse-action-btn-sub">消耗一次API，解析更精准</span>',
        '    </button>',
        '    <button type="button" class="schedule-parse-action-btn" data-schedule-action="auto-parse" onclick="runScheduleParse(\'' + safePrefix + '\', \'auto\')">',
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
        '<button type="button" class="schedule-parse-add-btn" onclick="addScheduleParseBusyRow(\'' + safePrefix + '\')">+ 添加忙碌时段</button>',
        '<div class="schedule-parse-field" style="margin-top: 12px;">',
        '  <label>备注</label>',
        '  <textarea data-schedule-field="notes" placeholder="可写上未能自动识别的说明，保存时会一并记录。">' + escapeScheduleParseHtml(normalized.notes || '') + '</textarea>',
        '</div>',
        '<div class="schedule-parse-footnote">修改后记得点底部的保存按钮。这个面板会把结果存成结构化作息，供忙时不回消息或自动回复使用。</div>'
    ].join('');
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
    const safeMode = String(mode || '').trim() === 'ai' ? 'ai' : 'auto';
    if (safeMode === 'auto') {
        const parsed = typeof window.parseRoleSchedulePlan === 'function'
            ? window.parseRoleSchedulePlan(rawText)
            : null;
        const normalized = renderScheduleParsePanel(cfg.prefix, parsed || getScheduleParseEmptyPlan(rawText), rawText, {
            mode: 'auto',
            statusText: '自动解析完成'
        });
        if (!normalized) {
            notifyScheduleParseAction('自动解析失败。');
            return;
        }
        notifyScheduleParseAction('自动解析完成。');
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
                const normalized = renderScheduleParsePanel(cfg.prefix, parsed, rawText, {
                    mode: 'ai',
                    statusText: 'AI 解析完成'
                });
                if (!normalized) {
                    notifyScheduleParseAction('AI 解析失败。');
                    return;
                }
                notifyScheduleParseAction('AI 解析完成。');
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
window.generateBusyReplyAutoLibrary = generateBusyReplyAutoLibrary;
window.renderScheduleParsePanel = renderScheduleParsePanel;
window.collectScheduleParsePanelState = collectScheduleParsePanelState;
window.openScheduleParsePanel = openScheduleParsePanel;
window.runScheduleParse = runScheduleParse;
window.addScheduleParseBusyRow = addScheduleParseBusyRow;
window.removeScheduleParseBusyRow = removeScheduleParseBusyRow;
