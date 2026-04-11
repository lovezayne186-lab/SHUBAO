(function (global) {
    'use strict';

    const ROOT_ID = 'redbook-forum-root';
    const STYLE_ID = 'redbook-forum-style';
    const CACHE_KEY = 'redbook_forum_posts_v1';
    const SETTINGS_KEY = 'redbook_forum_settings_v1';
    const COMMUNITY_WORLDBOOK_NAME = '小红书设定';
    const DEFAULT_COUNT = 12;
    const MIN_COUNT = 4;
    const MAX_COUNT = 20;
    const MAX_RECENT_MESSAGES = 12;
    const DEFAULT_AVATAR = 'image/default-avatar.svg';
    const COVER_COLOR_POOL = [
        { bg: '#E8E4FD', fg: '#5B4E7A' },
        { bg: '#6B6B6B', fg: '#FFFFFF' },
        { bg: '#FFEFEF', fg: '#D86B6B' },
        { bg: '#E6F4EA', fg: '#538A63' },
        { bg: '#FFF4E5', fg: '#A67B40' },
        { bg: '#E5F0FF', fg: '#4A70A6' }
    ];

    const state = {
        root: null,
        posts: [],
        generatedAt: 0,
        activePostId: '',
        drawerOpen: false,
        generating: false,
        settings: {
            selectedRoleIds: [],
            exactCount: DEFAULT_COUNT
        }
    };

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function asObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function safeParse(raw, fallback) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function escapeHtml(text) {
        return asString(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clampCount(value) {
        const num = parseInt(value, 10);
        if (!Number.isFinite(num)) return DEFAULT_COUNT;
        return Math.max(MIN_COUNT, Math.min(MAX_COUNT, num));
    }

    function toArrayFromMaybeObject(value) {
        if (Array.isArray(value)) return value;
        const obj = asObject(value);
        return Object.keys(obj).map(function (key) { return obj[key]; });
    }

    function loadSettings() {
        const saved = safeParse(localStorage.getItem(SETTINGS_KEY) || '{}', {});
        state.settings = {
            selectedRoleIds: asArray(saved.selectedRoleIds).map(asString).filter(Boolean),
            exactCount: clampCount(saved.exactCount)
        };
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                selectedRoleIds: asArray(state.settings.selectedRoleIds).map(asString).filter(Boolean),
                exactCount: clampCount(state.settings.exactCount)
            }));
        } catch (e) { }
    }

    function loadCache() {
        const saved = safeParse(localStorage.getItem(CACHE_KEY) || '{}', {});
        state.posts = asArray(saved.posts).map(normalizePost).filter(Boolean);
        state.generatedAt = Number(saved.generatedAt) || 0;
        if (!state.settings.selectedRoleIds.length) {
            state.settings.selectedRoleIds = asArray(saved.selectedRoleIds).map(asString).filter(Boolean);
        }
        if (!state.settings.exactCount && saved.exactCount) {
            state.settings.exactCount = clampCount(saved.exactCount);
        }
    }

    function saveCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                posts: state.posts,
                generatedAt: state.generatedAt,
                selectedRoleIds: asArray(state.settings.selectedRoleIds).map(asString).filter(Boolean),
                exactCount: clampCount(state.settings.exactCount)
            }));
        } catch (e) { }
    }

    function readProfiles() {
        if (global.charProfiles && typeof global.charProfiles === 'object') return global.charProfiles;
        return safeParse(localStorage.getItem('wechat_charProfiles') || '{}', {});
    }

    function readChatData() {
        if (global.chatData && typeof global.chatData === 'object') return global.chatData;
        return safeParse(localStorage.getItem('wechat_chatData') || '{}', {});
    }

    function readWorldBooks() {
        if (Array.isArray(global.worldBooks)) return global.worldBooks;
        const saved = safeParse(localStorage.getItem('wechat_worldbooks') || '[]', []);
        if (Array.isArray(saved)) return saved;
        const obj = asObject(saved);
        return Object.keys(obj).map(function (key) { return obj[key]; });
    }

    function getRoleDisplayName(profile, roleId) {
        const item = asObject(profile);
        return asString(item.remark || item.nickname || item.nickName || item.name || roleId || '未命名角色');
    }

    function getRoleAvatar(profile) {
        const item = asObject(profile);
        return asString(item.avatar || item.avatarUrl || item.img || item.image || DEFAULT_AVATAR) || DEFAULT_AVATAR;
    }

    function getAvailableCharacters() {
        const profiles = asObject(readProfiles());
        return Object.keys(profiles).map(function (roleId) {
            return { roleId: roleId, profile: asObject(profiles[roleId]) };
        }).filter(function (item) {
            const profile = item.profile;
            const category = asString(profile.chatType || profile.type || profile.category).toLowerCase();
            return item.roleId && category !== 'group';
        }).map(function (item) {
            return {
                roleId: item.roleId,
                name: getRoleDisplayName(item.profile, item.roleId),
                avatar: getRoleAvatar(item.profile),
                profile: item.profile
            };
        }).sort(function (a, b) {
            return a.name.localeCompare(b.name, 'zh-CN');
        });
    }

    function getPersonaText(profile) {
        const item = asObject(profile);
        const pieces = [
            asString(item.desc),
            asString(item.persona),
            asString(item.aiPersona),
            asString(item.style),
            asString(item.background),
            asString(item.prompt)
        ].filter(Boolean);
        return pieces.join('\n');
    }

    function getLongTermMemoryText(profile) {
        const item = asObject(profile);
        const memory = item.longTermMemory || item.memory || item.memories || [];
        if (typeof memory === 'string') return memory.trim();
        return asArray(memory).map(function (entry) {
            if (typeof entry === 'string') return entry.trim();
            const row = asObject(entry);
            return asString(row.content || row.text || row.summary || row.memory);
        }).filter(Boolean).join('\n');
    }

    function normalizeWorldBookIds(profile) {
        const item = asObject(profile);
        const raw = item.worldBookIds || item.worldbookIds || item.worldBookId || item.worldbookId || [];
        if (Array.isArray(raw)) return raw.map(asString).filter(Boolean);
        if (typeof raw === 'string') {
            return raw.split(/[,\n]/).map(asString).filter(Boolean);
        }
        return [];
    }

    function getBookEntries(book) {
        const item = asObject(book);
        if (typeof item.content === 'string' && item.content.trim()) return [item.content.trim()];
        const candidates = [
            item.entries,
            item.items,
            item.records,
            item.content,
            item.data
        ];
        for (let i = 0; i < candidates.length; i += 1) {
            const current = candidates[i];
            if (Array.isArray(current)) return current;
        }
        return [];
    }

    function formatWorldBookEntry(entry) {
        if (typeof entry === 'string') return entry.trim();
        const row = asObject(entry);
        return [
            asString(row.title || row.name || row.key),
            asString(row.content || row.text || row.value || row.description)
        ].filter(Boolean).join('：');
    }

    function collectWorldBookTextForRole(profile) {
        const ids = normalizeWorldBookIds(profile);
        if (!ids.length) return '';
        const books = readWorldBooks();
        const matched = books.filter(function (book) {
            const item = asObject(book);
            const id = asString(item.id || item.bookId || item.uuid);
            const name = asString(item.name || item.title);
            return ids.indexOf(id) !== -1 || ids.indexOf(name) !== -1;
        });
        return matched.map(function (book) {
            const item = asObject(book);
            const title = asString(item.name || item.title || '世界书');
            const lines = getBookEntries(item).map(formatWorldBookEntry).filter(Boolean).slice(0, 24);
            return '《' + title + '》\n' + lines.join('\n');
        }).filter(Boolean).join('\n\n');
    }

    function readCommunityWorldbookContext() {
        const books = readWorldBooks();
        const target = books.find(function (book) {
            const item = asObject(book);
            return asString(item.name || item.title) === COMMUNITY_WORLDBOOK_NAME;
        });
        if (!target) return '';
        return getBookEntries(target).map(formatWorldBookEntry).filter(Boolean).join('\n');
    }

    function getRecentHistoryText(roleId) {
        const chatData = asObject(readChatData());
        const source = asArray(chatData[roleId]).slice(-MAX_RECENT_MESSAGES);
        return source.map(function (item) {
            const row = asObject(item);
            const sender = row.isUser ? '用户' : '角色';
            const content = asString(row.text || row.content || row.message || row.summary);
            return content ? (sender + '：' + content) : '';
        }).filter(Boolean).join('\n');
    }

    function formatDateTime(timestamp) {
        const ts = Number(timestamp);
        if (!Number.isFinite(ts) || ts <= 0) return '';
        const date = new Date(ts);
        const pad = function (num) { return String(num).padStart(2, '0'); };
        return date.getFullYear() + '/' + pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function formatGeneratedMeta() {
        const roleMap = {};
        getAvailableCharacters().forEach(function (item) {
            roleMap[item.roleId] = item.name;
        });
        const roleNames = asArray(state.settings.selectedRoleIds).map(function (id) {
            return roleMap[id] || id;
        }).filter(Boolean);
        const parts = [];
        if (state.generatedAt) parts.push('更新于 ' + formatDateTime(state.generatedAt));
        if (roleNames.length) parts.push('参与角色：' + roleNames.join('、'));
        if (state.posts.length) parts.push('共 ' + state.posts.length + ' 篇');
        return parts.join(' · ');
    }

    function getAvatarForPost(post) {
        const targetName = asString(post.authorOriginalName || post.authorName);
        if (!targetName) return DEFAULT_AVATAR;
        const matched = getAvailableCharacters().find(function (item) {
            return item.roleId === targetName || item.name === targetName;
        });
        return matched ? matched.avatar : DEFAULT_AVATAR;
    }

    function getCardPalette(index) {
        const size = COVER_COLOR_POOL.length;
        const safeIndex = ((parseInt(index, 10) || 0) % size + size) % size;
        return COVER_COLOR_POOL[safeIndex];
    }

    function normalizeTags(tags) {
        if (Array.isArray(tags)) return tags.map(asString).filter(Boolean).slice(0, 6);
        if (typeof tags === 'string') {
            return tags.split(/[，,、#\s]+/).map(asString).filter(Boolean).slice(0, 6);
        }
        return [];
    }

    function extractJsonArray(raw) {
        const text = asString(raw);
        if (!text) return [];
        const cleaned = text
            .replace(/^\uFEFF/, '')
            .replace(/```json/ig, '')
            .replace(/```/g, '')
            .trim();
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start === -1 || end <= start) return [];
        const body = cleaned.slice(start, end + 1);
        const parsed = safeParse(body, []);
        return Array.isArray(parsed) ? parsed : [];
    }

    function normalizePost(item, index) {
        const row = asObject(item);
        const title = asString(row.postTitle || row.title || row.noteTitle);
        const authorName = asString(row.authorName || row.author || row.userName);
        const content = asString(row.content || row.body || row.text);
        const coverText = asString(row.coverText || row.coverCopy || row.cover || row.coverContent || row.slogan);
        const sectionName = asString(row.sectionName || row.topicName || row.groupName || row.topic || '生活讨论');
        if (!title || !authorName || !content) return null;
        return {
            id: asString(row.id || ('redbook_post_' + Date.now() + '_' + index + '_' + Math.random().toString(36).slice(2, 7))),
            postTitle: title,
            coverText: coverText || title.slice(0, 15),
            authorName: authorName,
            authorOriginalName: asString(row.authorOriginalName),
            authorAvatarPrompt: asString(row.authorAvatarPrompt || row.avatar_prompt),
            sectionName: sectionName,
            content: content,
            tags: normalizeTags(row.tags),
            likesCount: Math.max(0, parseInt(row.likesCount, 10) || 0),
            favoriteCount: Math.max(0, parseInt(row.favoriteCount, 10) || 0),
            commentsCount: Math.max(0, parseInt(row.commentsCount, 10) || 0),
            timestamp: asString(row.timestamp || row.date || row.time || '刚刚')
        };
    }

    function showError(message) {
        const text = asString(message) || '生成失败';
        if (typeof global.showCustomAlert === 'function') {
            global.showCustomAlert('生成失败', text);
            return;
        }
        alert(text);
    }

    function showSuccess(message) {
        const text = asString(message);
        if (!text) return;
        if (typeof global.showToast === 'function') {
            global.showToast(text);
            return;
        }
        try {
            console.log(text);
        } catch (e) { }
    }

    function buildPromptPayload(selectedRoles, exactCount) {
        const currentTime = new Date().toLocaleString('zh-CN', { hour12: false });
        const userName = asString(localStorage.getItem('wechat_user_nickname') || localStorage.getItem('wechat_user_name') || localStorage.getItem('user_nickname') || '用户');
        const communityContext = readCommunityWorldbookContext();

        const roleBlocks = selectedRoles.map(function (item, index) {
            const profile = asObject(item.profile);
            const persona = getPersonaText(profile);
            const memory = getLongTermMemoryText(profile);
            const history = getRecentHistoryText(item.roleId);
            const worldbook = collectWorldBookTextForRole(profile);
            const lines = [
                '<character>',
                '角色序号：' + (index + 1),
                '角色ID：' + item.roleId,
                '角色名：' + item.name,
                '<persona>\n' + (persona || '(空)'),
                '<memory>\n' + (memory || '(空)'),
                '<recent_history>\n' + (history || '(空)'),
                '<worldbook>\n' + (worldbook || '(空)'),
                '</character>'
            ];
            return lines.join('\n');
        }).join('\n\n');

        const systemPrompt = [
            '# 你的任务',
            '你是一个虚拟社区内容生成器。请根据下面的角色列表，生成一批“高仿小红书首页”风格的帖子。',
            '',
            '# 核心规则',
            '1. 你必须感知当前真实时间：' + currentTime,
            '2. 用户昵称是“' + userName + '”，你绝对不能扮演用户，也不能生成作者名等于该昵称的帖子。',
            '3. 内容必须综合角色的人设、长期记忆、最近聊天和世界书信息，不能脱离角色设定乱写。',
            '4. 帖子风格必须极具“小红书味”：真实生活感、情绪钩子、经验分享感、轻口语、带一点反差感，像能直接出现在发现页的笔记。',
            '5. 作者分布要有社区感：主角色与路人NPC混合出现；路人NPC首次出现时必须提供 authorAvatarPrompt 英文头像提示词，同批次里同名NPC要保持一致。',
            '6. 只生成发帖，不生成评论内容。',
            '7. 每条帖子必须额外生成一个 coverText 字段，作为封面文案。',
            '8. coverText 必须是 15 字以内的一句话，口语化、像小红书封面会写的话，要直接点出核心内容或情绪，要带 1 个 emoji，可以不加标点，要有一点反差感。',
            '9. 示例风格：\"我发现创作欲可以抵消过剩的分享欲 🎧\"、\"家人们我吃了放了八天的外卖 😭\"。',
            '10. 输出必须且只能是 JSON 数组，不要任何额外解释、前缀、Markdown。',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "coverText": "15字以内封面文案，带1个emoji",',
            '    "postTitle": "帖子标题",',
            '    "authorName": "作者显示名",',
            '    "authorOriginalName": "如果是主角色则填写原始角色名，否则可省略",',
            '    "authorAvatarPrompt": "如果是路人NPC则填写英文头像提示词",',
            '    "sectionName": "板块或话题",',
            '    "content": "正文，支持换行符\\\\n",',
            '    "tags": ["标签1", "标签2"],',
            '    "likesCount": 123,',
            '    "favoriteCount": 45,',
            '    "commentsCount": 18,',
            '    "timestamp": "刚刚/1小时前/今天 21:40"',
            '  }',
            ']',
            '',
            '# 数量要求',
            '请精确生成 ' + exactCount + ' 篇帖子。',
            '',
            '# 社区设定',
            communityContext || '(没有额外社区世界书)',
            '',
            '# 角色列表',
            roleBlocks || '(空)'
        ].join('\n');

        const userMessage = '请开始生成这一批小红书帖子，记得每条都要包含 coverText 和 postTitle，严格输出 JSON 数组。';
        return { systemPrompt: systemPrompt, userMessage: userMessage };
    }

    function callAi(systemPrompt, userMessage) {
        return new Promise(function (resolve, reject) {
            if (typeof global.callAI !== 'function') {
                reject(new Error('当前环境没有可用的 callAI 接口'));
                return;
            }
            global.callAI(
                systemPrompt,
                [],
                userMessage,
                function (text) { resolve(text); },
                function (error) { reject(new Error(asString(error) || '生成失败')); },
                {
                    disableLatestWrapper: true,
                    temperature: 0.92,
                    max_tokens: 4096,
                    maxTokens: 4096
                }
            );
        });
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .redbook-forum-shell{height:100%;display:flex;flex-direction:column;background:#f8f8f8;color:#333;position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
            .redbook-top-nav{height:88px;padding-top:40px;display:flex;justify-content:center;align-items:center;gap:30px;background:rgba(248,248,248,.92);backdrop-filter:blur(10px);position:absolute;top:0;left:0;right:0;z-index:5}
            .redbook-tab{font-size:16px;color:#999;font-weight:500;position:relative}
            .redbook-tab.is-active{color:#333;font-size:18px;font-weight:600}
            .redbook-tab.is-active::after{content:'';position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:20px;height:3px;background:#ff2442;border-radius:2px}
            .redbook-feed{flex:1;overflow-y:auto;padding:95px 12px 90px 12px}
            .redbook-feed::-webkit-scrollbar,.redbook-drawer-body::-webkit-scrollbar,.redbook-detail::-webkit-scrollbar{display:none}
            .redbook-summary{margin-bottom:12px;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.88);box-shadow:0 6px 18px rgba(0,0,0,.04);backdrop-filter:blur(10px)}
            .redbook-summary-title{font-size:13px;color:#ff2442;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
            .redbook-summary-meta{margin-top:6px;font-size:12px;color:#888;line-height:1.6}
            .redbook-card-list{display:grid;grid-template-columns:1fr 1fr;gap:12px}
            .redbook-card{background:#fff;border-radius:16px;overflow:hidden;height:280px;box-shadow:0 4px 12px rgba(0,0,0,.03);display:flex;flex-direction:column;cursor:pointer;position:relative}
            .redbook-card-cover{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:18px 16px 14px;position:relative}
            .redbook-card-topic{font-size:11px;line-height:1.2;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.55);backdrop-filter:blur(4px);margin-bottom:auto;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .redbook-card-covertext{font-size:21px;line-height:1.35;font-weight:700;letter-spacing:.01em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
            .redbook-card-info{padding:12px;background:#fff;display:flex;align-items:center;gap:8px;font-size:13px;color:#333;font-weight:500}
            .redbook-card-meta{min-width:0;flex:1}
            .redbook-card-title{font-size:13px;line-height:1.45;color:#333;font-weight:600;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
            .redbook-card-sub{margin-top:3px;font-size:11px;color:#8f8f96;display:flex;gap:8px;white-space:nowrap;overflow:hidden}
            .redbook-card-sub span{overflow:hidden;text-overflow:ellipsis}
            .redbook-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover;background:#eceff3;flex-shrink:0}
            .redbook-bottom-nav{height:70px;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-around;align-items:center;padding-bottom:15px;border-top:1px solid #f0f0f0;z-index:5}
            .redbook-nav-item{font-size:16px;color:#999;font-weight:500}
            .redbook-nav-item.is-active{color:#333;font-weight:700}
            .redbook-add-btn{width:46px;height:34px;background:#ff2442;color:#fff;border-radius:12px;display:flex;justify-content:center;align-items:center;font-size:24px;font-weight:300;box-shadow:0 4px 10px rgba(255,36,66,.3)}
            .redbook-empty{min-height:100%;display:flex;align-items:center;justify-content:center;padding:18px 0}
            .redbook-empty-box{width:min(100%,390px);padding:28px 22px;border-radius:24px;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,.06);text-align:center}
            .redbook-empty-title{font-size:21px;font-weight:700;color:#333}
            .redbook-empty-desc{margin-top:10px;font-size:14px;line-height:1.7;color:#7d7d85}
            .redbook-primary-btn{margin-top:16px;border:none;background:#ff2442;color:#fff;border-radius:999px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer}
            .redbook-primary-btn[disabled]{opacity:.6;cursor:default}
            .redbook-detail{height:100%;overflow-y:auto;padding:18px 16px 94px;background:#f8f8f8}
            .redbook-detail-card{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.05)}
            .redbook-detail-cover{padding:28px 18px 22px;min-height:220px;display:flex;flex-direction:column;justify-content:space-between}
            .redbook-back-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
            .redbook-back-btn{border:none;background:rgba(255,255,255,.58);color:#4c5360;font-size:14px;cursor:pointer;padding:7px 12px;border-radius:999px;backdrop-filter:blur(4px)}
            .redbook-detail-topic{font-size:12px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.58);display:inline-flex;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .redbook-detail-covertext{font-size:28px;line-height:1.35;font-weight:800;max-width:88%;word-break:break-word}
            .redbook-detail-body{padding:18px 18px 22px}
            .redbook-detail-title{font-size:20px;line-height:1.5;font-weight:700;color:#222}
            .redbook-detail-author{display:flex;align-items:center;gap:10px;margin-top:14px;margin-bottom:18px}
            .redbook-detail-author .redbook-avatar{width:34px;height:34px}
            .redbook-detail-author-main{font-size:14px;font-weight:600;color:#2c3138}
            .redbook-detail-author-sub{font-size:12px;color:#8a9099;margin-top:2px}
            .redbook-detail-content{font-size:15px;line-height:2;color:#353b45;white-space:pre-wrap}
            .redbook-detail-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
            .redbook-card-tag{font-size:11px;color:#5f6670;background:#f3f5f7;border-radius:999px;padding:4px 8px}
            .redbook-detail-stats{display:flex;gap:16px;margin-top:18px;padding-top:16px;border-top:1px solid #f3f3f4;font-size:13px;color:#7b828c}
            .redbook-drawer-mask{position:absolute;inset:0;background:rgba(10,14,20,.18);opacity:0;pointer-events:none;transition:opacity .22s ease;z-index:10}
            .redbook-drawer-mask.is-open{opacity:1;pointer-events:auto}
            .redbook-drawer{position:absolute;top:0;right:0;width:min(50%,420px);height:100%;background:#fff;border-left:1px solid rgba(20,25,34,.06);box-shadow:-16px 0 40px rgba(10,14,20,.12);transform:translateX(100%);transition:transform .25s ease;z-index:11;display:flex;flex-direction:column}
            .redbook-drawer.is-open{transform:translateX(0)}
            .redbook-drawer-head{padding:18px 18px 12px;border-bottom:1px solid #f0f1f3}
            .redbook-drawer-title{font-size:18px;font-weight:700;color:#1f2329}
            .redbook-drawer-sub{margin-top:6px;font-size:12px;color:#7a818b;line-height:1.6}
            .redbook-drawer-body{flex:1;overflow-y:auto;padding:16px 18px 24px}
            .redbook-field{margin-bottom:22px}
            .redbook-field-title{font-size:13px;font-weight:700;color:#2b3037;margin-bottom:10px}
            .redbook-role-list{display:flex;flex-direction:column;gap:10px}
            .redbook-role-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#f7f8fa;cursor:pointer;border:none;width:100%;text-align:left}
            .redbook-role-item.is-active{background:rgba(255,36,66,.08);box-shadow:inset 0 0 0 1px rgba(255,36,66,.18)}
            .redbook-role-check{width:18px;height:18px;border-radius:50%;border:1.5px solid #c6ccd4;display:flex;align-items:center;justify-content:center;font-size:12px;color:transparent;flex-shrink:0}
            .redbook-role-item.is-active .redbook-role-check{border-color:#ff2442;background:#ff2442;color:#fff}
            .redbook-role-meta{min-width:0}
            .redbook-role-name{font-size:14px;font-weight:600;color:#20242b;display:block}
            .redbook-role-desc{margin-top:4px;font-size:12px;color:#7a818b;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
            .redbook-count-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:16px;background:#f7f8fa}
            .redbook-count-input{width:92px;padding:10px 12px;border-radius:12px;border:1px solid #d6dbe2;background:#fff;font-size:14px}
            .redbook-drawer-foot{padding:14px 18px 18px;border-top:1px solid #f0f1f3}
            .redbook-foot-tip{margin-bottom:10px;font-size:12px;color:#7a818b;line-height:1.6}
            @media (max-width: 860px){
                .redbook-card-list{grid-template-columns:1fr}
                .redbook-drawer{width:min(88%,420px)}
                .redbook-card{height:260px}
            }
        `;
        document.head.appendChild(style);
    }

    function getRoleSummary(profile) {
        const text = getPersonaText(profile);
        return text ? text.replace(/\s+/g, ' ').slice(0, 60) : '已配置角色';
    }

    function buildShell() {
        if (!state.root) return;
        state.root.innerHTML = [
            '<div class="redbook-forum-shell">',
            '  <header class="redbook-top-nav">',
            '    <div class="redbook-tab">关注</div>',
            '    <div class="redbook-tab is-active">发现</div>',
            '    <div class="redbook-tab">附近</div>',
            '  </header>',
            '  <div class="redbook-feed" data-redbook-view></div>',
            '  <div class="redbook-drawer-mask" data-redbook-mask></div>',
            '  <aside class="redbook-drawer" data-redbook-drawer>',
            '    <div class="redbook-drawer-head">',
            '      <div class="redbook-drawer-title">生成设置</div>',
            '      <div class="redbook-drawer-sub">选择参与角色和本次要生成的帖子数量。生成成功后会一直保存在本地，直到你手动重新生成。</div>',
            '    </div>',
            '    <div class="redbook-drawer-body">',
            '      <div class="redbook-field">',
            '        <div class="redbook-field-title">参与角色</div>',
            '        <div class="redbook-role-list" data-redbook-role-list></div>',
            '      </div>',
            '      <div class="redbook-field">',
            '        <div class="redbook-field-title">精确生成条数</div>',
            '        <div class="redbook-count-row">',
            '          <div>范围 ' + MIN_COUNT + ' - ' + MAX_COUNT + '</div>',
            '          <input class="redbook-count-input" type="number" min="' + MIN_COUNT + '" max="' + MAX_COUNT + '" step="1" value="' + escapeHtml(state.settings.exactCount) + '" data-redbook-count-input>',
            '        </div>',
            '      </div>',
            '    </div>',
            '    <div class="redbook-drawer-foot">',
            '      <div class="redbook-foot-tip">只会生成帖子，不会自动补评论或假数据。</div>',
            '      <button class="redbook-primary-btn" type="button" data-redbook-generate-btn>生成帖子</button>',
            '    </div>',
            '  </aside>',
            '  <nav class="redbook-bottom-nav">',
            '    <div class="redbook-nav-item is-active">首页</div>',
            '    <div class="redbook-nav-item">购物</div>',
            '    <div class="redbook-add-btn">+</div>',
            '    <div class="redbook-nav-item">消息</div>',
            '    <div class="redbook-nav-item">我</div>',
            '  </nav>',
            '</div>'
        ].join('');
        renderRoleList();
    }

    function renderRoleList() {
        if (!state.root) return;
        const mount = state.root.querySelector('[data-redbook-role-list]');
        if (!mount) return;
        const roles = getAvailableCharacters();
        mount.innerHTML = roles.map(function (item) {
            const active = state.settings.selectedRoleIds.indexOf(item.roleId) !== -1;
            return [
                '<button type="button" class="redbook-role-item' + (active ? ' is-active' : '') + '" data-redbook-role="' + escapeHtml(item.roleId) + '">',
                '  <span class="redbook-role-check">✓</span>',
                '  <img class="redbook-avatar" src="' + escapeHtml(item.avatar) + '" alt="">',
                '  <span class="redbook-role-meta">',
                '    <span class="redbook-role-name">' + escapeHtml(item.name) + '</span>',
                '    <span class="redbook-role-desc">' + escapeHtml(getRoleSummary(item.profile)) + '</span>',
                '  </span>',
                '</button>'
            ].join('');
        }).join('');
    }

    function renderFeed() {
        if (!state.root) return;
        const mount = state.root.querySelector('[data-redbook-view]');
        if (!mount) return;
        if (!state.posts.length) {
            mount.innerHTML = [
                '<div class="redbook-empty">',
                '  <div class="redbook-empty-box">',
                '    <div class="redbook-empty-title">论坛版小红书</div>',
                '    <div class="redbook-empty-desc">这里会保留你生成过的首页帖子流。先点右上角搜索，挑选角色和条数，再生成第一批内容。</div>',
                '    <button type="button" class="redbook-primary-btn" data-redbook-open-drawer>去生成</button>',
                '  </div>',
                '</div>'
            ].join('');
            return;
        }
        mount.innerHTML = [
            '<div class="redbook-summary">',
            '  <div class="redbook-summary-title">Discover</div>',
            '  <div class="redbook-summary-meta">' + escapeHtml(formatGeneratedMeta()) + '</div>',
            '</div>',
            '<div class="redbook-card-list">',
            state.posts.map(function (post, index) {
                const palette = getCardPalette(index);
                return [
                    '<article class="redbook-card" data-redbook-open-post="' + escapeHtml(post.id) + '">',
                    '  <div class="redbook-card-cover" style="background:' + escapeHtml(palette.bg) + ';color:' + escapeHtml(palette.fg) + ';">',
                    '    <div class="redbook-card-topic"># ' + escapeHtml(post.sectionName) + '</div>',
                    '    <div class="redbook-card-covertext">' + escapeHtml(post.coverText) + '</div>',
                    '  </div>',
                    '  <div class="redbook-card-info">',
                    '    <img class="redbook-avatar" src="' + escapeHtml(getAvatarForPost(post)) + '" alt="">',
                    '    <div class="redbook-card-meta">',
                    '      <div class="redbook-card-title">' + escapeHtml(post.postTitle) + '</div>',
                    '      <div class="redbook-card-sub">',
                    '        <span>' + escapeHtml(post.authorName) + '</span>',
                    '        <span>赞 ' + escapeHtml(post.likesCount) + '</span>',
                    '      </div>',
                    '    </div>',
                    '  </div>',
                    '</article>'
                ].join('');
            }).join(''),
            '</div>'
        ].join('');
    }

    function renderDetail(postId) {
        if (!state.root) return;
        const mount = state.root.querySelector('[data-redbook-view]');
        if (!mount) return;
        const post = state.posts.find(function (item) { return item.id === postId; });
        if (!post) {
            state.activePostId = '';
            renderFeed();
            return;
        }
        state.activePostId = postId;
        const palette = getCardPalette(state.posts.findIndex(function (item) { return item.id === postId; }));
        mount.innerHTML = [
            '<div class="redbook-detail">',
            '  <div class="redbook-detail-card">',
            '    <div class="redbook-detail-cover" style="background:' + escapeHtml(palette.bg) + ';color:' + escapeHtml(palette.fg) + ';">',
            '      <div class="redbook-back-row">',
            '        <button type="button" class="redbook-back-btn" data-redbook-back>‹ 返回首页</button>',
            '        <div class="redbook-detail-topic"># ' + escapeHtml(post.sectionName) + '</div>',
            '      </div>',
            '      <div class="redbook-detail-covertext">' + escapeHtml(post.coverText) + '</div>',
            '    </div>',
            '    <div class="redbook-detail-body">',
            '      <div class="redbook-detail-title">' + escapeHtml(post.postTitle) + '</div>',
            '      <div class="redbook-detail-author">',
            '        <img class="redbook-avatar" src="' + escapeHtml(getAvatarForPost(post)) + '" alt="">',
            '        <div>',
            '          <div class="redbook-detail-author-main">' + escapeHtml(post.authorName) + '</div>',
            '          <div class="redbook-detail-author-sub">' + escapeHtml(post.timestamp) + ' · ' + escapeHtml(post.authorOriginalName || '论坛作者') + '</div>',
            '        </div>',
            '      </div>',
            '      <div class="redbook-detail-content">' + escapeHtml(post.content) + '</div>',
            post.tags.length ? ('<div class="redbook-detail-tags">' + post.tags.map(function (tag) {
                return '<span class="redbook-card-tag">#' + escapeHtml(tag) + '</span>';
            }).join('') + '</div>') : '',
            '      <div class="redbook-detail-stats">',
            '        <span>点赞 ' + escapeHtml(post.likesCount) + '</span>',
            '        <span>收藏 ' + escapeHtml(post.favoriteCount) + '</span>',
            '        <span>评论 ' + escapeHtml(post.commentsCount) + '</span>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function setDrawerOpen(open) {
        state.drawerOpen = open === true;
        if (!state.root) return;
        const mask = state.root.querySelector('[data-redbook-mask]');
        const drawer = state.root.querySelector('[data-redbook-drawer]');
        if (mask) mask.classList.toggle('is-open', state.drawerOpen);
        if (drawer) drawer.classList.toggle('is-open', state.drawerOpen);
    }

    function updateGenerateButton() {
        if (!state.root) return;
        const btn = state.root.querySelector('[data-redbook-generate-btn]');
        if (!btn) return;
        btn.disabled = state.generating;
        btn.textContent = state.generating ? '生成中...' : '生成帖子';
    }

    function toggleRole(roleId) {
        const id = asString(roleId);
        if (!id) return;
        const selected = asArray(state.settings.selectedRoleIds).slice();
        const index = selected.indexOf(id);
        if (index === -1) selected.push(id);
        else selected.splice(index, 1);
        state.settings.selectedRoleIds = selected;
        saveSettings();
        renderRoleList();
    }

    async function generatePosts() {
        if (state.generating) return;
        const selectedIds = asArray(state.settings.selectedRoleIds).map(asString).filter(Boolean);
        if (!selectedIds.length) {
            showError('请至少选择一个参与角色。');
            return;
        }
        const roleMap = {};
        getAvailableCharacters().forEach(function (item) {
            roleMap[item.roleId] = item;
        });
        const selectedRoles = selectedIds.map(function (id) { return roleMap[id]; }).filter(Boolean);
        if (!selectedRoles.length) {
            showError('当前没有可用于生成的角色。');
            return;
        }

        state.generating = true;
        updateGenerateButton();
        saveSettings();

        try {
            const promptPack = buildPromptPayload(selectedRoles, clampCount(state.settings.exactCount));
            const raw = await callAi(promptPack.systemPrompt, promptPack.userMessage);
            const parsed = extractJsonArray(raw).map(normalizePost).filter(Boolean);
            if (!parsed.length) {
                throw new Error('API 没有返回可展示的帖子数据。');
            }
            state.posts = parsed.slice(0, clampCount(state.settings.exactCount));
            state.generatedAt = Date.now();
            state.activePostId = '';
            saveCache();
            setDrawerOpen(false);
            renderFeed();
            showSuccess('小红书帖子已更新');
        } catch (error) {
            showError(error && error.message);
        } finally {
            state.generating = false;
            updateGenerateButton();
        }
    }

    function handleRootClick(event) {
        const target = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('[data-redbook-open-drawer],[data-redbook-mask],[data-redbook-role],[data-redbook-generate-btn],[data-redbook-open-post],[data-redbook-back]')
            : null;
        if (!target) return;
        if (target.hasAttribute('data-redbook-open-drawer')) {
            setDrawerOpen(true);
            return;
        }
        if (target.hasAttribute('data-redbook-mask')) {
            setDrawerOpen(false);
            return;
        }
        if (target.hasAttribute('data-redbook-role')) {
            toggleRole(target.getAttribute('data-redbook-role'));
            return;
        }
        if (target.hasAttribute('data-redbook-generate-btn')) {
            generatePosts();
            return;
        }
        if (target.hasAttribute('data-redbook-open-post')) {
            renderDetail(target.getAttribute('data-redbook-open-post'));
            return;
        }
        if (target.hasAttribute('data-redbook-back')) {
            state.activePostId = '';
            renderFeed();
        }
    }

    function handleRootInput(event) {
        const target = event.target;
        if (!target || !target.hasAttribute || !target.hasAttribute('data-redbook-count-input')) return;
        state.settings.exactCount = clampCount(target.value);
        target.value = state.settings.exactCount;
        saveSettings();
    }

    function open() {
        ensureStyle();
        loadSettings();
        loadCache();
        state.root = document.getElementById(ROOT_ID);
        if (!state.root) return;
        buildShell();
        setDrawerOpen(false);
        state.root.removeEventListener('click', handleRootClick);
        state.root.removeEventListener('input', handleRootInput);
        state.root.addEventListener('click', handleRootClick);
        state.root.addEventListener('input', handleRootInput);
        if (state.activePostId) renderDetail(state.activePostId);
        else renderFeed();
        updateGenerateButton();
    }

    function openDetail(postId) {
        if (!state.root) open();
        renderDetail(postId);
    }

    function openGeneratorDrawer() {
        if (!state.root) open();
        setDrawerOpen(true);
    }

    global.RedbookForumApp = {
        open: open,
        renderFeed: renderFeed,
        openDetail: openDetail,
        openGeneratorDrawer: openGeneratorDrawer,
        generatePosts: generatePosts
    };
})(window);
