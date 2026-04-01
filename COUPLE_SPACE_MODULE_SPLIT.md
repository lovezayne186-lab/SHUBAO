# 情侣空间模块拆分方案

## 目标

把现在的“一个大文件里混合页面、状态、存储、提示词、AI 调用、同步逻辑”的实现，拆成可独立维护的模块。

这次拆分优先解决 4 个问题：

1. 页面逻辑和 AI 逻辑耦合太深。
2. 不同场景的提示词散落在各处，难以统一改写。
3. 数据存储 key 分散，读写路径不清晰。
4. 很多功能依赖父窗口的聊天系统，但没有明确适配层。

## 建议目录

```text
apps/
  couple-space.html

JS/couplespace/
  app/
    bootstrap.js
    router.js
    events.js
  core/
    constants.js
    state.js
    date.js
    format.js
    errors.js
  adapters/
    parent-bridge.js
    ai-client.js
    storage.js
    notification.js
  domains/
    link/
      link-service.js
    anniversary/
      anniversary-service.js
    miss/
      miss-service.js
    mood/
      mood-service.js
      mood-repository.js
      mood-normalizer.js
    diary/
      diary-service.js
      diary-comment-service.js
      role-diary-sync-service.js
    secret/
      secret-service.js
      secret-repository.js
      secret-activity-watcher.js
    qa/
      qa-service.js
      qa-repository.js
      qa-question-bank.js
    settings/
      settings-service.js
  ai/
    scenes/
      couple-qa-scene.js
      secret-reaction-scene.js
      role-diary-scene.js
      diary-comment-scene.js
    prompt/
      base-role-context.js
      prompt-factory.js
      output-parser.js
  ui/
    home/
      home-page.js
    mood/
      mood-page.js
      mood-modal.js
      diary-note-list.js
    qa/
      qa-modal.js
    secret/
      secret-modal.js
      secret-timeline.js
    settings/
      settings-modal.js
    shared/
      toast.js
      loading.js
      confirm.js
```

## 拆分原则

1. `ui` 只负责渲染和事件绑定，不直接拼 prompt，不直接访问 `localStorage`。
2. `domains` 只负责业务规则，不碰 DOM。
3. `ai/scenes` 一场景一个文件，统一输入输出。
4. `adapters` 统一处理和父窗口、`callAI`、`localforage`、通知系统的对接。
5. 所有页面都从 `app/bootstrap.js` 启动，不在每个模块里各自偷偷初始化。

## 一层一层怎么拆

### 1. App 层

#### `app/bootstrap.js`

职责：

- 页面启动入口
- 初始化 store
- 初始化各 feature
- 注册全局监听

只做“装配”，不写业务细节。

#### `app/router.js`

职责：

- 管理 `home / mood / record / letter`
- 控制当前 tab

现在的 `setActiveTab`、`renderDock`、`renderPages` 可以迁到这里。

#### `app/events.js`

职责：

- 统一自定义事件名
- 统一发事件 / 监听事件

例如：

- `couple:link-changed`
- `couple:mood-updated`
- `couple:qa-updated`
- `couple:secret-updated`

---

### 2. Core 层

#### `core/constants.js`

职责：

- 所有 storage key
- role key 分隔符
- 最大图片数
- 心情选项常量

把现在散落的：

- `ANNIVERSARY_STORAGE_KEY`
- `MOOD_STORAGE_KEY`
- `ROLE_MOOD_STORAGE_KEY`
- `SECRET_SPACE_MESSAGES_KEY`
- `COUPLE_QA_STORAGE_KEY`

统一收口。

#### `core/state.js`

职责：

- 内存态容器
- 页面共享状态

建议只保留最小 UI 状态：

```js
{
  activeTab,
  linkedRoleId,
  miss,
  moodUi,
  qaUi,
  secretUi
}
```

不要把持久化数据和所有临时 UI 细节揉在一个大对象里。

#### `core/date.js`

职责：

- `toDateKey`
- `dateFromKey`
- `isSameDay`
- `addDays`
- `computeDaysTogether`

#### `core/format.js`

职责：

- `escapeHtml`
- `formatTime`
- 文本清洗

---

### 3. Adapter 层

这是情侣空间最关键的一层，因为它现在强依赖父窗口。

#### `adapters/parent-bridge.js`

职责：

