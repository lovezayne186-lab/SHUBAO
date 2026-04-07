/* =========================================================
   文件路径：JS脚本文件夹/settings.js
   作用：管理系统设置（API配置、模型拉取、温度控制、保存）
   ========================================================= */

// 1. 打开设置 App
function openSettingsApp() {
    const appWindow = document.getElementById('app-window');
    const title = document.getElementById('app-title-text');
    const content = document.getElementById('app-content-area');

    if (!appWindow) return;

    title.innerText = "系统设置";

    try {
        if (title && !title._devUnlockBound) {
            title._devUnlockBound = true;
            let tapCount = 0;
            let lastTapAt = 0;
            const DEV_UNLOCK_CODE = '2580';
            title.addEventListener('click', function () {
                const now = Date.now();
                if (now - lastTapAt > 1200) tapCount = 0;
                lastTapAt = now;
                tapCount++;
                if (tapCount < 7) return;
                tapCount = 0;

                const cur = localStorage.getItem('dev_mode_unlocked') === 'true';
                if (cur) {
                    const lock = confirm('已解锁开发者模式。是否要锁定并隐藏调试项？');
                    if (lock) {
                        localStorage.setItem('dev_mode_unlocked', 'false');
                        if (window.updateSystemPromptDebugUI) window.updateSystemPromptDebugUI();
                        renderSettingsUI(content);
                    }
                    return;
                }

                const code = prompt('输入开发者口令以解锁调试功能：');
                if (code === null) return;
                if (String(code || '').trim() === DEV_UNLOCK_CODE) {
                    localStorage.setItem('dev_mode_unlocked', 'true');
                    alert('✅ 开发者模式已解锁。');
                    renderSettingsUI(content);
                } else {
                    alert('❌ 口令错误。');
                }
            });
        }
    } catch (e) { }

    renderSettingsUI(content);
    appWindow.classList.add('active');
}

function escapeSettingsHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readApiPresetList() {
    try {
        const raw = localStorage.getItem('api_settings_presets_v1') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function writeApiPresetList(list) {
    try {
        localStorage.setItem('api_settings_presets_v1', JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function buildCurrentApiSettingsSnapshot() {
    const urlEl = document.getElementById('setting-api-url');
    const keyEl = document.getElementById('setting-api-key');
    const modelEl = document.getElementById('setting-model-select');
    const tempEl = document.getElementById('setting-temp-slider');
    return {
        baseUrl: urlEl ? String(urlEl.value || '').trim() : '',
        apiKey: keyEl ? String(keyEl.value || '').trim() : '',
        model: modelEl ? String(modelEl.value || '').trim() : '',
        temperature: tempEl ? String(tempEl.value || '').trim() : '0.7'
    };
}

function rerenderSettingsAppIfOpen() {
    const content = document.getElementById('app-content-area');
    const title = document.getElementById('app-title-text');
    if (!content || !title) return;
    if (String(title.innerText || '').trim() !== '系统设置') return;
    renderSettingsUI(content);
}

function fillSettingsFormFromPreset(preset) {
    const data = preset && typeof preset === 'object' ? preset : {};
    const urlEl = document.getElementById('setting-api-url');
    const keyEl = document.getElementById('setting-api-key');
    const modelEl = document.getElementById('setting-model-select');
    const tempEl = document.getElementById('setting-temp-slider');
    const tempDisplay = document.getElementById('temp-display');
    if (urlEl) urlEl.value = String(data.baseUrl || '');
    if (keyEl) keyEl.value = String(data.apiKey || '');
    if (modelEl) {
        const nextModel = String(data.model || '').trim();
        if (nextModel) {
            const exists = Array.from(modelEl.options || []).some(function (opt) {
                return String(opt.value || '') === nextModel;
            });
            if (!exists) {
                const option = document.createElement('option');
                option.value = nextModel;
                option.innerText = nextModel + ' (预设)';
                modelEl.appendChild(option);
            }
            modelEl.value = nextModel;
        }
    }
    if (tempEl) tempEl.value = String(data.temperature != null ? data.temperature : '0.7');
    if (tempDisplay) tempDisplay.innerText = String(data.temperature != null ? data.temperature : '0.7');
}

function getSelectedApiPreset() {
    const select = document.getElementById('setting-preset-select');
    const presetId = select ? String(select.value || '').trim() : '';
    if (!presetId) return null;
    const presets = readApiPresetList();
    for (let i = 0; i < presets.length; i++) {
        const preset = presets[i];
        if (preset && String(preset.id || '') === presetId) return preset;
    }
    return null;
}

function applySelectedApiPreset() {
    const preset = getSelectedApiPreset();
    if (!preset) {
        alert('请先选择一个预设');
        return;
    }
    try { localStorage.setItem('api_settings_last_preset_id', String(preset.id || '')); } catch (e) { }
    fillSettingsFormFromPreset(preset);
    alert(`✅ 已套用预设：${preset.name || '未命名预设'}`);
}

function saveCurrentApiPreset() {
    const snapshot = buildCurrentApiSettingsSnapshot();
    if (!snapshot.baseUrl || !snapshot.model) {
        alert('请先填写 API 地址并选择模型，再保存为预设');
        return;
    }
    const defaultName = snapshot.baseUrl.replace(/^https?:\/\//i, '') + ' / ' + snapshot.model;
    const inputName = prompt('给这个 API 预设起个名字：', defaultName);
    if (inputName === null) return;
    const name = String(inputName || '').trim();
    if (!name) {
        alert('预设名称不能为空');
        return;
    }
    const presets = readApiPresetList();
    const existingIndex = presets.findIndex(function (item) {
        return item && String(item.name || '').trim() === name;
    });
    const record = {
        id: existingIndex >= 0 && presets[existingIndex] && presets[existingIndex].id
            ? presets[existingIndex].id
            : ('preset_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
        name: name,
        baseUrl: snapshot.baseUrl,
        apiKey: snapshot.apiKey,
        model: snapshot.model,
        temperature: snapshot.temperature,
        updatedAt: Date.now()
    };
    if (existingIndex >= 0) {
        presets.splice(existingIndex, 1, record);
    } else {
        presets.unshift(record);
    }
    writeApiPresetList(presets.slice(0, 30));
    try { localStorage.setItem('api_settings_last_preset_id', record.id); } catch (e) { }
    rerenderSettingsAppIfOpen();
    setTimeout(function () {
        const select = document.getElementById('setting-preset-select');
        if (select) select.value = record.id;
    }, 0);
    alert(`✅ 预设已保存：${name}`);
}

function deleteSelectedApiPreset() {
    const preset = getSelectedApiPreset();
    if (!preset) {
        alert('请先选择一个预设');
        return;
    }
    if (!confirm(`确定删除预设「${preset.name || '未命名预设'}」吗？`)) return;
    const presets = readApiPresetList().filter(function (item) {
        return !(item && String(item.id || '') === String(preset.id || ''));
    });
    writeApiPresetList(presets);
    try {
        const lastId = localStorage.getItem('api_settings_last_preset_id') || '';
        if (String(lastId) === String(preset.id || '')) {
            localStorage.removeItem('api_settings_last_preset_id');
        }
    } catch (e) { }
    rerenderSettingsAppIfOpen();
    alert('已删除预设');
}

window.applySelectedApiPreset = applySelectedApiPreset;
window.saveCurrentApiPreset = saveCurrentApiPreset;
window.deleteSelectedApiPreset = deleteSelectedApiPreset;

// 2. 渲染 UI 界面
function renderSettingsUI(container) {
    const savedUrl = localStorage.getItem('api_base_url') || "";
    const savedKey = localStorage.getItem('user_api_key') || "";
    const savedModel = localStorage.getItem('selected_model') || "gpt-3.5-turbo";
    // 新增：读取温度，默认为 0.7
    const savedTemp = localStorage.getItem('model_temperature') || "0.7";
    const presets = readApiPresetList();
    const lastPresetId = localStorage.getItem('api_settings_last_preset_id') || '';
    const presetOptionsHtml = presets.length
        ? presets.map(function (preset) {
            const id = escapeSettingsHtml(preset.id || '');
            const name = escapeSettingsHtml(preset.name || '未命名预设');
            const url = escapeSettingsHtml(preset.baseUrl || '');
            const model = escapeSettingsHtml(preset.model || '');
            const temp = escapeSettingsHtml(String(preset.temperature != null ? preset.temperature : '0.7'));
            const selected = String(preset.id || '') === String(lastPresetId || '') ? ' selected' : '';
            return `<option value="${id}"${selected}>${name} | ${url || '未填地址'} | ${model || '未选模型'} | T=${temp}</option>`;
        }).join('')
        : '<option value="">暂无保存的预设</option>';
    const isDevUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
    const promptHistory = isDevUnlocked ? getDevAiPromptHistoryForDisplay() : [];
    let devAiFailCount = 0;
    try {
        if (isDevUnlocked) {
            const raw = localStorage.getItem('dev_ai_parse_failures_v1') || '[]';
            const parsed = JSON.parse(raw);
            devAiFailCount = Array.isArray(parsed) ? parsed.length : 0;
        }
    } catch (e) { devAiFailCount = 0; }

    container.innerHTML = `
        <div style="padding: 20px;padding-bottom: 100px;">
            
            <!-- API 地址设置 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 10px 0; color:#333;">API 地址 (Base URL)</h4>
                <input type="text" id="setting-api-url" value="${savedUrl}" placeholder="例如 https://api.deepseek.com" 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size:14px;">
                <p style="font-size: 12px; color: #999; margin: 5px 0 0;">会自动检测是否需要加 /v1</p>
            </div>

            <!-- API Key 设置 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 10px 0; color:#333;">API Key (密钥)</h4>
                <input type="password" id="setting-api-key" value="${savedKey}" placeholder="sk-..." 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size:14px;">
            </div>

            <!-- 模型选择区域 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color:#333;">选择模型</h4>
                    <button onclick="fetchModelList()" style="padding: 6px 12px; background: #007aff; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">
                        🔄 拉取列表
                    </button>
                </div>
                
                <select id="setting-model-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: white; font-size:14px;">
                    <option value="${savedModel}">${savedModel} (当前)</option>
                </select>
                <p id="fetch-status" style="font-size: 12px; color: #666; margin-top: 8px; min-height: 16px;"></p>
            </div>

            <!-- 新增：温度控制区域 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color:#333;">模型温度 (Temperature)</h4>
                    <!-- 显示当前数值 -->
                    <span id="temp-display" style="font-weight:bold; color:#007aff; font-size:16px;">${savedTemp}</span>
                </div>
                
                <!-- 滑动条：0 到 2，步长 0.1 -->
                <input type="range" id="setting-temp-slider" min="0" max="2" step="0.1" value="${savedTemp}" 
                    style="width: 100%; cursor: pointer;"
                    oninput="document.getElementById('temp-display').innerText = this.value">
                
                <div style="display:flex; justify-content:space-between; font-size: 12px; color: #999; margin-top: 5px;">
                    <span>0.0 (严谨)</span>
                    <span>1.0 (平衡)</span>
                    <span>2.0 (发散)</span>
                </div>
            </div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom: 10px;">
                    <h4 style="margin: 0; color:#333;">API 预设</h4>
                    <span style="font-size:12px; color:#888;">保存站点 / Key / 模型 / 温度</span>
                </div>
                <select id="setting-preset-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: white; font-size:14px; margin-bottom:10px;">
                    ${presetOptionsHtml}
                </select>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="applySelectedApiPreset()" style="flex:1; min-width:120px; padding:10px 12px; background:#007aff; color:white; border:none; border-radius:10px; font-size:13px; font-weight:bold; cursor:pointer;">套用预设</button>
                    <button onclick="saveCurrentApiPreset()" style="flex:1; min-width:120px; padding:10px 12px; background:#34c759; color:white; border:none; border-radius:10px; font-size:13px; font-weight:bold; cursor:pointer;">保存当前为预设</button>
                    <button onclick="deleteSelectedApiPreset()" style="flex:1; min-width:120px; padding:10px 12px; background:#ff9500; color:white; border:none; border-radius:10px; font-size:13px; font-weight:bold; cursor:pointer;">删除选中预设</button>
                </div>
                <p style="font-size: 12px; color: #999; margin: 10px 0 0; line-height: 1.6;">切换了 API 站点后，可以从这里一键切回之前保存过的地址、Key、模型和温度。</p>
            </div>

            ${isDevUnlocked ? `
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <h4 style="margin: 0; color:#333;">AI 调用调试中心</h4>
                    <span id="dev-ai-prompt-count" style="font-size:12px; color:#666;">最近记录：${promptHistory.length}/10</span>
                </div>
                <p style="font-size: 12px; color: #999; margin: 8px 0 0; line-height: 1.6;">最近 10 条经过 <code>callAI</code> 的提示词都会保存在本地，这里可以查看聊天、通话、音乐、情侣空间等不同场景的实际 system prompt，并支持直接复制。</p>
                <div style="display:flex; gap:10px; margin-top: 12px;">
                    <button type="button"
                        style="flex:1; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);"
                        onclick="copyLatestDevAiPromptRecord()">
                        复制最新记录
                    </button>
                    <button type="button"
                        style="flex:1; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);"
                        onclick="clearDevAiPromptHistory()">
                        清空提示词记录
                    </button>
                </div>
                <button type="button"
                    style="margin-top: 10px; width: 100%; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.38);"
                    onclick="extractCurrentRoleThoughtChain()">
                    提取当前角色思考链（最近 50 轮）
                </button>
                <div id="dev-thought-chain-panel" style="margin-top: 10px; border:1px solid rgba(0,0,0,0.06); border-radius:12px; background:#f8fafc; overflow:hidden;">
                    <div style="padding:8px 10px; border-bottom:1px solid rgba(0,0,0,0.06); font-size:12px; color:#334155; font-weight:600;">思考链提取结果</div>
                    <pre id="dev-thought-chain-output" style="margin:0; white-space:pre-wrap; word-break:break-word; max-height:260px; overflow:auto; font-size:11px; line-height:1.55; color:#0f172a; padding:10px;">点击“提取当前角色思考链”后，这里会显示最近 50 轮的思考链与心声。</pre>
                </div>
                <div id="dev-ai-prompt-history-panel" style="margin-top: 12px;">
                    ${renderDevAiPromptHistoryHtml(promptHistory)}
                </div>
            </div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <h4 style="margin: 0; color:#333;">提示词总览</h4>
                    <span style="font-size:12px; color:#666;">按角色查看各场景完整 prompt</span>
                </div>
                <p style="font-size: 12px; color: #999; margin: 8px 0 0; line-height: 1.6;">这里不依赖历史记录。会直接按当前代码为你生成当前角色在不同场景下的提示词全貌；也会展示侧影（方寸/呢喃/尘封）最近一次手动生成时记录的提示词快照。</p>
                <div id="dev-prompt-catalog-panel" style="margin-top:12px;"></div>
            </div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <h4 style="margin: 0; color:#333;">开发者快捷调试</h4>
                    <span style="font-size:12px; color:#666;">仅开发者模式可见</span>
                </div>
                <p style="font-size: 12px; color: #999; margin: 8px 0 0; line-height: 1.6;">保留现有的通知模拟、情侣空间修罗场测试，以及离线日记生成调试入口。</p>
                <button type="button"
                    style="margin-top: 12px; width: 100%; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #ff9a9e 0%, #f97373 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(249, 115, 115, 0.55);"
                    onclick="window.showIosNotification && window.showIosNotification('assets/chushitouxiang.jpg', '神秘角色', '你在干嘛？怎么不理我！')">
                    测试收到新消息
                </button>
                <button type="button"
                    style="margin-top: 10px; width: 100%; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);"
                    onclick="window.simulateCoupleSpaceCaughtChat && window.simulateCoupleSpaceCaughtChat(prompt('输入对方名字（不是情侣绑定对象）', '陌生人') || '陌生人')">
                    模拟发现我和别人聊天
                </button>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top: 10px;">
                    <button id="offline-diary-debug-3h" type="button" style="flex:1; min-width:140px; border:none; background:rgba(37, 99, 235, 0.1); color:#1d4ed8; font-size:12px; padding:10px 12px; border-radius:10px; cursor:pointer;">模拟离线 3h 回来</button>
                    <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:180px;">
                        <input id="offline-diary-debug-days" type="number" min="2" max="365" value="3" style="width:72px; border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:8px 8px; font-size:12px; outline:none;">
                        <button id="offline-diary-debug-days-btn" type="button" style="flex:1; border:none; background:rgba(37, 99, 235, 0.1); color:#1d4ed8; font-size:12px; padding:10px 12px; border-radius:10px; cursor:pointer;">模拟 N 天未打开</button>
                    </div>
                </div>
            </div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <h4 style="margin: 0; color:#333;">实验性静音保活</h4>
                    <span style="font-size:12px; color:#666;">仅供测试，不保证所有机型有效</span>
                </div>
                <p style="font-size: 12px; color: #999; margin: 8px 0 0; line-height: 1.6;">
                    ${(() => { const s = getSilentKeepAliveHackState(); return `当前状态：${s.enabled ? '已开启' : '已关闭'}｜播放态：${s.playing ? '正在循环' : '未在播放'}`; })()}
                </p>
                <button type="button"
                    style="margin-top: 12px; width: 100%; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);"
                    onclick="toggleExperimentalSilentKeepAlive()">
                    ${(() => { const s = getSilentKeepAliveHackState(); return s.enabled ? '关闭静音保活' : '开启静音保活'; })()}
                </button>
                <p style="font-size: 12px; color: #999; margin: 10px 0 0; line-height: 1.6;">实现方式：创建隐藏音频元素，循环播放内嵌静音 WAV，并在切后台/回前台时尝试续播。首次开启需要一次点击来满足浏览器的播放手势要求。</p>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(0,0,0,0.08);">
                    <p style="font-size: 12px; color: #999; margin: 0 0 8px; line-height: 1.6;">
                        ${(() => { const s = getBrowserNotificationState(); return `浏览器通知：${s.supported ? '支持' : '不支持'}｜权限：${s.permission}｜开关：${s.enabled ? '已开启' : '已关闭'}`; })()}
                    </p>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button"
                            style="flex:1; min-width:120px; padding: 10px 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%); color: #fff; font-size: 13px; font-weight: bold; cursor: pointer;"
                            onclick="enableBrowserNotificationsForExperiment()">
                            开启浏览器通知
                        </button>
                        <button type="button"
                            style="flex:1; min-width:120px; padding: 10px 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); color: #fff; font-size: 13px; font-weight: bold; cursor: pointer;"
                            onclick="testBrowserNotificationForExperiment()">
                            测试浏览器弹窗
                        </button>
                        <button type="button"
                            style="flex:1; min-width:120px; padding: 10px 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #fda4af 0%, #e11d48 100%); color: #fff; font-size: 13px; font-weight: bold; cursor: pointer;"
                            onclick="disableBrowserNotificationsForExperiment()">
                            关闭浏览器通知
                        </button>
                    </div>
                </div>
            </div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <h4 style="margin: 0; color:#333;">AI 降级追溯</h4>
                    <span style="font-size:12px; color:#666;">记录数：${devAiFailCount}</span>
                </div>
                <p style="font-size: 12px; color: #999; margin: 8px 0 0; line-height: 1.6;">仅在解析失败触发降级时记录 AI 原始返回，便于排查输出格式问题。</p>
                <div style="display:flex; gap:10px; margin-top: 12px;">
                    <button type="button"
                        style="flex:1; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);"
                        onclick="openDevAiParseFailureLogs()">
                        查看记录
                    </button>
                    <button type="button"
                        style="flex:1; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%); color: #fff; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);"
                        onclick="clearDevAiParseFailureLogs()">
                        清空记录
                    </button>
                </div>
            </div>
            ` : ''}

            <!-- 保存按钮 -->
            <button onclick="saveAllSettings()" style="width: 100%; padding: 14px; background: #34c759; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3); cursor: pointer; transition: transform 0.1s;">
                保存所有配置
            </button>
            <div style="text-align:center; margin-top:10px; font-size:12px; color:#aaa;">配置将保存在本地</div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-top: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 10px 0; color:#333;">数据导出 / 导入 (JSON)</h4>
                <div style="display:flex; gap:10px;">
                    <button onclick="exportAppData()" style="flex:1; padding: 12px; background: #007aff; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer;">
                        导出 JSON
                    </button>
                    <button onclick="triggerImportAppData()" style="flex:1; padding: 12px; background: #5856d6; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer;">
                        导入 JSON
                    </button>
                </div>
                <input type="file" id="settings-import-json" accept="application/json" style="display:none;">
                <p style="font-size: 12px; color: #999; margin: 10px 0 0; line-height: 1.6;">
                    导出包含：聊天记录、联系人与头像、桌面数据与壁纸、小组件图片、音乐数据、朋友圈背景与内容。导入会覆盖这些数据并自动刷新页面。
                </p>
            </div>

            <!-- 清除数据按钮 -->
            <button onclick="clearAllData()" style="width: 100%; padding: 14px; background: #ff3b30; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3); cursor: pointer; transition: transform 0.1s; margin-top: 15px;">
                清除数据
            </button>
            <div style="text-align:center; margin-top:10px; font-size:12px; color:#ff3b30;">⚠️ 此操作将清除所有保存的数据</div>

        </div>
    `;

    try {
        const fileInput = container.querySelector('#settings-import-json');
        if (fileInput && !fileInput._bound) {
            fileInput._bound = true;
            fileInput.addEventListener('change', function () {
                importAppDataFromInput(this);
            });
        }
    } catch (e) { }
    try {
        if (typeof bindOfflineDiaryDebugUIOnce === 'function') bindOfflineDiaryDebugUIOnce();
    } catch (e2) { }
    try {
        if (window.refreshDevPromptDebugPanel) window.refreshDevPromptDebugPanel();
    } catch (e3) { }
}

// 3. 拉取模型列表逻辑
async function fetchModelList() {
    let urlInput = document.getElementById('setting-api-url').value.trim();
    const keyInput = document.getElementById('setting-api-key').value.trim();
    const statusText = document.getElementById('fetch-status');
    const selectBox = document.getElementById('setting-model-select');

    if (!urlInput || !keyInput) {
        statusText.innerText = "❌ 请先填写 API 地址和 Key";
        statusText.style.color = "red";
        return;
    }

    let targetUrl = urlInput;
    if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
    
    // 智能尝试补全路径
    if (!targetUrl.endsWith('/v1')) {
        targetUrl += '/v1';
    }
    targetUrl += '/models';

    statusText.innerText = "⏳ 正在连接服务器...";
    statusText.style.color = "#007aff";

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${keyInput}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        let models = [];
        if (data.data && Array.isArray(data.data)) {
            models = data.data;
        } else if (Array.isArray(data)) {
            models = data;
        }

        if (models.length > 0) {
            selectBox.innerHTML = '';
            models.forEach(model => {
                const mId = model.id || model.name;
                const option = document.createElement('option');
                option.value = mId;
                option.innerText = mId;
                selectBox.appendChild(option);
            });
            selectBox.value = models[0].id || models[0].name;
            statusText.innerText = `✅ 成功获取 ${models.length} 个模型`;
            statusText.style.color = "green";
        } else {
            statusText.innerText = "⚠️ 连接成功但未找到模型";
            statusText.style.color = "orange";
        }

    } catch (error) {
        console.error(error);
        if (error.message.includes('Failed to fetch')) {
            statusText.innerText = "❌ 网络错误或跨域拦截";
        } else {
            statusText.innerText = `❌ ${error.message}`;
        }
        statusText.style.color = "red";
    }
}

function readDevAiParseFailureLogs() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return [];
        const raw = localStorage.getItem('dev_ai_parse_failures_v1') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function openDevAiParseFailureLogs() {
    const logs = readDevAiParseFailureLogs();
    try {
        console.log('[dev_ai_parse_failures_v1]', logs);
    } catch (e) { }
    const text = JSON.stringify(logs.slice(-30), null, 2);
    try {
        prompt('最近 30 条解析失败记录（已同步输出到控制台，可复制）：', text);
    } catch (e2) {
        alert(text);
    }
}

function clearDevAiParseFailureLogs() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return;
        const ok = confirm('确认清空解析失败记录？');
        if (!ok) return;
        localStorage.setItem('dev_ai_parse_failures_v1', '[]');
        alert('已清空。');
    } catch (e) { }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

function getSilentKeepAliveHackState() {
    try {
        if (window.SilentKeepAliveHack && typeof window.SilentKeepAliveHack.getState === 'function') {
            return window.SilentKeepAliveHack.getState();
        }
    } catch (e) { }
    try {
        return {
            enabled: localStorage.getItem('exp_silent_keepalive_enabled_v1') === 'true',
            playing: false,
            currentTime: 0
        };
    } catch (e2) {
        return { enabled: false, playing: false, currentTime: 0 };
    }
}

async function toggleExperimentalSilentKeepAlive() {
    try {
        if (!window.SilentKeepAliveHack || typeof window.SilentKeepAliveHack.toggle !== 'function') {
            alert('静音保活模块未加载。请刷新页面后再试。');
            return;
        }
        await window.SilentKeepAliveHack.toggle({ showTip: true });
    } catch (e) {
        alert('切换失败：' + (e && e.message ? e.message : e || '未知错误'));
    }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

window.toggleExperimentalSilentKeepAlive = toggleExperimentalSilentKeepAlive;

function getBrowserNotificationState() {
    try {
        if (window.BrowserNotificationBridge && typeof window.BrowserNotificationBridge.getState === 'function') {
            return window.BrowserNotificationBridge.getState();
        }
    } catch (e) { }
    return {
        supported: typeof Notification !== 'undefined',
        enabled: false,
        permission: typeof Notification !== 'undefined' ? String(Notification.permission || 'default') : 'unsupported'
    };
}

async function enableBrowserNotificationsForExperiment() {
    try {
        if (!window.BrowserNotificationBridge || typeof window.BrowserNotificationBridge.requestPermissionAndEnable !== 'function') {
            alert('浏览器通知模块未加载。请刷新页面后再试。');
            return;
        }
        const result = await window.BrowserNotificationBridge.requestPermissionAndEnable();
        if (!result || !result.ok) {
            alert('通知权限未开启。当前状态：' + String((result && (result.permission || result.reason)) || 'unknown'));
        }
    } catch (e) {
        alert('开启失败：' + (e && e.message ? e.message : e || '未知错误'));
    }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

function disableBrowserNotificationsForExperiment() {
    try {
        if (window.BrowserNotificationBridge && typeof window.BrowserNotificationBridge.disable === 'function') {
            window.BrowserNotificationBridge.disable();
        }
    } catch (e) { }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

async function testBrowserNotificationForExperiment() {
    try {
        if (!window.BrowserNotificationBridge || typeof window.BrowserNotificationBridge.show !== 'function') {
            alert('浏览器通知模块未加载。请刷新页面后再试。');
            return;
        }
        const st = getBrowserNotificationState();
        if (!st.supported) {
            alert('当前环境不支持浏览器通知。');
            return;
        }
        if (!(window.BrowserNotificationBridge.canNotify && window.BrowserNotificationBridge.canNotify())) {
            alert('还没有可用的浏览器通知权限，请先点“开启浏览器通知”。');
            return;
        }
        const result = await window.BrowserNotificationBridge.show('角色消息测试', '这是一条浏览器通知测试消息。你现在切出页面后，也会走这条通知链路。', {
            icon: 'assets/chushitouxiang.jpg',
            tag: 'browser-notification-test',
            renotify: true,
            durationMs: 8000
        });
        if (!result) {
            alert('通知请求已发出，但当前环境没有真正弹出系统通知。手机 Edge 安装到桌面时，通常更依赖系统通知权限和 Service Worker。');
        }
    } catch (e) {
        alert('测试失败：' + (e && e.message ? e.message : e || '未知错误'));
    }
}

window.enableBrowserNotificationsForExperiment = enableBrowserNotificationsForExperiment;
window.disableBrowserNotificationsForExperiment = disableBrowserNotificationsForExperiment;
window.testBrowserNotificationForExperiment = testBrowserNotificationForExperiment;

const SETTINGS_DEV_AI_PROMPT_HISTORY_KEY = 'dev_ai_prompt_history_v1';

function readDevAiPromptHistory() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return [];
        const raw = localStorage.getItem(SETTINGS_DEV_AI_PROMPT_HISTORY_KEY) || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function escapeDevPromptHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDevPromptTimestamp(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '未知时间';
    try {
        return new Date(n).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (e) {
        return '未知时间';
    }
}

function buildDevPromptDisplayText(record) {
    if (!record || typeof record !== 'object') return '';
    if (typeof record.mergedPrompt === 'string' && record.mergedPrompt) return record.mergedPrompt;
    const prompt = typeof record.prompt === 'string' ? record.prompt : '';
    const extra = typeof record.extraSystem === 'string' ? record.extraSystem.trim() : '';
    if (!extra) return prompt;
    return (prompt ? (prompt + '\n\n') : '') + '=== 一次性系统上下文(额外 system message) ===\n' + extra;
}

function buildDevPromptUserPreviewText(record) {
    if (!record || typeof record !== 'object') return '';
    if (typeof record.userPreviewFull === 'string' && record.userPreviewFull.trim()) {
        return record.userPreviewFull.trim();
    }
    if (typeof record.userPreview === 'string' && record.userPreview.trim()) {
        return record.userPreview.trim();
    }
    return '';
}

function getDevPromptMetaBadgeHtml(meta) {
    const m = meta && typeof meta === 'object' ? meta : {};
    const badges = [];
    if (m.promptClass === 'full_chat') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#eef7ee; color:#166534; font-size:11px; font-weight:700;">A类 FullChatPrompt</span>');
    } else if (m.promptClass === 'role_lite') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:700;">B类 RoleLitePrompt</span>');
    } else if (m.promptClass === 'role_json_task') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#f5f3ff; color:#6d28d9; font-size:11px; font-weight:700;">C类 RoleJsonTask</span>');
    } else if (m.promptClass === 'tool_json') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#f8fafc; color:#475569; font-size:11px; font-weight:700;">D类 ToolJsonPrompt</span>');
    }
    if (m.sceneSubtype === 'dialogue') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700;">dialogue</span>');
    } else if (m.sceneSubtype === 'continuity_journal') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700;">continuity_journal</span>');
    } else if (m.sceneSubtype === 'continuity_decision') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700;">continuity_decision</span>');
    }
    return badges.join('');
}

function buildFallbackDevAiPromptRecord() {
    try {
        const prompt = typeof window.__lastCallAISystemPrompt === 'string' ? window.__lastCallAISystemPrompt : '';
        if (!prompt) return null;
        const meta = window.__lastCallAISystemPromptMeta && typeof window.__lastCallAISystemPromptMeta === 'object'
            ? window.__lastCallAISystemPromptMeta
            : {};
        const roleId = String(meta.roleId || window.currentChatRole || '').trim();
        let roleName = '';
        try {
            const profile = roleId && window.charProfiles ? window.charProfiles[roleId] : null;
            if (profile) roleName = String(profile.remark || profile.nickName || profile.name || roleId);
        } catch (e1) { }
        let extraSystem = '';
        try {
            const map = window.__lastCallAISystemExtraByRole;
            if (map && roleId && typeof map[roleId] === 'string') extraSystem = map[roleId];
        } catch (e2) { }
        let promptTimestamp = 0;
        try {
            const tsMap = window.__lastCallAISystemPromptTimestampByRole;
            if (tsMap && roleId && typeof tsMap[roleId] !== 'undefined') {
                promptTimestamp = Number(tsMap[roleId]) || 0;
            }
            if (!promptTimestamp) {
                promptTimestamp = Number(window.__lastCallAISystemPromptTimestamp) || 0;
            }
        } catch (e3) { }
        return {
            id: 'fallback_latest_call',
            timestamp: promptTimestamp || Date.now(),
            scene: meta.sceneCode === 'couple_space_diary'
                ? 'A类FullChat·情侣空间日记'
                : (meta.sceneCode === 'moments_proactive_post'
                    ? 'A类FullChat·主动朋友圈'
                    : (meta.promptClass === 'full_chat'
                        ? 'A类FullChat'
                        : (meta.promptClass === 'role_lite'
                            ? 'B类RoleLite'
                            : (meta.promptClass === 'role_json_task'
                                ? 'C类RoleJsonTask'
                                : (meta.promptClass === 'tool_json'
                                    ? 'D类ToolJson'
                                    : (meta.hasSystemPromptMarker ? '线上私聊' : '最近一次调用'))))
                    )),
            roleId: roleId,
            roleName: roleName,
            model: localStorage.getItem('selected_model') || '',
            prompt: prompt,
            extraSystem: extraSystem,
            mergedPrompt: buildDevPromptDisplayText({ prompt: prompt, extraSystem: extraSystem }),
            userPreview: '当前页面内存中的最后一次调用',
            meta: meta,
            isFallback: true
        };
    } catch (e) {
        return null;
    }
}

function mergeLivePromptRecordIntoHistory(records) {
    const list = Array.isArray(records) ? records.slice() : [];
    const live = buildFallbackDevAiPromptRecord();
    if (!live) return list;

    const livePrompt = buildDevPromptDisplayText(live);
    const merged = [live];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'object') continue;
        const sameRole = String(item.roleId || '') === String(live.roleId || '');
        const samePrompt = buildDevPromptDisplayText(item) === livePrompt;
        if (sameRole && samePrompt) continue;
        merged.push(item);
        if (merged.length >= 10) break;
    }
    return merged;
}

