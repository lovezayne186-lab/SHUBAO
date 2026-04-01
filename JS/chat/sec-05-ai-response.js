/* === [SEC-05] AI 回复解析与消息写入 === */

function isChatRoleViewActive(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    const currentRole = String(window.currentChatRole || '').trim();
    if (!currentRole || currentRole !== rid) return false;
    const chatView = document.getElementById('chat-view');
    if (chatView) {
        try {
            if (chatView.style.display === 'none') return false;
            if (typeof window.getComputedStyle === 'function' && window.getComputedStyle(chatView).display === 'none') {
                return false;
            }
        } catch (e) { }
    }
    if (document.body && document.body.classList && document.body.classList.contains('chat-view-active')) {
        return true;
    }
    return !chatView;
}

function getRoleNotificationMeta(roleId) {
    const rid = String(roleId || '').trim();
    const profile = (window.charProfiles && window.charProfiles[rid] && typeof window.charProfiles[rid] === 'object')
        ? window.charProfiles[rid]
        : {};
    return {
        avatar: String(profile.avatar || '').trim() || 'assets/chushitouxiang.jpg',
        name: String(profile.remark || profile.nickName || profile.name || rid || 'Ta').trim() || 'Ta'
    };
}

function getAiMessageNotificationPreview(msg) {
    if (!msg || String(msg.role || '') !== 'ai') return '';
    const type = String(msg.type || 'text').trim();
    if (type === 'text') return String(msg.content || '').trim();
    if (type === 'voice') return '[语音]';
    if (type === 'image' || type === 'ai_secret_photo') return '[图片]';
    if (type === 'sticker') return '[表情包]';
    if (type === 'dice') return '[骰子]';
    if (type === 'transfer') {
        const amount = String(msg.amount || '').trim();
        return amount ? ('向你转了 ' + amount + ' 元') : '[转账]';
    }
    if (type === 'redpacket') {
        const note = String(msg.note || '').trim();
        return note ? ('给你发了红包: ' + note) : '[红包]';
    }
    if (type === 'location') {
        try {
            const payload = typeof msg.content === 'string' ? JSON.parse(msg.content) : (msg.content || {});
            const name = String(payload && (payload.name || payload.title) || '').trim();
            return name ? ('[位置] ' + name) : '[位置]';
        } catch (e) {
            return '[位置]';
        }
    }
    if (type === 'offline_action') {
        const text = String(msg.content || '').trim();
        return text ? ('（' + text + '）') : '';
    }
    return String(msg.content || '').trim();
}

function showBackgroundAiReplyNotification(roleId, msg) {
    if (isChatRoleViewActive(roleId)) return;
    const preview = getAiMessageNotificationPreview(msg);
    if (!preview) return;
    const meta = getRoleNotificationMeta(roleId);
    try {
        if (typeof window.showIosNotification === 'function') {
            window.showIosNotification(meta.avatar, meta.name, preview, { durationMs: 4200 });
        }
    } catch (e) { }
}

function pushRoleMessageToDataAndActiveView(roleId, msg) {
    const rid = String(roleId || '').trim();
    if (!rid || !msg) return false;
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[rid]) window.chatData[rid] = [];
    ensureChatMessageId(msg);
    window.chatData[rid].push(msg);
    if (!isChatRoleViewActive(rid)) {
        return false;
    }
    appendMessageToDOM(msg);
    return true;
}

window.isChatRoleViewActive = isChatRoleViewActive;
window.pushRoleMessageToDataAndActiveView = pushRoleMessageToDataAndActiveView;

function handleActions(roleId, actions, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const onBackgroundMessage = typeof opts.onBackgroundMessage === 'function' ? opts.onBackgroundMessage : null;
    const result = { postMessages: [], offlineMeetingStart: false, offlineMeetingSource: '', recall: null };
    if (!roleId || !actions || typeof actions !== 'object') return result;
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];

    try {
        const act = actions || {};

        if (act.transfer) {
            const info = act.transfer;
            const amountNum = typeof info.amount === 'number' ? info.amount : parseFloat(info.amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                const kindRaw = typeof info.kind === 'string' ? info.kind.toLowerCase() : '';
                let msgType = 'transfer';
                if (kindRaw === 'redpacket' || kindRaw === 'hongbao') {
                    msgType = 'redpacket';
                } else if (kindRaw === 'transfer' || kindRaw === 'zhuanzhang') {
                    msgType = 'transfer';
                }
                result.postMessages.push({
                    type: msgType,
                    amount: amountNum.toFixed(2),
                    note: typeof info.remark === 'string' ? info.remark : ''
                });
            }
        }

        if (act.location) {
            const loc = act.location;
            const name = typeof loc.name === 'string' ? loc.name : '';
            const address = typeof loc.address === 'string' ? loc.address : '';
            const payload = JSON.stringify({ name: name, address: address });
            const now = Date.now();
            const aiMsg = {
                role: 'ai',
                content: payload,
                type: 'location',
                timestamp: now
            };
            const rendered = pushRoleMessageToDataAndActiveView(roleId, aiMsg);
            if (!rendered && onBackgroundMessage) onBackgroundMessage(aiMsg);
        }

        if (act.changeAvatar) {
            handleChangeAvatarAction(roleId, act.changeAvatar);
        }

        const familyAct = act.family_card || act.familyCard || act.send_family_card || act.sendFamilyCard;
        if (familyAct) {
            let rawAmount = null;
            if (typeof familyAct === 'number' || typeof familyAct === 'string') {
                rawAmount = familyAct;
            } else if (familyAct && typeof familyAct === 'object') {
                rawAmount = familyAct.amount != null ? familyAct.amount : (familyAct.value != null ? familyAct.value : familyAct.money);
            }
            const amt = normalizeFamilyCardAmount(rawAmount);
            if (amt) {
                result.postMessages.push({ type: 'family_card', amount: amt });
            }
        }

        const offlineMeetingAct = act.offlineMeeting || act.offline_meeting || act.startOfflineMeeting;
        if (offlineMeetingAct && typeof offlineMeetingAct === 'object' && offlineMeetingAct.start) {
            if (!window.chatMapData) window.chatMapData = {};
            if (!window.chatMapData[roleId]) window.chatMapData[roleId] = {};
            const source = String(offlineMeetingAct.source || '').trim();
            const forceOnlineAfterMeeting = window.chatMapData[roleId].forceOnlineAfterMeeting === true;
            if (!forceOnlineAfterMeeting) {
                window.chatMapData[roleId].isMeeting = true;
                window.chatMapData[roleId].forceOnlineAfterMeeting = false;
                result.offlineMeetingStart = true;
                result.offlineMeetingSource = source;
            } else {
                console.log('[OfflineMeeting] blocked by force-online lock for role:', roleId, 'source:', source || '(none)');
            }
        }

        const recallAct = act.recall || act.revoke || act.withdraw;
        if (recallAct) {
            let recallSpec = {};
            if (typeof recallAct === 'string') {
                recallSpec = { target: recallAct };
            } else if (recallAct === true) {
                recallSpec = { target: 'self_last' };
            } else if (typeof recallAct === 'object') {
                recallSpec = recallAct;
            }
            const finalSpec = Object.assign({}, recallSpec, {
                initiator: 'ai',
                includeInAI: true,
                triggerAI: false,
                animate: true
            });
            if (!finalSpec.target && !finalSpec.messageId && !finalSpec.quoteId) {
                finalSpec.target = 'self_last';
            }
            if (typeof window.performChatMessageRecall === 'function') {
                result.recall = window.performChatMessageRecall(roleId, finalSpec);
            }
        }
    } catch (e) {
        console.error('handleActions 处理失败:', e);
    }
    return result;
}

function isRoleCurrentlyOfflineMeeting(roleId) {
    if (!roleId || !window.chatMapData) return false;
    return !!(window.chatMapData[roleId] && window.chatMapData[roleId].isMeeting === true);
}

function isRoleForcedOnlineAfterMeeting(roleId) {
    if (!roleId || !window.chatMapData) return false;
    return !!(window.chatMapData[roleId] && window.chatMapData[roleId].forceOnlineAfterMeeting === true);
}

function pushOfflineMixedSegments(result, text) {
    const raw = String(text || '').trim();
    if (!raw) return;
    const parts = raw.split('|||');
    for (let i = 0; i < parts.length; i++) {
        const part = String(parts[i] || '').trim();
        if (!part) continue;
        const re = /[（(]([\s\S]*?)[）)]/g;
        let match = null;
        let lastIndex = 0;
        let hadMatch = false;
        while ((match = re.exec(part)) !== null) {
            hadMatch = true;
            const before = part.slice(lastIndex, match.index).trim();
            if (before) {
                result.push({ kind: 'text', text: before });
            }
            const actionText = String(match[1] || '').trim();
            if (actionText) {
                result.push({ kind: 'offline_action', content: actionText });
            }
            lastIndex = re.lastIndex;
        }
        const tail = part.slice(lastIndex).trim();
        if (tail) {
            result.push({ kind: 'text', text: tail });
        } else if (!hadMatch && part) {
            result.push({ kind: 'text', text: part });
        }
    }
}

