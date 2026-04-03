/* =========================================================
   文件路径：JS/worldbook.js
   作用：世界书系统 (存储设定集，供角色关联)
   ========================================================= */

// --- 全局变量 ---
window.worldBooks = window.worldBooks || {}; // 存储格式: { id: { title: "", content: "" } }
window.worldBookCategories = window.worldBookCategories || [];
window.worldBookActiveCategory = window.worldBookActiveCategory || 'all';

// 1. 初始化读取数据
function loadWorldBooks() {
    try {
        const saved = localStorage.getItem('wechat_worldbooks');
        if (saved) {
            window.worldBooks = JSON.parse(saved);
        }
        const savedCategories = localStorage.getItem('wechat_worldbook_categories');
        if (savedCategories) {
            const parsed = JSON.parse(savedCategories);
            if (Array.isArray(parsed)) {
                window.worldBookCategories = parsed.filter(Boolean).map(s => String(s).trim()).filter(Boolean);
            }
        }
        const savedActive = localStorage.getItem('wechat_worldbook_active_category');
        if (savedActive) {
            window.worldBookActiveCategory = String(savedActive);
        }
    } catch (e) { console.error("读取世界书失败", e); }
}

// 2. 保存数据
function saveWorldBooks() {
    localStorage.setItem('wechat_worldbooks', JSON.stringify(window.worldBooks));
}

function saveWorldBookCategories() {
    localStorage.setItem('wechat_worldbook_categories', JSON.stringify(window.worldBookCategories || []));
}

function normalizeWorldBookCategories() {
    const seen = new Set();
    const out = [];
    const add = function (name) {
        const n = String(name || '').trim();
        if (!n) return;
        if (n === '全部') return;
        if (seen.has(n)) return;
        seen.add(n);
        out.push(n);
    };

    (window.worldBookCategories || []).forEach(add);
    Object.keys(window.worldBooks || {}).forEach(id => {
        const book = window.worldBooks[id];
        if (!book) return;
        if (book.category) add(book.category);
    });

    window.worldBookCategories = out;
    saveWorldBookCategories();
}

// 3. 打开世界书 APP (渲染列表)
window.openWorldBookApp = function() {
    // A. 切换到全屏 APP 视图
    const appWindow = document.getElementById('app-window');
    const contentArea = document.getElementById('app-content-area');
    const title = document.getElementById('app-title-text');
    const plusBtn = document.getElementById('top-plus-btn');

    if (!appWindow || !contentArea || !title) {
        console.error('找不到必要的DOM元素');
        return;
    }

    // 【核心修复】清除容器样式，确保干净的环境
    contentArea.setAttribute('style', ''); 
    
    // 显示应用窗口（使用正确的类名）
    appWindow.classList.add('active');
    
    // B. 设置标题和按钮
    title.innerText = "世界书 (设定集)";
    if (plusBtn) {
        plusBtn.style.display = 'block';
        plusBtn.onclick = openWorldBookPlusMenu;
    }

    // 【重要】恢复返回按钮的原始功能（关闭应用返回桌面）
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.onclick = function() {
            closeApp();
            document.getElementById('top-plus-btn').style.display = 'none';
        };
    }

    // C. 渲染列表
    normalizeWorldBookCategories();
    renderBookList();
};