function getDevAiPromptHistoryForDisplay() {
    const records = readDevAiPromptHistory();
    return mergeLivePromptRecordIntoHistory(records);
}

const DEV_PROMPT_PREVIEW_ROLE_KEY = 'dev_prompt_preview_role_v1';
const DEV_PROMPT_PREVIEW_SCENE_KEY = 'dev_prompt_preview_scene_v1';

function readDevPromptPreviewRoleId() {
    try {
        return String(localStorage.getItem(DEV_PROMPT_PREVIEW_ROLE_KEY) || '').trim();
    } catch (e) {
        return '';
    }
}

function writeDevPromptPreviewRoleId(roleId) {
    try {
        localStorage.setItem(DEV_PROMPT_PREVIEW_ROLE_KEY, String(roleId || '').trim());
    } catch (e) { }
}

function readDevPromptPreviewSceneKey() {
    try {
        return String(localStorage.getItem(DEV_PROMPT_PREVIEW_SCENE_KEY) || '').trim();
    } catch (e) {
        return '';
    }
}

function writeDevPromptPreviewSceneKey(sceneKey) {
    try {
        localStorage.setItem(DEV_PROMPT_PREVIEW_SCENE_KEY, String(sceneKey || '').trim());
    } catch (e) { }
}

function getDevPromptPreviewRoleOptions() {
    const items = [];
    try {
        const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
        Object.keys(profiles).forEach(function (rid) {
            const profile = profiles[rid] || {};
            const name = String(profile.remark || profile.nickName || profile.name || rid).trim() || rid;
            items.push({ roleId: String(rid || '').trim(), roleName: name });
        });
    } catch (e) { }
    return items.sort(function (a, b) {
        return String(a.roleName || '').localeCompare(String(b.roleName || ''), 'zh-CN');
    });
}