function normalizeStructuredReplySegments(replyValue, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const offlineMode = !!opts.offlineMode;
    const result = [];

    function pushText(text) {
        const s = String(text || '').trim();
        if (!s) return;
        if (offlineMode) {
            pushOfflineMixedSegments(result, s);
            return;
        }
        const normalized = s.replace(/\r\n?/g, '\n');
        const coarseParts = normalized.indexOf('|||') !== -1 ? normalized.split('|||') : [normalized];
        for (let i = 0; i < coarseParts.length; i++) {
            const block = String(coarseParts[i] || '').trim();
            if (!block) continue;
            const lineParts = block.split(/\n+/);
            for (let j = 0; j < lineParts.length; j++) {
                const item = String(lineParts[j] || '').trim();
                if (!item) continue;
                result.push({ kind: 'text', text: item });
            }
        }
    }

    function pushObject(type, payload) {
        result.push(Object.assign({ kind: String(type || '').trim() }, payload || {}));
    }

    if (replyValue == null) return result;

    if (Array.isArray(replyValue)) {
        for (let i = 0; i < replyValue.length; i++) {
            const item = replyValue[i];
            if (typeof item === 'string') {
                pushText(item);
                continue;
            }
            if (!item || typeof item !== 'object') continue;
            const rawType = String(item.type || item.kind || '').trim().toLowerCase();
            if (!rawType || rawType === 'text') {
                pushText(item.content != null ? item.content : item.text);
                continue;
            }
            if (rawType === 'offline_action' || rawType === 'action' || rawType === 'narration') {
                const actionContent = String(item.content != null ? item.content : item.text || '').trim();
                if (offlineMode) pushObject('offline_action', { content: actionContent });
                else pushText(actionContent);
                continue;
            }
            if (rawType === 'voice' || rawType === 'voice_message') {
                pushObject('voice', { content: String(item.content != null ? item.content : item.text || '').trim() });
                continue;
            }
            if (rawType === 'photo' || rawType === 'image' || rawType === 'ai_image') {
                pushObject('photo', { content: String(item.description != null ? item.description : (item.content != null ? item.content : item.text || '')).trim() });
                continue;
            }
            if (rawType === 'location') {
                pushObject('location', {
                    name: String(item.name || item.title || '').trim(),
                    address: String(item.address || item.content || '').trim()
                });
                continue;
            }
            if (rawType === 'sticker') {
                pushObject('sticker', { content: String(item.url || item.content || '').trim() });
                continue;
            }
            if (rawType === 'dice') {
                pushObject('dice');
                continue;
            }
            if (rawType === 'video_call' || rawType === 'video') {
                pushObject('video_call');
                continue;
            }
            if (rawType === 'call' || rawType === 'voice_call') {
                pushObject('call');
                continue;
            }
            if (rawType === 'takeout_card') {
                pushObject('takeout_card', {
                    shopName: String(item.shopName || '').trim(),
                    items: Array.isArray(item.items) ? item.items : [],
                    price: String(item.price || '').trim(),
                    remark: String(item.remark || '').trim()
                });
                continue;
            }
            pushText(item.content != null ? item.content : item.text);
        }
        return result;
    }

    if (typeof replyValue === 'string') {
        pushText(replyValue);
        return result;
    }

    return result;
}

function serializeReplySegmentsForDirectiveParsing(segments) {
    const list = Array.isArray(segments) ? segments : [];
    return list.map(function (seg) {
        if (!seg) return '';
        if (seg.kind === 'text') return String(seg.text || '');
        return '';
    }).filter(Boolean).join('|||');
}

function stripControlDirectivesFromText(text) {
    let s = String(text || '');
    if (!s) return '';
    s = s.replace(/\[\[\s*LISTEN_TOGETHER_(?:ACCEPT|DECLINE)\s*:\s*[^\]]+?\s*\]\]/gi, ' ');
    s = s.replace(/\[\[\s*ACCEPT_TRANSFER\s*\]\]/gi, ' ');
    s = s.replace(/\[\[\s*OPEN_REDPACKET\s*\]\]/gi, ' ');
    s = s.replace(/:::\s*TRANSFER\s*:(\{[\s\S]*?\})\s*:::/gi, ' ');
    s = s.replace(/\s*\|\|\|\s*/g, '|||');
    s = s.replace(/\s{2,}/g, ' ');
    s = s.replace(/(?:^\|\|\|)+|(?:\|\|\|$)+/g, '');
    return s.trim();
}

function sanitizeReplySegmentsForDisplay(segments, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const offlineMode = !!opts.offlineMode;
    const source = Array.isArray(segments) ? segments : [];
    const out = [];
    for (let i = 0; i < source.length; i++) {
        const seg = source[i];
        if (!seg) continue;
        if (seg.kind !== 'text') {
            out.push(seg);
            continue;
        }
        const cleaned = stripControlDirectivesFromText(seg.text || '');
        if (!cleaned) continue;
        const normalized = normalizeStructuredReplySegments(cleaned, { offlineMode: offlineMode });
        if (Array.isArray(normalized) && normalized.length) out.push.apply(out, normalized);
    }
    return out;
}