// 4. 渲染书籍列表（支持分类显示）
function renderBookList() {
    const contentArea = document.getElementById('app-content-area');
    contentArea.innerHTML = ""; // 清空

    const ids = Object.keys(window.worldBooks);
    const categories = Array.isArray(window.worldBookCategories) ? window.worldBookCategories : [];
    let activeCategory = (typeof window.worldBookActiveCategory === 'string' && window.worldBookActiveCategory) ? window.worldBookActiveCategory : 'all';
    if (activeCategory !== 'all' && !categories.includes(activeCategory)) {
        activeCategory = 'all';
        window.worldBookActiveCategory = 'all';
        localStorage.setItem('wechat_worldbook_active_category', 'all');
    }

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';
    wrapper.style.background = '#f2f2f7';

    const tabs = document.createElement('div');
    tabs.style.padding = '10px 15px 0 15px';
    tabs.style.background = '#f2f2f7';

    const tabsRow = document.createElement('div');
    tabsRow.style.display = 'flex';
    tabsRow.style.gap = '8px';
    tabsRow.style.overflowX = 'auto';
    tabsRow.style.padding = '8px 0 10px 0';
    tabsRow.style.whiteSpace = 'nowrap';

    const makeTab = function (label, value) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        const isActive = value === activeCategory;
        btn.style.border = isActive ? '1px solid #007aff' : '1px solid #e5e5e5';
        btn.style.background = isActive ? 'rgba(0,122,255,0.08)' : '#fff';
        btn.style.color = isActive ? '#007aff' : '#333';
        btn.style.borderRadius = '999px';
        btn.style.padding = '6px 12px';
        btn.style.fontSize = '13px';
        btn.style.cursor = 'pointer';
        btn.onclick = function () {
            window.worldBookActiveCategory = value;
            localStorage.setItem('wechat_worldbook_active_category', String(value));
            renderBookList();
        };
        return btn;
    };

    tabsRow.appendChild(makeTab('全部', 'all'));
    categories.forEach(c => tabsRow.appendChild(makeTab(c, c)));
    tabs.appendChild(tabsRow);

    const list = document.createElement('div');
    list.style.flex = '1';
    list.style.overflowY = 'auto';
    list.style.padding = '10px 15px 30px 15px';

    const filteredIds = ids.slice().filter(id => {
        const book = window.worldBooks[id];
        if (!book) return false;
        if (activeCategory === 'all') return true;
        return String(book.category || '').trim() === activeCategory;
    }).sort((a, b) => {
        const ta = String((window.worldBooks[a] && window.worldBooks[a].title) || '');
        const tb = String((window.worldBooks[b] && window.worldBooks[b].title) || '');
        return ta.localeCompare(tb, 'zh-Hans-CN', { sensitivity: 'base' });
    });

    if (filteredIds.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:60%; color:#999; padding-top:30px;';
        empty.innerHTML = `
            <div style="font-size:50px; margin-bottom:16px;">📖</div>
            <div>${activeCategory === 'all' ? '这里空空如也' : '这个分类还没有设定集'}</div>
            <div style="font-size:12px; margin-top:6px;">点击右上角 + 号创建</div>
        `;
        list.appendChild(empty);
    } else {
        if (activeCategory === 'all') {
            const categorized = {};
            filteredIds.forEach(id => {
                const book = window.worldBooks[id];
                const cat = String(book.category || '').trim() || '未分类';
                if (!categorized[cat]) categorized[cat] = [];
                categorized[cat].push(id);
            });

            const catKeys = Object.keys(categorized).sort((a, b) => {
                if (a === '未分类' && b !== '未分类') return 1;
                if (b === '未分类' && a !== '未分类') return -1;
                return a.localeCompare(b, 'zh-Hans-CN', { sensitivity: 'base' });
            });

            catKeys.forEach(cat => {
                const header = document.createElement('div');
                header.style.cssText = `
                    font-size: 13px;
                    color: #666;
                    font-weight: bold;
                    margin: 20px 0 10px 5px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #e5e5e5;
                `;
                header.textContent = cat;
                list.appendChild(header);

                categorized[cat].sort((a, b) => {
                    const ta = String((window.worldBooks[a] && window.worldBooks[a].title) || '');
                    const tb = String((window.worldBooks[b] && window.worldBooks[b].title) || '');
                    return ta.localeCompare(tb, 'zh-Hans-CN', { sensitivity: 'base' });
                }).forEach(id => {
                    const book = window.worldBooks[id];
                    const item = document.createElement('div');
                    item.style.cssText = `
                        background: #fff; padding: 15px; border-radius: 12px; margin-bottom: 10px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;
                    `;

                    const preview = book.content || "暂无内容...";
                    item.innerHTML = `
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:bold; font-size:16px; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${book.title}</div>
                            <div style="font-size:12px; color:#888; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                ${preview}
                            </div>
                        </div>
                        <div style="color:#ccc; margin-left:10px;">›</div>
                    `;

                    item.onclick = () => editBook(id);
                    list.appendChild(item);
                });
            });
        } else {
            filteredIds.forEach(id => {
                const book = window.worldBooks[id];
                const item = document.createElement('div');
                item.style.cssText = `
                    background: #fff; padding: 15px; border-radius: 12px; margin-bottom: 10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;
                `;

                const preview = book.content || "暂无内容...";
                item.innerHTML = `
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:bold; font-size:16px; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${book.title}</div>
                        <div style="font-size:12px; color:#888; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${preview}
                        </div>
                    </div>
                    <div style="color:#ccc; margin-left:10px;">›</div>
                `;

                item.onclick = () => editBook(id);
                list.appendChild(item);
            });
        }
    }

    wrapper.appendChild(tabs);
    wrapper.appendChild(list);
    contentArea.appendChild(wrapper);
}

function closeWorldBookOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function openWorldBookInputModal(options) {
    const title = options && options.title ? String(options.title) : '';
    const placeholder = options && options.placeholder ? String(options.placeholder) : '';
    const initialValue = options && options.initialValue ? String(options.initialValue) : '';
    const onConfirm = options && typeof options.onConfirm === 'function' ? options.onConfirm : null;

    closeWorldBookOverlay('worldbook-input-modal');

    const modalHtml = `
        <div id="worldbook-input-modal" style="position:fixed; inset:0; z-index:10080; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; padding:24px;" onclick="closeWorldBookOverlay('worldbook-input-modal')">
            <div style="width:100%; max-width:320px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
                <div style="padding:14px 16px; font-weight:700; color:#111; border-bottom:1px solid #f0f0f0;">${title}</div>
                <div style="padding:14px 16px;">
                    <input id="worldbook-input-value" value="${initialValue.replace(/"/g, '&quot;')}" placeholder="${placeholder.replace(/"/g, '&quot;')}"
                        style="width:100%; padding:12px 12px; border:1px solid #e5e5e5; border-radius:12px; outline:none; font-size:14px; box-sizing:border-box;">
                </div>
                <div style="display:flex; gap:10px; padding:0 16px 16px 16px;">
                    <button type="button" style="flex:1; padding:11px 0; border-radius:12px; border:1px solid #e5e5e5; background:#fff; color:#333; font-weight:600;" onclick="closeWorldBookOverlay('worldbook-input-modal')">取消</button>
                    <button type="button" style="flex:1; padding:11px 0; border-radius:12px; border:none; background:#007aff; color:#fff; font-weight:700;" onclick="(function(){var v=document.getElementById('worldbook-input-value'); var s=v?v.value:''; closeWorldBookOverlay('worldbook-input-modal'); if(window.__worldbookInputConfirm){window.__worldbookInputConfirm(s); window.__worldbookInputConfirm=null;}})()">确定</button>
                </div>
            </div>
        </div>
    `;

    window.__worldbookInputConfirm = function (value) {
        if (onConfirm) onConfirm(value);
    };

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const input = document.getElementById('worldbook-input-value');
    if (input) input.focus();
}