function resolveDevPromptPreviewRoleId() {
    const saved = readDevPromptPreviewRoleId();
    if (saved) return saved;
    const current = String(window.currentChatRole || '').trim();
    if (current) return current;
    try {
        const records = getDevAiPromptHistoryForDisplay();
        const rid = records && records[0] ? String(records[0].roleId || '').trim() : '';
        if (rid) return rid;
    } catch (e) { }
    const options = getDevPromptPreviewRoleOptions();
    return options[0] ? options[0].roleId : '';
}

function resolvePromptPreviewUserBirthday(userPersona) {
    const p = userPersona && typeof userPersona === 'object' ? userPersona : {};
    const birthday = String(p.birthday || '').trim();
    if (!birthday) return '';
    return birthday + (p.birthdayType === 'lunar' ? '（农历）' : '（阳历）');
}

function buildDevWechatPrivatePromptPreview(roleId) {
    try {
        if (typeof buildPromptContextBundle !== 'function' || typeof buildWechatPrivatePromptV2 !== 'function') return '';
        const rid = String(roleId || '').trim();
        if (!rid) return '';
        const bundle = buildPromptContextBundle(rid, {});
        return String(buildWechatPrivatePromptV2({
            roleId: rid,
            roleName: bundle.roleName,
            realName: bundle.profile && (bundle.profile.realName || bundle.profile.real_name || bundle.profile.nickName || bundle.roleName) || bundle.roleName,
            language: bundle.profile && (bundle.profile.language || bundle.profile.lang) || '',
            roleDesc: bundle.profile && bundle.profile.desc || '',
            roleStyle: bundle.profile && bundle.profile.style || '',
            roleSchedule: bundle.profile && bundle.profile.schedule || '',
            roleRemark: bundle.roleRemark,
            userName: bundle.userPersona && bundle.userPersona.name || '',
            userGender: bundle.userPersona && bundle.userPersona.gender || '',
            userBirthday: resolvePromptPreviewUserBirthday(bundle.userPersona),
            userSetting: bundle.userPersona && bundle.userPersona.setting || '',
            memoryArchivePrompt: bundle.memoryArchivePrompt,
            worldBookPromptText: bundle.worldBookPromptText,
            timePerceptionPrompt: '',
            recentSystemEventsPrompt: bundle.recentSystemEventsPrompt,
            continuityPrompt: bundle.continuityPrompt,
            justSwitchedToOnline: false,
            allowOfflineInvite: typeof isOfflineInviteAllowed === 'function' ? isOfflineInviteAllowed(rid) : true,
            transferScenePrompt: '',
            stickerPromptText: typeof buildAIStickerPromptText === 'function' ? String(buildAIStickerPromptText() || '').trim() : ''
        }) || '').trim();
    } catch (e) {
        return '';
    }
}

function buildDevOfflineMeetingPromptPreview(roleId) {
    try {
        if (typeof buildPromptContextBundle !== 'function' || typeof buildOfflineMeetingPromptV2 !== 'function') return '';
        const rid = String(roleId || '').trim();
        if (!rid) return '';
        const bundle = buildPromptContextBundle(rid, {});
        return String(buildOfflineMeetingPromptV2({
            roleId: rid,
            roleName: bundle.roleName,
            realName: bundle.profile && (bundle.profile.realName || bundle.profile.real_name || bundle.profile.nickName || bundle.roleName) || bundle.roleName,
            language: bundle.profile && (bundle.profile.language || bundle.profile.lang) || '',
            roleDesc: bundle.profile && bundle.profile.desc || '',
            roleStyle: bundle.profile && bundle.profile.style || '',
            roleSchedule: bundle.profile && bundle.profile.schedule || '',
            roleRemark: bundle.roleRemark,
            userName: bundle.userPersona && bundle.userPersona.name || '',
            userGender: bundle.userPersona && bundle.userPersona.gender || '',
            userBirthday: resolvePromptPreviewUserBirthday(bundle.userPersona),
            userSetting: bundle.userPersona && bundle.userPersona.setting || '',
            memoryArchivePrompt: bundle.memoryArchivePrompt,
            worldBookPromptText: bundle.worldBookPromptText,
            timePerceptionPrompt: '',
            recentSystemEventsPrompt: bundle.recentSystemEventsPrompt,
            continuityPrompt: bundle.continuityPrompt,
            arrivalContextPrompt: '【到达情景】你和用户刚刚在约定地点碰面，线下互动刚刚开始。',
            stickerPromptText: typeof buildAIStickerPromptText === 'function' ? String(buildAIStickerPromptText() || '').trim() : ''
        }) || '').trim();
    } catch (e) {
        return '';
    }
}