function normalizeImageUrlCandidate(url) {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    if (!u) return '';
    if (u.length >= 2 && ((u.startsWith('`') && u.endsWith('`')) || (u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'")))) {
        u = u.slice(1, u.length - 1).trim();
    }
    const stickerMatch = u.match(/^\[STICKER:\s*([^\]]+)\]$/i);
    if (stickerMatch && stickerMatch[1]) {
        u = String(stickerMatch[1]).trim();
    }
    return u;
}

function isValidImageUrlCandidate(url) {
    const u = normalizeImageUrlCandidate(url);
    if (!u) return false;
    if (u.startsWith('data:image/')) return true;
    if (u.startsWith('blob:')) return true;
    if (/^(\/|\.\/|\.\.\/|assets\/)/i.test(u)) return true;
    let parsed = null;
    try {
        parsed = new URL(u);
    } catch (e) {
        return false;
    }
    if (!parsed) return false;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const path = (parsed.pathname || '').toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return true;
    const q = (parsed.search || '').toLowerCase();
    if (q.includes('image') || q.includes('img') || q.includes('format=') || q.includes('mime=')) return true;
    return true;
}

function preloadImageUrl(url, timeoutMs) {
    return new Promise(function (resolve) {
        const u = normalizeImageUrlCandidate(url);
        if (!u) return resolve(false);
        const img = new Image();
        let done = false;
        let timerId = null;
        function finish(ok) {
            if (done) return;
            done = true;
            if (timerId) clearTimeout(timerId);
            img.onload = null;
            img.onerror = null;
            resolve(!!ok);
        }
        timerId = setTimeout(function () {
            finish(false);
        }, Math.max(800, timeoutMs || 2500));
        img.onload = function () { finish(true); };
        img.onerror = function () { finish(false); };
        try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
        let srcToLoad = u;
        try {
            srcToLoad = new URL(u, window.location.href).href;
        } catch (e) { }
        img.src = srcToLoad;
    });
}

function ensureChatHeaderAvatar() {
    const existing = document.getElementById('current-chat-avatar');
    if (existing) existing.remove();
    return null;
}

function applyCharacterAvatarToUI(roleId, avatarUrl) {
    if (!roleId) return [];
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : null;
    if (profile) {
        profile.avatar = avatarUrl;
    }

    const animatedTargets = [];

    if (window.currentChatRole === roleId) {
        const oldHeaderAvatar = document.getElementById('current-chat-avatar');
        if (oldHeaderAvatar) oldHeaderAvatar.remove();
    }

    const menuAvatar = document.getElementById('menu-role-avatar');
    if (menuAvatar && window.currentChatRole === roleId) {
        try { menuAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        menuAvatar.src = avatarUrl;
        animatedTargets.push(menuAvatar);
    }

    const statusAvatar = document.getElementById('status-monitor-avatar-img');
    if (statusAvatar && window.currentChatRole === roleId) {
        try { statusAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        statusAvatar.src = avatarUrl;
        animatedTargets.push(statusAvatar);
    }

    const callAvatar = document.getElementById('voice-call-avatar');
    if (callAvatar && window.currentChatRole === roleId) {
        try { callAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        callAvatar.src = avatarUrl;
        animatedTargets.push(callAvatar);
    }

    if (window.currentChatRole === roleId) {
        const historyBox = document.getElementById('chat-history');
        if (historyBox) {
            const aiRows = historyBox.querySelectorAll('.msg-row[data-role="ai"] .msg-avatar img');
            aiRows.forEach(function (img) {
                try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
                img.src = avatarUrl;
                animatedTargets.push(img);
            });
        }
    }

    return animatedTargets;
}

function runAvatarSwapAnimation(targets) {
    if (!targets || !targets.length) return;
    for (let i = 0; i < targets.length; i++) {
        const el = targets[i];
        if (!el || typeof el.animate !== 'function') continue;
        try {
            el.animate(
                [
                    { transform: 'scale(1)', filter: 'brightness(1)' },
                    { transform: 'scale(1.08)', filter: 'brightness(1.25)' },
                    { transform: 'scale(1)', filter: 'brightness(1)' }
                ],
                { duration: 420, easing: 'ease-out' }
            );
        } catch (e) { }
    }
}

function appendAvatarSwapError(roleId, text) {
    const now = Date.now();
    const msg = {
        role: 'ai',
        content: text || '我想换但图片加载失败了。',
        type: 'text',
        timestamp: now
    };
    const rendered = pushRoleMessageToDataAndActiveView(roleId, msg);
    saveData();
    if (!rendered) {
        showBackgroundAiReplyNotification(roleId, msg);
        if (typeof window.loadWechatChatList === 'function') {
            try { window.loadWechatChatList(true); } catch (e) { }
        }
    }
}

async function handleChangeAvatarAction(roleId, payload) {
    let chosenUrl = '';
    if (payload && typeof payload === 'object') {
        const rawIndex = payload.index != null ? payload.index : (payload.pick != null ? payload.pick : payload.choice);
        if (rawIndex != null) {
            const idx = parseInt(String(rawIndex), 10);
            if (!isNaN(idx) && idx > 0) {
                try {
                    const list = window.__latestUserImagesByRole && window.__latestUserImagesByRole[roleId]
                        ? window.__latestUserImagesByRole[roleId]
                        : [];
                    if (Array.isArray(list) && idx <= list.length) {
                        chosenUrl = list[idx - 1];
                    }
                } catch (e) { }
            }
        }
        if (!chosenUrl && payload.url) chosenUrl = payload.url;
    } else if (typeof payload === 'string') {
        chosenUrl = payload;
    }

    let avatarUrl = normalizeImageUrlCandidate(chosenUrl);
    if (!avatarUrl || !isValidImageUrlCandidate(avatarUrl)) {
        try {
            const list = window.__latestUserImagesByRole && window.__latestUserImagesByRole[roleId]
                ? window.__latestUserImagesByRole[roleId]
                : [];
            const ts = window.__latestUserImagesByRoleTs && window.__latestUserImagesByRoleTs[roleId]
                ? Number(window.__latestUserImagesByRoleTs[roleId])
                : 0;
            const isRecent = ts > 0 ? (Date.now() - ts) < (30 * 60 * 1000) : true;
            if (Array.isArray(list) && list.length > 0 && isRecent) {
                const last = list[list.length - 1];
                const fallback = normalizeImageUrlCandidate(last);
                if (fallback && isValidImageUrlCandidate(fallback)) {
                    avatarUrl = fallback;
                }
            }
        } catch (e) { }
    }
    if (!avatarUrl || !isValidImageUrlCandidate(avatarUrl)) {
        appendAvatarSwapError(roleId, '我想换，但这张图的链接看起来不太对，加载失败了。');
        return;
    }

    if (!window.charProfiles) window.charProfiles = {};
    if (!window.charProfiles[roleId]) window.charProfiles[roleId] = {};

    const prevAvatar = window.charProfiles[roleId].avatar || '';
    const targets = applyCharacterAvatarToUI(roleId, avatarUrl);
    runAvatarSwapAnimation(targets);

    const ok = await preloadImageUrl(avatarUrl, 25000);
    if (!ok) {
        if (prevAvatar) {
            const revertTargets = applyCharacterAvatarToUI(roleId, prevAvatar);
            runAvatarSwapAnimation(revertTargets);
        }
        appendAvatarSwapError(roleId, '我想换，但这张图我这边加载不出来，先不换了。');
        saveData();
        return;
    }

    saveData();
    if (typeof window.loadWechatChatList === 'function') {
        try { window.loadWechatChatList(true); } catch (e) { }
    }
}

function beginTrackedChatResponseRequest(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return '';
    window.__chatInflightRequestByRole = window.__chatInflightRequestByRole || {};
    const requestId = 'chatreq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    window.__chatInflightRequestByRole[rid] = {
        id: requestId,
        startedAt: Date.now()
    };
    return requestId;
}

function isTrackedChatResponseRequestCurrent(roleId, requestId) {
    const rid = String(roleId || '').trim();
    const reqId = String(requestId || '').trim();
    if (!rid || !reqId) return false;
    const store = window.__chatInflightRequestByRole || {};
    return !!(store[rid] && store[rid].id === reqId);
}

function finishTrackedChatResponseRequest(roleId, requestId) {
    const rid = String(roleId || '').trim();
    if (!isTrackedChatResponseRequestCurrent(rid, requestId)) return;
    try {
        delete window.__chatInflightRequestByRole[rid];
    } catch (e) { }
}

function setTrackedChatResponseHeaderText(headerTitle, roleId, requestId, text) {
    if (!headerTitle) return;
    if (!isTrackedChatResponseRequestCurrent(roleId, requestId)) return;
    const currentRole = String(window.currentChatRole || '').trim();
    const rid = String(roleId || '').trim();
    if (currentRole && rid && currentRole !== rid) return;
    headerTitle.innerText = text;
}

function invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle) {
    const requestId = beginTrackedChatResponseRequest(roleId);
    const isCurrentRequest = function () {
        return isTrackedChatResponseRequestCurrent(roleId, requestId);
    };
    const restoreHeaderTitle = function () {
        setTrackedChatResponseHeaderText(headerTitle, roleId, requestId, oldTitle);
    };
    const finishRequest = function () {
        finishTrackedChatResponseRequest(roleId, requestId);
    };

    if (typeof window.callAI === 'function') {
        window.callAI(
            systemPrompt,
            cleanHistory,
            userMessage,
            async (aiResponseText) => {
                if (!isCurrentRequest()) return;
                let rawText = typeof aiResponseText === 'string' ? aiResponseText : '';
                const wasOfflineMeeting = isRoleCurrentlyOfflineMeeting(roleId);
                let backgroundReplyNoticeMsg = null;

                let jsonPayload = null;
                let thoughtText = '';
                let innerMonologueText = '';
                let replyText = '';
                let replySegments = [];
                let systemEventText = '';
                let actions = null;

                // =================================================
                // 🛠️ 增强解析：确保能吃掉各种格式的 JSON
                // =================================================
                if (rawText) {
                    try {
                        // 1. 再次清洗，双重保险
                        let cleanJsonStr = rawText.trim();
                        // 如果还有 markdown 残留，再次清理
                        if (cleanJsonStr.startsWith('```')) {
                            cleanJsonStr = cleanJsonStr.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
                        }

                        // 2. 解析 JSON
                        const parsed = JSON.parse(cleanJsonStr);
                        if (parsed && typeof parsed === 'object') {
                            jsonPayload = parsed;
                        }
                    } catch (e) {
                        // 如果解析失败，说明 AI 可能真的只回了普通文本（容错）
                        console.warn("非标准 JSON 回复，降级为普通文本处理");
                    }
                }

                let pendingQuoteId = '';
                if (jsonPayload && typeof jsonPayload === 'object') {
                    const q = jsonPayload.quoteId != null
                        ? jsonPayload.quoteId
                        : (jsonPayload.quote_id != null ? jsonPayload.quote_id : (jsonPayload.reply_to != null ? jsonPayload.reply_to : ''));
                    pendingQuoteId = String(q || '').trim();
                }
                let quoteApplied = false;
                const tryAttachQuote = function (msgObj) {
                    if (!pendingQuoteId || quoteApplied || !msgObj) return;
                    msgObj.quoteId = pendingQuoteId;
                    resolveQuoteBlockForMessage(roleId, msgObj);
                    quoteApplied = true;
                };

                // =================================================
                // 🧠 逻辑分发：思考 / 回复 / 系统事件
                // =================================================
                if (jsonPayload) {
                    // 1. 提取内部思考 (Thought，用于逻辑推理)
                    if (typeof jsonPayload.thought === 'string') {
                        thoughtText = jsonPayload.thought;
                        if (thoughtText.trim()) {
                            saveHiddenThoughtToHistory(roleId, thoughtText, '【思考链】');
                        }
                    }

                    // 2. 提取状态与内心独白 (Status + inner_monologue)
                    if (jsonPayload.status && typeof jsonPayload.status === 'object') {
                        const statusObj = jsonPayload.status;
                        if (typeof statusObj.inner_monologue === 'string') {
                            innerMonologueText = statusObj.inner_monologue;
                            saveHiddenThoughtToHistory(roleId, innerMonologueText, '【内心独白】');
                        } else if (!innerMonologueText && typeof jsonPayload.thought === 'string') {
                            innerMonologueText = jsonPayload.thought;
                        }
                    }

                    // 3. 提取动作 (Actions)
                    if (jsonPayload.actions && typeof jsonPayload.actions === 'object') {
                        actions = handleActions(roleId, jsonPayload.actions, {
                            onBackgroundMessage: function (msg) {
                                backgroundReplyNoticeMsg = msg;
                            }
                        });
                    }
                    const offlineModeNow = wasOfflineMeeting || !!(actions && actions.offlineMeetingStart);

                    if (jsonPayload.status || innerMonologueText) {
                        updateRoleStatusFromAI(roleId, jsonPayload.status, innerMonologueText);
                    }

                    // 4. 处理核心回复 (Reply vs System Event)
                    // 注意：如果 reply 是 null，代表“不回消息”
                    if (jsonPayload.reply === null || jsonPayload.reply === undefined) {
                        // --- 物理阻断状态 (如洗澡/手术) ---
                        replyText = ''; // 既然是 null，就不要显示气泡

                        // 检查是否有系统事件提示
                        if (jsonPayload.system_event) {
                            systemEventText = String(jsonPayload.system_event);
                            appendSystemStatusToDOM(roleId, systemEventText); // 显示灰色小字
                        }
                    } else {
                        // --- 正常回复 ---
                        replySegments = normalizeStructuredReplySegments(
                            jsonPayload.reply_bubbles != null ? jsonPayload.reply_bubbles : jsonPayload.reply,
                            { offlineMode: offlineModeNow }
                        );
                        if (typeof jsonPayload.reply === 'string') {
                            replyText = String(jsonPayload.reply);
                        } else if (!replySegments.length && jsonPayload.reply_bubbles != null) {
                            replyText = String(jsonPayload.reply_bubbles || '');
                        } else {
                            replyText = '';
                        }
                    }

                    // 5. 将处理后的文本赋值给 rawText，供后续流程渲染
                    // 关键：这里我们只把 replyText 给后续流程，这样界面上就看不到 JSON 代码了！
                    rawText = replyText;
                }
                else {
                    // 如果不是 JSON，尝试去除旧版的 <thinking> 标签作为兜底
                    rawText = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
                    replySegments = normalizeStructuredReplySegments(rawText, { offlineMode: wasOfflineMeeting });
                }

                // =================================================
                // 🛑 阻断检查：如果 rawText 是空的（因为在洗澡），直接结束
                // =================================================
                if (!rawText && !replySegments.length && !jsonPayload?.actions) {
                    // 恢复标题状态
                    restoreHeaderTitle();
                    // 保存数据（因为可能存了 thought 或 system_event）
                    saveData();
                    finishRequest();
                    return; // 不执行后续的气泡渲染
                }

                let commandCarrierText = '';
                if (Array.isArray(replySegments) && replySegments.length) {
                    commandCarrierText = serializeReplySegmentsForDirectiveParsing(replySegments);
                } else {
                    commandCarrierText = String(rawText || '');
                }

                let listenTogetherDecisions = [];
                const ltDecision = applyListenTogetherDecisionFromAI(commandCarrierText || '', roleId);
                if (ltDecision && ltDecision.handled) {
                    listenTogetherDecisions = Array.isArray(ltDecision.decisions) ? ltDecision.decisions : [];
                    commandCarrierText = String(ltDecision.text || '').trim();
                }

                const joinedReplyTextForQuickCheck = (function () {
                    if (Array.isArray(replySegments) && replySegments.length) {
                        return replySegments.map(function (seg) {
                            if (!seg) return '';
                            if (seg.kind === 'text') return String(seg.text || '');
                            if (seg.kind === 'voice' || seg.kind === 'photo' || seg.kind === 'sticker') return String(seg.content || '');
                            if (seg.kind === 'location') return String(seg.name || '') + ' ' + String(seg.address || '');
                            if (seg.kind === 'video_call') return '[[VIDEO_CALL_USER]]';
                            if (seg.kind === 'call') return '[[CALL_USER]]';
                            if (seg.kind === 'dice') return '[[DICE]]';
                            return '';
                        }).join('|||');
                    }
                    return String(rawText || '');
                })();

                const familyParsed = parseAIFamilyCardFromContent(commandCarrierText || joinedReplyTextForQuickCheck || '');
                const familyCardAmountFromText = familyParsed.amount;
                commandCarrierText = familyParsed.text || '';

                const parsed = parseAITransferFromContent(commandCarrierText || '');
                const transferInfo = parsed.transfer;
                const acceptTransfer = parsed.acceptTransfer;
                const openRedpacket = parsed.openRedpacket;
                const baseText = parsed.text || '';
                const effectiveOfflineMode = wasOfflineMeeting || !!(actions && actions.offlineMeetingStart);
                if (Array.isArray(replySegments) && replySegments.length) {
                    replySegments = sanitizeReplySegmentsForDisplay(replySegments, {
                        offlineMode: effectiveOfflineMode
                    });
                } else {
                    rawText = baseText;
                    replySegments = normalizeStructuredReplySegments(baseText, {
                        offlineMode: effectiveOfflineMode
                    });
                }
                let parts = [];
                if (Array.isArray(replySegments) && replySegments.length) {
                    parts = replySegments.slice(0, 10);
                } else {
                    parts = normalizeStructuredReplySegments(baseText, {
                        offlineMode: effectiveOfflineMode
                    }).slice(0, 10);
                }

                let hasNormalReply = false;

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (!part) continue;
                    if (part.kind !== 'text') {
                        hasNormalReply = true;
                        break;
                    }
                    const textPart = String(part.text || '').trim();
                    if (!textPart) continue;

                    const cleanedPart = textPart.replace(/\s*\[\[DICE\]\]\s*/g, ' ').trim();
                    const isSys = cleanedPart.startsWith('[') ||
                        (cleanedPart.startsWith('(') && cleanedPart.endsWith(')')) ||
                        cleanedPart.includes('系统：');

                    if (!isSys) {
                        hasNormalReply = true;
                        break;
                    }
                }

                if (hasNormalReply || (jsonPayload && systemEventText)) {
                    if (window.chatData[roleId]) {
                        window.chatData[roleId].forEach(m => {
                            if (m.role === 'me' && m.status === 'sent') {
                                m.status = 'read';
                            }
                        });
                    }

                    if (isChatRoleViewActive(roleId)) {
                        const labels = document.querySelectorAll('.msg-status-text');
                        labels.forEach(label => {
                            if (label.innerText === '已送达') {
                                label.innerText = '已读';
                            }
                        });
                    }
                }

                const baseDelay = parseInt(localStorage.getItem('chat_bubble_delay')) || 200;

                let hasVisibleReplyBeforeTool = false;
                let pendingCallKind = '';

                // 🔥【修改开始】循环处理 AI 回复的每一段
                for (let i = 0; i < parts.length; i++) {
                    if (!isCurrentRequest()) return;
                    const segment = parts[i];
                    if (!segment) continue;
                    let part = segment.kind === 'text' ? String(segment.text || '').trim() : '';
                    if (segment.kind === 'text' && !part) continue;

                    const now = Date.now();
                    let hasDice = false;

                    if (segment.kind === 'video_call') {
                        pendingCallKind = 'video_call';
                        continue;
                    }
                    if (segment.kind === 'call') {
                        if (pendingCallKind !== 'video_call') pendingCallKind = 'call';
                        continue;
                    }

                    if (segment.kind === 'dice') {
                        const point = Math.floor(Math.random() * 6) + 1;
                        const diceMsg = {
                            role: 'ai',
                            content: String(point),
                            type: 'dice',
                            timestamp: now
                        };
                        tryAttachQuote(diceMsg);
                        const rendered = pushRoleMessageToDataAndActiveView(roleId, diceMsg);
                        if (!rendered) backgroundReplyNoticeMsg = diceMsg;
                        hasVisibleReplyBeforeTool = true;
                        if (i < parts.length - 1) {
                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            if (!isCurrentRequest()) return;
                        }
                        continue;
                    }

                    if (segment.kind === 'offline_action') {
                        const actionText = String(segment.content || '').trim();
                        if (actionText) {
                            const actionMsg = {
                                role: 'ai',
                                content: actionText,
                                type: 'offline_action',
                                timestamp: now
                            };
                            tryAttachQuote(actionMsg);
                            const rendered = pushRoleMessageToDataAndActiveView(roleId, actionMsg);
                            if (!rendered) backgroundReplyNoticeMsg = actionMsg;
                            hasVisibleReplyBeforeTool = true;
                        }
                        if (i < parts.length - 1) {
                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            if (!isCurrentRequest()) return;
                        }
                        continue;
                    }

                    if (segment.kind === 'voice' || segment.kind === 'photo' || segment.kind === 'location' || segment.kind === 'sticker' || segment.kind === 'takeout_card') {
                        let directMsgType = 'text';
                        let directContent = '';
                        if (segment.kind === 'voice') {
                            directMsgType = 'voice';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'photo') {
                            directMsgType = 'ai_secret_photo';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'location') {
                            directMsgType = 'location';
                            directContent = JSON.stringify({
                                name: String(segment.name || '').trim(),
                                address: String(segment.address || '').trim()
                            });
                        } else if (segment.kind === 'sticker') {
                            directMsgType = 'sticker';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'takeout_card') {
                            directMsgType = 'takeout_card';
                            directContent = JSON.stringify({
                                shopName: String(segment.shopName || '').trim(),
                                items: Array.isArray(segment.items) ? segment.items : [],
                                price: String(segment.price || '').trim(),
                                remark: String(segment.remark || '').trim()
                            });
                        }
                        if (directContent || directMsgType === 'location' || directMsgType === 'takeout_card') {
                            const directMsg = {
                                role: 'ai',
                                content: directContent,
                                type: directMsgType,
                                timestamp: now
                            };
                            if (directMsgType === 'voice') {
                                directMsg.duration = calcVoiceDurationSeconds(directContent);
                            }
                            tryAttachQuote(directMsg);
                            const rendered = pushRoleMessageToDataAndActiveView(roleId, directMsg);
                            if (!rendered) backgroundReplyNoticeMsg = directMsg;
                            hasVisibleReplyBeforeTool = true;
                        }
                        if (i < parts.length - 1) {
                            await new Promise(r => setTimeout(r, baseDelay * 2 + Math.random() * baseDelay));
                            if (!isCurrentRequest()) return;
                        }
                        continue;
                    }

                    // === 骰子处理（保持不变）===
                    if (part.indexOf('[[DICE]]') !== -1) {
                        const point = Math.floor(Math.random() * 6) + 1;
                        const diceMsg = {
                            role: 'ai',
                            content: String(point),
                            type: 'dice',
                            timestamp: now
                        };
                        tryAttachQuote(diceMsg);
                        const rendered = pushRoleMessageToDataAndActiveView(roleId, diceMsg);
                        if (!rendered) backgroundReplyNoticeMsg = diceMsg;
                        hasVisibleReplyBeforeTool = true;
                        hasDice = true;
                        part = part.replace(/\s*\[\[DICE\]\]\s*/g, ' ').trim();
                        if (!part) {
                            if (i < parts.length - 1) {
                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                if (!isCurrentRequest()) return;
                            }
                            continue;
                        }
                    }

                    let msgType = 'text';
                    let msgContent = part;

                    // === 🔥【修改开始】语音识别（优先级最高）===
                    // 修改：去掉了 ^ 和 $，只要包含标签就识别，防止 AI 加废话
                    const voiceMatch = part.match(/\[VOICE:\s*([\s\S]*?)\]/i);
                    if (voiceMatch) {
                        msgType = 'voice';
                        // 提取括号里的内容，自动忽略括号外的“好的”、“嗯”等废话
                        msgContent = voiceMatch[1].trim();
                    }

                    // 修改：确保照片也能宽松匹配
                    const photoMatch = part.match(/\[PHOTO:\s*([\s\S]*?)\]/i);
                    if (!voiceMatch && photoMatch) {
                        msgType = 'ai_secret_photo';
                        msgContent = photoMatch[1].trim();
                    }

                    const locationPattern = /\[LOCATION:\s*([^|\]]*?)\s*\|\s*([^\]]*?)\s*\]/i;
                    const locationMatch = part.match(locationPattern);
                    if (!voiceMatch && !photoMatch && locationMatch) {
                        msgType = 'location';
                        const name = (locationMatch[1] || '').trim();
                        const address = (locationMatch[2] || '').trim();
                        msgContent = JSON.stringify({ name: name, address: address });

                        const remainText = part.replace(locationPattern, '').trim();
                        if (remainText) {
                            const textMsg = {
                                role: 'ai',
                                content: remainText,
                                type: 'text',
                                timestamp: now
                            };
                            tryAttachQuote(textMsg);
                            const rendered = pushRoleMessageToDataAndActiveView(roleId, textMsg);
                            if (!rendered) backgroundReplyNoticeMsg = textMsg;
                            hasVisibleReplyBeforeTool = true;

                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            if (!isCurrentRequest()) return;
                        }
                    }

                    if (!voiceMatch && !photoMatch && !locationMatch) {
                        const redpacketPattern = /\[REDPACKET:\s*([0-9]+(?:\.[0-9]+)?)\s*:\s*([^\]]*?)\]/i;
                        const redpacketMatch = part.match(redpacketPattern);
                        if (redpacketMatch) {
                            const amount = redpacketMatch[1].trim();
                            let note = redpacketMatch[2].trim();
                            if (!note) {
                                note = '恭喜发财，大吉大利';
                            }
                            const redMsg = {
                                role: 'ai',
                                type: 'redpacket',
                                amount: amount,
                                note: note,
                                timestamp: now,
                                status: 'unopened'
                            };
                            tryAttachQuote(redMsg);
                            const renderedRed = pushRoleMessageToDataAndActiveView(roleId, redMsg);
                            if (!renderedRed) backgroundReplyNoticeMsg = redMsg;
                            hasVisibleReplyBeforeTool = true;

                            const remainTextForRed = part.replace(redpacketPattern, '').trim();
                            if (remainTextForRed) {
                                const textMsg = {
                                    role: 'ai',
                                    content: remainTextForRed,
                                    type: 'text',
                                    timestamp: now
                                };
                                tryAttachQuote(textMsg);
                                const renderedText = pushRoleMessageToDataAndActiveView(roleId, textMsg);
                                if (!renderedText) backgroundReplyNoticeMsg = textMsg;
                                hasVisibleReplyBeforeTool = true;
                            }

                            if (i < parts.length - 1) {
                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                if (!isCurrentRequest()) return;
                            }
                            continue;
                        }

                        const stickerPattern = /\[STICKER:\s*([^\s\]]+)\]/i;
                        const stickerMatch = part.match(stickerPattern);

                        if (stickerMatch) {
                            let url = stickerMatch[1].trim();
                            if (url.startsWith('//')) {
                                url = 'https:' + url;
                            }
                            msgType = 'sticker';
                            msgContent = url;

                            const remainText = part.replace(stickerPattern, '').trim();
                            if (remainText) {
                                const textMsg = {
                                    role: 'ai',
                                    content: remainText,
                                    type: 'text',
                                    timestamp: now
                                };
                                tryAttachQuote(textMsg);
                                const rendered = pushRoleMessageToDataAndActiveView(roleId, textMsg);
                                if (!rendered) backgroundReplyNoticeMsg = textMsg;
                                hasVisibleReplyBeforeTool = true;

                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                if (!isCurrentRequest()) return;
                            }
                        } else if (/^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(part)) {
                            msgType = 'image';
                            msgContent = part;
                        }
                    }

                    // === 语音时长计算（保持不变）===
                    let duration = 0;
                    if (msgType === 'voice') {
                        duration = calcVoiceDurationSeconds(msgContent);
                    }

                    // === 构建消息对象并发送（保持不变）===
                    const aiMsg = {
                        role: 'ai',
                        content: msgContent,
                        type: msgType,
                        timestamp: now
                    };
                    if (msgType === 'voice') {
                        aiMsg.duration = duration;
                    }
                    tryAttachQuote(aiMsg);
                    const rendered = pushRoleMessageToDataAndActiveView(roleId, aiMsg);
                    if (!rendered) backgroundReplyNoticeMsg = aiMsg;
                    hasVisibleReplyBeforeTool = true;

                    // === 模拟打字延迟（调整为更自然的间隔）===
                    if (i < parts.length - 1) {
                        // 增加消息之间的延迟，使回复更像真人
                        const delayTime = baseDelay * 2 + Math.random() * baseDelay;
                        await new Promise(r => setTimeout(r, delayTime));
                        if (!isCurrentRequest()) return;
                    }
                }

                // 🔥【修改结束】

                if ((!listenTogetherDecisions || !listenTogetherDecisions.length) && Array.isArray(cleanHistory) && cleanHistory.length) {
                    const lastH = cleanHistory[cleanHistory.length - 1];
                    if (lastH && lastH.role === 'me' && lastH.type === 'listen_invite') {
                        let inviteId = String(lastH.inviteId || '').trim();
                        if (!inviteId) inviteId = findLatestPendingInviteId(roleId);
                        if (inviteId && !findInviteDecisionMessage(roleId, inviteId)) {
                            const declineRe = /(拒绝|不了|不行|下次|改天|没空|忙|不太方便)/;
                            const contextRe = /(一起听|一起听歌|听歌|听这首)/;
                            const shouldDecline = declineRe.test(baseText) && contextRe.test(baseText);
                            listenTogetherDecisions = [{ kind: shouldDecline ? 'DECLINE' : 'ACCEPT', inviteId: inviteId }];
                        }
                    }
                }

                if (Array.isArray(listenTogetherDecisions) && listenTogetherDecisions.length) {
                    for (let i = 0; i < listenTogetherDecisions.length; i++) {
                        const d = listenTogetherDecisions[i] || {};
                        const kind = String(d.kind || '').toUpperCase();
                        const inviteId = String(d.inviteId || '').trim();
                        if (!inviteId) continue;
                        if (kind === 'ACCEPT') {
                            if (!findInviteDecisionMessage(roleId, inviteId)) {
                                updateInviteStatusInData(roleId, inviteId, 'accepted');
                                if (isChatRoleViewActive(roleId)) {
                                    const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
                                    const rowEl = row && row.closest ? row.closest('.msg-row') : null;
                                    if (rowEl) updateInviteCardRow(rowEl, 'accepted');
                                }
                                characterAcceptsInvite(inviteId, roleId);
                            }
                        } else if (kind === 'DECLINE') {
                            characterDeclinesInvite(inviteId, '', roleId);
                        }
                    }
                }

                const familyCardAmountFromActions = (function () {
                    if (!actions || !actions.postMessages || !Array.isArray(actions.postMessages)) return '';
                    for (let i = 0; i < actions.postMessages.length; i++) {
                        const p = actions.postMessages[i];
                        if (p && p.type === 'family_card' && p.amount) return String(p.amount);
                    }
                    return '';
                })();
                const familyCardAmount = familyCardAmountFromActions || familyCardAmountFromText;
                if (familyCardAmount && window.FamilyCard && typeof window.FamilyCard.receiveFromRole === 'function') {
                    window.FamilyCard.receiveFromRole(roleId, familyCardAmount);
                }

                if (actions && Array.isArray(actions.postMessages)) {
                    for (let i = 0; i < actions.postMessages.length; i++) {
                        const postMsg = actions.postMessages[i];
                        if (!postMsg || (postMsg.type !== 'transfer' && postMsg.type !== 'redpacket')) continue;
                        const amountText = String(postMsg.amount || '').trim();
                        if (!amountText) continue;
                        const transferMsg = {
                            role: 'ai',
                            type: postMsg.type,
                            amount: amountText,
                            note: String(postMsg.note || '').trim(),
                            timestamp: Date.now(),
                            status: postMsg.type === 'redpacket' ? 'unopened' : 'sent'
                        };
                        const rendered = pushRoleMessageToDataAndActiveView(roleId, transferMsg);
                        if (!rendered) backgroundReplyNoticeMsg = transferMsg;
                    }
                }

                if (transferInfo) {
                    const nowTransfer = Date.now();
                    let msgTypeForTransfer = 'transfer';
                    if (transferInfo.kind === 'redpacket') {
                        msgTypeForTransfer = 'redpacket';
                    } else if (transferInfo.kind === 'transfer') {
                        msgTypeForTransfer = 'transfer';
                    } else {
                        let lastUserText = "";
                        const historyList = window.chatData[roleId] || [];
                        for (let i = historyList.length - 1; i >= 0; i--) {
                            const m = historyList[i];
                            if (m && m.role === 'me') {
                                lastUserText = String(m.content || "");
                                break;
                            }
                        }
                        if (lastUserText) {
                            const lower = lastUserText.toLowerCase();
                            if (lastUserText.includes('红包')) {
                                msgTypeForTransfer = 'redpacket';
                            } else if (
                                lastUserText.includes('转账') ||
                                lastUserText.includes('转给') ||
                                lastUserText.includes('转我') ||
                                lower.includes('transfer')
                            ) {
                                msgTypeForTransfer = 'transfer';
                            }
                        }
                    }

                    const transferMsg = {
                        role: 'ai',
                        type: msgTypeForTransfer,
                        amount: transferInfo.amount,
                        note: transferInfo.remark || '',
                        timestamp: nowTransfer,
                        status: msgTypeForTransfer === 'redpacket' ? 'unopened' : 'sent'
                    };
                    const rendered = pushRoleMessageToDataAndActiveView(roleId, transferMsg);
                    if (!rendered) backgroundReplyNoticeMsg = transferMsg;
                }

                if (pendingCallKind && hasVisibleReplyBeforeTool) {
                    restoreHeaderTitle();
                    finishRequest();
                    showIncomingCallUI(roleId, pendingCallKind === 'video_call');
                    return;
                }

                if (acceptTransfer) {
                    markLastUserTransferAccepted(roleId);
                }

                if (openRedpacket) {
                    markLastUserRedpacketOpened(roleId);
                }

                saveData();

                if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                    window.maybeAutoUpdateMemoryArchive(roleId);
                }

                if (backgroundReplyNoticeMsg && !isChatRoleViewActive(roleId)) {
                    showBackgroundAiReplyNotification(roleId, backgroundReplyNoticeMsg);
                    if (typeof window.loadWechatChatList === 'function') {
                        try { window.loadWechatChatList(true); } catch (e) { }
                    }
                }

                restoreHeaderTitle();
                finishRequest();
            },
            (errorMessage) => {
                if (!isCurrentRequest()) return;
                restoreHeaderTitle();
                finishRequest();

                alert("❌ API 调用失败\n\n" + errorMessage + "\n\n请检查：\n• API 地址是否正确\n• API 密钥是否有效\n• 网络连接是否正常");

                console.error("❌ API 调用失败:", errorMessage);
            },
            {
                softTimeoutNoAbort: true,
                onSlow: function () {
                    setTrackedChatResponseHeaderText(headerTitle, roleId, requestId, '对方正在输入（网络较慢）...');
                },
                shouldDeliver: function () {
                    return isCurrentRequest();
                }
            }
        );
    } else {
        restoreHeaderTitle();
        finishRequest();
        alert("❌ API 模块未加载\n\n请刷新页面后重试");
    }
}

