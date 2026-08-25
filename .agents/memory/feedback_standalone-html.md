---
name: standalone-html-routing
description: 独立 HTML 走 public + StandaloneHtml；`#hash` 会被 `<base>` 收成目录路径
type: feedback
updated: 2026-08-25
---

# 独立 HTML 两次漏检

约定真源：`docs/public/html/README.md`。验收：`pnpm check:html`。

普通站内链会被 VitePress 拦成 404；`#hash` 会被 `<base>` 收成目录路径。不要另写中间件名单，也不要把「目录页存在」当成锚点存在。