function openWorldBookPlusMenu() {
    closeWorldBookOverlay('worldbook-plus-menu');
    const menuHtml = `
        <div id="worldbook-plus-menu" style="position:fixed; inset:0; z-index:10070; background:rgba(0,0,0,0.25); display:flex; align-items:flex-start; justify-content:flex-end; padding:70px 16px 16px 16px;" onclick="closeWorldBookOverlay('worldbook-plus-menu')">
            <div style="width:190px; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
                <div style="padding:12px 14px; font-size:14px; cursor:pointer;" onclick="closeWorldBookOverlay('worldbook-plus-menu'); createNewBook();">创建书名</div>
                <div style="height:1px; background:#f0f0f0;"></div>
                <div style="padding:12px 14px; font-size:14px; cursor:pointer;" onclick="closeWorldBookOverlay('worldbook-plus-menu'); createNewCategory();">创建分类</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuHtml);
}

function createNewCategory() {
    openWorldBookInputModal({
        title: '创建分类',
        placeholder: '输入分类名称',
        onConfirm: function (raw) {
            const name = String(raw || '').trim();
            if (!name) return;
            if (!Array.isArray(window.worldBookCategories)) window.worldBookCategories = [];
            window.worldBookCategories.push(name);
            normalizeWorldBookCategories();
            window.worldBookActiveCategory = name;
            localStorage.setItem('wechat_worldbook_active_category', name);
            renderBookList();
        }
    });
}

// 5. 新建书籍（支持分类）
function createNewBook() {
    const active = (typeof window.worldBookActiveCategory === 'string' && window.worldBookActiveCategory) ? window.worldBookActiveCategory : 'all';
    openWorldBookInputModal({
        title: '创建书名',
        placeholder: '输入设定集名称',
        onConfirm: function (raw) {
            const title = String(raw || '').trim();
            if (!title) return;

            const newId = 'book_' + Date.now();
            window.worldBooks[newId] = {
                title: title,
                category: active === 'all' ? '' : active,
                content: ""
            };
            saveWorldBooks();
            normalizeWorldBookCategories();
            renderBookList();
        }
    });
}

// 6. 编辑书籍 (复用 prompt 简单实现，后期可以做弹窗)
function editBook(id) {
    const book = window.worldBooks[id];
    
    // 这里的交互比较简单，如果你想做复杂弹窗也可以，但 prompt 够用了
    // 第一步：改名？
    // const newTitle = prompt("修改标题 (留空则不改):", book.title);
    // if (newTitle) book.title = newTitle;

    // 核心：修改内容
    // 由于 prompt 写大段文字不方便，建议这里我们复用那个 #editor-modal 或者做一个专用的 textarea 页面
    // 为了简单起见，我们先用一个临时的全屏 textarea 页面
    
    openBookEditorUI(id);
}

// 7. 专用书籍编辑器 UI (临时生成的 DOM)
function openBookEditorUI(id) {
    const book = window.worldBooks[id];
    const appWindow = document.getElementById('app-window');
    
    // 临时覆盖 app-content-area
    const contentArea = document.getElementById('app-content-area');
    const categoryValue = String(book.category || '').trim();
    const contentValue = book.content || '';
    const categories = Array.isArray(window.worldBookCategories) ? window.worldBookCategories : [];
    const safeAttr = function (s) { return String(s || '').replace(/"/g, '&quot;'); };
    const normalizedCategories = categories
        .map(c => String(c || '').trim())
        .filter(c => c && c !== '未分类');
    const optionsHtml = [''].concat(normalizedCategories).map(val => {
        const selected = val === categoryValue ? 'selected' : '';
        const label = val ? val : '未分类';
        return `<option value="${safeAttr(val)}" ${selected}>${label}</option>`;
    }).join('');
    
    contentArea.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; padding:15px; background:#f2f2f7;">
            <input type="text" id="book-title-input" value="${book.title}" 
                style="padding:15px; border:none; border-radius:10px; margin-bottom:10px; font-weight:bold; font-size:18px;">
            
            <select id="book-category-input"
                style="padding:12px 15px; border:none; border-radius:10px; margin-bottom:15px; font-size:14px; color:#666; background:#fff;">
                ${optionsHtml}
            </select>
            
            <textarea id="book-content-input" 
                style="flex:1; border:none; border-radius:10px; padding:15px; resize:none; font-size:15px; line-height:1.6;"
                placeholder="在此输入世界观、设定、魔法体系、历史背景等...\n\n当角色关联此书时，AI会自动读取这些设定。">${contentValue}</textarea>
            
            <div style="display:flex; gap:10px; margin-top:15px; padding-bottom:20px;">
                <button onclick="deleteBook('${id}')" style="flex:1; background:#ff3b30; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">删除</button>
                <button onclick="saveBookAndClose('${id}')" style="flex:1; background:#07c160; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">保存</button>
            </div>
        </div>
    `;
    
    // 修改返回按钮的行为：返回到世界书列表而不是关闭应用
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.openWorldBookApp(); // 返回世界书列表
        };
    }
    
    // 隐藏右上角加号
    const plusBtn = document.getElementById('top-plus-btn');
    if (plusBtn) {
        plusBtn.style.display = 'none';
    }
}