function markLastUserTransferAccepted(roleId) {
    const historyBox = isChatRoleViewActive(roleId) ? document.getElementById('chat-history') : null;
    const list = window.chatData[roleId] || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.role === 'me' && m.type === 'transfer' && m.status !== 'accepted') {
            m.status = 'accepted';
            
            const ts = m.timestamp;
            if (historyBox && ts) {
                const selector = '.msg-row[data-role="me"][data-type="transfer"][data-timestamp="' + ts + '"] .transfer-bubble';
                const bubble = historyBox.querySelector(selector);
                if (bubble) {
                    bubble.classList.add('transfer-bubble-accepted');
                    const footer = bubble.querySelector('.transfer-footer');
                    if (footer) {
                        footer.innerText = '对方已收钱';
                    }
                }
            }
            saveData();
            break;
        }
    }
}

function markLastUserRedpacketOpened(roleId) {
    const historyBox = isChatRoleViewActive(roleId) ? document.getElementById('chat-history') : null;
    const list = window.chatData[roleId] || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.role === 'me' && m.type === 'redpacket' && m.status !== 'opened') {
            m.status = 'opened';
            
            const ts = m.timestamp;
            if (historyBox && ts) {
                const selector = '.msg-row[data-role="me"][data-type="redpacket"][data-timestamp="' + ts + '"] .redpacket-bubble';
                const bubble = historyBox.querySelector(selector);
                if (bubble) {
                    bubble.setAttribute('data-status', 'opened');
                    const statusEl = bubble.querySelector('.redpacket-status-text');
                    if (statusEl) {
                        statusEl.innerText = '红包已领取';
                    }
                }
            }
            saveData();
            break;
        }
    }
}