- 统一访问父窗口能力
- 不让业务代码直接到处写 `window.parent`

对外暴露：

- `getRoleProfile(roleId)`
- `getUserPersona(roleId)`
- `getWechatHistory(roleId)`
- `buildRoleLitePrompt(...)`
- `buildFullChatPrompt(...)`
- `callAI(...)`
- `showToast(...)`
- `showNotification(...)`

这样以后如果情侣空间独立出来，不需要全项目重改。

#### `adapters/ai-client.js`

职责：

- 包装 `callAI`
- 统一错误处理
- 统一 history 注入

建议对外只给一个方法：

```js
runScene({ scene, roleId, history, context })
```

#### `adapters/storage.js`

职责：

- 包装 `localStorage + localforage`
- roleId 分桶
- 兼容旧 key 迁移

建议统一成：

```js
getScoped(key, roleId)
setScoped(key, roleId, value)
removeScoped(key, roleId)
```

这样 `mood/qa/secret` 都不需要自己拼 key。

#### `adapters/notification.js`

职责：

- iOS 风格通知
- 弹幕 / barrage
- 全局“角色正在处理中”提示

现在这些逻辑散在 `couple-space.js` 里，建议抽走。

---

### 4. Domain 层

这是重写时最重要的拆分。

#### `domains/link`

职责：

- 读取当前情侣绑定状态
- 解绑
- 清除 role-scoped 数据

建议文件：

- `link-service.js`

对外暴露：

- `getCurrentLink()`
- `unlink({ notify })`
- `isLinked()`

#### `domains/anniversary`

职责：

- 纪念日读取 / 保存
- 天数计算

建议文件：

- `anniversary-service.js`

#### `domains/miss`

职责：

- “想你 +1”
- 角色今日想你次数读取

建议文件：

- `miss-service.js`

#### `domains/mood`

职责：

- 用户日记 entries
- 角色日记 roleEntries
- 心情条目标准化

建议文件：

- `mood-repository.js`
- `mood-normalizer.js`
- `mood-service.js`

说明：

- repository 只管存取
- service 只管业务
- normalizer 专门把旧数据揉成标准结构

标准数据建议：

```js
{
  date,
  moodId,
  moodLabel,
  text,
  images,
  comments,
  updatedAt
}
```

#### `domains/diary`

职责：

- 保存用户日记
- 自动触发角色评论
- 角色日记补写
- 用户评论角色日记后触发 AI 回复

建议文件：

- `diary-service.js`
- `diary-comment-service.js`
- `role-diary-sync-service.js`

说明：

- `diary-service` 负责用户写日记
- `diary-comment-service` 负责评论和回复
- `role-diary-sync-service` 负责“进入空间时自动补写角色日记”

这块是现在最值得单独拆的业务模块。

#### `domains/secret`

职责：

- 秘密空间消息时间线
- 活动日志监听
- 修罗场触发

建议文件：

- `secret-repository.js`
- `secret-service.js`
- `secret-activity-watcher.js`

说明：

- repository 只管消息持久化
- service 负责发送 / 接收 / 合并
- watcher 监听活动日志并决定是否触发 AI

#### `domains/qa`

职责：

- 今日问题状态
- 时间推进
- 回答状态
- 伴侣回答生成

建议文件：

- `qa-question-bank.js`
- `qa-repository.js`
- `qa-service.js`

说明：

`coupleQA.js` 现在已经相对独立，适合优先拆成这个三段。

#### `domains/settings`

职责：

- 修罗场开关
- 未来情侣空间设置项

建议文件：

- `settings-service.js`

---

### 5. AI 层

这是你后面“重写提示词”最需要单独抽出来的一层。

#### `ai/prompt/base-role-context.js`

职责：

- 从父窗口拿角色人设
- 用户 persona
- 世界书
- 最近聊天 history

输出统一上下文对象：

```js
{
  roleId,
  roleName,
  roleProfile,
  userPersona,
  worldBook,
  history
}
```

#### `ai/prompt/prompt-factory.js`

职责：

- 根据场景把 base context 组装成最终 prompt

不要再让每个业务文件自己拼字符串。

#### `ai/prompt/output-parser.js`

职责：

- JSON 提取
- 纯文本提取
- reply/content/text 兼容

把现在的 `extractJsonObject`、`normalizeAiReplyText` 统一收进来。

