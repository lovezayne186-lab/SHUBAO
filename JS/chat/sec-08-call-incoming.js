/* === [SEC-08] AI 主动来电与接听逻辑 === */

function showIncomingCallUI(roleId, isVideo) {
    // 移除可能存在的旧弹窗
    const old = document.getElementById('incoming-call-layer');
    if (old) old.remove();

    const profile = window.charProfiles[roleId] || {};
    const avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    const name = profile.nickName || "未知角色";

    // 创建全屏遮罩
    const layer = document.createElement('div');
    layer.id = 'incoming-call-layer';
    layer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: space-between;
        padding: 60px 0; color: #fff; backdrop-filter: blur(10px);
    `;

    // 上半部分：头像和名字
    const isVideoCall = !!isVideo;
    const subtitleText = isVideoCall ? "邀请你进行视频通话..." : "邀请你进行语音通话...";
    const iconHtml = isVideoCall
        ? "<i class='bx bx-video' style=\"font-size:32px;\"></i>"
        : "<i class='bx bxs-phone-call' style=\"font-size:32px;\"></i>";
    const topHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; margin-top: 40px;">
            <img src="${avatarUrl}" style="width:100px; height:100px; border-radius:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 20px;">
            <div style="font-size:24px; font-weight:bold; margin-bottom:10px;">${name}</div>
            <div style="font-size:14px; color:rgba(255,255,255,0.7);">${subtitleText}</div>
        </div>
    `;

    // 下半部分：接听/挂断按钮 (左红右绿)
    const bottomHtml = `
        <div style="width: 80%; display:flex; justify-content: space-between; margin-bottom: 60px;">
            <!-- 挂断 -->
            <div id="btn-reject-call" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:64px; height:64px; background:#ff3b30; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    <i class='bx bxs-phone-off' style="font-size:32px;"></i>
                </div>
                <span style="font-size:12px;">挂断</span>
            </div>
            
            <!-- 接听 -->
            <div id="btn-accept-call" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:64px; height:64px; background:#30d158; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    ${iconHtml}
                </div>
                <span style="font-size:12px;">接听</span>
            </div>
        </div>
    `;

    layer.innerHTML = topHtml + bottomHtml;
    document.body.appendChild(layer);

    // 绑定事件
    document.getElementById('btn-reject-call').addEventListener('click', function () {
        layer.remove();
        // 写入一条“未接来电”记录
        const now = Date.now();
        appendMessageToDOM({
            role: 'ai',
            type: 'text',
            content: '📞 [未接来电]',
            timestamp: now
        });
        saveData();

        // 触发AI对未接来电的反应
        if (roleId) {
            const profile = window.charProfiles[roleId] || {};
            let systemPrompt = profile.desc || "你是一个友好的AI助手";

            if (profile.schedule && profile.schedule.trim()) {
                systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
            }
            if (profile.style && profile.style.trim()) {
                systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
            }
            const userPersona = window.userPersonas[roleId] || {};
            if (userPersona.name || userPersona.setting || userPersona.gender || userPersona.birthday) {
                systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
                if (userPersona.name) {
                    systemPrompt += `用户名字：${userPersona.name}\n`;
                }
                if (userPersona.setting) {
                    systemPrompt += `用户背景：${userPersona.setting}\n`;
                }
                if (userPersona.gender) {
                    systemPrompt += `用户性别：${userPersona.gender}\n`;
                }
                if (userPersona.birthday) {
                    systemPrompt += `用户生日：${userPersona.birthday}\n`;
                }
            }

            const history = window.chatData[roleId] || [];
            const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

            const headerTitle = document.getElementById('current-chat-name');
            const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
            if (headerTitle) {
                headerTitle.innerText = "对方正在输入...";
            }

            const callType = isVideo ? "视频通话" : "语音通话";
            const userMessage = `[系统通知：你发起了${callType}，但对方没有接听，显示为未接来电。请根据你的人设，表现出委屈、失落或关心的反应，询问用户为什么没有接听电话，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]`;
            invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle);
        }
    });

    document.getElementById('btn-accept-call').addEventListener('click', function () {
        layer.remove();
        acceptIncomingCall(roleId, isVideoCall);
    });
}