async function sendAITransferSystemNotice(roleId, status) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let text = '';
    if (status === 'accepted') {
        text = '(系统提示：用户收下了你的转账)';
    } else if (status === 'returned') {
        text = '(系统提示：用户退回了你的转账)';
    } else {
        return;
    }

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, text, roleId, headerTitle, oldTitle);
}

async function sendAIRedpacketSystemNotice(roleId, status, amount) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let text = '';
    if (status === 'accepted') {
        const safeAmount = amount ? String(amount) : '';
        text = safeAmount
            ? `(系统提示：用户领取了你的红包，金额 ${safeAmount} 元)`
            : '(系统提示：用户领取了你的红包)';
    } else if (status === 'declined') {
        text = '(系统提示：用户没有领取红包，将红包退回)';
    } else {
        return;
    }

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, text, roleId, headerTitle, oldTitle);
}

async function handleImageForAI(base64, roleId) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.filter(msg => msg && msg.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let caption = "";
    const input = document.getElementById('msg-input');
    if (input && input.value) {
        caption = input.value.trim();
    }

    const userPayload = {
        type: 'image',
        base64: base64,
        text: caption
    };

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userPayload, roleId, headerTitle, oldTitle);
}

async function handleImagesForAI(images, roleId, captionOverride) {
    if (!roleId) return;
    const list = Array.isArray(images) ? images.filter(u => typeof u === 'string' && u) : [];
    if (!list.length) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.filter(msg => msg && msg.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let caption = typeof captionOverride === 'string' ? captionOverride : "";
    if (!caption) {
        const input = document.getElementById('msg-input');
        if (input && input.value) {
            caption = String(input.value).trim();
        }
    }

    const userPayload = {
        type: 'images',
        images: list,
        text: caption
    };

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userPayload, roleId, headerTitle, oldTitle);
}

