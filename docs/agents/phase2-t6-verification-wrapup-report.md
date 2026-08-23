# Phase 2 T6 — 验证与文档收口（执行报告）

任务：`task_e91f33fb4d8e` / dispatch `ctx_27b536c7bfb2`  
档位：`docs/agents/phase2-build-time-projections-collaboration.md` → T6 / Wave F  
日期：2026-08-22  
Outcome：**succeeded**

## 改动摘要

1. **对等主路径**：`checkContentParity` 改为文件扫描 ↔ `projectManagedPostsFromFs` ↔ 侧栏；删除 live `posts.ts` 的 `manualPosts` shadow；残留非空 shadow 报 `deprecated-shadow-manual-posts`。
2. **Fixture / R1**：fixture 不再写 manual posts 金标；六合同与 R1 改为投影权威下的漂移/假绿路径（title 漂移红、issue-only 绿）。
3. **文档与路由**：VitePress / catalog / publishing-panel / blog-editor（含 templates + weekly-and-journey）去掉三写教导；`agent-first-modularization.md` Phase 2 checkbox 在终验后勾选。

## 文件列表（本波主要）

| 路径 | 变更 |
| --- | --- |
| `docs/.vitepress/posts.ts` | 删除 `manualPosts` shadow |
| `content-catalog/verify/parity.mjs` | 投影权威对等 |
| `content-catalog/verify/projections.mjs` | `tryParseShadowManualPosts` |
| `content-catalog/verify/fixture-repo.mjs` | fixture/mutations 改投影口径 |
| `content-catalog/parity.*.test.mjs` / `project.test.mjs` / `site-projection.test.mjs` | 金标与断言 |
| `docs/.vitepress/README.md`、`content-catalog/README.md`、`publishing-panel.md`、`config.mts` 注释 | 去三写 |
| `.agents/skills/blog-editor/**` | 投影路由与模板 |
| `docs/agents/agent-first-modularization.md` | Phase 2 [x] |
| `docs/agents/phase2-t6-verification-wrapup-report.md` | 本报告 |

## 五条命令证据

| 命令 | 结果 |
| --- | --- |
| `pnpm test:content` | 35/35，退出码 0 |
| `pnpm test:panel` | 155/155，退出码 0 |
| `node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs` | 6/6，退出码 0 |
| `pnpm docs:build` | complete in ~6.11s，退出码 0 |
| `git diff --check` | 退出码 0（修正模板行尾空白后） |

## 偏差

- 面板 `insertManualPost` / `updateManualPost` 等 legacy helpers 仍保留并有单测（不再被 `applyDraft` 调用）；非空 shadow 会被 parity 拒绝。
- schema 字段名仍为 `pairWithManualPosts`（语义已是对投影对账）；未做破坏性重命名。

## 遗留

- Phase 3（投研/哲学/大问题结构投影）未启动。
- 可选：删除或进一步隔离 panel legacy 字符串手术 helpers。
- 无 commit / push / deploy。

## Outcome

**succeeded** — Phase 2 完成条件可按任务档验收。
