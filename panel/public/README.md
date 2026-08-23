# panel/public

发布面板单页前端。`index.html` 只提供静态外壳；主要栏目、期数、条目、期头和发布状态由 `app.js` 动态渲染。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `index.html` | 静态页面壳、固定按钮与根 DOM 锚点 |
| `app.js` | 当前顶层状态、动态渲染、事件、API 与发布流程编排 |
| `style.css` | 发布面板视觉样式；设计约束见 `panel/DESIGN.md` |
| `kind-ui.mjs` | 栏目 capability 回退、模式归一化、期头/期数视图和上传请求体 |
| `draft.mjs` | 本地/服务端草稿匹配、恢复选择与 `/api/draft` 请求体 |
| `publish-flow.mjs` | 防重复提交的 single-flight 辅助 |
| `job-restore.mjs` | 可恢复发布任务与当前栏目/期数匹配 |
| `media.mjs` | 正文图片 URL 提取与移除 |
| `paste.mjs` | 剪贴板图片识别、角色和文件名 |
| `escape.mjs` | 动态 HTML/属性转义 |

## Stable UI anchors

- 栏目、期数和条目容器：`#kinds`、`#issue-bar`、`#entries`
- 保存/发布：`#btn-preview`、`#btn-publish`
- 动态动作：`data-kind`、`data-mode`、`data-role`
- 期头可见输入：`#issue-theme-input`、`#issue-caption-input`

修改可见页面时不要只搜索 `index.html`：先从锚点进入 `app.js` 的 `renderKinds`、`renderIssueBar`、`renderIssueChrome`、`renderEntries` 或 `renderJob`。

## State and boundaries

全局状态目前集中在 `app.js` 的 `state`。后端 capability 由 bootstrap 从共享 `ContentKind` adapter 提供；`kind-ui.mjs` 只保留冻结且有 fixture 测试的兼容回退，不得继续扩展为第二份合同。

前端目标模块是 `IssueEditor`、`EntryEditor`、`DraftSession`、`PublicationFlow`；当前尚未完成拆分，不要把计划中的文件当作 live 实现。

## Tests

前端纯函数测试位于 `panel/*.test.mjs`，完整运行 `pnpm test:panel`。测试不要移进本目录，除非同时修改 package script。

## 子目录

无。

最后更新：2026-08-24
