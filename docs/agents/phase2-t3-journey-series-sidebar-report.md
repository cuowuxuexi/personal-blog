# T3 执行回报：历程独立系列侧栏

- taskId: `task_1b3b762c7116`
- dispatchId: `ctx_811a87727511`
- outcome: **succeeded**
- wave: C（生活侧栏去具名叶子；历程侧栏保留篇章+日期组机制）

## 改动摘要

1. **目标 IA**：`journey.lifeSidebarEnumeratesNamedChapters: false`；对等从「五处具名叶子」改为「系列入口 + 文件/posts/历程侧栏/系列 index」。
2. **live config**：删除 `/AI与生活/` 下具名历程叶子组；保留顶部系列入口；历程侧栏仍由 `...journeySidebarGroups` 投影（篇章组 + `历程 · {year}年` 机制）。
3. **fixture / R3**：金标 config 不再枚举生活侧栏叶子；新增 `life-sidebar-named-leaves` / `life-series-entry` 校验与红绿突变。

## 文件列表

- `docs/.vitepress/config.mts`
- `docs/.vitepress/site-projection.test.mjs`
- `content-catalog/kinds.mjs`
- `content-catalog/schema.mjs`
- `content-catalog/catalog.test.mjs`
- `content-catalog/verify/parity.mjs`
- `content-catalog/verify/fixture-repo.mjs`
- `content-catalog/parity.fixture.test.mjs`
- `docs/agents/phase2-t3-journey-series-sidebar-report.md`（本文件）

## 验证命令与结果

```bash
pnpm test:content
# 33 pass / 0 fail

pnpm docs:build
# exit 0
```

自验：生活侧栏无三具名叶子字面量；系列入口仍在；历程侧栏经投影含篇章组；公开 URL 未改。

## 偏差

- 无决策门。面板 editChrome 仍尝试双写生活侧栏具名叶子（try/catch 已吞掉缺失）；属 T4 去三写前中间态。

## 遗留

- T4：面板去三写
- T5：revisionDate 查询口径
- T6：验证与文档收口

## outcome

`succeeded`
