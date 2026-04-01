# 提示词分层对照表

这份表的目标不是解释业务功能，而是帮助后续改提示词时快速判断：

- 这个场景该走哪一层 builder
- 该不该带完整聊天连续性
- 输出应该继续保持什么格式

## 总原则

### A类 `FullChatPrompt`

- 适合“角色正在持续存在地和用户互动”的场景
- 高优先级带入：
  - 最近聊天摘要
  - 最近系统事件
  - 关系连续性摘要
  - 长期记忆 / 世界书
- 不代表所有 A 类都要输出主聊天 JSON 协议
- A 类内部再分：
  - `dialogue`：持续说话型
  - `continuity_journal`：连续关系写作型
  - `continuity_decision`：连续关系决策型

### B类 `RoleLitePrompt`

- 适合“一次性角色反应”
- 保留角色味和中等记忆，但不使用主聊天那套重协议
- 输出通常是：
  - 一句到几句自然中文
  - 或一个很小的 JSON

### C类 `RoleJsonTaskPrompt`

- 适合“角色驱动的结构化生成”
- 需要角色设定，但主要目标是稳定 JSON
- 不应该输出聊天腔的废话

### D类 `ToolJsonPrompt`

- 适合纯工具 / 数据生成
- 不走恋爱角色沉浸逻辑
- 只做任务本身

## 场景归类

### A类 FullChatPrompt

| 场景 | 子类型 | 当前入口 | 输出形式 |
| --- | --- | --- | --- |
| 线上微信私聊 | `dialogue` | `JS/chat/sec-03-ai-prompt.js` | 主聊天单对象 JSON |
| 位置共享中的对话 | `dialogue` | `JS/chat/sec-06-map-location.js` | 纯文本对话 / 原有位置共享格式 |
| 语音通话中说话 | `dialogue` | `JS/chat/sec-07-call-outgoing.js` / `JS/chat/sec-08-call-incoming.js` | 原有一行括号动作格式 |
| 视频通话中说话 | `dialogue` | `JS/chat/sec-07-call-outgoing.js` / `JS/chat/sec-08-call-incoming.js` | 原有一行括号动作格式 |
| 音乐页聊天 | `dialogue` | `JS/music.js` | 1-2句自然中文 |
| 长叙事模式 | `continuity_journal` | `JS/chat/sec-10-navigation-tools.js` | 长叙事 JSON |
| 情侣空间心情日记 | `continuity_journal` | `JS/chat/sec-02-core-render.js` / `JS/couplespace/couple-space.js` | 日记 JSON |
| AI 主动发朋友圈 | `continuity_decision` | `JS/moments.js` | `should_post/content/visibility/mood` JSON |

### B类 RoleLitePrompt

| 场景 | 当前入口 | 输出形式 |
| --- | --- | --- |
| 朋友圈点赞/评论决策 | `JS/moments.js` | 小 JSON |
| 朋友圈下回复评论 | `JS/moments.js` | 一句话 |
| 朋友圈评论的继续回复 | `JS/moments.js` | 一句话 |
| 情侣邀请是否接受 | `JS/chat/sec-10-navigation-tools.js` | 小 JSON |
| 语音/视频通话是否接听 | `JS/chat/sec-07-call-outgoing.js` | `[[ACCEPT]]` / `[[REJECT]]` |
| 经期页面角色关心 | `JS/我的/period.js` | 1-2句文本 |
| 情侣问答角色回答 | `JS/couplespace/coupleQA.js` | 一段正文 |
| 情侣空间即时吃醋/关心反应 | `JS/system.js` / `JS/couplespace/couple-space.js` | 一条简短微信式消息 |
| 离线回来后的思念同步 | `JS/chat.js` | 小 JSON |

### C类 RoleJsonTaskPrompt

| 场景 | 当前入口 | 输出形式 |
| --- | --- | --- |
| 地图地点生成 | `JS/chat/sec-06-map-location.js` | JSON 数组 |
| 打工日报 / 伴手礼 | `JS/work.js` | JSON 对象 |
| 打工生活便签 | `JS/work.js` | 固定文本格式 |

### D类 ToolJsonPrompt

| 场景 | 当前入口 | 输出形式 |
| --- | --- | --- |
| 步数生成 | `JS/我的/sports.js` | JSON 数组 |
| 轨迹生成 | `JS/我的/sports.js` | JSON 对象 |

## 改提示词时怎么判断改哪儿

### 先问自己 3 个问题

1. 这个场景是不是“角色正在继续和用户相处”？
2. 这个场景是不是只需要“一次性反应”？
3. 这个场景本质是不是“稳定产出 JSON / 数据”？

### 判断规则

- 如果答案偏向“持续互动、要吃关系上下文”，优先放 A 类
- 如果答案偏向“只回一句话/做一次判断”，优先放 B 类
- 如果答案偏向“角色相关，但以 JSON 产出为主”，优先放 C 类
- 如果答案偏向“和恋爱沉浸无关的数据任务”，放 D 类

## 你以后最常改的几个点

### 想增强角色连续性

- 优先看 `JS/chat/sec-03-ai-prompt.js`
- 重点是：
  - 最近聊天摘要
  - 最近系统事件摘要
  - 关系连续性摘要
  - 长期记忆档案

### 想让一个小场景别再吃太重的 prompt

- 先确认它是不是应该从 A 降到 B 或 C
- 不要在原文件里继续叠加更多“角色设定 + 世界书 + 关系说明”
- 改成对应 builder 即可

### 想让调试面板更容易看

- 关键在 `JS/api.js`
- 通过 marker 决定：
  - `promptClass`
  - `sceneCode`
  - `sceneSubtype`

## 当前 marker 约定

- `[[PROMPT_CLASS:FULL_CHAT]]`
- `[[PROMPT_CLASS:ROLE_LITE]]`
- `[[PROMPT_CLASS:ROLE_JSON_TASK]]`
- `[[PROMPT_CLASS:TOOL_JSON]]`

常见子标记：

- `[[SCENE_SUBTYPE:dialogue]]`
- `[[SCENE_SUBTYPE:continuity_journal]]`
- `[[SCENE_SUBTYPE:continuity_decision]]`

常见场景标记：

- `[[SCENE:WECHAT_PRIVATE_V2]]`
- `[[SCENE:COUPLE_SPACE_DIARY]]`
- `[[SCENE:MOMENTS_PROACTIVE_POST]]`
- 其它场景统一由 `makeSceneMarker(scene)` 生成

## 维护建议

- 新增 AI 场景时，先补这张表，再写代码
- 如果一个场景开始同时依赖“最近聊天 + 关系进展 + 长期记忆”，优先考虑升到 A 类
- 如果一个场景只是“生成一个结果”，但你发现 prompt 越写越像聊天，就说明它大概率分层错了
