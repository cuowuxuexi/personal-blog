# T1 执行回报：投影生成器与 typed IA

- taskId: `task_3be0dde85c16`
- dispatchId: `ctx_016cbc0f86e3`
- outcome: **succeeded**
- wave: A（投影 ≡ 现网金标；未接线 posts.ts / config.mts）

## 改动摘要

1. **typed IA**：`journey.yearGroupTemplate` 改为 `历程 · {year}年`；新增 `namedChapterGroupText`、`seriesEntry`；weekly-life / weekly-investment / journey 的 `indexing` 迁为 `projected-posts`（`validation.pairWithManualPosts` 仍保留至 Wave B）。
2. **纯投影 core**：`frontmatter.mjs` + `project.mjs` 实现单一 frontmatter→PostItem 映射、排序、年份/历程/生活受管 sidebar 投影；投资开篇无 issue 例外按 `openingWithoutIssueLink` 精确保留；具名篇章 vs 日期期数分流。
3. **双 adapter**：`managedPostsFromGlob`（纯）与 `project-fs.mjs`（Node-only）共用同一 core；`verify/frontmatter.mjs` 改为 re-export。
4. **测试**：`project.test.mjs` fixture 红绿 + live 对账；顺带修正 `panel/journey.test.mjs` / legacy fixture 对历程年份组文案的期望。

## 文件列表

- `content-catalog/schema.mjs`
- `content-catalog/kinds.mjs`
- `content-catalog/frontmatter.mjs`（新）
- `content-catalog/project.mjs`（新）
- `content-catalog/project-fs.mjs`（新）
- `content-catalog/index.mjs`
- `content-catalog/verify/frontmatter.mjs`
- `content-catalog/catalog.test.mjs`
- `content-catalog/project.test.mjs`（新）
- `content-catalog/README.md`
- `panel/legacy-kinds-fixture.test.mjs`
- `panel/journey.test.mjs`

## 验证命令与结果

```bash
pnpm test:content
# 28 pass / 0 fail

node --test panel/journey.test.mjs panel/legacy-kinds-fixture.test.mjs panel/kind-adapter.test.mjs
# 预期全绿（历程年份组期望已改）
```

补充：全量 `pnpm test:panel` 曾因旧期望 `/周记 · 2026年/` 对 journey newIssue 红 1；改为 `/历程 · 2026年/` 后与 typed IA 一致。

## 偏差

- 无决策门触发；未改公开 MD/URL/标题/期号。
- `manualPosts` / sidebar 字面量与 `posts.ts`/`config.mts` 生产接线未动（属 T2）。
- live 历程日期期为空集；年份组投影为空且与现网 `yearSidebarItems('journey')` 一致。

## 遗留（非本任务）

- T2：站点消费投影
- T3：生活侧栏去具名叶子 / 历程独立系列
- T4：面板去三写
- T5：revisionDate 查询口径（映射与校验已在 core，查询语义未切）
- T6：验证收口

## outcome

`succeeded`