function readDevSecretCenterPromptStore() {
    try {
        const raw = localStorage.getItem('secret_center_prompt_debug_v1') || '{}';
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function readDevSecretCenterPromptRecord(roleId, sceneKey) {
    const rid = String(roleId || '').trim();
    const scene = String(sceneKey || '').trim();
    if (!rid || !scene) return null;
    const store = readDevSecretCenterPromptStore();
    const key = rid + '::' + scene;
    const record = store && typeof store === 'object' ? store[key] : null;
    return record && typeof record === 'object' ? record : null;
}

function buildDevSecretCenterPromptPreview(roleId, sceneKey) {
    const record = readDevSecretCenterPromptRecord(roleId, sceneKey);
    if (!record) return '';
    const blocks = [];
    const contextSummary = String(record.contextSummary || '').trim();
    const basePrompt = String(record.basePrompt || '').trim();
    const scenePrompt = String(record.scenePrompt || '').trim();
    const finalSystemPrompt = String(record.finalSystemPrompt || '').trim();
    const userMessage = String(record.userMessage || '').trim();
    const responseText = String(record.responseText || '').trim();
    const errorMessage = String(record.errorMessage || '').trim();

    if (contextSummary) blocks.push('【角色上下文】\n' + contextSummary);
    if (basePrompt) blocks.push('【基底提示词】\n' + basePrompt);
    if (scenePrompt) blocks.push('【场景提示词】\n' + scenePrompt);
    if (finalSystemPrompt) blocks.push('【最终 System Prompt】\n' + finalSystemPrompt);
    if (userMessage) blocks.push('【用户输入】\n' + userMessage);
    if (responseText) blocks.push('【模型返回原文】\n' + responseText);
    if (errorMessage) blocks.push('【错误信息】\n' + errorMessage);
    return blocks.join('\n\n').trim();
}

function appendDevSecretCenterPromptEntries(roleId, pushFn) {
    if (typeof pushFn !== 'function') return;
    const rid = String(roleId || '').trim();
    if (!rid) return;
    const scenes = [
        { key: 'fangcun', label: '侧影·方寸' },
        { key: 'ninan', label: '侧影·呢喃' },
        { key: 'chenfeng', label: '侧影·尘封' }
    ];
    scenes.forEach(function (scene) {
        const preview = buildDevSecretCenterPromptPreview(rid, scene.key);
        if (!preview) return;
        const record = readDevSecretCenterPromptRecord(rid, scene.key) || {};
        const updatedAt = Number(record.updatedAt) || 0;
        const noteTime = updatedAt ? ('最近快照：' + formatDevPromptTimestamp(updatedAt) + '。') : '';
        const note = '来源：侧影分区手动生成时记录的提示词快照（生成前后）。' + noteTime;
        pushFn('secret_center_' + scene.key, scene.label, preview, note);
    });
}

function buildDevPromptCatalogForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    const list = [];
    function push(key, label, prompt, note) {
        const text = String(prompt || '').trim();
        if (!text) return;
        list.push({ key: key, label: label, prompt: text, note: String(note || '').trim() });
    }

    push('wechat_private_v2', '线上私聊', buildDevWechatPrivatePromptPreview(rid), '主聊天 prompt 预览，按当前角色的人设、记忆和连续性规则生成。');
    push('offline_meeting_v2', '线下见面', buildDevOfflineMeetingPromptPreview(rid), '线下见面采用代表性的到达情景预览。');
    appendDevSecretCenterPromptEntries(rid, push);
    try {
        if (typeof buildFullChatPrompt === 'function') {
            push('location_share_chat', '位置共享', buildFullChatPrompt('location_share_chat', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 14,
                extraCurrentContext: '当前场景是实时位置共享中的连续对话。',
                extraTaskRules: '你正在与用户进行实时位置共享。你只能回复纯文本（仅文字与常用标点），禁止语音、图片、表情包、贴纸、链接、代码块、Markdown，以及任何类似 [VOICE: ...]、[STICKER: ...] 的格式。\n【出行方式锁定】\n你已经选择步行作为本次出行方式，本次行程中禁止更改出行方式或再次使用 [[START_MOVE: ...]] 指令。你只能继续以步行的方式向用户汇报当前路况、进度和到达情况。',
                sceneIntro: '当前场景是位置共享中的连续聊天。'
            }), '位置共享预览使用代表性的出行上下文。');
            push('music_chat', '音乐聊天', buildFullChatPrompt('music_chat', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 12,
                extraCurrentContext: '当前音乐状态：播放中；当前歌曲：《示例歌曲》- 示例歌手；当前歌词：我想把今天轻轻唱给你听。',
                extraTaskRules: [
                    '你正在和用户在手机音乐App里一起听歌并聊天，说话仍然要像微信聊天。',
                    '回复要求：1-2句自然中文；不要输出 markdown、代码块、触发码或指令；不要长篇大论。',
                    '可以自然提及歌曲气氛、歌词余韵和你们此刻的关系温度，但不要机械播报播放状态。'
                ].join('\n'),
                sceneIntro: '当前场景是一起听歌时的连续聊天。'
            }), '音乐聊天预览使用代表性的播放状态和歌词上下文。');
            push('voice_call_talk', '语音通话中', buildFullChatPrompt('voice_call_talk', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 14,
                extraCurrentContext: '当前场景是语音通话，角色正在和用户实时说话。',
                extraTaskRules: '你现在处于“语音通话中”模式。\n- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在通话而不是纯打字。\n- 你的回复必须是一个 JSON 对象：{"direction":"...","lines":["...","...","...","..."]}。\n- direction 会单独显示成居中小字，只能写背景音、环境底噪，以及你开口时的声音质感/语气；不要写任何看得见的动作，也不要加括号。\n- lines 会拆成多个气泡，必须有 4 到 7 条，每条只写真正说出口的话。\n- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并收尾，不要再主动开启新的话题。',
                sceneIntro: '当前场景是语音通话中的正式说话，这是持续对话场景。'
            }), '语音通话中使用实时说话场景预览。');
            push('video_call_talk', '视频通话中', buildFullChatPrompt('video_call_talk', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 14,
                extraCurrentContext: '当前场景是视频通话，角色可以看到用户画面。',
                extraTaskRules: '你现在处于“视频通话中”模式。\n- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在通话而不是纯打字。\n- 你的回复必须是一个 JSON 对象：{"direction":"...","lines":["...","...","...","..."]}。\n- direction 会单独显示成居中小字，只能写你此刻的动作、视线方向、神态和表情；不要写台词，不要写背景音，也不要加括号。\n- lines 会拆成多个气泡，必须有 4 到 7 条，每条只写真正说出口的话。\n- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并收尾，不要再主动开启新的话题。\n- 当前是视频通话，你可以基于用户画面做自然反应，但不能胡编乱造看不到的细节。',
                sceneIntro: '当前场景是视频通话中的正式说话，这是持续对话场景。'
            }), '视频通话中使用可见画面场景预览。');
            push('moments_proactive_post', '主动朋友圈', buildFullChatPrompt('moments_proactive_post', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 20,
                extraCurrentContext: '【当前时间】' + new Date().toLocaleString('zh-CN', { hour12: false }) + '\n【今日已发朋友圈条数】0\n【你上一次主动发朋友圈的时间】今天还没发过\n【今天是否和用户聊天】是\n【今天聊天记录（带日期时间）】\n今天和用户有几轮自然聊天，气氛偏亲近。',
                extraTaskRules: [
                    '你要像真实成年人一样判断表达欲，而不是机械定时发圈。',
                    '最近聊天状态、关系余温、刚发生的互动，优先级高于静态世界书设定。',
                    '如果今天和用户有聊天，朋友圈内容应优先围绕今天的互动、今天引发的情绪和今天的生活片段展开。',
                    '如果不适合发，就明确选择不发，不要为了完成任务硬凑一条朋友圈。'
                ].join('\n')
            }), '主动朋友圈预览使用代表性的当日聊天上下文。');
            push('couple_space_diary', '情侣空间日记', buildFullChatPrompt('couple_space_diary', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 18
            }), '情侣空间日记使用连续关系写作任务预览。');
        }
    } catch (e1) { }

    try {
        if (typeof buildRoleLitePrompt === 'function') {
            push('moments_reaction', '朋友圈互动', buildRoleLitePrompt('moments_reaction', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是角色看到用户新发的朋友圈后，决定要不要互动。',
                taskGuidance: '你可以看到用户刚发的朋友圈，需要基于你们关系、最近互动和角色本身判断是否点赞、评论，或者什么都不做。',
                outputInstructions: '只输出当前任务要求的 JSON 对象，不要解释，不要代码块。'
            }), '朋友圈互动为 RoleLite 决策 prompt。');
            push('moments_comment_reply', '朋友圈评论回复', buildRoleLitePrompt('moments_comment_reply', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是角色回复朋友圈评论。',
                taskGuidance: '你需要对用户在朋友圈下的评论作出自然、简短且符合关系阶段的回复。',
                outputInstructions: '只输出一条自然中文回复，不要解释，不要代码块。'
            }), '朋友圈评论回复为 RoleLite 回复 prompt。');
            push('moments_reply_reply', '朋友圈楼中楼回复', buildRoleLitePrompt('moments_reply_reply', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是角色回复朋友圈楼中楼内容。',
                taskGuidance: '你需要承接上一条楼中楼语气，给出一句自然的继续回复。',
                outputInstructions: '只输出一条自然中文回复，不要解释，不要代码块。'
            }), '朋友圈楼中楼回复为 RoleLite 连续承接 prompt。');
            push('voice_call_handshake', '语音通话接听', buildRoleLitePrompt('voice_call_handshake', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是语音通话接听判断。你需要像真实成年人一样决定接不接。',
                taskGuidance: '你现在收到的是一次“语音通话邀请”，这是独立于普通文字聊天的一次通话。\n1. 你需要根据当前时间、你的人设和你对用户当前的好感度、关系亲疏，决定是否接听。\n2. 如果不方便或不想接，必须拒绝。\n3. 如果接听，开场白要像刚连上通话时自然说出口的话。',
                outputInstructions: '只输出一行中文，不要解释、不要代码块。\n- 如果拒绝：格式必须是 [[REJECT]] 后面接一句自然理由。\n- 如果接听：格式必须是 [[ACCEPT]] 后面接“(场景音或语气描写) 开场白内容”。'
            }), '语音通话接听为 RoleLite 接听判断 prompt。');
            push('video_call_handshake', '视频通话接听', buildRoleLitePrompt('video_call_handshake', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是视频通话接听判断。你需要像真实成年人一样决定接不接。',
                taskGuidance: '你现在收到的是一次“视频通话邀请”，这是独立于普通文字聊天的一次通话。\n1. 你需要根据当前时间、你的人设和你对用户当前的好感度、关系亲疏，决定是否接听。\n2. 如果不方便或不想接，必须拒绝。\n3. 如果接听，开场白要像刚连上通话时自然说出口的话。',
                outputInstructions: '只输出一行中文，不要解释、不要代码块。\n- 如果拒绝：格式必须是 [[REJECT]] 后面接一句自然理由。\n- 如果接听：格式必须是 [[ACCEPT]] 后面接“(场景音或语气描写) 开场白内容”。'
            }), '视频通话接听为 RoleLite 接听判断 prompt。');
        }
    } catch (e2) { }

    return list;
}

