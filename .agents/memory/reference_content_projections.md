---
name: content-projections
description: 周记/历程身份投影与投研/哲学/大问题结构投影的权威入口
updated: 2026-08-28
type: reference
---

# 内容投影真源指针

现行架构与验收以以下文件为准：

- 决策：`docs/adr/0002-content-authority-and-build-time-projections.md`
- 源码地图：`content-catalog/README.md`、根 `PROJECT.md`
- Phase 2 验收：`docs/agents/phase2-build-time-projections-acceptance-report.md`
- 2026-08-24 结构加深：`.planning/架构加深/验收报告.md`（提案 05/06）
- 2026-08-27 投研侧栏接线：`.planning/投研标的上线/方案.md`
- 2026-08-28 投研 HTML 章：`subject-chapter` 的 `publicHref` 成为侧栏 link，标题直达 `/html/<名字>`

稳定约束：周记与「我的AI历程」的身份真源是 Markdown/frontmatter；投研/哲学/大问题的目录、nav 与 sidebar 也由内容目录投影，`config.mts` 只 spread 这些组。`posts.ts` 和受管 sidebar 由构建期生成。发布面板只写周记/历程 Markdown 与正文实际引用的图片。不要重新引入 `posts.ts` / `config.mts` 三写，也不要手改受管 hub sidebar。
