# panel/public

发布面板单页前端。`index.html` 只提供静态外壳；脸（按钮位置、墨纸样子）不变。门里面按三件工作切开：改期头、改条目、走发布。`app.js` 只负责开机接线。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `index.html` | 静态页面壳、固定按钮与根 DOM 锚点 |
| `app.js` | 开机、装配三件工作、顶层状态与状态栏 |
| `issue-chrome.mjs` | 改期头：栏目条、当期/篇章、主题封面说明、开新期 |
| `entry-editor.mjs` | 改条目：收集一条、表单草稿、贴图、润色、写入文章并准备预览 |
| `publication.mjs` | 走发布：准备、确认、问进度只问、自动继续核对、重试 |
| `style.css` | 发布面板视觉样式；设计约束见 `panel/DESIGN.md` |
| `kind-ui.mjs` | 改期头内部：capability 视图与上传请求体 |
| `draft.mjs` | 改条目内部：表单草稿匹配与 `/api/draft` 请求体 |
| `paste.mjs` | 改条目内部：剪贴板图片 |
| `publish-flow.mjs` | 改条目内部：防连点 |
| `job-restore.mjs` | 走发布内部：可恢复任务匹配 |
| `media.mjs` | 改条目内部：正文图片 URL |
| `escape.mjs` | 动态 HTML/属性转义 |

网址路径这次不改（`/api/draft` 仍是写入文章）。问进度是 `GET /api/publish/jobs/:id`；核对未结束由面板自动发 `POST .../continue-verify`。

## Stable UI anchors

- 栏目、期数和条目容器：`#kinds`、`#issue-bar`、`#entries`
- 保存/发布：`#btn-preview`、`#btn-publish`
- 动态动作：`data-kind`、`data-mode`、`data-role`
- 期头可见输入：`#issue-theme-input`、`#issue-caption-input`

修改可见页面时不要只搜索 `index.html`：改主题进 `issue-chrome.mjs`，改贴图或清空草稿进 `entry-editor.mjs`，改确认旁提示进 `publication.mjs`。

## State and boundaries

顶层状态仍在 `app.js` 的 `state`，由三件工作共用。后端 capability 由 bootstrap 从共享 `ContentKind` adapter 提供；`kind-ui.mjs` 只保留冻结且有 fixture 测试的兼容回退，不得继续扩展为第二份合同。

`kind-ui.mjs`、`draft.mjs`、`publish-flow.mjs`、`job-restore.mjs`、`paste.mjs` 是内部实现，不要从 `app.js` 直接改。

## Tests

前端纯函数测试位于 `panel/*.test.mjs`，完整运行 `pnpm test:panel`。测试不要移进本目录，除非同时修改 package script。

## 子目录

无。

最后更新：2026-08-24