#### `ai/scenes/couple-qa-scene.js`

输入：

- question
- userAnswer

输出：

- partnerAnswerText

#### `ai/scenes/secret-reaction-scene.js`

输入：

- trigger
- payload
- recentActivities

输出：

- shortMessage

#### `ai/scenes/role-diary-scene.js`

输入：

- mode: `today` / `catchup`
- shortTermMemory
- chatStats

输出：

- `{ mood, content }`
- 或 `{ diaries: [] }`

#### `ai/scenes/diary-comment-scene.js`

输入：

- scene: `user_diary` / `comment_on_role_diary`
- diaryText
- userComment
- images

输出：

- shortReply

---

### 6. UI 层

#### `ui/home/home-page.js`

职责：

- 首页数据展示
- 想你按钮
- 打开问答入口

#### `ui/mood/mood-page.js`

职责：

- 周视图 / 月视图渲染
- 选中日期
- 打开日记卡片

#### `ui/mood/mood-modal.js`

职责：

- 选心情
- 写日记
- 选图片
- 保存

#### `ui/mood/diary-note-list.js`

职责：

- 用户日记卡片
- 角色日记卡片
- 评论区渲染

#### `ui/qa/qa-modal.js`

职责：

- 打印问题
- 输入答案
- 解锁伴侣回答

#### `ui/secret/secret-modal.js`

职责：

- 弹窗开关
- 输入框
- 按钮事件

#### `ui/secret/secret-timeline.js`

职责：

- 时间线渲染
- 滚动到底部

#### `ui/settings/settings-modal.js`

职责：

- 修罗场开关
- 解绑确认

## 现有代码对应关系

### 现有 `couple-space.js`

建议拆成：

- `app/bootstrap.js`
- `domains/link/link-service.js`
- `domains/miss/miss-service.js`
- `domains/mood/mood-service.js`
- `domains/diary/diary-service.js`
- `domains/diary/diary-comment-service.js`
- `domains/diary/role-diary-sync-service.js`
- `domains/secret/secret-service.js`
- `domains/secret/secret-activity-watcher.js`
- `ai/scenes/secret-reaction-scene.js`
- `ai/scenes/role-diary-scene.js`
- `ai/scenes/diary-comment-scene.js`
- `ui/home/home-page.js`
- `ui/mood/mood-page.js`
- `ui/secret/secret-modal.js`

### 现有 `coupleQA.js`

建议拆成：

- `domains/qa/qa-repository.js`
- `domains/qa/qa-service.js`
- `ai/scenes/couple-qa-scene.js`
- `ui/qa/qa-modal.js`

### 现有 `qa_data.js`

建议改名：

- `domains/qa/qa-question-bank.js`

### 现有 `qlkj-setting.js`

建议拆成：

- `domains/settings/settings-service.js`
- `ui/settings/settings-modal.js`

## 推荐的调用方向

只能单向依赖：

```text
UI -> Domain -> AI Scene / Repository -> Adapter
```

不要反过来：

- Domain 不要直接操作 DOM
- AI Scene 不要直接操作 localStorage
- Repository 不要直接 `window.parent.callAI`

## 先拆的优先级

### 第一批

1. `adapters/parent-bridge.js`
2. `adapters/storage.js`
3. `domains/qa/*`
4. `ui/qa/*`

原因：

- 问答模块边界最清晰
- 最容易先拆成功

### 第二批

1. `domains/mood/*`
2. `domains/diary/*`
3. `ai/scenes/role-diary-scene.js`
4. `ai/scenes/diary-comment-scene.js`

原因：

- 这是当前情侣空间最复杂的业务核心

### 第三批

1. `domains/secret/*`
2. `ai/scenes/secret-reaction-scene.js`
3. `ui/secret/*`

原因：

- 强依赖活动日志和通知，适合最后拆

## 最后建议

如果你准备彻底重写情侣空间，我建议不要继续维护“一个 `couple-space.js` 大总管”。

最好的方式是直接以这 5 个 feature 为单位重建：

1. `link`
2. `qa`
3. `mood-diary`
4. `secret`
5. `settings`

然后把所有提示词统一收进 `ai/scenes`。

这样你后面想重写提示词时，只需要改场景文件，不需要再在 UI 代码里翻字符串。
