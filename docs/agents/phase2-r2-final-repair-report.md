# Phase 2 终验修复 R2 报告（repair_round=2｜最终轮）

- 角色：执行窗口【执行03】
- 任务：task_4df56fef435c / dispatch ctx_fda45329a395
- 模型：cursor-grok-4.5-high-fast（本窗）
- 时间：2026-08-22
- outcome：**succeeded**

## 改动摘要

按终验修复包 R2-1 / R2-2 / R2-3 修掉 Markdown 身份被 kind 静默覆盖、浏览器可达图漏动态 `import()` 与 `fs/promises`、以及 sidebar wiring 未剔除注释且未强制 own spread 恰好一次；未创建 acceptance_report，未改终验通过态，未 commit/push/deploy。

## 文件列表

| 路径 | 作用 |
| --- | --- |
| `content-catalog/project.mjs` | identity 反映 `fm.category`/`fm.type`；`postFromManagedMarkdown` fail-closed |
| `content-catalog/verify/scan.mjs` | managed scan 继续共享 identity（含缺失值） |
| `content-catalog/verify/import-graph.mjs` | 相对动态 `import()` 边；识别 `node:fs/promises` / `fs/promises` |
| `content-catalog/verify/sidebar-wiring.mjs` | 去注释后检测；own spread === 1、foreign === 0 |
| `content-catalog/verify/fixture-repo.mjs` | R2 身份 / wiring 变异 |
| `content-catalog/project.test.mjs` | R2-1 单元红绿 |
| `content-catalog/scan-identity.test.mjs` | scan 共享错/缺 identity |
| `content-catalog/parity.fixture.test.mjs` | R2-1 parity 红；R2-3 wiring 变异红 |
| `content-catalog/import-graph.test.mjs` | dynamic import / fs/promises 变红 |
| `content-catalog/sidebar-wiring.test.mjs` | 注释剥离、恰好一次、literal 不被注释误判 |
| `docs/agents/agent-first-modularization.md` | 仍「执行完成，等待独立终验」；补 R2 报告指针 |
| `docs/agents/phase2-r2-final-repair-report.md` | 本报告 |

## R2-1 / R2-2 / R2-3 如何变红 / 变绿

### R2-1 High — Markdown 身份真源

- **根因**：`managedIdentityFromMarkdown` 用 `kind.category` / `kind.postType` 覆盖 frontmatter，错误身份被静默纠正。
- **修复**：identity 直接取 `fm.category` / `fm.type`；`postFromManagedMarkdown` 在缺失或与 kind 合同不符时返回 `null`（不自动纠正）；scan 继续读共享 identity。
- **变红**：
  - 单元：`category:投资` / `type:journey` / 缺 `category` → identity 保留原值，post 为 `null`。
  - fixture：`mutateWeeklyLifeWrongCategory|WrongType|MissingCategory` → `test:content` 经 `triple-write-drift` 红。
- **变绿**：正确 live / good fixture 投影与 parity 仍绿；title/date/revisionDate/description/issue/link 语义未改。

### R2-2 Medium — browser graph 完整性

- **修复**：`collectSpecifiers` 增加相对 `import('...')`；`isNodeFsImport` 覆盖静态 / dynamic / `require` 的 `node:fs`、`fs`、`node:fs/promises`、`fs/promises`。
- **变红**：`dynamic import('./project-fs.mjs')` → `browser-fs-leak`；`import 'node:fs/promises'` → `browser-fs-leak`。
- **变绿**：现网 `posts.ts` / adapter / `content-catalog/index.mjs` 可达图仍绿。

### R2-3 Medium — sidebar 恰好一次且非注释

- **修复**：`stripJsComments` 后检测 import/spread；各 section own spread 计数必须 `===1`，foreign `===0`；mode 检测亦走去注释源码。
- **变红**：`mutateDuplicateInvestSidebarSpread` / `mutateCommentOnlySidebarSpread` → `sidebar-wiring-spread`；`mutateCommentOnlyManagedSidebarImport` → `sidebar-wiring-import`。
- **变绿**：live-shaped 齐全接线绿；literal fixture 即使注释里写了 spread/import 仍判 `literal` 且绿。

## 五条命令证据

| 命令 | 退出码 |
| --- | --- |
| `pnpm test:content` | **0**（51/51） |
| `pnpm test:panel` | **0**（155/155） |
| `node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs` | **0**（6/6） |
| `pnpm docs:build` | **0** |
| `git diff --check` | **0** |

自验使用 Cursor 宿主原生 `node --test` / `pnpm`；未伪称 `/check-work`。

## 偏差

无策略偏差。本窗仅改 R2-1/2/3 指出缺口；未复做 R1 编辑，未清 legacy helpers，未改 HomeRecent，未启动 Phase 3。

## 遗留

- 独立终验与 `acceptance_report` 仍由规划窗在终验通过后书写；`agent-first-modularization.md` 保持「执行完成，等待独立终验」。
- 非范围未做：legacy triple-write helpers 清理、其它 parser 统一、Phase 3、commit/push/deploy、无关 dirty 整理。

## outcome

**succeeded** — R2-1 / R2-2 / R2-3 已落地并通过契约自验五条命令。
