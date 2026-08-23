---
name: content-projections
description: 周记/历程构建期投影的权威入口与不可回退约束
updated: 2026-08-24
type: reference
---

# 内容投影真源指针

现行架构与验收以以下文件为准：

- 决策：`docs/adr/0002-content-authority-and-build-time-projections.md`
- 源码地图：`content-catalog/README.md`
- Phase 2 验收：`docs/agents/phase2-build-time-projections-acceptance-report.md`

稳定约束：周记与「我的AI历程」的身份真源是 Markdown/frontmatter；`posts.ts` 和受管 sidebar 由构建期投影生成；发布面板只写目标 Markdown 与正文实际引用的图片。不要重新引入 `posts.ts` / `config.mts` 三写。