function compressImageFileToDataUrl(file, maxSize) {
    return new Promise(function (resolve) {
        if (!file) return resolve('');
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = maxSize || 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                let out = '';
                try {
                    out = canvas.toDataURL('image/jpeg', 0.6);
                } catch (e2) {
                    out = '';
                }
                resolve(out);
            };
            img.onerror = function () { resolve(''); };
            img.src = e.target && e.target.result ? e.target.result : '';
        };
        reader.onerror = function () { resolve(''); };
        try {
            reader.readAsDataURL(file);
        } catch (e) {
            resolve('');
        }
    });
}

// =========================================================
// 🔄 替换结束
// =========================================================

// =========================================================
// 渲染消息到屏幕 (修复版：精确识别系统提示 + 表情包)
// =========================================================
function appendMessageToDOM(msg) {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return;

    if (msg && msg.hidden) {
        return;
    }

    if (msg && msg.type === 'call_memory') {
        return;
    }

    if (msg && msg.type === 'location_share') {
        return;
    }

    const msgId = ensureChatMessageId(msg);

    if (
        msg &&
        (msg.type === 'system' || msg.type === 'system_event' || msg.role === 'system') &&
        typeof msg.content === 'string' &&
        msg.content.indexOf('[系统]') === 0 &&
        (msg.content.indexOf('一起听') !== -1 || msg.content.indexOf('歌曲切换为') !== -1)
    ) {
        return;
    }

    if (msg && msg.type === 'system_event') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msgId) {
            sysRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${text}</span>`;
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }
    if (msg && msg.type === 'offline_action') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const actionRow = document.createElement('div');
        actionRow.className = 'sys-msg-row offline-action-row';
        if (msgId) {
            actionRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.role) {
            actionRow.setAttribute('data-role', String(msg.role));
        }
        actionRow.setAttribute('data-type', 'offline_action');
        if (msg.timestamp) {
            actionRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        actionRow.innerHTML = `<span class="sys-msg-text">（${text}）</span>`;
        historyBox.appendChild(actionRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }
    if (msg && msg.type === 'system') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msgId) {
            sysRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${text}</span>`;
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }

    const content = msg && msg.content !== undefined ? msg.content : "";
    let displayContent = content;
    let shouldTriggerLocationShare = false;
    let locationTriggerBlockedBySettings = false;
    if (msg && msg.role === 'me' && (msg.type === undefined || msg.type === 'text')) {
        displayContent = stripLocationSharePrefix(content);
    }

    if (msg && msg.role === 'ai' && typeof content === 'string') {
        if (content.indexOf(':::ACTION_TRIGGER_LOCATION:::') !== -1) {
            const settings = typeof window.getCurrentChatSettings === 'function'
                ? window.getCurrentChatSettings(window.currentChatRole || '')
                : {};
            const allowOfflineInvite = !settings || settings.allowOfflineInvite !== false;
            shouldTriggerLocationShare = allowOfflineInvite;
            locationTriggerBlockedBySettings = !allowOfflineInvite;
            const stripped = content.replace(/:::ACTION_TRIGGER_LOCATION:::/g, '').trim();
            msg.content = stripped;
            displayContent = stripped;
        }
    }

    // === 🔥 核心改进：精确识别系统消息 ===
    const isSysMsg = detectSystemMessage(msg, content);

    if (isSysMsg && msg.role === 'ai') {
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${content}</span>`;
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }

    // --- 1. 时间显示逻辑 ---
    const msgTime = msg.timestamp || 0;
    if (msgTime > 0) {
        if (window.lastRenderedTime === 0 || (msgTime - window.lastRenderedTime > 300000)) {
            const timeLabel = typeof createChatTimeDividerElement === 'function'
                ? createChatTimeDividerElement(msgTime)
                : document.createElement('div');
            if (!timeLabel.className) timeLabel.className = 'chat-time-label';
            if (!timeLabel.textContent) timeLabel.innerText = formatChatDividerTime(msgTime);
            historyBox.appendChild(timeLabel);
            window.lastRenderedTime = msgTime;
        } else {
            window.lastRenderedTime = msgTime;
        }
    }

    // --- 2. 准备基础数据 ---
    const roleId = window.currentChatRole;
    const isMe = (msg.role === 'me');
    let avatarUrl = "";

    resolveQuoteBlockForMessage(roleId, msg);

    if (isMe) {
        const myPersona = window.userPersonas[roleId] || {};
        avatarUrl = myPersona.avatar || "assets/chushitouxiang.jpg";
    } else {
        const profile = window.charProfiles[roleId] || {};
        avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    }

    let smallTimeStr = msgTime > 0 ? formatChatTime(msgTime) : "";

    // --- 3. 🔥 构建气泡内容 (支持引用块) ---
    let bubbleHtml = "";

    if (msg.type === 'listen_invite') {
        const inviteId = String(msg.inviteId || '');
        const p = getCurrentUserProfile();
        const userName = msg.userName ? String(msg.userName) : String(p.name || '我');
        const userAvatar = msg.userAvatar ? String(msg.userAvatar) : String(p.avatar || 'assets/chushitouxiang.jpg');
        const status = String(msg.inviteStatus || 'pending');
        const isPending = status === 'pending';
        const isCancelled = status === 'cancelled';
        const isDeclined = status === 'declined';
        const isAccepted = status === 'accepted';
        const stateText = isCancelled ? '已取消' : (isDeclined ? '已拒绝' : (isAccepted ? '已接受' : '等待对方回应...'));
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-sent${(isCancelled || isDeclined) ? ' is-disabled' : ''}${isCancelled ? ' is-cancelled' : ''}${isAccepted ? ' is-accepted' : ''}" data-invite-id="${inviteId}">
                    <div class="listen-invite-body">
                        <div class="listen-invite-avatars">
                            <div class="listen-invite-avatar">
                                <img src="${userAvatar}" alt="" />
                            </div>
                            <div class="listen-invite-line" aria-hidden="true">
                                <svg viewBox="0 0 160 40" preserveAspectRatio="none">
                                    <polyline
                                        points="0,20 46,20 58,12 72,30 86,14 100,20 160,20"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <i class="bx bxs-heart" aria-hidden="true"></i>
                            </div>
                            <div class="listen-invite-avatar"></div>
                        </div>
                        <div class="listen-invite-title">${userName}</div>
                        <div class="listen-invite-subtext">邀请你一起听</div>
                        <div class="listen-invite-state">${stateText}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'listen_invite_accepted') {
        const p = getCurrentUserProfile();
        const userAvatar = msg.userAvatar ? String(msg.userAvatar) : String(p.avatar || 'assets/chushitouxiang.jpg');
        const characterName = msg.characterName ? String(msg.characterName) : '对方';
        const characterAvatar = msg.characterAvatar ? String(msg.characterAvatar) : avatarUrl;
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-accepted">
                    <div class="listen-invite-body">
                        <div class="listen-invite-avatars">
                            <div class="listen-invite-avatar">
                                <img src="${userAvatar}" alt="" />
                            </div>
                            <div class="listen-invite-line" aria-hidden="true">
                                <svg viewBox="0 0 160 40" preserveAspectRatio="none">
                                    <polyline
                                        points="0,20 46,20 58,12 72,30 86,14 100,20 160,20"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <i class="bx bxs-heart" aria-hidden="true"></i>
                            </div>
                            <div class="listen-invite-avatar">
                                <img src="${characterAvatar}" alt="" />
                            </div>
                        </div>
                        <div class="listen-invite-subtext">${characterName} 已加入一起听</div>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'listen_invite_declined') {
        const characterName = msg.characterName ? String(msg.characterName) : '对方';
        const extra = msg.extraText ? String(msg.extraText) : '';
        const extraHtml = extra ? `<div class="listen-invite-state">${extra}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-accepted is-disabled">
                    <div class="listen-invite-body">
                        <div class="listen-invite-subtext">${characterName} 拒绝了一起听</div>
                        ${extraHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'couple_invite') {
        bubbleHtml = `
            <div class="msg-bubble couple-invite-bubble custom-bubble-content">
                <div class="couple-invite-card">
                    <div class="couple-invite-text">想和你建立情侣关系</div>
                    <div class="couple-invite-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 21s-7-4.6-9.4-9C.7 8.3 2.4 5.5 5.4 5.1c1.7-.2 3.4.6 4.3 2 1-1.4 2.6-2.2 4.3-2 3 .4 4.7 3.2 2.8 6.9C19 16.4 12 21 12 21z" fill="#ec4899"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'couple_unlink') {
        bubbleHtml = `
            <div class="msg-bubble couple-invite-bubble custom-bubble-content">
                <div class="couple-invite-card">
                    <div class="couple-invite-text">已解除情侣关系</div>
                    <div class="couple-invite-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 21s-7-4.6-9.4-9C.7 8.3 2.4 5.5 5.4 5.1c1.7-.2 3.4.6 4.3 2 1-1.4 2.6-2.2 4.3-2 3 .4 4.7 3.2 2.8 6.9C19 16.4 12 21 12 21z" fill="#ec4899"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'history') {
        // 聊天记录类型
        const lines = msg.preview || ["聊天记录详情..."];
        let linesHTML = lines.map(line => `<div class="history-row">${line}</div>`).join('');
        bubbleHtml = `
            <div class="history-bubble-container" onclick="alert('查看详情功能暂未开发')">
                <div class="history-title">聊天记录</div>
                <div class="history-divider"></div>
                <div class="history-content">${linesHTML}</div>
            </div>`;
    } else if (msg.type === 'image' || msg.type === 'sticker') {
        const rawImgSrc = msg.type === 'sticker'
            ? String(msg.stickerUrl || content || '').trim()
            : String(content || '').trim();
        const imgSrc = typeof normalizeImageUrlCandidate === 'function'
            ? normalizeImageUrlCandidate(rawImgSrc)
            : rawImgSrc;
        const extraClass = msg.type === 'sticker' ? ' custom-sticker' : '';
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image custom-bubble-content custom-image-message${extraClass}">
                <img src="${imgSrc}">
            </div>
        `;
    } else if (msg.type === 'transfer') {
        const amount = msg.amount || "";
        const note = msg.note || "";
        const noteHtml = note ? `<div class="transfer-note">${note}</div>` : '';
        const status = msg.status || 'sent';
        let extraClass = '';
        if (status === 'accepted' || status === 'returned') {
            extraClass = ' transfer-bubble-accepted';
        }
        let footerText = '待领取';
        if (msg.role === 'me') {
            if (status === 'accepted') {
                footerText = '对方已收钱 ✓';
            }
        } else {
            if (status === 'accepted') {
                footerText = '已收钱';
            } else if (status === 'returned') {
                footerText = '已退回';
            }
        }
        bubbleHtml = `
            <div class="msg-bubble transfer-bubble custom-bubble-content custom-transfer-card${extraClass}">
                <div class="chat-transfer-card-surface">
                    <div class="transfer-main">
                        <div class="transfer-icon-circle">
                            <i class="bx bx-transfer"></i>
                        </div>
                        <div class="transfer-info">
                            <div class="transfer-amount">¥${amount}</div>
                            ${noteHtml}
                        </div>
                    </div>
                    <div class="transfer-split"></div>
                    <div class="transfer-footer">${footerText}</div>
                </div>
            </div>
        `;
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount || "";
        let note = msg.note || '';
        if (!note) {
            note = '恭喜发财，大吉大利';
        }
        const status = msg.status || 'unopened';
        const isOpened = status === 'opened';
        const amountHtml = isOpened && amount ? `<div class="redpacket-amount">¥${amount}</div>` : '';
        const statusText = isOpened ? '红包已领取' : '领取红包';
        bubbleHtml = `
            <div class="msg-bubble redpacket-bubble custom-bubble-content" data-status="${status}">
                <div class="chat-redpacket-card-surface">
                    <div class="redpacket-main">
                        <div class="redpacket-icon"></div>
                        <div class="redpacket-info">
                            <div class="redpacket-note">${note}</div>
                            <div class="redpacket-status-text">${statusText}</div>
                        </div>
                        ${amountHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || "";
        const status = msg.status === 'accepted' ? 'accepted' : (msg.role === 'ai' ? 'pending' : (msg.status || 'sent'));
        const subtitle = status === 'accepted'
            ? '已领取'
            : (msg.role === 'ai' ? `额度 ¥${amount}，立即领取` : `额度 ¥${amount}`);
        bubbleHtml = `
            <div class="msg-bubble family-card-bubble custom-bubble-content" data-status="${status}">
                <div class="family-card-main">
                    <div class="family-card-icon"></div>
                    <div class="family-card-text">
                        <div class="family-card-title">送你一张亲属卡</div>
                        <div class="family-card-subtitle">${subtitle}</div>
                    </div>
                </div>
                <div class="family-card-divider"></div>
                <div class="family-card-footer">亲属卡</div>
            </div>
        `;
    } else if (msg.type === 'call_end') {
        const safeText = content.replace(/\n/g, ' ');
        bubbleHtml = `
            <div class="msg-bubble call-end-bubble custom-bubble-content">
                <div class="call-end-main">
                    <i class="bx bx-phone-call call-end-icon"></i>
                    <span class="call-end-text">${safeText}</span>
                </div>
            </div>
        `;
    } else if (msg.type === 'voice') {
        const safeVoiceText = content.replace(/\n/g, '<br>');
        const durationSec = msg.duration || calcVoiceDurationSeconds(content);
        bubbleHtml = `
            <div class="msg-bubble voice-bubble custom-bubble-content">
                <div class="voice-main">
                    <div class="voice-icon">
                        <span class="voice-wave wave1"></span>
                        <span class="voice-wave wave2"></span>
                        <span class="voice-wave wave3"></span>
                    </div>
                    <div class="voice-duration">${durationSec}"</div>
                </div>
                <div class="voice-text" style="display:none;">${safeVoiceText}</div>
            </div>
        `;
    } else if (msg.type === 'dice') {
        const point = content || "";
        let animClass = "";
        if (msgTime && (Date.now() - msgTime < 2000)) {
            animClass = ' dice-anim';
        }
        bubbleHtml = `
            <div class="msg-bubble custom-bubble-content">
                <i class="bx bx-dice-${point} dice-icon${animClass}"></i>
            </div>
        `;
    } else if (msg.type === 'takeout_card') {
        let shopName = '外卖';
        let items = [];
        let price = '';
        let remark = '';
        try {
            const obj = JSON.parse(content || '{}');
            if (obj && typeof obj === 'object') {
                shopName = String(obj.shopName || '').trim() || '外卖';
                items = Array.isArray(obj.items) ? obj.items : [];
                price = String(obj.price || '').trim();
                remark = String(obj.remark || '').trim();
            }
        } catch (e) { }
        
        let itemsHtml = items.map(item => `
            <div class="takeout-item-row">
                <span class="takeout-item-name">${item}</span>
                <span class="takeout-item-qty">1</span>
            </div>
        `).join('');

        bubbleHtml = `
            <div class="msg-bubble takeout-bubble custom-bubble-content">
                <div class="takeout-receipt-card">
                    <div class="takeout-receipt-header">
                        <div class="takeout-receipt-top">
                            <span class="takeout-order-number">${Math.floor(Math.random()*100).toString().padStart(3, '0')}</span>
                            <span class="takeout-platform">外卖订单</span>
                        </div>
                        <div class="takeout-receipt-logo">
                            <i class="bx bx-store-alt"></i>
                            <div class="takeout-shop-name">${shopName}</div>
                        </div>
                        <div class="takeout-slogan">喜悦发生于热爱生活的瞬间</div>
                    </div>
                    <div class="takeout-receipt-body">
                        <div class="takeout-items-header">
                            <span>商品名称</span>
                            <span style="text-align: right;">数量</span>
                        </div>
                        <div class="takeout-items-list">
                            ${itemsHtml}
                        </div>
                    </div>
                    <div class="takeout-receipt-divider"></div>
                    <div class="takeout-receipt-footer">
                        <div class="takeout-total-row">
                            <span>合计</span>
                            <span>${price}</span>
                        </div>
                        <div class="takeout-receipt-divider"></div>
                        <div class="takeout-pay-row">
                            <span>实付金额</span>
                            <span class="takeout-final-price">${price}</span>
                        </div>
                    </div>
                    ${remark ? `<div class="takeout-receipt-divider"></div><div class="takeout-receipt-remark">备注：${remark}</div>` : ''}
                </div>
            </div>
        `;
    } else if (msg.type === 'location') {
        let name = '';
        let address = '';
        try {
            const obj = JSON.parse(content || '{}');
            if (obj && typeof obj === 'object') {
                name = String(obj.name || '').trim();
                address = String(obj.address || '').trim();
            }
        } catch (e) { }
        const nameHtml = name ? `<div class="location-name">${name}</div>` : `<div class="location-name">位置</div>`;
        const addressHtml = address ? `<div class="location-address">${address}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble location-bubble custom-bubble-content custom-location-card">
                <div class="location-card">
                    <div class="location-map"><img src="assets/map.jpg"></div>
                    <div class="location-info">
                        ${nameHtml}
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'ai_secret_photo') {
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image ai-photo-bubble custom-bubble-content custom-image-message">
                <img src="${window.virtualPhotoImagePath}">
            </div>
        `;
    } else {
        const stickerMatch = String(content || '').match(/\[STICKER:\s*([^\s\]]+)\]/i);
        if (stickerMatch) {
            let url = stickerMatch[1].trim();
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }
            bubbleHtml = `
                <div class="msg-bubble msg-bubble-image custom-bubble-content custom-sticker">
                    <img src="${url}">
                </div>
            `;
        } else {
            const safeContent = String(displayContent || '').replace(/\n/g, '<br>');
            let quoteBlockHtml = "";
            if (msg.quote && msg.quote.text) {
                let shortQuote = msg.quote.text;
                shortQuote = String(shortQuote || '').replace(/\s+/g, ' ').trim();
                if (shortQuote.length > 80) {
                    shortQuote = shortQuote.substring(0, 80) + '...';
                }
                const quoteTargetId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
                const quoteIdAttr = quoteTargetId ? ` data-quote-id="${quoteTargetId}"` : '';
                quoteBlockHtml = `
                <div class="quote-block"${quoteIdAttr}>
                    <span class="quote-name">${msg.quote.name || 'TA'}:</span>
                    <span class="quote-preview">${shortQuote}</span>
                </div>
            `;
            }

            // 为AI文本消息添加打字效果
            if (msg.role === 'ai' && msg.type === 'text') {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text" data-text="${safeContent}"></div>
                </div>
            `;
            } else {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text">${safeContent}</div>
                </div>
            `;
            }
        }
    }

    // --- 4. 构建状态文字 ---
    let statusHtml = "";
    if (isMe) {
        if (msg.type !== 'call_end' && msg.type !== 'couple_invite' && msg.type !== 'couple_unlink') {
            let statusText = "已送达";
            if (msg.status === 'read') statusText = "已读";
            statusHtml = `<div class="msg-status-text">${statusText}</div>`;
        }
    }

    // --- 5. 组合最终 HTML ---
    const row = document.createElement('div');
    row.className = isMe ? 'msg-row msg-right custom-bubble-container is-me' : 'msg-row msg-left custom-bubble-container is-other';
    if (msg.role) {
        row.setAttribute('data-role', msg.role);
    }
    if (msg.type) {
        row.setAttribute('data-type', msg.type);
    }
    if (msg.timestamp) {
        row.setAttribute('data-timestamp', String(msg.timestamp));
    }
    if (msgId) {
        row.setAttribute('data-msg-id', msgId);
    }

    const avatarHtml = `
        <div class="msg-avatar-wrap">
            <div class="msg-avatar">
                <img src="${avatarUrl}" alt="">
            </div>
            <div class="msg-avatar-time">${smallTimeStr}</div>
        </div>
    `;

    row.innerHTML = `
        ${avatarHtml}
        <div class="msg-content-wrapper">
            ${bubbleHtml}
            ${statusHtml}
        </div>
    `;

    const bubbleEl = row.querySelector('.msg-bubble');
    if (bubbleEl && smallTimeStr && msg.type !== 'couple_invite' && msg.type !== 'couple_unlink') {
        const t = document.createElement('div');
        t.className = 'msg-bubble-time';
        t.textContent = smallTimeStr;
        bubbleEl.appendChild(t);
    }

    const quoteBlockEl = row.querySelector('.quote-block');
    if (quoteBlockEl && msg.quoteId) {
        quoteBlockEl.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            if (typeof window.scrollToChatMessageById === 'function') {
                window.scrollToChatMessageById(String(msg.quoteId));
            }
        });
    }

    if (msg.type === 'voice') {
        const voiceBubble = row.querySelector('.voice-bubble');
        if (voiceBubble) {
            const textEl = voiceBubble.querySelector('.voice-text');
            voiceBubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (!textEl) return;
                const visible = textEl.style.display === 'block';
                textEl.style.display = visible ? 'none' : 'block';
                if (visible) {
                    voiceBubble.classList.remove('voice-bubble-open');
                } else {
                    voiceBubble.classList.add('voice-bubble-open');
                }
            });
        }
    }

    if (msg.type === 'ai_secret_photo') {
        const bubble = row.querySelector('.ai-photo-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (msg && msg.content) {
                    alert(msg.content);
                }
            });
        }
    }

    if (msg.type === 'redpacket') {
        const bubble = row.querySelector('.redpacket-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (msg.role === 'me') {
                    return;
                }
                openRedpacketModal({
                    msg: msg,
                    row: row
                });
            });
        }
    }

    if (msg.type === 'transfer' && msg.role === 'ai') {
        const bubble = row.querySelector('.transfer-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                openAITransferModal({
                    msg: msg,
                    row: row
                });
            });
        }
    }

    if (msg.type === 'family_card' && msg.role === 'ai') {
        const bubble = row.querySelector('.family-card-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
                if (st !== 'pending') return;
                openFamilyCardAcceptModal({
                    msg: msg,
                    row: row,
                    roleId: window.currentChatRole
                });
            });
        }
    }

    if (msg.type === 'listen_invite') {
        const buttons = row.querySelectorAll('.listen-invite-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                const action = btn.getAttribute('data-action') || '';
                const inviteId = btn.getAttribute('data-invite-id') || '';
                handleInviteClick(action, inviteId);
            });
        });
    }

    historyBox.appendChild(row);
    historyBox.scrollTop = historyBox.scrollHeight;

    // 为AI文本消息添加打字效果（仅对新消息生效）
    if (msg.role === 'ai' && msg.type === 'text') {
        const textEl = row.querySelector('.msg-text[data-text]');
        if (textEl) {
            const fullText = textEl.getAttribute('data-text');
            
            // 检查是否是历史消息（时间戳与当前时间差较大）
            const isHistoricalMessage = msg.timestamp && (Date.now() - msg.timestamp > 5000);
            
            if (isHistoricalMessage) {
                // 历史消息：直接显示完整内容，不触发打字效果
                textEl.innerHTML = fullText;
                textEl.removeAttribute('data-text');
            } else {
                // 新消息：触发打字效果
                textEl.textContent = '';
                textEl.removeAttribute('data-text');

                // 打字效果实现
                let index = 0;
                const typeSpeed = 30; // 打字速度，单位毫秒

                function type() {
                    if (index < fullText.length) {
                        // 处理HTML标签
                        if (fullText[index] === '<' && fullText.indexOf('>', index) !== -1) {
                            const endTagIndex = fullText.indexOf('>', index);
                            textEl.insertAdjacentHTML('beforeend', fullText.substring(index, endTagIndex + 1));
                            index = endTagIndex + 1;
                        } else {
                            textEl.appendChild(document.createTextNode(fullText.charAt(index)));
                            index++;
                        }
                        historyBox.scrollTop = historyBox.scrollHeight;
                        setTimeout(type, typeSpeed);
                    }
                }

                // 开始打字动画
                setTimeout(type, 100);
            }
        }
    }

    if (shouldTriggerLocationShare) {
        try {
            const rid = window.currentChatRole;
            if (rid) {
                showIncomingLocationShareUI(rid);
            }
        } catch (e) { }
    }
    if (locationTriggerBlockedBySettings) {
        try {
            saveData();
        } catch (e) { }
    }
}

