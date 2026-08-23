# 第 1 轮修复报告：对等假绿收口

outcome: succeeded  
task: task_e0dcae88c021  
dispatch: ctx_cc3fae3e1dee  
date: 2026-08-22

## 改动摘要

按终验 R1–R7 收紧共享合同与 verifier：开篇 issue 例外只允许投资开篇链接；扫描先发现再分类；具名历程锁定三篇集合/基数/顺序；Hermes glob/fs/verifier 共用 `hermes-diary-core.mjs`；对等检查 fail-closed；路径片段拒绝 traversal；panel KINDS 用冻结 legacy fixture 锁定。未改公开 Markdown / URL / 视觉 / 发布语义，未改 `weekly.mjs` 写盘协议，未新增依赖，未 commit / push / deploy。

## 文件列表

- `content-catalog/kinds.mjs` — weekly 显式排除 index/README；投资开篇 `openingWithoutIssueLink`
- `content-catalog/schema.mjs` — 缺 issue 必须声明开篇链接
- `content-catalog/paths.mjs` — YYYY-MM-DD、非法片段、research 规范化后仍须位于 `docs/投资/投研/`
- `content-catalog/index.mjs` — 导出路径校验辅助函数
- `content-catalog/catalog.test.mjs` — 开篇链接、weekly 排除、R6 单测
- `content-catalog/hermes-adapter.test.mjs` — 生产纯适配红绿
- `content-catalog/parity.fixture.test.mjs` — R1–R5 先红后绿
- `content-catalog/verify/scan.mjs` — 候选发现/分类；Hermes 走 core
- `content-catalog/verify/parity.mjs` — issue/字段/未登记/具名篇章/基数
- `content-catalog/verify/projections.mjs` — bracket + quoted-field；未识别对象显式失败
- `content-catalog/verify/fixture-repo.mjs` — 三篇历程 + 真开篇 + 新 mutator
- `content-catalog/README.md`、`content-catalog/verify/README.md`
- `docs/.vitepress/hermes-diary-core.mjs` — 抽出的生产纯适配
- `docs/.vitepress/hermes-diary.ts`、`docs/.vitepress/hermes-diary-fs.ts` — 改走 core
- `docs/.vitepress/README.md`
- `panel/legacy-kinds-fixture.test.mjs` — R7 冻结快照
- `docs/agents/phase1-r1-r7-false-green-repair-report.md`（本报告）
- `docs/agents/phase1-content-contract-execution-report.md`（补充段）

## R1–R7 测试证据

| 项 | 先红后绿 / 单测 | 失败码或断言 |
| --- | --- | --- |
| R1 只改 Markdown issue | `mutateMarkdownIssueOnly` | `triple-write-drift` |
| R1 只改 posts date/issue | `mutatePostsDateIssueOnly` | `triple-write-drift` |
| R1 日期 journey 不得豁免 | `mutateDatedJourneyMissingIssue` | `missing-issue` |
| R2 未登记 weekly | `mutateUnregisteredWeekly` | `unregistered-file` |
| R2 未登记 Hermes | `mutateUnregisteredHermes` | `unregistered-file` |
| R2 大事件不误报 | good fixture 含 `大事件/2026.md` 仍绿 | — |
| R3 五处整篇删除 | `mutateDeleteNamedChapterEverywhere` | `named-chapter-set` |
| R3 sidebar/index 重复 | `mutateSidebarDuplicateChapter` / `mutateIndexDuplicateChapter` | `duplicate-link` |
| R3 顺序交换 | `mutateNamedChapterOrderSwap` | `named-chapter-order` |
| R3 单侧漏项 | `mutateNamedChapterOneSided` | `named-chapter-set` |
| R4 index/README/非法名/frontmatter/排序 | `hermes-adapter.test.mjs` | 共用 core，无 twin parser |
| R5 字段换序仍绿、未识别对象红 | `mutateSidebarFieldReorder` / `mutateSidebarUnparsed` | `sidebar-unparsed` |
| R6 traversal / 非法片段 | `catalog.test.mjs` | 构造器抛错；中文主题仍合法 |
| R7 legacy KINDS | `panel/legacy-kinds-fixture.test.mjs` | 不 import content-catalog |

## 验证命令与退出码

| 命令 | 结果 | 退出码 |
| --- | --- | --- |
| `pnpm test:content` | 22/22 | 0 |
| `pnpm test:panel` | 155/155（含 R7） | 0 |
| `node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs` | 6/6 | 0 |
| `pnpm docs:build` | build complete in 12.54s | 0 |
| `git diff --check` | 仅 CRLF 提示，无 whitespace error | 0 |

宿主 Cursor：新鲜 native verifier（generalPurpose，非 /check-work）verdict **PASS**。

## 偏差

- 投研侧栏存在合法嵌套组（`text` + `items`、无 `link`）。fail-closed 只对受管对等侧栏的叶子对象要求 `text`+`link`；嵌套组不报 `sidebar-unparsed`，未识别叶子仍失败。
- 未改公开内容；live 开篇与三篇具名历程已满足收紧后的合同，无需决策门。

## 遗留

- 派发层复验后再次交终验。
- 统一 `pnpm verify` / 浏览器 smoke 仍不存在。
- Phase 2 删除三写、Phase 3 typed IA 不在本轮。
- residual：category/type 单独漂移与 date/issue 走同一比较分支；R3 顺序交换只改历程侧栏，生活侧栏/index 共用同一顺序检查。
