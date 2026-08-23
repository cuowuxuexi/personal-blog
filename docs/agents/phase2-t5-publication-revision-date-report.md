# Phase 2 T5 — 首次公开与修订日期语义（执行报告）

任务：`task_03a22a81a177` / dispatch `ctx_6dcd6eb755f7`  
档位：`docs/agents/phase2-build-time-projections-collaboration.md` → T5 / Wave E  
日期：2026-08-22  
Outcome：**succeeded**

## 改动摘要

1. **查询口径**：`content-catalog/query.mjs` 新增 `freshnessDate`；`selectRecentPosts` 按 `revisionDate ?? date` 降序；Hermes / research 忽略 `revisionDate`。`postsByCategory`（系列最新一期）仍严格按 `date`。
2. **投影合同**（T1 已有，本波确认消费）：受管 frontmatter 可选 `revisionDate`；非法或早于 `date` 则整篇投影失败；缺省不回填。站点 adapter 已透传 `revisionDate`。
3. **文档**：`CONTEXT.md` 日期字段合同；`content-catalog/README.md`；`docs/agents/publishing-panel.md`；`.agents/skills/blog-editor/SKILL.md`。未批量改既有 MD，未引入 `updated` / Git / mtime 自动逻辑。

## 文件列表

| 路径 | 变更 |
| --- | --- |
| `content-catalog/query.mjs` | freshness 排序 |
| `content-catalog/index.mjs` | 导出 `freshnessDate` |
| `content-catalog/catalog.test.mjs` | revision / latest 单测 |
| `docs/.vitepress/recent-posts.test.mjs` | 无 revision 快照不变 + fixture |
| `CONTEXT.md` | Date field contract |
| `content-catalog/README.md` | 日期字段表 |
| `docs/agents/publishing-panel.md` | Date fields |
| `.agents/skills/blog-editor/SKILL.md` | `revisionDate` 作者显式声明 |
| `docs/agents/phase2-t5-publication-revision-date-report.md` | 本报告 |

## 验证

```bash
pnpm test:content
```

预期：catalog + recent-posts + site-projection 全绿（含「无 revisionDate 时 recent 快照与旧 date 排序一致」「有 revisionDate 重排」「Hermes 假 revision 不抢序」「latest issue 仍按 date」）。

## 偏差

- 无。未改公开正文观点；未回填历史 `revisionDate`。
- 面板 UI 尚未提供 `revisionDate` 表单项（合同允许作者手写 frontmatter；创作入口自动化留给后续，非本波必交付）。

## 遗留

- T6：shadow `manualPosts` 清理、任务档 checkbox、全量文档收口。
- 可选：面板显式编辑 `revisionDate`；站点正文展示修订日期（若作者需要）。

## Outcome

**succeeded**