function bindMessageLongPressEdit(row, msg) {
    if (!row || !msg) return;
    const type = msg.type;
    if (type && type !== 'text') return;
    const bubble = row.querySelector('.msg-bubble');
    if (!bubble) return;
    const ts = msg.timestamp;
    if (!ts) return;
    const roleId = window.currentChatRole;
    if (!roleId) return;
    let pressTimer = null;
    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }
    function handleEdit() {
        clearPressTimer();
        const original = typeof msg.content === 'string' ? msg.content : '';
        const result = window.prompt('编辑消息', original);
        if (result === null) return;
        const newText = String(result);
        msg.content = newText;
        if (!window.chatData) window.chatData = {};
        const list = window.chatData[roleId] || [];
        for (let i = list.length - 1; i >= 0; i--) {
            const m = list[i];
            if (!m) continue;
            if (m.timestamp === ts && m.role === msg.role && (m.type || 'text') === (msg.type || 'text')) {
                m.content = newText;
                break;
            }
        }
        const textEl = row.querySelector('.msg-text');
        if (textEl) {
            textEl.innerHTML = String(newText).replace(/\n/g, '<br>');
        }
        try {
            saveData();
        } catch (e) { }
        try {
            if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                window.maybeAutoUpdateMemoryArchive(roleId);
            }
        } catch (e) { }
    }
    function startPress(e) {
        if (e && e.type === 'mousedown' && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        clearPressTimer();
        pressTimer = setTimeout(function () {
            handleEdit();
        }, 600);
    }
    function cancelPress() {
        clearPressTimer();
    }
    bubble.addEventListener('mousedown', startPress);
    bubble.addEventListener('touchstart', startPress);
    bubble.addEventListener('mouseup', cancelPress);
    bubble.addEventListener('mouseleave', cancelPress);
    bubble.addEventListener('touchend', cancelPress);
    bubble.addEventListener('touchmove', cancelPress);
    bubble.addEventListener('contextmenu', function (e) {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        handleEdit();
    });
}

let currentAITransferContext = null;
let currentRedpacketContext = null;