// 8. 保存并返回
window.saveBookAndClose = function(id) {
    const titleInput = document.getElementById('book-title-input');
    const categoryInput = document.getElementById('book-category-input');
    const contentInput = document.getElementById('book-content-input');
    
    if(window.worldBooks[id]) {
        window.worldBooks[id].title = titleInput.value;
        window.worldBooks[id].category = categoryInput ? categoryInput.value.trim() : '';
        window.worldBooks[id].content = contentInput.value;
        saveWorldBooks();
        normalizeWorldBookCategories();
        alert("已保存");
        // 返回列表
        window.openWorldBookApp();
    }
};

// 9. 删除书籍
window.deleteBook = function(id) {
    if(confirm("确定删除这本设定集吗？关联的角色将失去此设定。")) {
        delete window.worldBooks[id];
        saveWorldBooks();
        window.openWorldBookApp(); // 返回列表
    }
};

// =========================================================
// 10. 【升级版】获取下拉菜单和多选列表的 HTML
// =========================================================
window.getWorldBookOptionsHTML = function (selectedIds) {
    const selectedArr = Array.isArray(selectedIds) ? selectedIds : (selectedIds ? [selectedIds] : []);
    const ids = Object.keys(window.worldBooks || {});
    let html = `<option value="">-- 不关联 (默认) --</option>`;
    
    if (ids.length === 0) return html;

    const books = ids.map(id => ({ ...window.worldBooks[id], id }));
    
    // 1. 分类
    const categories = [...new Set(books.map(b => b.category).filter(Boolean))];
    if (categories.length > 0) {
        html += `<optgroup label="全分类关联">`;
        categories.forEach(cat => {
            const id = `cat:${cat}`;
            const sel = selectedArr.includes(id) ? 'selected' : '';
            html += `<option value="${id}" ${sel}>整个分类: ${cat}</option>`;
        });
        html += `</optgroup>`;
    }

    // 2. 单本
    html += `<optgroup label="单本关联">`;
    books.forEach(book => {
        const id = String(book.id || '');
        const sel = selectedArr.includes(id) ? 'selected' : '';
        html += `<option value="${id}" ${sel}>${book.title || '未命名'}</option>`;
    });
    html += `</optgroup>`;
    
    return html;
};

function loadWorldBookFoldState() {
    try {
        const raw = localStorage.getItem('wechat_worldbook_fold_state_v1');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) { }
    return {};
}

function saveWorldBookFoldState(state) {
    try {
        localStorage.setItem('wechat_worldbook_fold_state_v1', JSON.stringify(state && typeof state === 'object' ? state : {}));
    } catch (e) { }
}

window.toggleWorldBookCategoryFold = function (catName) {
    const cat = String(catName || '').trim() || '未分类';
    const state = loadWorldBookFoldState();
    const nextCollapsed = !state[cat];
    state[cat] = nextCollapsed;
    saveWorldBookFoldState(state);

    const key = encodeURIComponent(cat);
    const body = document.getElementById('wb-cat-body-' + key);
    const arrow = document.getElementById('wb-cat-arrow-' + key);
    if (body) body.style.display = nextCollapsed ? 'none' : 'block';
    if (arrow) arrow.textContent = nextCollapsed ? '▸' : '▾';
};

