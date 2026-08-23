# Phase 2 终验修复 R1 报告（repair_round=1）

- 角色：执行窗口【执行02】
- 任务：task_4501116b83b4 / dispatch ctx_7e3e9ac7ea47（当前结算）；先前 ctx_ad5402fad0ae capability 曾被撤销，工程已在该窗完成
- 时间：2026-08-22
- outcome：**succeeded**

## 改动摘要

按终验修复包 R1–R5 修掉 live sidebar 同源假绿、浏览器可达图缺护栏、managed scan 平行身份映射、`postsByCategory` 未共享稳定排序，以及过期文档措辞；未创建 acceptance_report，未 commit/push/deploy。

## 文件列表

| 路径 | 作用 |
| --- | --- |
| `content-catalog/verify/sidebar-wiring.mjs` | live/live-shaped spread 接线断言 |
| `content-catalog/verify/import-graph.mjs` | relative ESM 递归可达图扫描 |
| `content-catalog/verify/parity.mjs` | 取消无接线同源 fallback；接入 wiring |
| `content-catalog/verify/fixture-repo.mjs` | live-shaped fixture + spread 变异 |
| `content-catalog/verify/scan.mjs` | managed kinds 委托 `managedIdentityFromMarkdown` |
| `content-catalog/project.mjs` | 抽出 `managedIdentityFromMarkdown` |
| `content-catalog/index.mjs` | 导出 identity helper |
| `content-catalog/query.mjs` | `postsByCategory` 稳定次键 issue/link |
| `content-catalog/parity.fixture.test.mjs` | R1 live-shaped 红绿 |
| `content-catalog/import-graph.test.mjs` | R2 图扫描 + index re-export 变异 |
| `content-catalog/scan-identity.test.mjs` | R3 边界：scan ≡ shared core |
| `content-catalog/catalog.test.mjs` | R4 同日确定性 |
| `docs/.vitepress/content-catalog-adapter.mjs` | `postsByCategoryFromCatalog` 窄 adapter |
| `docs/.vitepress/posts.ts` | 委托共享 `postsByCategory` |
| `docs/.vitepress/site-projection.test.mjs` | wiring / graph / 共享排序 |
| `docs/.vitepress/managed-sidebar-fs.mjs` | 去掉「待 T3」过期注释 |
| `docs/agents/agent-first-modularization.md` | Phase 2「执行完成，等待独立终验」 |
| `docs/agents/phase2-r1-repair-report.md` | 本报告 |

## R1–R5 如何变红 / 变绿

### R1 High — live sidebar 假绿

- **根因**：`resolvedYearSidebarItems` / `resolvedNamedJourneySidebarItems` 在 config 字面量为空时无条件回退 `projectManagedPostsFromFs`，与 posts 同源，删/挪 spread 仍可能绿。
- **修复**：`inspectManagedSidebarWiring` 独立断言 `managed-sidebar-fs` import + 三 section 各自恰好对应 spread；仅当 wiring 通过才允许投影补侧栏。
- **变红**：live-shaped fixture 上 `mutateRemoveInvestSidebarSpread` / `mutateMisplaceJourneySidebarSpread` → `sidebar-wiring-spread`；`mutateRemoveManagedSidebarImport` → `sidebar-wiring-import`。
- **变绿**：literal fixture 仍走字面量；live / live-shaped 在接线齐全时绿；`parity.live` 绿。

### R2 High — posts.ts 浏览器传递依赖

- **修复**：`checkBrowserSafeImportGraph` 对 `posts.ts` / adapter / `content-catalog/index.mjs` 做 relative import/re-export 递归扫描，禁止可达 `project-fs` 或 `node:fs`。
- **变红**：临时 fixture `index` re-export `project-fs` → `browser-fs-leak`。
- **变绿**：现网可达图扫描通过。

### R3 Medium — managed kind 平行身份映射

- **修复**：`scan.mjs` 对 weekly-life / weekly-investment / journey 委托 `managedIdentityFromMarkdown`（与 `postFromManagedMarkdown` 同源）；research/Hermes 维持专项路径；保留 body/rel/dated。
- **变红/锁**：`scan-identity.test.mjs` 断言 scan 字段与 shared core 一致；Hermes 不走 managed identity。
- **变绿**：既有 fixture / live parity 仍绿。

### R4 Medium — postsByCategory 共享排序

- **修复**：`query.mjs` 在 date 后加 issue、link 稳定次键（不用 revisionDate）；`posts.ts` 经 adapter 委托共享实现。
- **变红锁**：同日多条 + 高 revisionDate 的旧文不得抢 latest；catalog / site-projection 测试锁定顺序。
- **变绿**：recent 新鲜度排序保持原口径（不以 postsByCategory 次键改 recent）。

### R5 文档收口

- `managed-sidebar-fs.mjs` 去掉「待 T3」。
- `agent-first-modularization.md` Phase 2 改为「执行完成，等待独立终验」；不以 T6 报告冒充 acceptance。
- 未创建 `acceptance_report`。

## 五条命令证据

| 命令 | 退出码 |
| --- | --- |
| `pnpm test:content` | **0**（42/42；本 Dispatch 重跑确认） |
| `pnpm test:panel` | **0**（155/155；本 Dispatch 重跑确认） |
| `node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs` | **0**（6/6） |
| `pnpm docs:build` | **0** |
| `git diff --check` | **0** |

自验使用 Cursor 宿主原生 `node --test` / `pnpm`；未伪称 `/check-work`。

## 偏差

1. **编排 capability（历史）**：首轮 `ctx_ad5402fad0ae` 的 dcap 在中途被撤销，导致当时无法 `worker_done`；已向 Run 发 status `msg_c579f15ed32b`。本结算使用重派 `ctx_7e3e9ac7ea47`。
2. **recent 次键**：R4 稳定次键只落在 `postsByCategory`；`selectRecentPosts` 同日仍 return 0，避免改 HomeRecent 展示（非范围）。

## 遗留

- 独立终验与 `acceptance_report` 仍由规划窗在终验通过后书写。
- 非范围未做：legacy triple-write helpers 清理、Hermes/panel parseFrontmatter 统一、Phase 3、commit/push/deploy、无关 dirty 整理。
- 派发侧需确认本窗 `worker_done` 是否被 revoked capability 挡住；若挡住，用新 dispatch 结算同一修复结果即可（repair_round 仍为 1）。

## outcome

**succeeded** — R1–R5 已落地并通过契约自验五条命令。