function renderDevPromptCatalogHtml() {
    const roleOptions = getDevPromptPreviewRoleOptions();
    if (!roleOptions.length) {
        return '<div style="padding:14px; border-radius:12px; background:#f7f8fa; color:#8a8f99; font-size:12px; line-height:1.7;">当前还没有可用于预览提示词的角色数据。</div>';
    }
    const selectedRoleId = resolveDevPromptPreviewRoleId();
    const validRoleId = roleOptions.some(function (item) { return item.roleId === selectedRoleId; })
        ? selectedRoleId
        : roleOptions[0].roleId;
    writeDevPromptPreviewRoleId(validRoleId);
    const roleName = roleOptions.find(function (item) { return item.roleId === validRoleId; });
    const catalog = buildDevPromptCatalogForRole(validRoleId);
    const selectedSceneKey = readDevPromptPreviewSceneKey();
    const validSceneKey = catalog.some(function (item) { return item.key === selectedSceneKey; })
        ? selectedSceneKey
        : (catalog[0] ? catalog[0].key : '');
    writeDevPromptPreviewSceneKey(validSceneKey);
    const current = catalog.find(function (item) { return item.key === validSceneKey; }) || catalog[0] || null;
    const optionsHtml = roleOptions.map(function (item) {
        return '<option value="' + escapeDevPromptHtml(item.roleId) + '"' + (item.roleId === validRoleId ? ' selected' : '') + '>' + escapeDevPromptHtml(item.roleName) + '</option>';
    }).join('');
    const buttonsHtml = catalog.map(function (item) {
        const active = current && current.key === item.key;
        return '<button type="button" onclick="switchDevPromptPreviewScene(\'' + escapeDevPromptHtml(item.key) + '\')" style="border:none; border-radius:999px; padding:8px 12px; cursor:pointer; font-size:12px; font-weight:700; background:' + (active ? '#2563eb' : 'rgba(37,99,235,0.1)') + '; color:' + (active ? '#fff' : '#1d4ed8') + ';">' + escapeDevPromptHtml(item.label) + '</button>';
    }).join('');
    const promptText = current ? current.prompt : '';
    const noteText = current && current.note ? current.note : '这里显示的是按当前代码生成的场景 prompt 预览。';
    return [
        '<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">',
        '  <select id="dev-prompt-preview-role-select" onchange="changeDevPromptPreviewRole(this.value)" style="flex:1; min-width:180px; padding:10px; border:1px solid #dbe2ea; border-radius:10px; background:#fff; font-size:13px;">' + optionsHtml + '</select>',
        '  <button type="button" onclick="copyCurrentDevPromptPreview()" style="padding:10px 12px; border:none; background:#2563eb; color:#fff; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">复制当前场景</button>',
        '</div>',
        '<div style="margin-top:10px; font-size:12px; color:#475569;">当前角色：' + escapeDevPromptHtml(roleName ? roleName.roleName : validRoleId) + '。这里会把当前代码下该角色可用的主要场景 prompt 直接展开给你看。</div>',
        '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' + buttonsHtml + '</div>',
        current
            ? '<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:#f8fafc; color:#475569; font-size:12px; line-height:1.65;">' + escapeDevPromptHtml(noteText) + '</div>'
            : '<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:#fff7ed; color:#9a3412; font-size:12px;">当前没有生成成功的场景 prompt。</div>',
        '<pre id="dev-prompt-preview-output" style="margin:10px 0 0; white-space:pre-wrap; word-break:break-word; max-height:360px; overflow:auto; font-size:11px; line-height:1.55; color:#111827; background:#f3f5f9; border-radius:12px; padding:12px;">' + escapeDevPromptHtml(promptText) + '</pre>'
    ].join('');
}

function refreshDevPromptCatalogPanel() {
    try {
        const panel = document.getElementById('dev-prompt-catalog-panel');
        if (!panel) return;
        panel.innerHTML = renderDevPromptCatalogHtml();
    } catch (e) { }
}

function changeDevPromptPreviewRole(roleId) {
    writeDevPromptPreviewRoleId(roleId);
    writeDevPromptPreviewSceneKey('');
    refreshDevPromptCatalogPanel();
}

function switchDevPromptPreviewScene(sceneKey) {
    writeDevPromptPreviewSceneKey(sceneKey);
    refreshDevPromptCatalogPanel();
}

async function copyCurrentDevPromptPreview() {
    const roleId = resolveDevPromptPreviewRoleId();
    const catalog = buildDevPromptCatalogForRole(roleId);
    const sceneKey = readDevPromptPreviewSceneKey();
    const current = catalog.find(function (item) { return item.key === sceneKey; }) || catalog[0] || null;
    if (!current || !current.prompt) {
        notifyDevPromptAction('当前没有可复制的场景 prompt。');
        return;
    }
    const ok = await copyTextForDevPrompt(current.prompt);
    notifyDevPromptAction(ok ? ('已复制：' + current.label) : '复制失败，请重试。');
}

function renderDevAiPromptHistoryHtml(records) {
    const list = Array.isArray(records) ? records.slice(0, 10) : [];
    if (!list.length) {
        return `
            <div style="padding: 14px; border-radius: 12px; background: #f7f8fa; color: #8a8f99; font-size: 12px; line-height: 1.7;">
                暂无调用记录。下一次触发 AI 后，这里会自动记录聊天、通话、音乐、情侣空间等经过 <code>callAI</code> 的提示词。若你刚改完代码还没刷新页面，请先刷新一次，让新版记录逻辑生效。
            </div>
        `;
    }

    return list.map(function (record, index) {
        const scene = escapeDevPromptHtml(record && record.scene ? record.scene : '其他调用');
        const time = escapeDevPromptHtml(formatDevPromptTimestamp(record && record.timestamp));
        const roleName = escapeDevPromptHtml(record && (record.roleName || record.roleId) ? (record.roleName || record.roleId) : '未绑定角色');
        const model = escapeDevPromptHtml(record && record.model ? record.model : '未记录模型');
        const previewText = buildDevPromptUserPreviewText(record) || '无用户输入预览';
        const previewShort = escapeDevPromptHtml(previewText.length > 120 ? (previewText.slice(0, 120) + '...') : previewText);
        const previewFull = escapeDevPromptHtml(previewText);
        const metaBadge = getDevPromptMetaBadgeHtml(record && record.meta);
        const fallbackTag = record && record.isFallback
            ? '<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff4db; color:#b45309; font-size:11px; font-weight:700;">当前内存</span>'
            : '';
        const payloadText = buildDevPromptDisplayText(record);
        const payload = escapeDevPromptHtml(payloadText);
        const payloadLen = String(payloadText.length);
        return `
            <details ${index === 0 ? 'open' : ''} style="border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; background: #fafbff; padding: 12px 14px; margin-bottom: 10px;">
                <summary style="cursor: pointer; list-style: none; outline: none;">
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding-right: 6px;">
                        <span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#e8f0ff; color:#315efb; font-size:11px; font-weight:700;">${scene}</span>
                        ${metaBadge}
                        ${fallbackTag}
                        <span style="font-size:12px; color:#444; font-weight:600;">${time}</span>
                        <span style="font-size:12px; color:#666;">${roleName}</span>
                    </div>
                </summary>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06);">
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 10px; font-size:12px; color:#666; line-height:1.6;">
                        <span>模型：${model}</span>
                        <span>长度：${payloadLen} 字</span>
                        <span>输入预览：${previewShort}</span>
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom: 10px;">
                        <button type="button" onclick="copyDevAiInputPreviewByIndex(${index})" style="border:none; background:#0f766e; color:#fff; font-size:12px; padding:8px 12px; border-radius:10px; cursor:pointer;">复制输入预览</button>
                        <button type="button" onclick="copyDevAiPromptRecordByIndex(${index})" style="border:none; background:#2563eb; color:#fff; font-size:12px; padding:8px 12px; border-radius:10px; cursor:pointer;">复制这条</button>
                    </div>
                    <details style="margin-bottom: 10px; border:1px solid rgba(0,0,0,0.06); border-radius:10px; background:#fff;">
                        <summary style="cursor:pointer; padding:8px 10px; font-size:12px; color:#334155;">展开完整输入预览</summary>
                        <pre style="margin:0; white-space:pre-wrap; word-break:break-word; max-height:160px; overflow:auto; font-size:11px; line-height:1.55; color:#111827; background:#f8fafc; border-top:1px solid rgba(0,0,0,0.06); padding:10px;">${previewFull}</pre>
                    </details>
                    <pre style="margin:0; white-space:pre-wrap; word-break:break-word; max-height:280px; overflow:auto; font-size:11px; line-height:1.55; color:#222; background:#f3f5f9; border-radius:12px; padding:12px;">${payload}</pre>
                </div>
            </details>
        `;
    }).join('');
}

async function copyTextForDevPrompt(text) {
    const payload = String(text || '');
    if (!payload) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(payload);
            return true;
        } catch (e) { }
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
    } catch (e2) {
        return false;
    }
}

function notifyDevPromptAction(text) {
    try {
        if (typeof window.showCenterToast === 'function') {
            window.showCenterToast(String(text || ''));
            return;
        }
    } catch (e) { }
    alert(String(text || ''));
}

async function copyDevAiPromptRecordByIndex(index) {
    const list = getDevAiPromptHistoryForDisplay();
    const idx = Number(index);
    const record = Number.isFinite(idx) && idx >= 0 ? list[idx] : null;
    if (!record) {
        notifyDevPromptAction('没有找到这条记录。');
        return;
    }
    const ok = await copyTextForDevPrompt(buildDevPromptDisplayText(record));
    notifyDevPromptAction(ok ? '已复制提示词。' : '复制失败，请重试。');
}

async function copyLatestDevAiPromptRecord() {
    return copyDevAiPromptRecordByIndex(0);
}

async function copyDevAiInputPreviewByIndex(index) {
    const list = getDevAiPromptHistoryForDisplay();
    const idx = Number(index);
    const record = Number.isFinite(idx) && idx >= 0 ? list[idx] : null;
    if (!record) {
        notifyDevPromptAction('没有找到这条记录。');
        return;
    }
    const preview = buildDevPromptUserPreviewText(record);
    if (!preview) {
        notifyDevPromptAction('这条记录没有输入预览。');
        return;
    }
    const ok = await copyTextForDevPrompt(preview);
    notifyDevPromptAction(ok ? '已复制输入预览。' : '复制失败，请重试。');
}

