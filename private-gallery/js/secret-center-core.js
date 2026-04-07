(function (global) {
    'use strict';

    const STORAGE_KEYS = {
        roleId: 'SecretCenter_CurrentRoleId',
        roleName: 'SecretCenter_CurrentRoleName',
        fallbackRoleId: 'FangCun_CurrentRoleId',
        fallbackRoleName: 'FangCun_CurrentRole',
        profiles: 'wechat_charProfiles',
        worldBooks: 'wechat_worldbooks',
        promptDebug: 'secret_center_prompt_debug_v1',
        cachePrefix: 'secret_center_v1:'
    };

    const SCENE_META = {
        fangcun: { key: 'fangcun', label: '方寸' },
        ninan: { key: 'ninan', label: '呢喃' },
        chenfeng: { key: 'chenfeng', label: '尘封' },
        shadow_wechat: { key: 'shadow_wechat', label: '微信子App' }
    };

    function safeParse(raw, fallback) {
        try {
            const parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (e) {
            return fallback;
        }
    }

    function asObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function readLocalStorage(key, fallback) {
        try {
            const value = global.localStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function writeLocalStorage(key, value) {
        try {
            global.localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function getParentWindow() {
        try {
            if (global.parent && global.parent !== global) return global.parent;
        } catch (e) { }
        return global;
    }

    function readProfiles() {
        const parentWindow = getParentWindow();
        try {
            if (parentWindow.charProfiles && typeof parentWindow.charProfiles === 'object') {
                return parentWindow.charProfiles;
            }
        } catch (e) { }
        return asObject(safeParse(readLocalStorage(STORAGE_KEYS.profiles, '{}'), {}));
    }

    function readWorldBooks() {
        const parentWindow = getParentWindow();
        try {
            if (parentWindow.worldBooks && typeof parentWindow.worldBooks === 'object') {
                return parentWindow.worldBooks;
            }
        } catch (e) { }
        return asObject(safeParse(readLocalStorage(STORAGE_KEYS.worldBooks, '{}'), {}));
    }

    function normalizeWorldBookIds(input) {
        if (input == null) return [];
        const rawList = Array.isArray(input) ? input : [input];
        const result = [];
        for (let i = 0; i < rawList.length; i++) {
            const text = asString(rawList[i]);
            if (!text) continue;
            if (result.indexOf(text) === -1) result.push(text);
        }
        return result;
    }

    function resolveRoleName(profile, fallbackId) {
        const p = asObject(profile);
        return asString(p.remark || p.nickName || p.name || fallbackId || '未知角色');
    }

    function resolvePersonaText(profile) {
        const p = asObject(profile);
        return asString(p.desc || p.persona || p.description || p.prompt || p.personality || p.character || '');
    }

    function buildWorldBookText(profile) {
        const p = asObject(profile);
        const worldbookIds = normalizeWorldBookIds(p.worldbookId || p.worldbookIds || p.worldBookIds || p.world_book_ids);
        if (!worldbookIds.length) return '';

        const parentWindow = getParentWindow();
        try {
            if (typeof parentWindow.buildWorldBookPrompt === 'function') {
                return asString(parentWindow.buildWorldBookPrompt(worldbookIds));
            }
        } catch (e) { }

        const worldBooks = readWorldBooks();
        const chunks = [];
        for (let i = 0; i < worldbookIds.length; i++) {
            const wbId = worldbookIds[i];
            if (!wbId) continue;
            const book = worldBooks[wbId];
            if (!book || typeof book !== 'object') continue;
            const title = asString(book.title || wbId);
            const content = asString(book.content || '');
            if (!content) continue;
            chunks.push('【' + title + '】\n' + content);
        }
        return chunks.join('\n\n');
    }

    function getSelectedRoleId() {
        const primary = asString(readLocalStorage(STORAGE_KEYS.roleId, ''));
        if (primary) return primary;
        return asString(readLocalStorage(STORAGE_KEYS.fallbackRoleId, ''));
    }

    function getSelectedRoleName() {
        const primary = asString(readLocalStorage(STORAGE_KEYS.roleName, ''));
        if (primary) return primary;
        return asString(readLocalStorage(STORAGE_KEYS.fallbackRoleName, ''));
    }

    function writeSelectedRole(roleId, roleName) {
        const rid = asString(roleId);
        const rname = asString(roleName);
        if (!rid) return false;
        writeLocalStorage(STORAGE_KEYS.roleId, rid);
        writeLocalStorage(STORAGE_KEYS.fallbackRoleId, rid);
        if (rname) {
            writeLocalStorage(STORAGE_KEYS.roleName, rname);
            writeLocalStorage(STORAGE_KEYS.fallbackRoleName, rname);
        }
        return true;
    }

    function resolveRoleContext(inputRoleId) {
        const rid = asString(inputRoleId || getSelectedRoleId());
        if (!rid) {
            return { ok: false, error: '请先在「叩门」页面选择角色。', roleId: '' };
        }
        const profiles = readProfiles();
        const profile = asObject(profiles[rid]);
        if (!profile || !Object.keys(profile).length) {
            return { ok: false, error: '未找到该角色资料，请重新选择角色。', roleId: rid };
        }
        const roleName = resolveRoleName(profile, rid) || getSelectedRoleName() || rid;
        const personaText = resolvePersonaText(profile);
        const worldBookText = buildWorldBookText(profile);
        const contextSummary = [
            '【角色ID】' + rid,
            '【角色名】' + roleName,
            personaText ? ('【角色人设】\n' + personaText) : '【角色人设】未填写',
            worldBookText ? ('【世界书背景】\n' + worldBookText) : '【世界书背景】未关联'
        ].join('\n\n');
        return {
            ok: true,
            roleId: rid,
            roleName: roleName,
            profile: profile,
            personaText: personaText,
            worldBookText: worldBookText,
            contextSummary: contextSummary
        };
    }

    function buildBasePrompt(context) {
        return [
            '你是「侧影」APP 的内容导演，不是即时聊天机器人。',
            '你的任务是根据角色人设与世界书背景，生成该角色的内在生活片段。',
            '输出必须是单个 JSON 对象，不要 Markdown，不要代码块，不要解释。',
            '必须与角色长期设定一致，禁止跳出人设，禁止输出系统说明。',
            context.contextSummary
        ].join('\n\n');
    }

    function buildScenePrompt(scene, context) {
        if (scene === 'fangcun') {
            return [
                '场景：方寸（角色手机）。请生成角色手机中的私密内容侧写。',
                '输出 JSON Schema：',
                '{',
                '  "phoneProfile": {"theme":"", "motto":"", "todayFocus":""},',
                '  "apps": [{"name":"", "label":"", "note":""}],',
                '  "notes": ["", "", ""],',
                '  "drafts": ["", ""],',
                '  "albumCaptions": ["", "", ""]',
                '}',
                '要求：apps 4-8 条；文字自然、克制、符合角色气质。'
            ].join('\n');
        }
        if (scene === 'ninan') {
            return [
                '场景：呢喃（角色梦境）。请生成角色在梦里对用户说的话。',
                '输出 JSON Schema：',
                '{',
                '  "dreamTitle":"",',
                '  "dreamMonologue":"",',
                '  "whispers":["", "", ""]',
                '}',
                '要求：dreamMonologue 80-220 字，语气像梦中自语，不要过度戏剧化。'
            ].join('\n');
        }
        if (scene === 'chenfeng') {
            return [
                '场景：尘封（遇见用户之前）。请生成角色在遇见用户之前的往事时间轴。',
                '输出 JSON Schema：',
                '{',
                '  "timeline":[',
                '    {"time":"", "event":"", "emotion":"", "detail":""}',
                '  ]',
                '}',
                '要求：timeline 3-6 条，时间顺序清晰，能解释角色形成现在性格的过程。'
            ].join('\n');
        }
        if (scene === 'shadow_wechat') {
            return [
                '场景：微信子App（角色私密社交视角）。',
                '必须输出一个 JSON 对象，不要额外解释。',
                '输出 JSON Schema：',
                '{',
                '  "contacts": {',
                '    "pinnedUser": {',
                '      "remark": "角色给用户的备注",',
                '      "latestMood": "一句话心境说明"',
                '    },',
                '    "generatedContacts": [',
                '      {',
                '        "name": "联系人名",',
                '        "category": "同事/同学|家人|朋友",',
                '        "remark": "角色对该联系人的备注",',
                '        "recentMessages": [',
                '          {"speaker":"我|对方", "text":"聊天内容"}',
                '        ]',
                '      }',
                '    ],',
                '    "drafts": ["没有对用户说出口的话"]',
                '  },',
                '  "subscriptions": {',
                '    "items": [{"title":"推文标题", "summary":"摘要", "source":"来源", "fullText":"推文全文"}]',
                '  },',
                '  "favorites": {',
                '    "items": [{"title":"收藏标题", "excerpt":"收藏片段", "reason":"收藏原因"}]',
                '  }',
                '}',
                '硬性约束：',
                '1) 联系人总量 4-7（含置顶用户）；非置顶联系人按给定分类生成，可缺某类。',
                '2) 非置顶每个联系人 recentMessages 必须 10 条。',
                '3) drafts 3-5 条；subscriptions 3-5 条；favorites 3-5 条。',
                '4) favorites 必须与“用户”相关，不要泛泛而谈。'
            ].join('\n');
        }
        return '场景未定义。';
    }

    function buildUserMessage(scene, context) {
        const sceneLabel = (SCENE_META[scene] && SCENE_META[scene].label) || scene;
        return '请为角色「' + context.roleName + '」生成“' + sceneLabel + '”内容，只输出 JSON。';
    }

    function buildSceneCacheKey(scene, roleId) {
        return STORAGE_KEYS.cachePrefix + String(roleId || '') + ':' + String(scene || '');
    }

    function readSceneCache(scene, roleId) {
        const key = buildSceneCacheKey(scene, roleId);
        const raw = readLocalStorage(key, '');
        const parsed = safeParse(raw, null);
        return parsed && typeof parsed === 'object' ? parsed : null;
    }

    function writeSceneCache(scene, roleId, payload) {
        const key = buildSceneCacheKey(scene, roleId);
        const body = payload && typeof payload === 'object' ? payload : {};
        return writeLocalStorage(key, JSON.stringify(body));
    }

    function clearSceneCache(scene, roleId) {
        const key = buildSceneCacheKey(scene, roleId);
        try {
            global.localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    function readPromptDebugStore() {
        return asObject(safeParse(readLocalStorage(STORAGE_KEYS.promptDebug, '{}'), {}));
    }

    function writePromptDebugRecord(scene, roleId, payload) {
        const store = readPromptDebugStore();
        const key = String(roleId || '') + '::' + String(scene || '');
        const prev = asObject(store[key]);
        const next = Object.assign({}, prev, asObject(payload), {
            scene: String(scene || ''),
            roleId: String(roleId || ''),
            updatedAt: Date.now()
        });
        store[key] = next;
        writeLocalStorage(STORAGE_KEYS.promptDebug, JSON.stringify(store));
        return next;
    }

    function getPromptDebugRecord(scene, roleId) {
        const store = readPromptDebugStore();
        const key = String(roleId || '') + '::' + String(scene || '');
        return asObject(store[key]);
    }

    function toText(value) {
        if (typeof value === 'string') return value;
        if (value == null) return '';
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }

    function callParentAI(context, systemPrompt, userMessage, requestOptions) {
        return new Promise(function (resolve, reject) {
            const parentWindow = getParentWindow();
            if (!parentWindow || typeof parentWindow.callAI !== 'function') {
                reject(new Error('主窗口 callAI 未初始化，无法生成内容。'));
                return;
            }
            const prevRoleId = asString(parentWindow.currentChatRole || '');
            try { parentWindow.currentChatRole = context.roleId; } catch (e) { }
            let settled = false;
            function finish(fn) {
                if (settled) return;
                settled = true;
                try { parentWindow.currentChatRole = prevRoleId; } catch (e) { }
                fn();
            }
            try {
                parentWindow.callAI(
                    systemPrompt,
                    [],
                    userMessage,
                    function (content) {
                        finish(function () { resolve(toText(content)); });
                    },
                    function (error) {
                        const message = asString(error) || '模型请求失败';
                        finish(function () { reject(new Error(message)); });
                    },
                    Object.assign({
                        temperature: 0.8,
                        maxTokens: 1800
                    }, asObject(requestOptions))
                );
            } catch (e) {
                finish(function () { reject(e); });
            }
        });
    }

    function stripCodeFence(text) {
        const raw = asString(text);
        if (!raw) return '';
        if (raw.indexOf('```') !== 0) return raw;
        return raw
            .replace(/^```[a-zA-Z]*\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
    }

    function parseJsonFromText(rawText) {
        const text = stripCodeFence(rawText);
        if (!text) return null;
        const direct = safeParse(text, null);
        if (direct && typeof direct === 'object') return direct;

        const firstObj = text.indexOf('{');
        const lastObj = text.lastIndexOf('}');
        if (firstObj >= 0 && lastObj > firstObj) {
            const objTry = safeParse(text.slice(firstObj, lastObj + 1), null);
            if (objTry && typeof objTry === 'object') return objTry;
        }

        const firstArr = text.indexOf('[');
        const lastArr = text.lastIndexOf(']');
        if (firstArr >= 0 && lastArr > firstArr) {
            const arrTry = safeParse(text.slice(firstArr, lastArr + 1), null);
            if (arrTry && typeof arrTry === 'object') return arrTry;
        }
        return null;
    }

    function trimList(input, fallback, maxCount) {
        const src = Array.isArray(input) ? input : [];
        const out = [];
        for (let i = 0; i < src.length && out.length < maxCount; i++) {
            const text = asString(src[i]);
            if (!text) continue;
            out.push(text);
        }
        if (out.length) return out;
        return Array.isArray(fallback) ? fallback.slice(0, maxCount) : [];
    }

    function normalizeFangCunData(payload, context) {
        const data = asObject(payload);
        const pp = asObject(data.phoneProfile || data.phone_profile || {});
        const appsRaw = Array.isArray(data.apps) ? data.apps : [];
        const apps = appsRaw.slice(0, 8).map(function (item) {
            const row = asObject(item);
            return {
                name: asString(row.name || row.app || row.title || '应用'),
                label: asString(row.label || row.tag || ''),
                note: asString(row.note || row.desc || '')
            };
        }).filter(function (item) { return !!item.name; });

        return {
            phoneProfile: {
                theme: asString(pp.theme || '简约暖色'),
                motto: asString(pp.motto || (context.roleName + '今天也在认真生活。')),
                todayFocus: asString(pp.todayFocus || '把眼前的小事做好')
            },
            apps: apps.length ? apps : [
                { name: '相册', label: '留影', note: '收藏对自己有意义的画面' },
                { name: '备忘录', label: '随手记', note: '写下不想忘的念头' },
                { name: '日历', label: '日程', note: '提醒重要时刻' },
                { name: '音乐', label: '听歌', note: '用旋律整理情绪' }
            ],
            notes: trimList(data.notes, ['今天也想把心事写清楚。', '别忘了把重要的话讲出口。', '慢一点，没关系。'], 5),
            drafts: trimList(data.drafts, ['有些话想说给你听。', '总有一天会把真心说完整。'], 4),
            albumCaptions: trimList(data.albumCaptions || data.album_captions, ['这天的风很轻。', '想把这刻存下来。', '以后回看也会笑。'], 5)
        };
    }

    function normalizeNiNanData(payload, context) {
        const data = asObject(payload);
        return {
            dreamTitle: asString(data.dreamTitle || data.title || '今夜梦境'),
            dreamMonologue: asString(data.dreamMonologue || data.monologue || (context.roleName + '在梦里轻声重复你的名字。')),
            whispers: trimList(data.whispers, ['别怕，我在。', '醒来后也想见你。', '晚安，慢慢睡。'], 5)
        };
    }

    function normalizeChenFengData(payload) {
        const data = asObject(payload);
        const rows = Array.isArray(data.timeline) ? data.timeline : [];
        const timeline = rows.slice(0, 8).map(function (item) {
            const row = asObject(item);
            return {
                time: asString(row.time || row.date || '某一年'),
                event: asString(row.event || row.title || '发生了一件事'),
                emotion: asString(row.emotion || row.mood || '复杂'),
                detail: asString(row.detail || row.note || '')
            };
        }).filter(function (item) { return !!item.time && !!item.event; });
        if (timeline.length) return { timeline: timeline };
        return {
            timeline: [
                { time: '很久以前', event: '开始独自生活', emotion: '克制', detail: '学会把情绪收好，不轻易说出口。' },
                { time: '后来', event: '经历一次离别', emotion: '沉默', detail: '把很多话留在心里，慢慢消化。' },
                { time: '再后来', event: '重新整理自己', emotion: '坚定', detail: '开始相信，认真生活会等来新的相遇。' }
            ]
        };
    }

    function readChatDataMap() {
        const parentWindow = getParentWindow();
        try {
            if (parentWindow.chatData && typeof parentWindow.chatData === 'object') {
                return parentWindow.chatData;
            }
        } catch (e) { }
        return asObject(safeParse(readLocalStorage('wechat_chatData', '{}'), {}));
    }

    function isVisibleChatRecord(record) {
        const msg = record && typeof record === 'object' ? record : null;
        if (!msg) return false;
        if (msg.hidden === true) return false;
        const role = asString(msg.role || '');
        if (role !== 'me' && role !== 'ai') return false;
        const type = asString(msg.type || '');
        if (type === 'system' || type === 'system_event') return false;
        const content = asString(msg.content || '');
        if (!content) return false;
        if (content.indexOf('[系统]') === 0 && (content.indexOf('一起听') !== -1 || content.indexOf('歌曲切换为') !== -1)) {
            return false;
        }
        return true;
    }

    function toChatPreviewText(content) {
        const text = asString(content || '');
        if (!text) return '';
        if (text.indexOf('data:image') !== -1 || text.indexOf('<img') !== -1) return '[图片]';
        if (text.indexOf('[VOICE:') !== -1 || text.indexOf('[语音]') !== -1) return '[语音]';
        if (text.indexOf('[STICKER:') !== -1) return '[表情]';
        return text;
    }

    function getRecentRealUserMessages(roleId, roleName, userName, maxCount) {
        const rid = asString(roleId);
        const map = readChatDataMap();
        const history = Array.isArray(map[rid]) ? map[rid] : [];
        const out = [];
        const limit = Math.max(1, Number(maxCount) || 10);
        for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            if (!isVisibleChatRecord(msg)) continue;
            const role = asString(msg.role || '');
            const text = toChatPreviewText(msg.content || '');
            if (!text) continue;
            out.push({
                speaker: role === 'me' ? '我' : (roleName || 'TA'),
                text: text,
                timestamp: Number(msg.timestamp) || 0
            });
            if (out.length >= limit) break;
        }
        out.reverse();
        return out;
    }

    function buildFallbackRecentMemory(roleId, roleName, maxLines) {
        const list = getRecentRealUserMessages(roleId, roleName, '我', Math.max(6, Number(maxLines) || 16));
        if (!list.length) return '';
        const lines = list.map(function (row) {
            const speaker = asString(row.speaker || '');
            const text = asString(row.text || '');
            return speaker + '：' + text;
        });
        return lines.join('\n');
    }

    function buildRealFavoriteItems(roleId, roleName, userName, maxCount) {
        const list = getRecentRealUserMessages(roleId, roleName, userName, Math.max(20, (Number(maxCount) || 5) * 4));
        if (!list.length) return [];
        const out = [];
        for (let i = list.length - 1; i >= 0; i--) {
            const row = list[i];
            const text = asString(row && row.text);
            if (!text) continue;
            const speaker = asString(row && row.speaker) || '对方';
            out.unshift({
                title: '聊天收藏',
                excerpt: speaker + '：' + text,
                reason: '来自真实聊天记录',
                source: 'real_chat',
                timestamp: Number(row && row.timestamp) || 0
            });
            if (out.length >= Math.max(1, Number(maxCount) || 5)) break;
        }
        return out;
    }

    function readBundleContext(roleId) {
        const rid = asString(roleId);
        const parentWindow = getParentWindow();
        try {
            if (typeof parentWindow.buildPromptContextBundle === 'function') {
                const bundle = parentWindow.buildPromptContextBundle(rid, { maxSummaryLines: 18 });
                return bundle && typeof bundle === 'object' ? bundle : null;
            }
        } catch (e) { }
        return null;
    }

    function buildShadowWechatContextPack(context) {
        const bundle = readBundleContext(context.roleId);
        const parentWindow = getParentWindow();
        const userPersona = bundle && bundle.userPersona && typeof bundle.userPersona === 'object'
            ? bundle.userPersona
            : {};
        const userName = asString(
            userPersona.name ||
            readLocalStorage('user_name', '') ||
            (parentWindow.momentsData && parentWindow.momentsData.userName) ||
            '你'
        ) || '你';
        const userInfoLines = [];
        if (userName) userInfoLines.push('用户称呼：' + userName);
        if (asString(userPersona.gender)) userInfoLines.push('用户性别：' + asString(userPersona.gender));
        if (asString(userPersona.birthday)) userInfoLines.push('用户生日：' + asString(userPersona.birthday) + (userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）'));
        if (asString(userPersona.setting)) userInfoLines.push('用户设定：' + asString(userPersona.setting));
        const userInfoText = userInfoLines.join('\n');

        const memoryParts = [];
        if (bundle) {
            if (asString(bundle.memoryArchivePrompt)) memoryParts.push('【记忆档案】\n' + asString(bundle.memoryArchivePrompt));
            if (asString(bundle.continuityPrompt)) memoryParts.push('【连续性】\n' + asString(bundle.continuityPrompt));
            if (asString(bundle.recentChatSummary)) memoryParts.push('【近期聊天摘要】\n' + asString(bundle.recentChatSummary));
        }
        if (!memoryParts.length) {
            const fallback = buildFallbackRecentMemory(context.roleId, context.roleName, 18);
            if (fallback) memoryParts.push('【近期可见聊天】\n' + fallback);
        }
        const memoryText = memoryParts.join('\n\n');
        return {
            bundle: bundle,
            userName: userName,
            userInfoText: userInfoText,
            memoryText: memoryText
        };
    }

    function ensureMessagesForGeneratedContact(messages, contactName) {
        const src = Array.isArray(messages) ? messages : [];
        const out = [];
        for (let i = 0; i < src.length && out.length < 10; i++) {
            const row = src[i];
            if (typeof row === 'string') {
                const text = asString(row);
                if (!text) continue;
                out.push({ speaker: '对方', text: text, timestamp: 0 });
                continue;
            }
            const obj = asObject(row);
            const speaker = asString(obj.speaker || obj.role || '对方') || '对方';
            const text = asString(obj.text || obj.message || obj.content || '');
            if (!text) continue;
            out.push({ speaker: speaker, text: text, timestamp: Number(obj.timestamp) || 0 });
        }
        while (out.length < 10) {
            const idx = out.length + 1;
            out.push({
                speaker: idx % 2 === 0 ? '我' : '对方',
                text: idx % 2 === 0
                    ? '这句话我先记在心里。'
                    : ((contactName || 'Ta') + '：最近有点忙，改天再细聊。'),
                timestamp: 0
            });
        }
        return out.slice(0, 10);
    }

    function normalizeShadowWechatData(payload, context, options) {
        const data = asObject(payload);
        const opts = asObject(options);
        const roleName = asString(context.roleName || 'TA');
        const userName = asString(opts.userName || '你') || '你';
        const realUserMessages = Array.isArray(opts.realUserMessages) ? opts.realUserMessages : [];
        const realFavoriteItems = Array.isArray(opts.realFavoriteItems) ? opts.realFavoriteItems : [];

        const contactsData = asObject(data.contacts || {});
        const pinnedData = asObject(contactsData.pinnedUser || {});
        const pinnedRemark = asString(pinnedData.remark || pinnedData.note || ('给' + userName + '的置顶'));
        const pinnedUser = {
            contactId: 'user',
            name: userName,
            remark: pinnedRemark,
            latestMood: asString(pinnedData.latestMood || pinnedData.mood || ''),
            recentMessages: realUserMessages.slice(-10)
        };

        const generatedRaw = Array.isArray(contactsData.generatedContacts)
            ? contactsData.generatedContacts
            : (Array.isArray(data.generatedContacts) ? data.generatedContacts : []);
        const generatedContacts = generatedRaw.slice(0, 6).map(function (item, index) {
            const row = asObject(item);
            const name = asString(row.name || row.contactName || ('联系人' + String(index + 1))) || ('联系人' + String(index + 1));
            const category = asString(row.category || row.group || '朋友') || '朋友';
            const remark = asString(row.remark || row.note || '');
            const recentMessages = ensureMessagesForGeneratedContact(row.recentMessages || row.messages, name);
            return {
                contactId: 'c_' + String(index + 1),
                name: name,
                category: category,
                remark: remark || (roleName + '给' + name + '的备注'),
                recentMessages: recentMessages
            };
        });

        while (generatedContacts.length < 3) {
            const idx = generatedContacts.length + 1;
            const name = idx === 1 ? '林同学' : (idx === 2 ? '陈姐' : ('好友' + idx));
            generatedContacts.push({
                contactId: 'c_fallback_' + idx,
                name: name,
                category: idx % 3 === 0 ? '家人' : (idx % 2 === 0 ? '同事/同学' : '朋友'),
                remark: roleName + '给' + name + '的备注',
                recentMessages: ensureMessagesForGeneratedContact([], name)
            });
        }

        const drafts = trimList(contactsData.drafts || data.drafts, [
            '有些话到了嘴边，最后还是删掉了。',
            '今天其实很想你，但我还是先沉默。',
            '等时机更好一点，我再认真说给你听。'
        ], 5).slice(0, 5);
        while (drafts.length < 3) drafts.push('这句话先留在草稿箱里。');

        const subsData = asObject(data.subscriptions || {});
        const subscriptionsRaw = Array.isArray(subsData.items) ? subsData.items : (Array.isArray(data.subscriptions) ? data.subscriptions : []);
        const subscriptions = subscriptionsRaw.slice(0, 5).map(function (item, idx) {
            if (typeof item === 'string') {
                const titleText = asString(item);
                return {
                    title: titleText,
                    summary: '',
                    source: '订阅号',
                    fullText: titleText
                };
            }
            const row = asObject(item);
            return {
                title: asString(row.title || ('推文' + String(idx + 1))),
                summary: asString(row.summary || row.desc || ''),
                source: asString(row.source || row.account || '订阅号'),
                fullText: asString(row.fullText || row.content || row.article || row.summary || row.desc || '')
            };
        }).filter(function (item) { return !!item.title; });
        while (subscriptions.length < 3) {
            subscriptions.push({
                title: '今天值得读的一篇',
                summary: '记录情绪、关系与生活细节的内容。',
                source: '订阅号',
                fullText: '这是一篇围绕日常关系、情绪整理和长期陪伴展开的推文。它从一个小场景切入，逐步展开“如何在亲密关系中保持表达和倾听”的思考，最后给出可执行的小建议。'
            });
        }

        const favorites = realFavoriteItems.slice(0, 5).map(function (item, idx) {
            const row = asObject(item);
            return {
                title: asString(row.title || ('聊天收藏 ' + String(idx + 1))) || ('聊天收藏 ' + String(idx + 1)),
                excerpt: asString(row.excerpt || row.content || ''),
                reason: asString(row.reason || '来自真实聊天记录'),
                source: 'real_chat',
                timestamp: Number(row.timestamp) || 0
            };
        }).filter(function (item) { return !!item.excerpt; });

        return {
            contacts: {
                pinnedUser: pinnedUser,
                generatedContacts: generatedContacts.slice(0, 6),
                drafts: drafts.slice(0, 5)
            },
            subscriptions: {
                items: subscriptions.slice(0, 5)
            },
            favorites: {
                items: favorites.slice(0, 5)
            },
            meta: {
                roleId: asString(context.roleId || ''),
                roleName: roleName,
                generatedAt: Date.now()
            }
        };
    }

    function normalizeSceneData(scene, payload, context) {
        if (scene === 'fangcun') return normalizeFangCunData(payload, context);
        if (scene === 'ninan') return normalizeNiNanData(payload, context);
        if (scene === 'chenfeng') return normalizeChenFengData(payload, context);
        if (scene === 'shadow_wechat') return normalizeShadowWechatData(payload, context, {});
        return asObject(payload);
    }

    async function generateSceneContent(scene, options) {
        const opts = asObject(options);
        const sceneKey = asString(scene);
        if (!SCENE_META[sceneKey]) {
            return { ok: false, error: '未知场景：' + sceneKey };
        }

        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            if (cached && typeof cached === 'object' && cached.data) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const finalSystemPrompt = basePrompt + '\n\n' + scenePrompt;
        const userMessage = buildUserMessage(sceneKey, context);

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, opts.requestOptions);
            const parsed = parseJsonFromText(rawResponse);
            const data = normalizeSceneData(sceneKey, parsed || {}, context);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: data,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            });
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: data,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    async function generateShadowWechatContent(options) {
        const opts = asObject(options);
        const sceneKey = 'shadow_wechat';
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            if (cached && cached.data) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const pack = buildShadowWechatContextPack(context);
        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const extraBlocks = [];
        if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
        if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
        const finalSystemPrompt = [basePrompt, scenePrompt].concat(extraBlocks).join('\n\n');
        const userMessage = '请生成该角色的微信子App数据（联系人、订阅号、收藏夹），只输出 JSON 对象。';
        const realUserMessages = getRecentRealUserMessages(context.roleId, context.roleName, pack.userName, 10);
        const realFavoriteItems = buildRealFavoriteItems(context.roleId, context.roleName, pack.userName, 5);

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, Object.assign({
                temperature: 0.85,
                maxTokens: 2600
            }, asObject(opts.requestOptions)));
            const parsed = parseJsonFromText(rawResponse);
            const normalized = normalizeShadowWechatData(parsed || {}, context, {
                userName: pack.userName,
                realUserMessages: realUserMessages,
                realFavoriteItems: realFavoriteItems
            });
            const promptDebug = {
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            };
            const finalData = Object.assign({}, normalized, { promptDebug: promptDebug });
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: finalData,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, Object.assign({}, promptDebug, {
                roleName: context.roleName
            }));
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: finalData,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    function navigateToRolePicker() {
        try {
            const parentWindow = getParentWindow();
            parentWindow.postMessage({ type: 'SECRET_CENTER_NAVIGATE', target: 'role_picker', at: Date.now() }, '*');
            return true;
        } catch (e) {
            return false;
        }
    }

    global.SecretCenterCore = {
        scenes: SCENE_META,
        getSelectedRoleId: getSelectedRoleId,
        getSelectedRoleName: getSelectedRoleName,
        writeSelectedRole: writeSelectedRole,
        resolveRoleContext: resolveRoleContext,
        buildSceneCacheKey: buildSceneCacheKey,
        readSceneCache: readSceneCache,
        writeSceneCache: writeSceneCache,
        clearSceneCache: clearSceneCache,
        readPromptDebugStore: readPromptDebugStore,
        getPromptDebugRecord: getPromptDebugRecord,
        generateSceneContent: generateSceneContent,
        generateShadowWechatContent: generateShadowWechatContent,
        navigateToRolePicker: navigateToRolePicker
    };
})(window);