window.getWorldBookCheckboxListHTML = function (selectedIds) {
    const selectedArr = Array.isArray(selectedIds) ? selectedIds : (selectedIds ? [selectedIds] : []);
    const ids = Object.keys(window.worldBooks || {});
    const books = ids.map(id => ({ ...window.worldBooks[id], id }));
    
    let html = '';

    if (!books.length) {
        html = '<div data-wb-assoc-root="1"><div data-wb-assoc-summary style="color:#999; font-size:13px; padding:6px 2px;">暂无世界书，请先在世界书应用中添加。</div><div data-wb-assoc-list style="display:none;"></div></div>';
        return html;
    }

    const selectedSet = new Set(selectedArr.map(v => String(v || '').trim()).filter(Boolean));
    const expandedSelected = new Set();
    for (const val of selectedSet) {
        if (val.startsWith('cat:') || val.startsWith('CATEGORY:')) {
            const targetCat = val.includes(':') ? val.split(':').slice(1).join(':') : val;
            books.forEach(b => {
                const bCat = String(b && b.category ? b.category : '').trim() || '未分类';
                if (bCat === targetCat) expandedSelected.add(String(b.id || '').trim());
            });
        } else {
            expandedSelected.add(val);
        }
    }

    const byCat = new Map();
    books.forEach(b => {
        const cat = String(b && b.category ? b.category : '').trim() || '未分类';
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat).push(b);
    });

    const cats = Array.from(byCat.keys()).sort((a, b) => {
        if (a === '未分类' && b !== '未分类') return 1;
        if (b === '未分类' && a !== '未分类') return -1;
        return String(a).localeCompare(String(b), 'zh-Hans-CN', { sensitivity: 'base' });
    });

    const foldState = loadWorldBookFoldState();
    const safeAttr = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    const selectedCount = expandedSelected.size;
    html += `<div data-wb-assoc-root="1" style="display:flex; flex-direction:column; gap:10px;">`;
    html += `<div data-wb-assoc-summary style="font-size:12px; color:#666; padding:2px 2px;">${selectedCount ? ('已选择 ' + selectedCount + ' 项') : '未选择世界书'}</div>`;
    html += `<div data-wb-assoc-list style="display:none;">`;

    cats.forEach(cat => {
        const list = byCat.get(cat) || [];
        list.sort((a, b) => String(a && a.title ? a.title : '').localeCompare(String(b && b.title ? b.title : ''), 'zh-Hans-CN', { sensitivity: 'base' }));
        const collapsed = !!foldState[cat];
        const key = encodeURIComponent(cat);
        const arrow = collapsed ? '▸' : '▾';

        html += `
        <div data-wb-cat-wrap="${safeAttr(cat)}" style="border-radius:14px; background:#fff; overflow:hidden; border:1px solid rgba(0,0,0,0.06); box-shadow:0 6px 18px rgba(0,0,0,0.04);">
            <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; user-select:none; background:rgba(0,0,0,0.02);">
                <label style="display:flex; align-items:center; justify-content:center; width:18px; height:18px; cursor:pointer;">
                    <input type="checkbox" name="wb-cat-checkbox" data-wb-cat="${safeAttr(cat)}" style="width:16px; height:16px;">
                </label>
                <div style="flex:1; min-width:0; font-weight:900; font-size:13px; color:#222; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeAttr(cat)}</div>
                <button type="button" onclick="toggleWorldBookCategoryFold('${safeAttr(cat)}')" style="border:none; background:transparent; padding:6px 8px; border-radius:10px; cursor:pointer; color:#666; font-size:14px;">
                    <span id="wb-cat-arrow-${key}">${arrow}</span>
                </button>
            </div>
            <div id="wb-cat-body-${key}" style="display:${collapsed ? 'none' : 'block'}; padding:8px 12px;">
        `;

        list.forEach(book => {
            const id = String(book && book.id ? book.id : '').trim();
            if (!id) return;
            const checked = expandedSelected.has(id) ? 'checked' : '';
            const title = String(book && book.title ? book.title : '未命名');
            html += `
                <label style="display:flex; align-items:center; gap:10px; padding:8px 0; cursor:pointer;">
                    <input type="checkbox" name="wb-checkbox" value="${safeAttr(id)}" data-wb-cat="${safeAttr(cat)}" ${checked} style="width:16px; height:16px;">
                    <span style="flex:1; min-width:0; font-size:14px; color:#111; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeAttr(title)}</span>
                </label>
            `;
        });

        html += `
            </div>
        </div>
        `;
    });

    html += `</div></div>`;
    
    return html;
};