function clearDevAiPromptHistory() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return;
        const ok = confirm('确认清空最近 10 条 AI 调用记录？');
        if (!ok) return;
        localStorage.setItem(SETTINGS_DEV_AI_PROMPT_HISTORY_KEY, '[]');
    } catch (e) { }
    if (window.refreshDevPromptDebugPanel) window.refreshDevPromptDebugPanel();
}

window.refreshDevPromptDebugPanel = function () {
    try {
        const panel = document.getElementById('dev-ai-prompt-history-panel');
        const countEl = document.getElementById('dev-ai-prompt-count');
        if (!panel && !countEl) return;
        const records = getDevAiPromptHistoryForDisplay();
        if (countEl) countEl.textContent = '最近记录：' + String(records.length) + '/10';
        if (panel) panel.innerHTML = renderDevAiPromptHistoryHtml(records);
    } catch (e) { }
    try {
        refreshDevPromptCatalogPanel();
    } catch (e2) { }
};

function resolveRoleNameForThoughtChain(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return '未知角色';
    try {
        if (window.charProfiles && window.charProfiles[rid]) {
            const profile = window.charProfiles[rid];
            const name = String(profile.remark || profile.nickName || profile.name || '').trim();
            if (name) return name;
        }
    } catch (e) { }
    return rid;
}

function resolveThoughtChainRoleId() {
    const currentRoleId = String(window.currentChatRole || '').trim();
    if (currentRoleId) return currentRoleId;
    try {
        const records = getDevAiPromptHistoryForDisplay();
        const rid = records && records[0] ? String(records[0].roleId || '').trim() : '';
        if (rid) return rid;
    } catch (e) { }
    return '';
}

function readChatDataForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    try {
        if (window.chatData && typeof window.chatData === 'object' && Array.isArray(window.chatData[rid])) {
            return window.chatData[rid].slice();
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_chatData') || '{}';
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed[rid])) {
            return parsed[rid].slice();
        }
    } catch (e2) { }
    return [];
}

function readRoleStatusHistoryForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    try {
        if (window.roleStatusHistory && typeof window.roleStatusHistory === 'object' && Array.isArray(window.roleStatusHistory[rid])) {
            return window.roleStatusHistory[rid].slice();
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_roleStatusHistory') || '{}';
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed[rid])) {
            return parsed[rid].slice();
        }
    } catch (e2) { }
    return [];
}

function normalizeThoughtChainText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function pickThoughtEntryKind(rawContent) {
    const text = String(rawContent || '').trim();
    if (!text) return null;
    if (text.indexOf('【思考链】') === 0 || text.indexOf('【思考】') === 0) {
        return { kind: 'thought', text: text.replace(/^【思考链】|^【思考】/, '').trim() };
    }
    if (text.indexOf('【内心独白】') === 0) {
        return { kind: 'inner_monologue', text: text.replace(/^【内心独白】/, '').trim() };
    }
    return null;
}

function attachReplySnippetsToThoughtRounds(rounds, history) {
    const list = Array.isArray(rounds) ? rounds : [];
    if (!list.length) return list;
    const visibleAiMessages = (Array.isArray(history) ? history : [])
        .filter(function (msg) {
            if (!msg || typeof msg !== 'object') return false;
            if (msg.role !== 'ai') return false;
            if (msg.hidden === true) return false;
            if (msg.type === 'system_event') return false;
            return typeof msg.content === 'string' && msg.content.trim();
        })
        .map(function (msg) {
            return {
                timestamp: Number(msg.timestamp) || 0,
                text: normalizeThoughtChainText(msg.content)
            };
        })
        .filter(function (item) { return !!item.text; })
        .sort(function (a, b) { return a.timestamp - b.timestamp; });
    if (!visibleAiMessages.length) return list;
    for (let i = 0; i < list.length; i++) {
        const round = list[i];
        if (!round) continue;
        const ts = Number(round.timestamp) || 0;
        let picked = '';
        for (let j = 0; j < visibleAiMessages.length; j++) {
            const msg = visibleAiMessages[j];
            if (msg.timestamp >= ts && msg.timestamp <= ts + 120000) {
                picked = msg.text;
                break;
            }
        }
        if (!picked) {
            for (let j = visibleAiMessages.length - 1; j >= 0; j--) {
                const msg = visibleAiMessages[j];
                if (msg.timestamp <= ts) {
                    picked = msg.text;
                    break;
                }
            }
        }
        if (picked) {
            round.replySnippet = picked.length > 140 ? (picked.slice(0, 140) + '...') : picked;
        }
    }
    return list;
}

function collectThoughtChainRounds(roleId, maxRounds) {
    const history = readChatDataForRole(roleId).sort(function (a, b) {
        return (Number(a && a.timestamp) || 0) - (Number(b && b.timestamp) || 0);
    });
    const hiddenEntries = [];
    for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;
        if (msg.role !== 'ai' || msg.hidden !== true) continue;
        const parsed = pickThoughtEntryKind(msg.content);
        if (!parsed || !parsed.text) continue;
        hiddenEntries.push({
            timestamp: Number(msg.timestamp) || 0,
            kind: parsed.kind,
            text: parsed.text
        });
    }
    hiddenEntries.sort(function (a, b) { return a.timestamp - b.timestamp; });
    const rounds = [];
    let currentRound = null;
    for (let i = 0; i < hiddenEntries.length; i++) {
        const entry = hiddenEntries[i];
        const needNewRound = !currentRound
            || Math.abs(entry.timestamp - currentRound._lastTs) > 15000
            || (entry.kind === 'thought' && !!currentRound.thought)
            || (entry.kind === 'inner_monologue' && !!currentRound.innerMonologue);
        if (needNewRound) {
            currentRound = {
                timestamp: entry.timestamp,
                thought: '',
                innerMonologue: '',
                replySnippet: '',
                _lastTs: entry.timestamp
            };
            rounds.push(currentRound);
        }
        if (entry.kind === 'thought' && !currentRound.thought) {
            currentRound.thought = normalizeThoughtChainText(entry.text);
        } else if (entry.kind === 'inner_monologue' && !currentRound.innerMonologue) {
            currentRound.innerMonologue = normalizeThoughtChainText(entry.text);
        }
        currentRound._lastTs = entry.timestamp;
        if (!currentRound.timestamp || entry.timestamp < currentRound.timestamp) {
            currentRound.timestamp = entry.timestamp;
        }
    }

    const statusHistory = readRoleStatusHistoryForRole(roleId).sort(function (a, b) {
        return (Number(a && a.timestamp) || 0) - (Number(b && b.timestamp) || 0);
    });
    for (let i = 0; i < statusHistory.length; i++) {
        const item = statusHistory[i];
        if (!item || typeof item !== 'object') continue;
        const mono = normalizeThoughtChainText(item.inner_monologue);
        if (!mono) continue;
        const ts = Number(item.timestamp) || 0;
        let attached = false;
        for (let j = rounds.length - 1; j >= 0; j--) {
            const round = rounds[j];
            if (!round) continue;
            if (Math.abs(ts - (Number(round.timestamp) || 0)) <= 15000) {
                if (!round.innerMonologue) round.innerMonologue = mono;
                attached = true;
                break;
            }
            if ((Number(round.timestamp) || 0) < ts - 15000) break;
        }
        if (!attached) {
            rounds.push({
                timestamp: ts,
                thought: '',
                innerMonologue: mono,
                replySnippet: ''
            });
        }
    }

    for (let i = 0; i < rounds.length; i++) {
        if (rounds[i] && typeof rounds[i] === 'object') {
            delete rounds[i]._lastTs;
        }
    }
    rounds.sort(function (a, b) { return (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0); });
    const merged = rounds.filter(function (round) {
        return !!(round && (round.thought || round.innerMonologue));
    });
    attachReplySnippetsToThoughtRounds(merged, history);
    const limit = Math.max(1, Number(maxRounds) || 50);
    return merged.slice(Math.max(0, merged.length - limit));
}

function buildThoughtChainExportText(roleId, rounds) {
    const rid = String(roleId || '').trim();
    const roleName = resolveRoleNameForThoughtChain(rid);
    const list = Array.isArray(rounds) ? rounds : [];
    const lines = [];
    lines.push('【角色思考链提取】');
    lines.push('角色：' + roleName + (rid ? '（' + rid + '）' : ''));
    lines.push('提取时间：' + formatDevPromptTimestamp(Date.now()));
    lines.push('轮数：' + String(list.length));
    lines.push('');
    for (let i = 0; i < list.length; i++) {
        const item = list[i] || {};
        const ts = formatDevPromptTimestamp(item.timestamp);
        lines.push('【第' + String(i + 1) + '轮｜' + ts + '】');
        lines.push('思考链：' + (item.thought || '（该轮未记录 thought）'));
        lines.push('内心独白：' + (item.innerMonologue || '（该轮未记录 inner_monologue）'));
        if (item.replySnippet) {
            lines.push('对外回复摘录：' + item.replySnippet);
        }
        lines.push('');
    }
    return lines.join('\n').trim();
}

async function extractCurrentRoleThoughtChain() {
    const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
    if (!devUnlocked) {
        notifyDevPromptAction('未解锁开发者模式，无法提取思考链。');
        return;
    }
    const roleId = resolveThoughtChainRoleId();
    if (!roleId) {
        notifyDevPromptAction('当前没有可提取的角色，请先进入一个角色聊天。');
        return;
    }
    const rounds = collectThoughtChainRounds(roleId, 50);
    const outputEl = document.getElementById('dev-thought-chain-output');
    if (!rounds.length) {
        const emptyText = '未找到思考链记录。\n请先和该角色对话 1-2 轮后再提取。';
        if (outputEl) outputEl.textContent = emptyText;
        notifyDevPromptAction('未找到思考链记录。');
        return;
    }
    const text = buildThoughtChainExportText(roleId, rounds);
    if (outputEl) {
        outputEl.textContent = text;
    } else {
        try {
            prompt('思考链提取结果：', text);
        } catch (e) {
            alert(text);
        }
    }
    window.__lastExtractedThoughtChainText = text;
    const copied = await copyTextForDevPrompt(text);
    notifyDevPromptAction(copied ? '思考链已提取并复制到剪贴板。' : '思考链已提取。');
}

window.extractCurrentRoleThoughtChain = extractCurrentRoleThoughtChain;

