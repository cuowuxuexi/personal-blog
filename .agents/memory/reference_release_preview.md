---
name: release-preview
description: 发布面板隔离预览的非根 base 与 SSR 修复约束
updated: 2026-08-24
type: reference
---

# Release preview 约束指针

现行实现与说明见 `panel/lib/probes.mjs`、`panel/lib/README.md`、`panel/probes.test.mjs` 和 `panel/publish-api.test.mjs`。

job 级预览必须使用 `/release-preview/<jobId>/` base。当前 Windows + VitePress 组合下，单次非根 base 构建可能生成 `NotFound` SSR 壳，因此实现会生成根路径 SSR 与带前缀客户端资源并合并两者。开放预览前必须验证目标 HTML 存在、不是 `NotFound`，且请求的编辑锚点存在；不要在没有对应回归测试时简化为单次构建。
