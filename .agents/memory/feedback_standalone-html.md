---
name: standalone-html-routing
description: 独立 HTML 必须走 public 目录 + StandaloneHtml；普通站内链接会被 VitePress 拦成 404
type: feedback
updated: 2026-08-23
---

# 独立 HTML 点击 404

约定真源：`docs/public/html/README.md`。

VitePress 点击拦截调用的是内部闭包 `go()`，不是可替换的 `router.go`。无后缀路径会被当成缺失 Markdown。正确做法：文件放 `docs/public/html/<name>/index.html`，正文用 `<StandaloneHtml>`（`target="_blank"`）。不要再给每一页写死中间件名单。已上线的 Pi / Grok 仍在 `/journey-guides/`。