window.bindWorldBookCheckboxList = function (container) {
    const root = container && container.querySelector ? container.querySelector('[data-wb-assoc-root="1"]') : null;
    if (!container || !root) return;
    if (container._wbAssocBound) {
        try {
            if (typeof container._wbAssocSync === 'function') container._wbAssocSync();
        } catch (e) { }
        return;
    }
    container._wbAssocBound = true;

    const esc = (window.CSS && typeof window.CSS.escape === 'function')
        ? window.CSS.escape
        : function (s) { return String(s || '').replace(/["\\]/g, '\\$&'); };

    const getSummaryEl = function () { return container.querySelector('[data-wb-assoc-summary]'); };
    const getBookCheckboxes = function (cat) {
        const sel = cat ? ('input[name="wb-checkbox"][data-wb-cat="' + esc(cat) + '"]') : 'input[name="wb-checkbox"]';
        return Array.from(container.querySelectorAll(sel));
    };
    const getCatCheckbox = function (cat) {
        if (!cat) return null;
        const el = container.querySelector('input[name="wb-cat-checkbox"][data-wb-cat="' + esc(cat) + '"]');
        return el || null;
    };

    const syncCat = function (cat) {
        const catCb = getCatCheckbox(cat);
        if (!catCb) return;
        const books = getBookCheckboxes(cat);
        if (!books.length) {
            catCb.checked = false;
            catCb.indeterminate = false;
            return;
        }
        const checkedCount = books.filter(b => !!b.checked).length;
        catCb.checked = checkedCount > 0 && checkedCount === books.length;
        catCb.indeterminate = checkedCount > 0 && checkedCount < books.length;
    };

    const syncAll = function () {
        const catCbs = Array.from(container.querySelectorAll('input[name="wb-cat-checkbox"][data-wb-cat]'));
        catCbs.forEach(cb => {
            const cat = String(cb.getAttribute('data-wb-cat') || '');
            if (!cat) return;
            syncCat(cat);
        });

        const allBooks = Array.from(container.querySelectorAll('input[name="wb-checkbox"]'));
        const checkedCount = allBooks.filter(b => !!b.checked).length;
        const summary = getSummaryEl();
        if (summary) {
            summary.textContent = checkedCount ? ('已选择 ' + checkedCount + ' 项') : '未选择世界书';
        }
    };

    container._wbAssocSync = syncAll;
    syncAll();

    container.addEventListener('change', function (e) {
        const t = e && e.target ? e.target : null;
        if (!t) return;
        const name = t.getAttribute ? t.getAttribute('name') : '';
        if (name === 'wb-cat-checkbox') {
            const cat = String(t.getAttribute('data-wb-cat') || '');
            const books = getBookCheckboxes(cat);
            const next = !!t.checked;
            books.forEach(cb => { cb.checked = next; });
            syncCat(cat);
            syncAll();
            return;
        }
        if (name === 'wb-checkbox') {
            const cat = String(t.getAttribute('data-wb-cat') || '');
            if (cat) syncCat(cat);
            syncAll();
        }
    });
};

window.toggleWorldBookAssociatePanel = function (btnEl, containerId) {
    let container = null;
    if (containerId) {
        container = document.getElementById(containerId);
    } else if (btnEl && btnEl.getAttribute) {
        const id = btnEl.getAttribute('data-wb-target') || '';
        if (id) container = document.getElementById(id);
    }
    if (!container) return;
    const root = container.querySelector('[data-wb-assoc-root="1"]');
    if (!root) return;
    const list = root.querySelector('[data-wb-assoc-list]');
    if (!list) return;
    const willOpen = list.style.display === 'none' || !list.style.display;
    list.style.display = willOpen ? 'block' : 'none';
    if (btnEl && btnEl.textContent !== undefined) {
        btnEl.textContent = willOpen ? '▾' : '▸';
        try { btnEl.setAttribute('aria-expanded', willOpen ? 'true' : 'false'); } catch (e) { }
    }
    if (willOpen && typeof window.bindWorldBookCheckboxList === 'function') {
        window.bindWorldBookCheckboxList(container);
    }
};

// 立即运行加载
loadWorldBooks();