// 4. 保存所有设置
function saveAllSettings() {
    let url = document.getElementById('setting-api-url').value.trim();
    const key = document.getElementById('setting-api-key').value.trim();
    const model = document.getElementById('setting-model-select').value;
    const temp = document.getElementById('setting-temp-slider').value;

    try {
        if (window.updateSystemPromptDebugUI) window.updateSystemPromptDebugUI();
    } catch (e) { }

    if (url && key) {
        if (url.endsWith('/')) url = url.slice(0, -1);

        localStorage.setItem('api_base_url', url);
        localStorage.setItem('user_api_key', key);
        localStorage.setItem('selected_model', model);
        // 新增：保存温度
        localStorage.setItem('model_temperature', temp);
        
        alert(`✅ 设置已保存！\n\n模型：${model}\n温度：${temp}`);
        if(window.closeApp) window.closeApp();
    } else {
        alert("地址和 Key 不能为空！");
    }
}

// 5. 清除所有数据（彻底版）
async function clearAllData() {
    // 弹出确认对话框
    const confirmed = confirm("⚠️ 警告：此操作将清除所有保存的数据！\n\n包括：\n• API 配置\n• 聊天记录\n• 角色数据\n• 所有设置\n• 缓存文件\n\n确定要继续吗？");
    
    if (confirmed) {
        // 二次确认
        const doubleConfirm = confirm("🚨 最后确认：\n\n数据清除后无法恢复！\n\n确定要清除所有数据吗？");
        
        if (doubleConfirm) {
            try {
                // 1. 清除 localStorage
                localStorage.clear();
                console.log("✅ localStorage 已清除");
                
                // 2. 清除 sessionStorage
                sessionStorage.clear();
                console.log("✅ sessionStorage 已清除");
                
                // 3. 清除 IndexedDB (localForage)
                if (window.localforage) {
                    await localforage.clear();
                    console.log("✅ localForage 已清除");
                }
                
                // 4. 清除所有 IndexedDB 数据库（彻底清除）
                if (window.indexedDB && indexedDB.databases) {
                    const databases = await indexedDB.databases();
                    for (const db of databases) {
                        indexedDB.deleteDatabase(db.name);
                        console.log("✅ 删除数据库:", db.name);
                    }
                }
                
                // 5. 注销 Service Worker（清除缓存控制）
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                        console.log("✅ Service Worker 已注销");
                    }
                }
                
                // 6. 清除所有缓存
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        await caches.delete(cacheName);
                        console.log("✅ 缓存已删除:", cacheName);
                    }
                }
                
                // 显示成功消息
                alert("✅ 所有数据已彻底清除！\n\n页面将自动刷新...");
                
                // 强制刷新（绕过缓存）
                setTimeout(() => {
                    window.location.href = window.location.href;
                }, 500);
                
            } catch (error) {
                console.error("清除数据时出错:", error);
                alert("❌ 清除数据时出错: " + error.message + "\n\n请查看控制台了解详情");
            }
        }
    }
}

function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(String(base64 || ''));
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function gzipToBase64(text) {
    const input = new TextEncoder().encode(String(text || ''));
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64(buf);
}

async function gunzipFromBase64(base64) {
    const bytes = base64ToUint8Array(base64);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
}

function getBackupLocalStorageKeys() {
    return [
        'wechat_moments_data',
        'moments_proactive_state_v1',
        'music_library_v1',
        'wechat_worldbooks',
        'wechat_worldbook_categories',
        'wechat_worldbook_active_category',
        'wechat_memory_archive_v1',
        'user_avatar',
        'user_name',
        'user_signature',
        'aes_bubble_text',
        'show_status_info',
        'icon_follow_wallpaper',
        'icon_custom_color',
        'appearance_icon_manager_open',
        'wechat_stats_partner_id',
        'wechat_custom_groups',
        'wechat_chatlist_kaomoji',
        'chat_settings_by_role'
    ];
}

function getChatStoreKeys() {
    const fallback = [
        'wechat_chatData',
        'wechat_chatMapData',
        'wechat_charProfiles',
        'wechat_userPersonas',
        'wechat_backgrounds',
        'wechat_callLogs',
        'wechat_unread'
    ];
    try {
        if (window.DB && isObject(window.DB.keys)) {
            const vals = Object.values(window.DB.keys).filter(Boolean).map(String);
            if (vals.length) return vals;
        }
    } catch (e) { }
    return fallback;
}

function shouldBackupLocalStorageKey(key) {
    if (!key) return false;
    const k = String(key);
    if (k.indexOf('widget_save_') === 0) return true;
    return getBackupLocalStorageKeys().indexOf(k) !== -1;
}

async function buildAppBackupPayload() {
    const ls = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!shouldBackupLocalStorageKey(key)) continue;
            const value = localStorage.getItem(key);
            if (value != null) ls[key] = value;
        }
    } catch (e) { }

    const lf = {};
    const lfKeysWanted = new Set();
    getChatStoreKeys().forEach(k => lfKeysWanted.add(k));
    lfKeysWanted.add('desktopAppList');
    lfKeysWanted.add('desktopWallpaper');

    const hasForage = !!(window.localforage && typeof window.localforage.getItem === 'function');
    if (hasForage) {
        try {
            if (window.DB && typeof window.DB.configLargeStore === 'function') {
                window.DB.configLargeStore();
            }
        } catch (e) { }

        try {
            const keys = await window.localforage.keys();
            (keys || []).forEach(k => {
                if (!k) return;
                const sk = String(k);
                if (sk.indexOf('widget_img_') === 0) lfKeysWanted.add(sk);
            });
        } catch (e) { }

        const lfKeys = Array.from(lfKeysWanted);
        for (let i = 0; i < lfKeys.length; i++) {
            const key = lfKeys[i];
            try {
                const v = await window.localforage.getItem(key);
                if (v !== null && v !== undefined) lf[key] = v;
            } catch (e) { }
        }
    } else {
        const lfKeys = Array.from(lfKeysWanted);
        for (let i = 0; i < lfKeys.length; i++) {
            const key = lfKeys[i];
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = safeJsonParse(raw);
                lf[key] = parsed !== null ? parsed : raw;
            } catch (e) { }
        }
    }

    return {
        __shubao_backup__: 1,
        createdAt: new Date().toISOString(),
        payload: { ls: ls, lf: lf }
    };
}

function downloadTextFile(filename, text) {
    const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportAppData() {
    try {
        const backup = await buildAppBackupPayload();
        const payloadText = JSON.stringify(backup.payload || {});
        const base = {
            __shubao_backup__: backup.__shubao_backup__,
            createdAt: backup.createdAt,
            format: 'plain',
            data: backup.payload
        };

        let outText = JSON.stringify(base);
        let suffix = 'json';

        const canZip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
        if (canZip) {
            try {
                const gz = await gzipToBase64(payloadText);
                outText = JSON.stringify({
                    __shubao_backup__: backup.__shubao_backup__,
                    createdAt: backup.createdAt,
                    format: 'gzip-base64',
                    data: gz
                });
            } catch (e) {
            }
        }

        const stamp = backup.createdAt.replace(/[:.]/g, '-');
        const filename = 'shubao-backup-' + stamp + '.' + suffix;
        downloadTextFile(filename, outText);
        alert('✅ 已导出 JSON 备份文件');
    } catch (e) {
        console.error(e);
        alert('❌ 导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
}

function triggerImportAppData() {
    const input = document.getElementById('settings-import-json');
    if (!input) {
        alert('找不到导入控件，请重新打开设置页面');
        return;
    }
    input.value = '';
    input.click();
}

async function importAppDataFromInput(fileInput) {
    try {
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) return;
        const text = await file.text();
        const json = safeJsonParse(text);
        if (!json || !isObject(json)) {
            alert('❌ 导入失败：文件不是有效 JSON');
            return;
        }

        if (json.__shubao_backup__ !== 1) {
            alert('❌ 导入失败：不是本系统导出的备份文件');
            return;
        }

        let payload = null;
        if (json.format === 'gzip-base64') {
            if (typeof DecompressionStream === 'undefined') {
                alert('❌ 当前环境不支持解压缩，无法导入该备份');
                return;
            }
            const rawText = await gunzipFromBase64(json.data || '');
            payload = safeJsonParse(rawText);
        } else if (json.format === 'plain') {
            payload = json.data;
        } else if (json.payload) {
            payload = json.payload;
        } else if (json.data) {
            payload = json.data;
        }

        if (!payload || !isObject(payload) || !isObject(payload.ls) || !isObject(payload.lf)) {
            alert('❌ 导入失败：备份结构不正确');
            return;
        }

        const ok = confirm('⚠️ 导入会覆盖聊天/联系人/桌面/音乐/朋友圈等数据，且操作不可撤销。\n\n建议先导出一份当前数据备份。\n\n确定要继续导入吗？');
        if (!ok) return;

        try {
            if (window.DB && typeof window.DB.configLargeStore === 'function') {
                window.DB.configLargeStore();
            }
        } catch (e) { }

        const lsKeys = Object.keys(payload.ls || {});
        for (let i = 0; i < lsKeys.length; i++) {
            const k = lsKeys[i];
            try {
                localStorage.setItem(k, String(payload.ls[k]));
            } catch (e) { }
        }

        const hasForage = !!(window.localforage && typeof window.localforage.setItem === 'function');
        const lfKeys = Object.keys(payload.lf || {});
        if (hasForage) {
            for (let i = 0; i < lfKeys.length; i++) {
                const k = lfKeys[i];
                try {
                    await window.localforage.setItem(k, payload.lf[k]);
                } catch (e) { }
            }
        } else {
            for (let i = 0; i < lfKeys.length; i++) {
                const k = lfKeys[i];
                try {
                    const v = payload.lf[k];
                    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
                } catch (e) { }
            }
        }

        alert('✅ 导入完成，页面将刷新以加载新数据');
        setTimeout(() => window.location.reload(), 300);
    } catch (e) {
        console.error(e);
        alert('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        try {
            if (fileInput) fileInput.value = '';
        } catch (e) { }
    }
}

// 挂载
window.openSettingsApp = openSettingsApp;
window.fetchModelList = fetchModelList;
window.saveAllSettings = saveAllSettings;
window.clearAllData = clearAllData;
window.exportAppData = exportAppData;
window.triggerImportAppData = triggerImportAppData;
window.importAppDataFromInput = importAppDataFromInput;
