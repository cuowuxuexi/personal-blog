---
name: standalone-html-routing
description: 周记可嵌独立 HTML；投研 HTML 章用 publicHref 直达，不要 iframe
type: feedback
updated: 2026-08-28
---

# 独立 HTML 两条路

约定真源：`docs/public/html/README.md`、`docs/agents/research-publishing.md`。验收：`pnpm check:html`。

- 周记正文可以 `<StandaloneHtml>` 嵌进文章。
- 投研交来的 HTML、历程 `publicHref` 标题：点标题就打开 `/html/<名字>` 整页。不要再套档案壳或 iframe。
- 不要把「完整档案页」理解成必须把画布改写成 Markdown。档案根才是恒瑞那种壳。

普通站内链会被 VitePress 拦成 404；`#hash` 会被 `<base>` 收成目录路径。不要另写中间件名单。
