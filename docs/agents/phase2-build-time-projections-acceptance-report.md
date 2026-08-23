# Phase 2 终验报告：周记 / 历程构建期投影

verdict: accepted  
architecture_effect: compatible_extension  
run_id: run_5b8be14ff75e  
repair_round: 2 + planning-window narrow closure  
date: 2026-08-23

## 结论

Phase 2 已通过最终验收。周记与“我的 AI 历程”的 Markdown/frontmatter 现为内容身份真源；`posts.ts` 与受管 sidebar 在开发 / 构建期由共享投影生成；发布面板 `applyDraft` 不再写 `docs/.vitepress/posts.ts` 或 `config.mts`，只写目标 Markdown 与被引用图片。

T1–T6 完成后，独立终验先后发现两轮假绿与共享规则缺口，均已在 R1、R2 修复。R2 后仍有一个中严重度 browser import graph 护栏缺口及一个低严重度具名历程顺序重复真源；作者明确授权规划验收窗口直接做窄幅收口。本窗口补齐 side-effect `node:fs` / `fs/promises` 检测，并让 panel 直接消费 catalog 的 `namedChapterOrder`。最终独立 spec 复核无 findings。

本轮没有 commit、push、发布、部署或国内站上传。

## 已接受的行为与架构

### Markdown 与构建期投影

- `weekly-life`、`weekly-investment`、`journey` 的 title、date、category、type、issue、description、link 与可选 `revisionDate` 来自 Markdown/frontmatter。
- 纯投影 core 不依赖 `node:fs`、VitePress、Vue 或 panel。
- `posts.ts` 使用 Vite raw glob adapter；`config.mts` 与 verifier 使用 Node fs adapter；两者共享同一 frontmatter→PostItem、排序与 sidebar 模型核心。
- research 仍不进入最近更新；Hermes 保持 file-is-index 专项适配。
- `revisionDate ?? date` 决定最近更新 freshness；“最新一期”仍只按系列内 date / issue，不受 `revisionDate` 影响。

### 站点 IA

- 生活侧栏只保留“我的 AI 历程”系列入口，不重复枚举三个具名篇章。
- 历程侧栏拥有具名篇章组与日期型历程年份组。
- 日期型历程年份组固定为 `历程 · {year}年`。
- 具名篇章顺序由 `content-catalog` 的 `namedChapterOrder` 单一拥有；投影、verifier 与 panel 列表均消费该合同。

### 发布面板去三写

- `applyDraft` 新建、编辑期头和具名历程时不再修改 `posts.ts` / `config.mts`。
- 发布 manifest / allowlist 不再因周记或历程草稿自动携带这两个索引文件。
- 只写 Markdown 后，Node fs 投影仍可发现新一期。
- legacy 字符串手术 helper 暂时保留用于既有单测，但不再被 `applyDraft` 调用；其清理不属于本阶段完成条件。

## 独立终验与修复闭环

### R1

- live sidebar 不再用同源 fallback 自证；import 与三个 section spread 有独立接线断言。
- browser 入口按相对 ESM import / re-export 可达图阻止 `project-fs` 与 `node:fs`。
- verifier 的 managed kind 身份映射委托生产 projection core。
- `postsByCategory` 委托共享 query，并锁定 date 后的稳定 issue/link 次键。
- 文档状态改为等待独立终验，不以 T6 执行报告冒充 acceptance。

### R2

- `managedIdentityFromMarkdown()` 反映 frontmatter 的 category/type；缺失或与 kind 不符时 fail closed，不再静默纠正。
- browser graph 覆盖相对动态 `import()`、`node:fs/promises` / `fs/promises` 的静态、动态与 require 形式。
- sidebar 检测先移除行/块注释；own spread 必须恰好一次，foreign spread 必须为零。

### 规划窗口窄幅收口

- 补齐 side-effect `import 'node:fs'` / `import 'fs/promises'` 检测与变异测试。
- 删除 panel 内手写 `JOURNEY_CHAPTER_ORDER`，改为 `getContentKind('journey').namedChapterOrder`。
- `panel/journey.test.mjs` 以 typed IA 动态生成期望顺序，未来 catalog 顺序变化会直接暴露 panel 漂移。
- 独立 spec reviewer 最终结果：无 findings。

## 最终验收证据

规划验收窗口在全部收口修改后独立复跑：

| 命令 | 结果 |
| --- | --- |
| `pnpm test:content` | 51/51，退出码 0 |
| `pnpm test:panel` | 155/155，退出码 0 |
| `node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs` | 6/6，退出码 0 |
| `pnpm docs:build` | VitePress client/server bundle 与页面渲染通过，退出码 0 |
| `git diff --check` | 退出码 0，仅现有 CRLF 提示 |
| `node --test content-catalog/import-graph.test.mjs` | 4/4，含 side-effect fs/promises 变异测试 |
| `node --test panel/journey.test.mjs` | 11/11，含 catalog typed IA 顺序消费 |

## 公开行为与边界

- 现有公开正文、URL、周记期号和标题未因本阶段批量改写。
- 生活侧栏移除具名历程叶子是 approved-v1 明确批准的 IA 变化；系列入口与历程侧栏仍可访问原 URL。
- 未新增 npm 依赖。
- 未进入 Phase 3 的投研 / 哲学 / 大问题投影，也未进入主题、面板 UI 或发布状态机拆分。

## 证据指针

- approved baseline：`docs/agents/phase2-build-time-projections-collaboration.md`
- 执行报告：`docs/agents/phase2-build-time-projections-execution-report.md`
- R1：`docs/agents/phase2-r1-repair-report.md`
- R2：`docs/agents/phase2-r2-final-repair-report.md`
- 关键实现：`content-catalog/project.mjs`、`project-fs.mjs`、`query.mjs`、`verify/parity.mjs`、`verify/import-graph.mjs`、`verify/sidebar-wiring.mjs`、`docs/.vitepress/posts.ts`、`docs/.vitepress/config.mts`、`panel/lib/weekly.mjs`

## 后续

Phase 2 已关闭。Phase 3 尚未开始：投研、哲学与大问题的结构化目录投影仍按现有 live 入口维护，待新的迭代基线批准后再实施。
