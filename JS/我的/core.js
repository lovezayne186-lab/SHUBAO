var MineCore = (function () {
    var initialized = false;
    var themeStudioInitialized = false;
    var themeStudioRuntime = {
        config: null,
        applyingPresetId: '',
        editingPresetId: '',
        applyRolePickCallback: null
    };
    var THEME_STUDIO_KEYS = {
        presets: 'theme_studio_userPresets_v1',
        global: 'theme_studio_global_v1',
        roleBindings: 'theme_studio_roleBindings_v1'
    };
    var GLOBAL_BEAUTIFY_CSS_KEY = 'theme_studio_globalBeautifyCss_v1';
    var GLOBAL_BEAUTIFY_STYLE_ID = 'theme-studio-global-beautify-style';

    function compressImageDataUrl(dataUrl, maxSide, done) {
        if (!dataUrl) return done('');
        var img = new Image();
        img.onload = function () {
            var w = img.naturalWidth || img.width || 0;
            var h = img.naturalHeight || img.height || 0;
            if (!w || !h) return done(dataUrl);
            var maxDim = Math.max(w, h);
            var scale = maxDim > maxSide ? (maxSide / maxDim) : 1;
            var outW = Math.max(1, Math.round(w * scale));
            var outH = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, outW, outH);
                ctx.drawImage(img, 0, 0, outW, outH);
            }
            var out = '';
            try {
                out = canvas.toDataURL('image/jpeg', 0.86);
            } catch (e) {
                out = dataUrl;
            }
            done(out || dataUrl);
        };
        img.onerror = function () {
            done(dataUrl);
        };
        img.src = dataUrl;
    }

    function readImageFileAsAvatar(file, done) {
        if (!file) return done('');
        var reader = new FileReader();
        reader.onload = function (e) {
            var dataUrl = e && e.target ? e.target.result : '';
            dataUrl = typeof dataUrl === 'string' ? dataUrl : '';
            if (!dataUrl) return done('');
            compressImageDataUrl(dataUrl, 512, done);
        };
        reader.onerror = function () {
            done('');
        };
        try {
            reader.readAsDataURL(file);
        } catch (e) {
            done('');
        }
    }

    function buildHtml() {
        var html = '';
        html += '<div class="mine-root">';
        html += '  <div class="mine-header">';
        html += '    <div class="mine-header-avatar" data-mine-action="change-avatar">';
        html += '      <img data-mine-role="avatar" src="" alt="">';
        html += '    </div>';
        html += '    <div class="mine-header-info">';
        html += '      <div class="mine-header-name" data-mine-role="name" data-mine-action="edit-name"></div>';
        html += '      <div class="mine-header-signature" data-mine-role="signature" data-mine-action="edit-signature"></div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <input type="file" id="mine-avatar-input" class="mine-avatar-input" accept="image/*">';
        html += '  <div class="mine-list-section">';
        html += '    <div class="mine-list-item" data-mine-item="wallet">';
        html += '      <div class="mine-item-icon"><i class="bx bx-wallet"></i></div>';
        html += '      <div class="mine-item-text">钱包</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="favorites">';
        html += '      <div class="mine-item-icon"><i class="bx bx-bookmark-heart"></i></div>';
        html += '      <div class="mine-item-text">收藏</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-list-section">';
        html += '    <div class="mine-list-item" data-mine-item="theme-studio">';
        html += '      <div class="mine-item-icon"><i class="bx bx-palette"></i></div>';
        html += '      <div class="mine-item-text">美化</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="sports">';
        html += '      <div class="mine-item-icon"><i class="bx bx-run"></i></div>';
        html += '      <div class="mine-item-text">运动</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="period">';
        html += '      <div class="mine-item-icon"><i class="bx bx-droplet"></i></div>';
        html += '      <div class="mine-item-text">经期</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-favorites-panel" id="mine-favorites-panel" style="display:none;">';
        html += '    <div class="mine-favorites-header">';
        html += '      <div class="mine-favorites-back" data-fav-action="back">‹</div>';
        html += '      <div class="mine-favorites-title">收藏</div>';
        html += '      <div class="mine-favorites-spacer"></div>';
        html += '    </div>';
        html += '    <div class="mine-favorites-list" id="mine-favorites-list"></div>';
        html += '  </div>';
        html += buildThemeStudioHtml();
        html += '  <div class="mine-edit-overlay" id="mine-edit-overlay" style="display:none;" aria-hidden="true">';
        html += '    <div class="mine-edit-card" role="dialog" aria-modal="true">';
        html += '      <div class="mine-edit-title" id="mine-edit-title"></div>';
        html += '      <input id="mine-edit-input" class="mine-edit-input" type="text" autocomplete="off">';
        html += '      <textarea id="mine-edit-textarea" class="mine-edit-textarea" rows="3"></textarea>';
        html += '      <div class="mine-edit-actions">';
        html += '        <button type="button" class="mine-edit-btn mine-edit-cancel" data-mine-edit="cancel">取消</button>';
        html += '        <button type="button" class="mine-edit-btn mine-edit-save" data-mine-edit="save">保存</button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function buildThemeStudioHtml() {
        var html = '';
        html += '  <div class="theme-studio-panel" id="theme-studio-panel" style="display:none;" aria-hidden="true">';
        html += '    <div class="theme-studio-header">';
        html += '      <div class="theme-studio-back" data-theme-action="back">‹</div>';
        html += '      <div class="theme-studio-title">聊天美化中心</div>';
        html += '      <button type="button" class="theme-studio-save" data-theme-action="save">保存为预设</button>';
        html += '    </div>';
        html += '    <div class="theme-studio-main">';
        html += '      <div class="theme-studio-scroll">';
        html += '      <div class="theme-card theme-card-global-css">';
        html += '        <div class="theme-card-title">全局美化 CSS</div>';
        html += '        <textarea id="theme-global-css" class="theme-css-textarea" placeholder="这里的 CSS 会直接作用于全局（聊天室顶部栏、底部栏等都可以写）。"></textarea>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-top">';
        html += '        <div class="theme-card-title">气泡设置</div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">AI 气泡颜色</div>';
        html += '          <input type="color" id="theme-ai-color" class="theme-color-input" value="#ffffff">';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">用户气泡颜色</div>';
        html += '          <input type="color" id="theme-user-color" class="theme-color-input" value="#c49c99">';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">气泡小尾巴</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-tail-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">小尾巴上下</div>';
        html += '          <input type="range" id="theme-tail-top" class="theme-range" min="0" max="28" value="14">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">小尾巴细长程度</div>';
        html += '          <input type="range" id="theme-tail-slim" class="theme-range" min="0" max="100" value="0">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">气泡高度</div>';
        html += '          <input type="range" id="theme-bubble-compact" class="theme-range" min="0" max="100" value="0">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">质感</div>';
        html += '          <div class="theme-seg" id="theme-texture-seg">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-texture="solid">实色</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="outline">线框</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="matte">磨砂</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="glass">毛玻璃</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="transparent">透明</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="gradient">渐变</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label"> 合并气泡</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-kkt-merge"><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">阴影强度</div>';
        html += '          <input type="range" id="theme-shadow" class="theme-range" min="0" max="24" value="8">';
        html += '        </div>';
        html += '        <div class="theme-radius-block">';
        html += '          <div class="theme-radius-head">';
        html += '            <div class="theme-label">AI 圆角</div>';
        html += '            <button type="button" class="theme-mini-btn" id="theme-copy-to-user">复制到自己</button>';
        html += '          </div>';
        html += '          <div class="theme-radius-grid">';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">左上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="tl"></div>';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">右上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="tr"></div>';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">左下</div><input type="range" min="0" max="30" value="6" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="bl"></div>';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">右下</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="br"></div>';
        html += '          </div>';
        html += '          <div class="theme-user-radius" id="theme-user-radius" style="display:none;">';
        html += '            <div class="theme-label">User 圆角</div>';
        html += '            <div class="theme-radius-grid">';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">左上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="user" data-corner="tl"></div>';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">右上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="user" data-corner="tr"></div>';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">左下</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="user" data-corner="bl"></div>';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">右下</div><input type="range" min="0" max="30" value="6" class="theme-range theme-radius-range" data-radius-target="user" data-corner="br"></div>';
        html += '            </div>';
        html += '          </div>';
        html += '        </div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-bottom">';
        html += '        <div class="theme-card-title">头像设置</div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">显示头像</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-avatar-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">头像形状</div>';
        html += '          <div class="theme-seg" id="theme-avatar-shape-seg">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-shape="circle">圆形</button>';
        html += '            <button type="button" class="theme-seg-btn" data-shape="squircle">方圆</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">头像大小</div>';
        html += '          <input type="range" id="theme-avatar-size" class="theme-range" min="24" max="50" value="40">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">头像与气泡间距</div>';
        html += '          <input type="range" id="theme-avatar-gap" class="theme-range" min="0" max="24" value="4">';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">显示时间戳</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-timestamp-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">时间戳位置</div>';
        html += '          <div class="theme-seg" id="theme-timestamp-pos">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-tspos="avatar">头像下</button>';
        html += '            <button type="button" class="theme-seg-btn" data-tspos="bubble">气泡角</button>';
        html += '            <button type="button" class="theme-seg-btn" data-tspos="off">关闭</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">显示已读</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-read-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-presets">';
        html += '        <div class="theme-card-title theme-card-title-row">';
        html += '          <span>我的预设</span>';
        html += '          <span class="theme-subtle" id="theme-preset-count">0</span>';
        html += '        </div>';
        html += '        <div id="theme-preset-list" class="theme-preset-list"></div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-reset">';
        html += '        <div class="theme-card-title">恢复系统默认</div>';
        html += '        <button type="button" class="theme-danger-btn" data-theme-action="reset">恢复系统初始外观</button>';
        html += '      </div>';
        html += '      </div>';
        html += '      <div class="theme-preview-dock">';
        html += '        <div class="theme-preview-shell">';
        html += '          <div class="theme-preview-box" id="theme-preview-box" data-preview-avatar="1" data-kkt="0" data-tail="1" data-ts="1" data-tspos="avatar" data-read="1">';
        html += '            <div class="theme-preview-inner">';
        html += '              <div class="msg-row msg-left">';
        html += '                <div class="msg-avatar-wrap">';
        html += '                  <div class="msg-avatar"><img id="theme-preview-ai-avatar" src="assets/chushitouxiang.jpg" alt=""></div>';
        html += '                  <div class="msg-avatar-time">12:34</div>';
        html += '                </div>';
        html += '                <div class="msg-content-wrapper">';
        html += '                  <div class="msg-bubble">';
        html += '                    <span class="msg-text">今天也想把聊天气泡弄得更温柔一点。</span>';
        html += '                    <div class="msg-bubble-time">12:34</div>';
        html += '                  </div>';
        html += '                </div>';
        html += '              </div>';
        html += '              <div class="msg-row msg-left">';
        html += '                <div class="msg-avatar-wrap">';
        html += '                  <div class="msg-avatar"><img src="assets/chushitouxiang.jpg" alt=""></div>';
        html += '                  <div class="msg-avatar-time">12:35</div>';
        html += '                </div>';
        html += '                <div class="msg-content-wrapper">';
        html += '                  <div class="msg-bubble">';
        html += '                    <span class="msg-text">你喜欢韩系简约还是更偏奶油感？</span>';
        html += '                    <div class="msg-bubble-time">12:35</div>';
        html += '                  </div>';
        html += '                </div>';
        html += '              </div>';
        html += '              <div class="msg-row msg-right">';
        html += '                <div class="msg-avatar-wrap">';
        html += '                  <div class="msg-avatar"><img id="theme-preview-user-avatar" src="assets/chushitouxiang.jpg" alt=""></div>';
        html += '                  <div class="msg-avatar-time">12:36</div>';
        html += '                </div>';
        html += '                <div class="msg-content-wrapper">';
        html += '                  <div class="msg-bubble">';
        html += '                    <span class="msg-text">就要留白多、低饱和、看起来很干净那种。</span>';
        html += '                    <div class="msg-bubble-time">12:36</div>';
        html += '                  </div>';
        html += '                  <div class="msg-status-text">已读</div>';
        html += '                </div>';
        html += '              </div>';
        html += '            </div>';
        html += '          </div>';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="theme-sheet" id="theme-apply-sheet" style="display:none;" aria-hidden="true">';
        html += '    <div class="theme-sheet-mask" data-theme-sheet="close"></div>';
        html += '    <div class="theme-sheet-panel">';
        html += '      <div class="theme-sheet-title">应用到</div>';
        html += '      <button type="button" class="theme-sheet-option" data-theme-sheet="apply-global">应用到全局角色</button>';
        html += '      <button type="button" class="theme-sheet-option" data-theme-sheet="apply-role">应用到指定角色</button>';
        html += '      <button type="button" class="theme-sheet-cancel" data-theme-sheet="close">取消</button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="theme-picker" id="theme-role-picker" style="display:none;" aria-hidden="true">';
        html += '    <div class="theme-picker-mask" data-theme-picker="close"></div>';
        html += '    <div class="theme-picker-panel">';
        html += '      <div class="theme-picker-header">';
        html += '        <div class="theme-picker-back" data-theme-picker="close">‹</div>';
        html += '        <div class="theme-picker-title">选择角色</div>';
        html += '        <div class="theme-picker-spacer"></div>';
        html += '      </div>';
        html += '      <div class="theme-picker-body" id="theme-role-picker-body"></div>';
        html += '    </div>';
        html += '  </div>';
        html += '';
        return html;
    }

    function readGlobalBeautifyCss() {
        try {
            return String(localStorage.getItem(GLOBAL_BEAUTIFY_CSS_KEY) || '');
        } catch (e) {
            return '';
        }
    }

    function applyGlobalBeautifyCss(cssText) {
        var trimmed = String(cssText || '').trim();
        var el = document.getElementById(GLOBAL_BEAUTIFY_STYLE_ID);
        if (!trimmed) {
            if (el && el.parentNode) el.parentNode.removeChild(el);
            return;
        }
        if (!el) {
            el = document.createElement('style');
            el.id = GLOBAL_BEAUTIFY_STYLE_ID;
            document.head.appendChild(el);
        }
        el.textContent = trimmed;
    }

    function writeGlobalBeautifyCss(cssText) {
        try {
            localStorage.setItem(GLOBAL_BEAUTIFY_CSS_KEY, String(cssText || ''));
        } catch (e) { }
        applyGlobalBeautifyCss(cssText);
    }

    function formatTime(ts) {
        var t = typeof ts === 'number' ? ts : parseInt(String(ts || ''), 10);
        if (!t || isNaN(t)) return '';
        var d = new Date(t);
        var now = new Date();
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        if (d.toDateString() === now.toDateString()) {
            return hh + ':' + mm;
        }
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    function getFavoritesList() {
        if (window.getFavorites && typeof window.getFavorites === 'function') {
            return window.getFavorites();
        }
        try {
            var raw = localStorage.getItem('wechat_favorites_v2');
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function toggleFavoritesPanel(container, visible) {
        var panel = container.querySelector('#mine-favorites-panel');
        if (panel) panel.style.display = visible ? 'block' : 'none';
        var header = container.querySelector('.mine-header');
        if (header) header.style.display = visible ? 'none' : '';
        var sections = container.querySelectorAll('.mine-list-section');
        sections.forEach(function (el) {
            el.style.display = visible ? 'none' : '';
        });
    }

    function toggleThemeStudioPanel(container, visible) {
        var panel = container.querySelector('#theme-studio-panel');
        if (panel) panel.style.display = visible ? 'block' : 'none';
        if (panel) panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
        var header = container.querySelector('.mine-header');
        if (header) header.style.display = visible ? 'none' : '';
        var favPanel = container.querySelector('#mine-favorites-panel');
        if (favPanel && visible) favPanel.style.display = 'none';
        if (!visible) {
            closeApplySheet(container);
            closeRolePicker(container);
        }
        var sections = container.querySelectorAll('.mine-list-section');
        sections.forEach(function (el) {
            el.style.display = visible ? 'none' : '';
        });
    }

    function safeParseJson(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function clampNumber(v, min, max, fallback) {
        var n = typeof v === 'number' ? v : parseFloat(String(v || ''));
        if (!isFinite(n)) n = fallback;
        n = Math.max(min, Math.min(max, n));
        return n;
    }

    function normalizeHexColor(value, fallback) {
        var s = String(value || '').trim();
        if (!s) return fallback;
        if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
        return fallback;
    }

    function hexToRgb(hex) {
        var h = String(hex || '').replace('#', '');
        if (h.length !== 6) return null;
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return null;
        return { r: r, g: g, b: b };
    }

    function mixRgb(a, b, t) {
        var tt = Math.max(0, Math.min(1, t));
        return {
            r: Math.round(a.r + (b.r - a.r) * tt),
            g: Math.round(a.g + (b.g - a.g) * tt),
            b: Math.round(a.b + (b.b - a.b) * tt)
        };
    }

    function rgbToRgba(rgb, a) {
        var alpha = Math.max(0, Math.min(1, a));
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
    }

    function setCssVar(el, name, value) {
        try {
            el.style.setProperty(name, String(value || ''));
        } catch (e) { }
    }

    function getDefaultThemeConfig() {
        return {
            aiColor: '#ffffff',
            userColor: '#c49c99',
            texture: 'solid',
            tailEnabled: true,
            tailTop: 14,
            tailSlim: 0,
            tailWidth: 6,
            tailHeight: 6,
            bubbleCompact: 0,
            avatarBubbleGap: 4,
            timestampEnabled: true,
            timestampPos: 'avatar',
            readEnabled: true,
            kktMerge: false,
            shadow: 8,
            aiRadius: { tl: 12, tr: 12, bl: 6, br: 12 },
            userRadius: { tl: 12, tr: 12, bl: 12, br: 6 },
            avatarVisible: true,
            avatarShape: 'circle',
            avatarSize: 40
        };
    }

    function normalizeThemeConfig(raw) {
        var base = getDefaultThemeConfig();
        var c = raw && typeof raw === 'object' ? raw : {};

        var legacyAccent = normalizeHexColor(c.accentColor, '');
        base.aiColor = normalizeHexColor(c.aiColor, '') || '#ffffff';
        base.userColor = normalizeHexColor(c.userColor, '') || legacyAccent || base.userColor;

        base.texture = String(c.texture || base.texture);
        if (!/^(solid|outline|matte|glass|transparent|gradient)$/.test(base.texture)) base.texture = 'solid';

        base.tailEnabled = c.tailEnabled !== false;
        base.tailTop = clampNumber(c.tailTop, 0, 28, base.tailTop);
        base.tailSlim = clampNumber(c.tailSlim, 0, 100, base.tailSlim);
        base.tailWidth = clampNumber(c.tailWidth, 2, 16, base.tailWidth);
        base.tailHeight = clampNumber(c.tailHeight, 2, 14, base.tailHeight);

        base.bubbleCompact = clampNumber(c.bubbleCompact, 0, 100, base.bubbleCompact);

        base.avatarBubbleGap = clampNumber(c.avatarBubbleGap, 0, 24, base.avatarBubbleGap);

        base.timestampEnabled = c.timestampEnabled !== false;
        base.timestampPos = String(c.timestampPos || base.timestampPos);
        if (base.timestampPos !== 'avatar' && base.timestampPos !== 'bubble') base.timestampPos = 'avatar';

        base.readEnabled = c.readEnabled !== false;

        base.kktMerge = !!c.kktMerge;
        base.shadow = clampNumber(c.shadow, 0, 24, base.shadow);

        base.avatarVisible = c.avatarVisible !== false;
        base.avatarShape = c.avatarShape === 'squircle' ? 'squircle' : 'circle';
        base.avatarSize = clampNumber(c.avatarSize, 24, 50, base.avatarSize);

        base.aiRadius = {
            tl: clampNumber(c.aiRadius && c.aiRadius.tl, 0, 30, base.aiRadius.tl),
            tr: clampNumber(c.aiRadius && c.aiRadius.tr, 0, 30, base.aiRadius.tr),
            bl: clampNumber(c.aiRadius && c.aiRadius.bl, 0, 30, base.aiRadius.bl),
            br: clampNumber(c.aiRadius && c.aiRadius.br, 0, 30, base.aiRadius.br)
        };
        base.userRadius = {
            tl: clampNumber(c.userRadius && c.userRadius.tl, 0, 30, base.userRadius.tl),
            tr: clampNumber(c.userRadius && c.userRadius.tr, 0, 30, base.userRadius.tr),
            bl: clampNumber(c.userRadius && c.userRadius.bl, 0, 30, base.userRadius.bl),
            br: clampNumber(c.userRadius && c.userRadius.br, 0, 30, base.userRadius.br)
        };

        return base;
    }

    function readThemePresets() {
        var list = safeParseJson(localStorage.getItem(THEME_STUDIO_KEYS.presets), []);
        return Array.isArray(list) ? list : [];
    }

    function writeThemePresets(list) {
        try {
            localStorage.setItem(THEME_STUDIO_KEYS.presets, JSON.stringify(list || []));
        } catch (e) { }
    }

    function readRoleBindings() {
        var m = safeParseJson(localStorage.getItem(THEME_STUDIO_KEYS.roleBindings), {});
        return m && typeof m === 'object' ? m : {};
    }

    function writeRoleBindings(m) {
        try {
            localStorage.setItem(THEME_STUDIO_KEYS.roleBindings, JSON.stringify(m || {}));
        } catch (e) { }
    }

    function writeGlobalThemeConfig(config) {
        try {
            localStorage.setItem(THEME_STUDIO_KEYS.global, JSON.stringify(config || {}));
        } catch (e) { }
        if (window.ThemeStudio && typeof window.ThemeStudio.applyGlobalThemeConfig === 'function') {
            window.ThemeStudio.applyGlobalThemeConfig(config);
        }
    }

    function buildBubbleMaterial(texture, rgb, shadowStrength, isAi) {
        var s = clampNumber(shadowStrength, 0, 24, 8);
        var shadowAlpha = Math.max(0, Math.min(0.22, s / 24 * 0.22));
        var shadow = shadowAlpha > 0 ? ('0 10px 26px rgba(0,0,0,' + shadowAlpha.toFixed(3) + ')') : 'none';

        var bg = rgbToRgba(rgb, 1);
        var border = isAi ? '1px solid rgba(0,0,0,0.06)' : 'none';
        var backdrop = 'none';
        var arrow = bg;

        if (texture === 'outline') {
            bg = 'transparent';
            border = '1px solid ' + rgbToRgba(rgb, 0.62);
            arrow = 'transparent';
            shadow = 'none';
        } else if (texture === 'matte') {
            bg = rgbToRgba(rgb, 0.22);
            border = '1px solid rgba(255,255,255,0.35)';
            backdrop = 'blur(6px)';
            arrow = bg;
        } else if (texture === 'glass') {
            bg = 'linear-gradient(135deg,' + rgbToRgba(rgb, 0.28) + ',' + rgbToRgba({ r: 255, g: 255, b: 255 }, 0.18) + ')';
            border = '1px solid rgba(255,255,255,0.26)';
            backdrop = 'blur(14px) saturate(1.12)';
            arrow = rgbToRgba(rgb, 0.22);
        } else if (texture === 'transparent') {
            bg = rgbToRgba(rgb, 0.08);
            border = '1px solid rgba(0,0,0,0.06)';
            shadow = 'none';
            arrow = bg;
        } else if (texture === 'gradient') {
            var d1 = rgbToRgba(rgb, 0.95);
            var d2 = rgbToRgba(mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.08), 0.92);
            bg = 'linear-gradient(135deg,' + d1 + ',' + d2 + ')';
            border = 'none';
            arrow = rgbToRgba(rgb, 0.92);
        }

        return { bg: bg, border: border, backdrop: backdrop, shadow: shadow, arrow: arrow };
    }

    function computeTextColor(rgb) {
        var r = rgb && typeof rgb.r === 'number' ? rgb.r : 0;
        var g = rgb && typeof rgb.g === 'number' ? rgb.g : 0;
        var b = rgb && typeof rgb.b === 'number' ? rgb.b : 0;
        var l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return l < 0.56 ? '#ffffff' : '#000000';
    }

    function applyPreviewThemeConfig(container, config) {
        var box = container.querySelector('#theme-preview-box');
        if (!box) return;

        var aiRgb = hexToRgb(normalizeHexColor(config.aiColor, '#ffffff')) || { r: 255, g: 255, b: 255 };
        var userRgb = hexToRgb(normalizeHexColor(config.userColor, '#c49c99')) || { r: 196, g: 156, b: 153 };

        var texture = String(config.texture || 'solid');
        var ai = buildBubbleMaterial(texture, aiRgb, config.shadow, true);
        var user = buildBubbleMaterial(texture, userRgb, config.shadow, false);

        setCssVar(box, '--preview-ai-bg', ai.bg);
        setCssVar(box, '--preview-ai-border', ai.border);
        setCssVar(box, '--preview-ai-backdrop', ai.backdrop);
        setCssVar(box, '--preview-ai-shadow', ai.shadow);
        setCssVar(box, '--preview-ai-arrow', ai.arrow);
        setCssVar(box, '--preview-ai-color', computeTextColor(aiRgb));

        setCssVar(box, '--preview-user-bg', user.bg);
        setCssVar(box, '--preview-user-border', user.border);
        setCssVar(box, '--preview-user-backdrop', user.backdrop);
        setCssVar(box, '--preview-user-shadow', user.shadow);
        setCssVar(box, '--preview-user-arrow', user.arrow);
        setCssVar(box, '--preview-user-color', computeTextColor(userRgb));

        setCssVar(box, '--preview-ai-radius-tl', clampNumber(config.aiRadius && config.aiRadius.tl, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-ai-radius-tr', clampNumber(config.aiRadius && config.aiRadius.tr, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-ai-radius-bl', clampNumber(config.aiRadius && config.aiRadius.bl, 0, 30, 6) + 'px');
        setCssVar(box, '--preview-ai-radius-br', clampNumber(config.aiRadius && config.aiRadius.br, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-tl', clampNumber(config.userRadius && config.userRadius.tl, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-tr', clampNumber(config.userRadius && config.userRadius.tr, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-bl', clampNumber(config.userRadius && config.userRadius.bl, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-br', clampNumber(config.userRadius && config.userRadius.br, 0, 30, 6) + 'px');

        var avatarSize = clampNumber(config.avatarSize, 24, 50, 40);
        setCssVar(box, '--preview-avatar-size', avatarSize + 'px');
        var avatarRadius = config.avatarShape === 'circle' ? '50%' : '35%';
        setCssVar(box, '--preview-avatar-radius', avatarRadius);
        setCssVar(box, '--preview-avatar-gap', clampNumber(config.avatarBubbleGap, 0, 24, 4) + 'px');

        var slim = clampNumber(config.tailSlim, 0, 100, 0);
        var w = clampNumber(6 + (slim / 100) * 10, 2, 16, 6);
        var h = 6;
        config.tailWidth = w;
        config.tailHeight = h;

        setCssVar(box, '--preview-tail-top', clampNumber(config.tailTop, 0, 28, 14) + 'px');
        setCssVar(box, '--preview-tail-width', clampNumber(config.tailWidth, 2, 16, 6) + 'px');
        setCssVar(box, '--preview-tail-height', clampNumber(config.tailHeight, 2, 14, 6) + 'px');

        var compact = clampNumber(config.bubbleCompact, 0, 100, 0);
        var padY = clampNumber(9 - (compact / 100) * 5, 4, 9, 9);
        var lh = Math.max(1.18, 1.5 - (compact / 100) * 0.28);
        setCssVar(box, '--preview-bubble-pad-y', padY.toFixed(2) + 'px');
        setCssVar(box, '--preview-bubble-line-height', lh.toFixed(3));

        box.setAttribute('data-preview-avatar', config.avatarVisible ? '1' : '0');
        box.setAttribute('data-kkt', config.kktMerge ? '1' : '0');
        box.setAttribute('data-tail', config.tailEnabled ? '1' : '0');
        box.setAttribute('data-ts', config.timestampEnabled ? '1' : '0');
        box.setAttribute('data-tspos', String(config.timestampPos || 'avatar'));
        box.setAttribute('data-read', config.readEnabled ? '1' : '0');
    }

    function initThemeStudio(container) {
        if (themeStudioInitialized) return;
        themeStudioInitialized = true;

        themeStudioRuntime.config = normalizeThemeConfig(getDefaultThemeConfig());

        var userAvatar = 'assets/chushitouxiang.jpg';
        try {
            if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
                var p = window.MineProfile.getProfile();
                if (p && p.avatar) userAvatar = String(p.avatar);
            }
        } catch (e) { }
        var userAvatarEl = container.querySelector('#theme-preview-user-avatar');
        if (userAvatarEl) userAvatarEl.src = userAvatar;

        var aiColorInput = container.querySelector('#theme-ai-color');
        if (aiColorInput) aiColorInput.value = themeStudioRuntime.config.aiColor;

        var userColorInput = container.querySelector('#theme-user-color');
        if (userColorInput) userColorInput.value = themeStudioRuntime.config.userColor;

        var tailVisibleInput = container.querySelector('#theme-tail-visible');
        if (tailVisibleInput) tailVisibleInput.checked = themeStudioRuntime.config.tailEnabled !== false;

        var tailTopInput = container.querySelector('#theme-tail-top');
        if (tailTopInput) tailTopInput.value = String(themeStudioRuntime.config.tailTop);

        var tailSlimInput = container.querySelector('#theme-tail-slim');
        if (tailSlimInput) tailSlimInput.value = String(themeStudioRuntime.config.tailSlim || 0);

        var bubbleCompactInput = container.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) bubbleCompactInput.value = String(themeStudioRuntime.config.bubbleCompact || 0);

        var kktInput = container.querySelector('#theme-kkt-merge');
        if (kktInput) kktInput.checked = !!themeStudioRuntime.config.kktMerge;

        var shadowInput = container.querySelector('#theme-shadow');
        if (shadowInput) shadowInput.value = String(themeStudioRuntime.config.shadow);

        var avatarVisibleInput = container.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) avatarVisibleInput.checked = !!themeStudioRuntime.config.avatarVisible;

        var avatarSizeInput = container.querySelector('#theme-avatar-size');
        if (avatarSizeInput) avatarSizeInput.value = String(themeStudioRuntime.config.avatarSize);

        var avatarGapInput = container.querySelector('#theme-avatar-gap');
        if (avatarGapInput) avatarGapInput.value = String(themeStudioRuntime.config.avatarBubbleGap || 4);

        var tsVisibleInput = container.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) tsVisibleInput.checked = themeStudioRuntime.config.timestampEnabled !== false;

        syncTimestampPosUI(container, themeStudioRuntime.config.timestampEnabled !== false ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');

        var readVisibleInput = container.querySelector('#theme-read-visible');
        if (readVisibleInput) readVisibleInput.checked = themeStudioRuntime.config.readEnabled !== false;

        var globalCssInput = container.querySelector('#theme-global-css');
        if (globalCssInput) {
            globalCssInput.value = readGlobalBeautifyCss();
        }

        applyPreviewThemeConfig(container, themeStudioRuntime.config);
        renderPresetList(container);
        bindThemeStudioEvents(container);
        syncThemeStudioDockLayout(container);
    }

    function syncThemeStudioDockLayout(container) {
        var scroll = container.querySelector('.theme-studio-scroll');
        var dock = container.querySelector('.theme-preview-dock');
        if (!scroll || !dock) return;

        var apply = function () {
            var h = dock.getBoundingClientRect ? dock.getBoundingClientRect().height : dock.offsetHeight;
            var pad = Math.max(220, Math.round(h || 0) + 16);
            scroll.style.paddingBottom = pad + 'px';
        };

        try {
            requestAnimationFrame(function () {
                apply();
                try {
                    setTimeout(apply, 80);
                } catch (e2) { }
            });
        } catch (e) {
            apply();
        }

        if (!container.__themeDockResizeBound) {
            container.__themeDockResizeBound = true;
            try {
                window.addEventListener('resize', apply);
            } catch (e3) { }
        }
    }

    function bindThemeStudioEvents(container) {
        var panel = container.querySelector('#theme-studio-panel');
        if (!panel || panel.__themeBound) return;
        panel.__themeBound = true;

        panel.addEventListener('click', function (e) {
            var t = e && e.target ? e.target : null;
            if (!t) return;
            var act = t.getAttribute && t.getAttribute('data-theme-action');
            if (act === 'back') {
                toggleThemeStudioPanel(container, false);
                return;
            }
            if (act === 'save') {
                // 优化：点击保存时，提供直接应用到当前角色的选项
                var roleId = typeof window.currentChatRole !== 'undefined' ? window.currentChatRole : '';
                var isEditing = String(themeStudioRuntime.editingPresetId || '').trim();
                
                if (roleId && !isEditing) {
                    var choice = window.confirm('要将当前样式直接应用到当前聊天的角色吗？\n(点"确定"直接应用并存为预设，点"取消"仅存为预设)');
                    if (choice) {
                        saveCurrentConfigAsPreset(container, function(newPresetId) {
                            applyPresetToRole(container, newPresetId, roleId);
                        });
                        return;
                    }
                }
                saveCurrentConfigAsPreset(container);
                return;
            }
            if (act === 'reset') {
                resetThemeStudioToDefault(container);
                return;
            }
            var tex = t.getAttribute && t.getAttribute('data-texture');
            if (tex) {
                setTexture(container, tex);
                return;
            }
            var shape = t.getAttribute && t.getAttribute('data-shape');
            if (shape) {
                setAvatarShape(container, shape);
                return;
            }
            var tspos = t.getAttribute && t.getAttribute('data-tspos');
            if (tspos) {
                setTimestampPos(container, tspos);
                return;
            }
            var applyPresetId = t.getAttribute && t.getAttribute('data-theme-apply');
            if (applyPresetId) {
                openApplySheet(container, applyPresetId);
                return;
            }

            if (t.closest && t.closest('.theme-preset-card')) {
                if (t.closest('.theme-preset-apply')) return;
                var card = t.closest('.theme-preset-card');
                var pid = card ? (card.getAttribute('data-preset-id') || '') : '';
                if (pid) {
                    loadPresetForEdit(container, String(pid));
                }
                return;
            }
        });

        var aiColorInput = panel.querySelector('#theme-ai-color');
        if (aiColorInput) {
            aiColorInput.addEventListener('input', function () {
                themeStudioRuntime.config.aiColor = normalizeHexColor(aiColorInput.value, themeStudioRuntime.config.aiColor);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var globalCssInput = panel.querySelector('#theme-global-css');
        if (globalCssInput) {
            globalCssInput.addEventListener('input', function () {
                writeGlobalBeautifyCss(globalCssInput.value || '');
            });
        }

        var userColorInput = panel.querySelector('#theme-user-color');
        if (userColorInput) {
            userColorInput.addEventListener('input', function () {
                themeStudioRuntime.config.userColor = normalizeHexColor(userColorInput.value, themeStudioRuntime.config.userColor);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tailVisibleInput = panel.querySelector('#theme-tail-visible');
        if (tailVisibleInput) {
            tailVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.tailEnabled = !!tailVisibleInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tailTopInput = panel.querySelector('#theme-tail-top');
        if (tailTopInput) {
            tailTopInput.addEventListener('input', function () {
                themeStudioRuntime.config.tailTop = clampNumber(tailTopInput.value, 0, 28, 14);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tailSlimInput = panel.querySelector('#theme-tail-slim');
        if (tailSlimInput) {
            tailSlimInput.addEventListener('input', function () {
                themeStudioRuntime.config.tailSlim = clampNumber(tailSlimInput.value, 0, 100, 0);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var bubbleCompactInput = panel.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) {
            bubbleCompactInput.addEventListener('input', function () {
                themeStudioRuntime.config.bubbleCompact = clampNumber(bubbleCompactInput.value, 0, 100, 0);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var avatarGapInput = panel.querySelector('#theme-avatar-gap');
        if (avatarGapInput) {
            avatarGapInput.addEventListener('input', function () {
                themeStudioRuntime.config.avatarBubbleGap = clampNumber(avatarGapInput.value, 0, 24, 4);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tsVisibleInput = panel.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) {
            tsVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.timestampEnabled = !!tsVisibleInput.checked;
                if (themeStudioRuntime.config.timestampEnabled && !themeStudioRuntime.config.timestampPos) {
                    themeStudioRuntime.config.timestampPos = 'avatar';
                }
                syncTimestampPosUI(container, themeStudioRuntime.config.timestampEnabled ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var readVisibleInput = panel.querySelector('#theme-read-visible');
        if (readVisibleInput) {
            readVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.readEnabled = !!readVisibleInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var kktInput = panel.querySelector('#theme-kkt-merge');
        if (kktInput) {
            kktInput.addEventListener('change', function () {
                themeStudioRuntime.config.kktMerge = !!kktInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var shadowInput = panel.querySelector('#theme-shadow');
        if (shadowInput) {
            shadowInput.addEventListener('input', function () {
                themeStudioRuntime.config.shadow = clampNumber(shadowInput.value, 0, 24, 8);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var avatarVisibleInput = panel.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) {
            avatarVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.avatarVisible = !!avatarVisibleInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var avatarSizeInput = panel.querySelector('#theme-avatar-size');
        if (avatarSizeInput) {
            avatarSizeInput.addEventListener('input', function () {
                themeStudioRuntime.config.avatarSize = clampNumber(avatarSizeInput.value, 24, 50, 40);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var radiusRanges = panel.querySelectorAll('.theme-radius-range');
        radiusRanges.forEach(function (range) {
            range.addEventListener('input', function () {
                var target = range.getAttribute('data-radius-target') || '';
                var corner = range.getAttribute('data-corner') || '';
                var v = clampNumber(range.value, 0, 30, 12);
                if (target === 'ai' && themeStudioRuntime.config.aiRadius && corner) {
                    themeStudioRuntime.config.aiRadius[corner] = v;
                }
                if (target === 'user' && themeStudioRuntime.config.userRadius && corner) {
                    themeStudioRuntime.config.userRadius[corner] = v;
                }
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        });

        var copyBtn = panel.querySelector('#theme-copy-to-user');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                mirrorRadiusToUser(container);
            });
        }

        var presetList = panel.querySelector('#theme-preset-list');
        if (presetList && !presetList.__themeLongPressBound) {
            presetList.__themeLongPressBound = true;
            var longPressTimer = 0;
            var startX = 0;
            var startY = 0;
            var activePresetId = '';

            var cancelLongPress = function () {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = 0;
                }
                activePresetId = '';
            };

            presetList.addEventListener('pointerdown', function (e) {
                var t = e && e.target ? e.target : null;
                if (!t) return;
                if (t.closest && t.closest('.theme-preset-apply')) return;
                var card = t.closest ? t.closest('.theme-preset-card') : null;
                if (!card) return;
                var pid = card.getAttribute('data-preset-id') || '';
                if (!pid) return;
                cancelLongPress();
                startX = typeof e.clientX === 'number' ? e.clientX : 0;
                startY = typeof e.clientY === 'number' ? e.clientY : 0;
                activePresetId = String(pid);
                longPressTimer = setTimeout(function () {
                    longPressTimer = 0;
                    var presetName = '';
                    var presets = readThemePresets();
                    presets.forEach(function (p) {
                        if (p && String(p.id || '') === activePresetId) presetName = String(p.name || '');
                    });
                    try {
                        var nextName = window.prompt('修改预设名称（留空将删除）', presetName || '预设');
                        if (nextName === null) {
                            activePresetId = '';
                            return;
                        }
                        var trimmed = String(nextName || '').trim();
                        if (!trimmed) {
                            var okDel = window.confirm('删除该预设？');
                            if (okDel) deletePresetById(container, activePresetId);
                            activePresetId = '';
                            return;
                        }
                        renamePresetById(container, activePresetId, trimmed);
                    } catch (err) { }
                    activePresetId = '';
                }, 560);
            });

            presetList.addEventListener('pointermove', function (e) {
                if (!longPressTimer) return;
                var x = typeof e.clientX === 'number' ? e.clientX : 0;
                var y = typeof e.clientY === 'number' ? e.clientY : 0;
                if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) cancelLongPress();
            });

            presetList.addEventListener('pointerup', cancelLongPress);
            presetList.addEventListener('pointercancel', cancelLongPress);
            presetList.addEventListener('pointerleave', cancelLongPress);
        }

        bindThemeSheets(container);
    }

    function resetThemeStudioToDefault(container) {
        try {
            var ok = window.confirm('确定恢复系统初始外观？不会删除预设。');
            if (!ok) return;
        } catch (e) { }

        themeStudioRuntime.editingPresetId = '';
        themeStudioRuntime.applyingPresetId = '';
        themeStudioRuntime.config = normalizeThemeConfig(getDefaultThemeConfig());

        writeGlobalBeautifyCss('');
        try { localStorage.removeItem(THEME_STUDIO_KEYS.global); } catch (e0) { }
        try { localStorage.removeItem(THEME_STUDIO_KEYS.roleBindings); } catch (e1) { }
        try { localStorage.removeItem('chat_bubble_css'); } catch (e2) { }
        try {
            var bubbleStyle1 = document.getElementById('user-custom-css');
            if (bubbleStyle1 && bubbleStyle1.parentNode) bubbleStyle1.parentNode.removeChild(bubbleStyle1);
        } catch (e3) { }
        try {
            var bubbleStyle2 = document.getElementById('chat-bubble-css-style');
            if (bubbleStyle2 && bubbleStyle2.parentNode) bubbleStyle2.parentNode.removeChild(bubbleStyle2);
        } catch (e4) { }
        try {
            var raw = localStorage.getItem('chat_settings_by_role') || '{}';
            var all = safeParseJson(raw, {});
            var changed = false;
            Object.keys(all || {}).forEach(function (k) {
                var item = all[k];
                if (!item || typeof item !== 'object') return;
                if ('bubbleCss' in item) { delete item.bubbleCss; changed = true; }
                if ('fontSize' in item) { delete item.fontSize; changed = true; }
            });
            if (changed) localStorage.setItem('chat_settings_by_role', JSON.stringify(all || {}));
        } catch (e5) { }

        var globalCssInput = container.querySelector('#theme-global-css');
        if (globalCssInput) globalCssInput.value = '';

        var aiColorInput = container.querySelector('#theme-ai-color');
        if (aiColorInput) aiColorInput.value = themeStudioRuntime.config.aiColor;

        var userColorInput = container.querySelector('#theme-user-color');
        if (userColorInput) userColorInput.value = themeStudioRuntime.config.userColor;

        var tailVisibleInput = container.querySelector('#theme-tail-visible');
        if (tailVisibleInput) tailVisibleInput.checked = themeStudioRuntime.config.tailEnabled !== false;

        var tailTopInput = container.querySelector('#theme-tail-top');
        if (tailTopInput) tailTopInput.value = String(themeStudioRuntime.config.tailTop);

        var tailSlimInput = container.querySelector('#theme-tail-slim');
        if (tailSlimInput) tailSlimInput.value = String(themeStudioRuntime.config.tailSlim || 0);

        var bubbleCompactInput = container.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) bubbleCompactInput.value = String(themeStudioRuntime.config.bubbleCompact || 0);

        var kktInput = container.querySelector('#theme-kkt-merge');
        if (kktInput) kktInput.checked = !!themeStudioRuntime.config.kktMerge;

        var shadowInput = container.querySelector('#theme-shadow');
        if (shadowInput) shadowInput.value = String(themeStudioRuntime.config.shadow);

        var avatarVisibleInput = container.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) avatarVisibleInput.checked = !!themeStudioRuntime.config.avatarVisible;

        var avatarSizeInput = container.querySelector('#theme-avatar-size');
        if (avatarSizeInput) avatarSizeInput.value = String(themeStudioRuntime.config.avatarSize);

        var avatarGapInput = container.querySelector('#theme-avatar-gap');
        if (avatarGapInput) avatarGapInput.value = String(themeStudioRuntime.config.avatarBubbleGap || 4);

        var tsVisibleInput = container.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) tsVisibleInput.checked = themeStudioRuntime.config.timestampEnabled !== false;

        syncTimestampPosUI(container, themeStudioRuntime.config.timestampEnabled !== false ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');

        var readVisibleInput = container.querySelector('#theme-read-visible');
        if (readVisibleInput) readVisibleInput.checked = themeStudioRuntime.config.readEnabled !== false;

        setTexture(container, themeStudioRuntime.config.texture || 'solid');
        setAvatarShape(container, themeStudioRuntime.config.avatarShape || 'circle');

        var box = container.querySelector('#theme-user-radius');
        if (box) box.style.display = 'none';
        var ranges = container.querySelectorAll('.theme-radius-range');
        ranges.forEach(function (r) {
            var target = r.getAttribute('data-radius-target') || '';
            var corner = r.getAttribute('data-corner') || '';
            if (target === 'ai' && corner) r.value = String(themeStudioRuntime.config.aiRadius[corner]);
            if (target === 'user' && corner) r.value = String(themeStudioRuntime.config.userRadius[corner]);
        });

        applyPreviewThemeConfig(container, themeStudioRuntime.config);

        try {
            if (window.ThemeStudio && typeof window.ThemeStudio.resetGlobalThemeToSystemDefault === 'function') {
                window.ThemeStudio.resetGlobalThemeToSystemDefault();
            }
        } catch (e2) { }

        try {
            if (typeof window.applyChatBubbleCssFromSettings === 'function') {
                window.applyChatBubbleCssFromSettings(String(window.currentChatRole || ''));
            }
            if (typeof window.applyChatFontSizeFromSettings === 'function') {
                window.applyChatFontSizeFromSettings(String(window.currentChatRole || ''));
            }
        } catch (e3) { }
    }

    function setTexture(container, texture) {
        var seg = container.querySelector('#theme-texture-seg');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var t = b.getAttribute('data-texture') || '';
            if (t === texture) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
        themeStudioRuntime.config.texture = String(texture || 'solid');
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function setAvatarShape(container, shape) {
        var seg = container.querySelector('#theme-avatar-shape-seg');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var t = b.getAttribute('data-shape') || '';
            if (t === shape) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
        themeStudioRuntime.config.avatarShape = shape === 'squircle' ? 'squircle' : 'circle';
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function syncTimestampPosUI(container, tspos) {
        var seg = container.querySelector('#theme-timestamp-pos');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var v = b.getAttribute('data-tspos') || '';
            if (v === tspos) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
    }

    function setTimestampPos(container, tspos) {
        var v = String(tspos || '').trim();
        if (!v) return;
        var enabled = v !== 'off';
        themeStudioRuntime.config.timestampEnabled = enabled;
        if (enabled) {
            themeStudioRuntime.config.timestampPos = (v === 'bubble') ? 'bubble' : 'avatar';
        }
        var checkbox = container.querySelector('#theme-timestamp-visible');
        if (checkbox) checkbox.checked = enabled;
        syncTimestampPosUI(container, enabled ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function mirrorRadiusToUser(container) {
        var ai = themeStudioRuntime.config.aiRadius || { tl: 12, tr: 12, bl: 6, br: 12 };
        themeStudioRuntime.config.userRadius = {
            tl: ai.tr,
            tr: ai.tl,
            bl: ai.br,
            br: ai.bl
        };
        var box = container.querySelector('#theme-user-radius');
        if (box) box.style.display = '';
        var ranges = container.querySelectorAll('.theme-radius-range[data-radius-target="user"]');
        ranges.forEach(function (r) {
            var c = r.getAttribute('data-corner') || '';
            if (!c) return;
            r.value = String(themeStudioRuntime.config.userRadius[c]);
        });
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function saveCurrentConfigAsPreset(container, onSuccess) {
        var presets = readThemePresets();
        var editingId = String(themeStudioRuntime.editingPresetId || '').trim();
        if (editingId) {
            var changed = false;
            presets.forEach(function (p) {
                if (p && String(p.id || '') === editingId) {
                    p.config = JSON.parse(JSON.stringify(themeStudioRuntime.config || getDefaultThemeConfig()));
                    p.updatedAt = Date.now();
                    changed = true;
                }
            });
            if (changed) writeThemePresets(presets);
            renderPresetList(container);
            if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
                window.GlobalModal.showError('已保存修改');
            } else {
                alert('已保存修改');
            }
            if (typeof onSuccess === 'function') onSuccess(editingId);
            return;
        }

        var idx = presets.length + 1;
        var defaultName = '预设 ' + idx;
        var name = defaultName;
        try {
            var inputName = window.prompt('预设名称', defaultName);
            if (inputName === null) return;
            name = String(inputName || '').trim() || defaultName;
        } catch (e) {
            name = defaultName;
        }
        var id = 'preset_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        var item = {
            id: id,
            name: name,
            createdAt: Date.now(),
            config: JSON.parse(JSON.stringify(themeStudioRuntime.config || getDefaultThemeConfig()))
        };
        presets.unshift(item);
        writeThemePresets(presets);
        renderPresetList(container);
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError('已保存为预设');
        } else if (!onSuccess) {
            alert('已保存为预设');
        }
        if (typeof onSuccess === 'function') onSuccess(id);
    }

    function renderPresetList(container) {
        var listEl = container.querySelector('#theme-preset-list');
        var countEl = container.querySelector('#theme-preset-count');
        if (!listEl) return;
        var presets = readThemePresets();
        if (countEl) countEl.textContent = String(presets.length);
        var editingId = String(themeStudioRuntime.editingPresetId || '').trim();
        if (!presets.length) {
            listEl.innerHTML = '<div class="theme-empty">暂无预设，先调一套再保存吧。</div>';
            return;
        }
        var html = '';
        presets.forEach(function (p) {
            var name = p && p.name ? String(p.name) : '未命名';
            var pid = p && p.id ? String(p.id) : '';
            var editingClass = editingId && pid === editingId ? ' is-editing' : '';
            html += '<div class="theme-preset-card' + editingClass + '" data-preset-id="' + escapeHtml(pid) + '">';
            html += '  <div class="theme-preset-main">';
            html += '    <div class="theme-preset-name">' + escapeHtml(name) + '</div>';
            html += '    <div class="theme-preset-meta">' + formatTime(p && p.createdAt) + '</div>';
            html += '  </div>';
            html += '  <button type="button" class="theme-preset-apply" data-theme-apply="' + escapeHtml(pid) + '">应用</button>';
            html += '</div>';
        });
        listEl.innerHTML = html;
    }

    function deletePresetById(container, presetId) {
        var pid = String(presetId || '').trim();
        if (!pid) return;
        var presets = readThemePresets();
        var next = [];
        presets.forEach(function (p) {
            if (p && String(p.id || '') !== pid) next.push(p);
        });
        writeThemePresets(next);
        var bindings = readRoleBindings();
        var changed = false;
        Object.keys(bindings || {}).forEach(function (k) {
            if (String(bindings[k] || '') === pid) {
                delete bindings[k];
                changed = true;
            }
        });
        if (changed) writeRoleBindings(bindings);
        renderPresetList(container);
    }

    function renamePresetById(container, presetId, nextName) {
        var pid = String(presetId || '').trim();
        var name = String(nextName || '').trim();
        if (!pid || !name) return;
        var presets = readThemePresets();
        var changed = false;
        presets.forEach(function (p) {
            if (p && String(p.id || '') === pid) {
                p.name = name;
                changed = true;
            }
        });
        if (changed) writeThemePresets(presets);
        renderPresetList(container);
    }

    function loadPresetForEdit(container, presetId) {
        var pid = String(presetId || '').trim();
        if (!pid) return;
        var presets = readThemePresets();
        var target = null;
        presets.forEach(function (p) {
            if (!target && p && String(p.id || '') === pid) target = p;
        });
        if (!target || !target.config) return;
        themeStudioRuntime.editingPresetId = pid;
        themeStudioRuntime.config = normalizeThemeConfig(target.config);
        syncEditorUiFromConfig(container, themeStudioRuntime.config);
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
        renderPresetList(container);
        syncThemeStudioDockLayout(container);
    }

    function syncEditorUiFromConfig(container, config) {
        var c = config || getDefaultThemeConfig();
        var aiColorInput = container.querySelector('#theme-ai-color');
        if (aiColorInput) aiColorInput.value = c.aiColor;
        var userColorInput = container.querySelector('#theme-user-color');
        if (userColorInput) userColorInput.value = c.userColor;

        var tailVisibleInput = container.querySelector('#theme-tail-visible');
        if (tailVisibleInput) tailVisibleInput.checked = c.tailEnabled !== false;
        var tailTopInput = container.querySelector('#theme-tail-top');
        if (tailTopInput) tailTopInput.value = String(c.tailTop);
        var tailSlimInput = container.querySelector('#theme-tail-slim');
        if (tailSlimInput) tailSlimInput.value = String(c.tailSlim || 0);
        var bubbleCompactInput = container.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) bubbleCompactInput.value = String(c.bubbleCompact || 0);

        var kktInput = container.querySelector('#theme-kkt-merge');
        if (kktInput) kktInput.checked = !!c.kktMerge;
        var shadowInput = container.querySelector('#theme-shadow');
        if (shadowInput) shadowInput.value = String(c.shadow);

        var avatarVisibleInput = container.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) avatarVisibleInput.checked = !!c.avatarVisible;
        var avatarSizeInput = container.querySelector('#theme-avatar-size');
        if (avatarSizeInput) avatarSizeInput.value = String(c.avatarSize);
        var avatarGapInput = container.querySelector('#theme-avatar-gap');
        if (avatarGapInput) avatarGapInput.value = String(c.avatarBubbleGap || 4);

        var tsVisibleInput = container.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) tsVisibleInput.checked = c.timestampEnabled !== false;
        syncTimestampPosUI(container, c.timestampEnabled !== false ? (c.timestampPos || 'avatar') : 'off');

        var readVisibleInput = container.querySelector('#theme-read-visible');
        if (readVisibleInput) readVisibleInput.checked = c.readEnabled !== false;

        setTexture(container, c.texture || 'solid');
        setAvatarShape(container, c.avatarShape || 'circle');

        var aiRanges = container.querySelectorAll('.theme-radius-range[data-radius-target="ai"]');
        aiRanges.forEach(function (r) {
            var corner = r.getAttribute('data-corner') || '';
            if (corner && c.aiRadius && typeof c.aiRadius[corner] === 'number') r.value = String(c.aiRadius[corner]);
        });

        var userRanges = container.querySelectorAll('.theme-radius-range[data-radius-target="user"]');
        userRanges.forEach(function (r) {
            var corner = r.getAttribute('data-corner') || '';
            if (corner && c.userRadius && typeof c.userRadius[corner] === 'number') r.value = String(c.userRadius[corner]);
        });
        var userBox = container.querySelector('#theme-user-radius');
        if (userBox) userBox.style.display = '';
    }

    function bindThemeSheets(container) {
        var applySheet = container.querySelector('#theme-apply-sheet');
        if (applySheet && !applySheet.__themeSheetBound) {
            applySheet.__themeSheetBound = true;
            applySheet.addEventListener('click', function (e) {
                var t = e && e.target ? e.target : null;
                if (!t) return;
                var act = t.getAttribute && t.getAttribute('data-theme-sheet');
                if (!act) return;
                if (act === 'close') {
                    closeApplySheet(container);
                    return;
                }
                if (act === 'apply-global') {
                    applyPresetToGlobal(container, themeStudioRuntime.applyingPresetId);
                    closeApplySheet(container);
                    return;
                }
                if (act === 'apply-role') {
                    closeApplySheet(container);
                    openRolePicker(container, function (roleId) {
                        applyPresetToRole(container, themeStudioRuntime.applyingPresetId, roleId);
                    });
                    return;
                }
            });
        }

        var picker = container.querySelector('#theme-role-picker');
        if (picker && !picker.__themePickerBound) {
            picker.__themePickerBound = true;
            picker.addEventListener('click', function (e) {
                var t = e && e.target ? e.target : null;
                if (!t) return;
                var act = t.getAttribute && t.getAttribute('data-theme-picker');
                if (act === 'close') {
                    closeRolePicker(container);
                    return;
                }
                var rid = t.getAttribute && t.getAttribute('data-role-id');
                if (rid) {
                    var cb = themeStudioRuntime.applyRolePickCallback;
                    themeStudioRuntime.applyRolePickCallback = null;
                    closeRolePicker(container);
                    if (typeof cb === 'function') cb(String(rid));
                }
            });
        }
    }

    function openApplySheet(container, presetId) {
        var sheet = container.querySelector('#theme-apply-sheet');
        if (!sheet) return;
        themeStudioRuntime.applyingPresetId = String(presetId || '');
        sheet.style.display = 'flex';
        sheet.setAttribute('aria-hidden', 'false');
    }

    function closeApplySheet(container) {
        var sheet = container.querySelector('#theme-apply-sheet');
        if (!sheet) return;
        sheet.style.display = 'none';
        sheet.setAttribute('aria-hidden', 'true');
        themeStudioRuntime.applyingPresetId = '';
    }

    function applyPresetToGlobal(container, presetId) {
        var presets = readThemePresets();
        var target = null;
        presets.forEach(function (p) {
            if (!target && p && String(p.id || '') === String(presetId || '')) target = p;
        });
        if (!target || !target.config) return;
        writeGlobalThemeConfig(target.config);
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError('已应用到全局');
        }
    }

    function applyPresetToRole(container, presetId, roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return;
        var bindings = readRoleBindings();
        bindings[rid] = String(presetId || '');
        writeRoleBindings(bindings);
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError('已绑定到角色');
        } else {
            alert('已绑定到角色');
        }
        
        // 关键修复：绑定角色后立即应用最新配置
        if (window.ThemeStudio && typeof window.ThemeStudio.applyThemeToChat === 'function') {
            // 我们不能直接拿到 chatEl，但是 applyThemeToChat 内部会自动去找 document.getElementById('chat-room-layer')
            window.ThemeStudio.applyThemeToChat(rid);
        }
    }

    function openRolePicker(container, onPick) {
        var picker = container.querySelector('#theme-role-picker');
        var body = container.querySelector('#theme-role-picker-body');
        if (!picker || !body) return;
        themeStudioRuntime.applyRolePickCallback = onPick;
        var profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
        var ids = Object.keys(profiles || {});
        ids.sort(function (a, b) {
            var pa = profiles[a] || {};
            var pb = profiles[b] || {};
            var na = String(pa.remark || pa.nickName || a);
            var nb = String(pb.remark || pb.nickName || b);
            return na.localeCompare(nb);
        });
        var html = '';
        ids.forEach(function (id) {
            var p = profiles[id] || {};
            var name = String(p.remark || p.nickName || id);
            var avatar = String(p.avatar || p.avatarUrl || 'assets/chushitouxiang.jpg');
            html += '<button type="button" class="theme-role-item" data-role-id="' + escapeHtml(id) + '">';
            html += '  <img class="theme-role-avatar" src="' + escapeHtml(avatar) + '" alt="">';
            html += '  <span class="theme-role-name">' + escapeHtml(name) + '</span>';
            html += '</button>';
        });
        if (!html) {
            html = '<div class="theme-empty" style="padding:18px;">暂无角色数据</div>';
        }
        body.innerHTML = html;
        picker.style.display = 'flex';
        picker.setAttribute('aria-hidden', 'false');
    }

    function closeRolePicker(container) {
        var picker = container.querySelector('#theme-role-picker');
        if (!picker) return;
        picker.style.display = 'none';
        picker.setAttribute('aria-hidden', 'true');
        themeStudioRuntime.applyRolePickCallback = null;
    }

    function renderFavorites(container) {
        var listEl = container.querySelector('#mine-favorites-list');
        if (!listEl) return;
        var list = getFavoritesList();
        list = list.slice().sort(function (a, b) {
            var ta = a && typeof a.timestamp === 'number' ? a.timestamp : 0;
            var tb = b && typeof b.timestamp === 'number' ? b.timestamp : 0;
            return tb - ta;
        });
        if (!list.length) {
            listEl.innerHTML = '<div class="mine-favorites-empty">暂无收藏</div>';
            return;
        }
        var html = '';
        list.forEach(function (fav) {
            var id = fav && fav.id ? String(fav.id) : '';
            var avatar = fav && fav.senderAvatar ? String(fav.senderAvatar) : 'assets/chushitouxiang.jpg';
            var name = fav && fav.senderName ? String(fav.senderName) : 'TA';
            var timeText = formatTime(fav && fav.timestamp);
            var content = fav && fav.content ? String(fav.content) : '';
            content = content.replace(/\s+/g, ' ').trim();
            if (content.length > 80) content = content.slice(0, 80) + '...';
            html += '<div class="mine-fav-item" data-fav-id="' + id + '">';
            html += '  <div class="mine-fav-avatar"><img src="' + avatar + '" alt=""></div>';
            html += '  <div class="mine-fav-main">';
            html += '    <div class="mine-fav-top">';
            html += '      <div class="mine-fav-name">' + name + '</div>';
            html += '      <div class="mine-fav-time">' + timeText + '</div>';
            html += '    </div>';
            html += '    <div class="mine-fav-content">' + content + '</div>';
            html += '  </div>';
            html += '</div>';
        });
        listEl.innerHTML = html;
        var items = listEl.querySelectorAll('.mine-fav-item');
        items.forEach(function (el) {
            el.onclick = function () {
                var id = el.getAttribute('data-fav-id') || '';
                var picked = null;
                for (var i = 0; i < list.length; i++) {
                    if (String(list[i] && list[i].id || '') === String(id)) {
                        picked = list[i];
                        break;
                    }
                }
                if (!picked) return;
                if (picked.roleId && window.enterChatRoom && typeof window.enterChatRoom === 'function') {
                    window.enterChatRoom(String(picked.roleId));
                    setTimeout(function () {
                        if (picked.messageId && window.scrollToChatMessageById && typeof window.scrollToChatMessageById === 'function') {
                            window.scrollToChatMessageById(String(picked.messageId));
                        }
                    }, 380);
                }
            };
        });
    }

    function closeEditOverlay(container) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('data-field', '');
    }

    function saveEditOverlay(container) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        var field = overlay.getAttribute('data-field') || '';
        var input = container.querySelector('#mine-edit-input');
        var textarea = container.querySelector('#mine-edit-textarea');
        if (!field) return closeEditOverlay(container);

        if (field === 'name') {
            var nameVal = input ? String(input.value || '').trim() : '';
            if (window.MineProfile && typeof window.MineProfile.setName === 'function') {
                window.MineProfile.setName(nameVal);
            }
        } else if (field === 'signature') {
            var signVal = textarea ? String(textarea.value || '') : '';
            if (window.MineProfile && typeof window.MineProfile.setSignature === 'function') {
                window.MineProfile.setSignature(signVal);
            }
        }
        closeEditOverlay(container);
    }

    function openEditOverlay(container, field) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        var title = container.querySelector('#mine-edit-title');
        var input = container.querySelector('#mine-edit-input');
        var textarea = container.querySelector('#mine-edit-textarea');

        var profile = null;
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            profile = window.MineProfile.getProfile();
        }
        profile = profile || { name: '', signature: '' };

        overlay.setAttribute('data-field', field || '');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');

        if (field === 'name') {
            if (title) title.textContent = '修改昵称';
            if (input) {
                input.style.display = '';
                input.value = profile.name || '';
            }
            if (textarea) textarea.style.display = 'none';
            setTimeout(function () {
                try { input && input.focus(); } catch (e) { }
                try { input && input.select && input.select(); } catch (e2) { }
            }, 0);
        } else if (field === 'signature') {
            if (title) title.textContent = '修改个性签名';
            if (textarea) {
                textarea.style.display = '';
                textarea.value = profile.signature || '';
            }
            if (input) input.style.display = 'none';
            setTimeout(function () {
                try { textarea && textarea.focus(); } catch (e) { }
            }, 0);
        }
    }

    function bindEvents(container) {
        var avatarBox = container.querySelector('[data-mine-action="change-avatar"]');
        var avatarInput = container.querySelector('#mine-avatar-input');
        if (avatarInput) avatarInput.value = '';
        if (avatarBox && avatarInput) {
            avatarBox.onclick = function () {
                try { avatarInput.click(); } catch (e) { }
            };
        }
        if (avatarInput) {
            avatarInput.onchange = function () {
                var file = avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;
                readImageFileAsAvatar(file, function (avatarDataUrl) {
                    if (avatarDataUrl && window.MineProfile && typeof window.MineProfile.setAvatar === 'function') {
                        window.MineProfile.setAvatar(avatarDataUrl);
                    }
                });
                avatarInput.value = '';
            };
        }

        var nameEl = container.querySelector('[data-mine-action="edit-name"]');
        if (nameEl) {
            nameEl.onclick = function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                openEditOverlay(container, 'name');
            };
        }
        var signEl = container.querySelector('[data-mine-action="edit-signature"]');
        if (signEl) {
            signEl.onclick = function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                openEditOverlay(container, 'signature');
            };
        }

        var editOverlay = container.querySelector('#mine-edit-overlay');
        if (editOverlay) {
            editOverlay.onclick = function (e) {
                if (e && e.target === editOverlay) closeEditOverlay(container);
            };
            var cancelBtn = editOverlay.querySelector('[data-mine-edit="cancel"]');
            if (cancelBtn) cancelBtn.onclick = function () { closeEditOverlay(container); };
            var saveBtn = editOverlay.querySelector('[data-mine-edit="save"]');
            if (saveBtn) saveBtn.onclick = function () { saveEditOverlay(container); };

            var editInput = container.querySelector('#mine-edit-input');
            if (editInput) {
                editInput.onkeydown = function (e) {
                    if (!e) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeEditOverlay(container);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEditOverlay(container);
                    }
                };
            }
            var editTextarea = container.querySelector('#mine-edit-textarea');
            if (editTextarea) {
                editTextarea.onkeydown = function (e) {
                    if (!e) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeEditOverlay(container);
                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        saveEditOverlay(container);
                    }
                };
            }
        }

        var panelBack = container.querySelector('[data-fav-action="back"]');
        if (panelBack) {
            panelBack.onclick = function () {
                toggleFavoritesPanel(container, false);
            };
        }
        var items = container.querySelectorAll('.mine-list-item');
        items.forEach(function (item) {
            item.addEventListener('click', function () {
                var type = item.getAttribute('data-mine-item');
                if (type === 'wallet') {
                    try {
                        if (typeof window.recordActivity === 'function') window.recordActivity('进入了微信-我的-钱包');
                    } catch (e) { }
                    if (window.Wallet && typeof window.Wallet.open === 'function') {
                        window.Wallet.open();
                    }
                } else if (type === 'favorites') {
                    toggleFavoritesPanel(container, true);
                    renderFavorites(container);
                } else if (type === 'theme-studio') {
                    toggleThemeStudioPanel(container, true);
                    initThemeStudio(container);
                } else if (type === 'sports') {
                    if (window.SportsLeaderboard && typeof window.SportsLeaderboard.show === 'function') {
                        window.SportsLeaderboard.show();
                    }
                } else if (type === 'period') {
                    try {
                        if (typeof window.recordActivity === 'function') window.recordActivity('进入了经期');
                    } catch (e) { }
                    if (window.PeriodApp && typeof window.PeriodApp.show === 'function') {
                        window.PeriodApp.show();
                    }
                }
            });
        });
    }

    function render() {
        var container = document.getElementById('mine-view');
        if (!container) return;
        themeStudioInitialized = false;
        themeStudioRuntime.config = null;
        themeStudioRuntime.applyingPresetId = '';
        themeStudioRuntime.editingPresetId = '';
        themeStudioRuntime.applyRolePickCallback = null;
        container.innerHTML = buildHtml();
        bindEvents(container);
        if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
        initialized = true;
    }

    function show() {
        var container = document.getElementById('mine-view');
        if (!container) return;
        if (!initialized || !container.querySelector || !container.querySelector('.mine-root')) {
            render();
        } else if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
    }

    function refreshProfile() {
        if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
    }

    try {
        applyGlobalBeautifyCss(readGlobalBeautifyCss());
    } catch (e) { }

    return {
        show: show,
        render: render,
        refreshProfile: refreshProfile
    };
})();

window.MineCore = MineCore;