// 2. 接听电话：初始化状态并唤起通话界面
function acceptIncomingCall(roleId, isVideo) {
    const overlay = document.getElementById('voice-call-overlay');
    const avatarEl = document.getElementById('voice-call-avatar');
    const statusEl = document.getElementById('voice-call-status');
    const inputRow = document.getElementById('voice-call-input-row');

    const isVideoCall = !!isVideo;

    // 1. 显示或隐藏语音通话界面
    if (overlay) {
        overlay.style.display = isVideoCall ? 'none' : 'flex';
    }
    if (inputRow && !isVideoCall) {
        inputRow.style.display = 'none';
    }

    // 2. 设置头像
    const profile = window.charProfiles[roleId] || {};
    if (avatarEl) avatarEl.src = profile.avatar || 'assets/chushitouxiang.jpg';

    // 3. 初始化状态 (直接 Connected，不需要握手)
    const state = window.voiceCallState || {};
    // 清理旧定时器
    if (state.timerId) clearInterval(state.timerId);
    if (state.chatSyncIntervalId) clearInterval(state.chatSyncIntervalId);

    state.active = true;
    state.connected = true;
    state.seconds = 0;
    state.roleId = roleId;
    state.isVideo = isVideoCall;
    window.voiceCallState = state;
    window.isVoiceCallActive = true;
    window.voiceCallHistory = [];

    // 4. 启动计时器（语音和视频都计时）
    if (statusEl) statusEl.innerText = '00:00';
    state.timerId = setInterval(function () {
        const s = (window.voiceCallState && window.voiceCallState.seconds) || 0;
        const next = s + 1;
        window.voiceCallState.seconds = next;
        if (statusEl && !isVideoCall) {
            statusEl.innerText = formatCallDuration(next);
        }
    }, 1000);

    // 5. 视频通话：直接进入视频界面
    if (isVideoCall) {
        startActiveVideoSession(roleId);
    }

    // 6. 🔥 关键：因为是AI打来的，接通后AI要先说话
    triggerAIFirstSpeakInCall(roleId);
}

// 3. 触发 AI 通话第一句 (修复版：带记忆功能)
// 🔍 搜索 function triggerAIFirstSpeakInCall 并替换为：
function triggerAIFirstSpeakInCall(roleId) {
    const state = window.voiceCallState || {};
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.map(msg => {
        if (!msg.content) return null;
        if (msg.type === 'call_end' || msg.type === 'call_memory') return null;
        return {
            role: msg.role === 'me' ? 'me' : 'ai',
            content: msg.content
        };
    }).filter(Boolean);

    const userMessage = "[系统通知：用户接听了你的电话。请结合之前的聊天上下文，直接开始说话，说出你的开场白。]";

    window.callAI(
        systemPrompt,
        cleanHistory,
        userMessage,
        function (aiResponseText) {
            if (!window.voiceCallState.active) return;

            // 🔥 修复点：使用 cleanVoiceCallAIReply 进行清洗
            let reply = cleanVoiceCallAIReply(aiResponseText);

            if (reply) {
                window.voiceCallHistory.push({
                    role: 'ai',
                    content: reply
                });
                syncCallChatMessages();
            }
        },
        function () {
            console.error("AI 接通后发言失败");
        }
    );
}




document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('voice-call-overlay');
    const floatWindow = document.getElementById('call-float-window');
    const minimizeBtn = document.getElementById('voice-call-minimize');
    const hangupBtn = document.getElementById('voice-call-hangup-btn');
    const micBtn = document.getElementById('voice-call-mic-btn');
    const speakerBtn = document.getElementById('voice-call-speaker-btn');
    const inputRow = document.getElementById('voice-call-input-row');
    const inputEl = document.getElementById('voice-call-input');
    const sendBtn = document.getElementById('voice-call-send');
    if (minimizeBtn && overlay && floatWindow) {
        minimizeBtn.addEventListener('click', function () {
            const state = window.voiceCallState || {};
            if (!state.active) return;
            overlay.style.display = 'none';
            floatWindow.style.display = 'flex';
        });
    }
    if (floatWindow && overlay) {
        floatWindow.addEventListener('click', function () {
            const state = window.voiceCallState || {};
            if (!state.active) return;
            floatWindow.style.display = 'none';
            overlay.style.display = 'flex';
        });
    }
    if (hangupBtn) {
        hangupBtn.addEventListener('click', function () {
            try {
                const s = window.voiceCallState || {};
                s.userHangup = true;
                window.voiceCallState = s;
            } catch (e) { }
            endVoiceCall();
        });
    }
    if (micBtn) {
        micBtn.addEventListener('click', function () {
            micBtn.classList.toggle('off');
            if (inputRow) {
                if (inputRow.style.display === 'none' || !inputRow.style.display) {
                    inputRow.style.display = 'flex';
                    if (inputEl) {
                        setTimeout(function () {
                            inputEl.focus();
                        }, 10);
                    }
                } else {
                    inputRow.style.display = 'none';
                }
            }
        });
    }
    if (speakerBtn) {
        speakerBtn.addEventListener('click', function () {
            speakerBtn.classList.toggle('off');
        });
    }
    if (sendBtn) {
        sendBtn.innerHTML = "<i class='bx bx-refresh'></i>";
        sendBtn.title = '一键重Roll';
    }
    if (inputEl) {
        const sendFromCallInput = function () {
            const raw = inputEl.value.trim();
            const roleId = window.currentChatRole;
            if (!raw || !roleId) return;
            if (!window.voiceCallState || !window.voiceCallState.connected || !window.isVoiceCallActive) {
                return;
            }
            const text = raw;
            inputEl.value = '';
            sendTextInVoiceCall(text);
        };
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendFromCallInput();
            }
        });
        if (sendBtn) {
            sendBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                rerollVoiceCallReply();
            });
        }
    }
});





// =========================================================
// === 2. 菜单与弹窗体系 (完整功能) ===
// =========================================================

// 打开主设置菜单

