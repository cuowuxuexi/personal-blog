# T2 执行回报：站点消费投影

- taskId: `task_e5c639b56b20`
- dispatchId: `ctx_1aaca35f8386`
- outcome: **succeeded**
- wave: B（站点改读投影；manualPosts 保留为 shadow；未切 T3 系列 IA；未去三写）

## 改动摘要

1. **posts.ts**：weekly/journey 改为 Vite raw glob → `siteManagedPostsFromGlob`；Hermes 仍 glob + core；`recentPosts` / `postsByCategory` / `formatIssue` 名称不变；`manualPosts` 字面量保留为 Wave B shadow（面板三写 marker）。
2. **config.mts**：投资/生活年份组与历程侧栏受管组改为 `managed-sidebar-fs.mjs`（Node `projectManagedPostsFromFs`）；生活侧栏具名历程叶子仍静态保留（T3）；大事件 / 系列入口 / Hermes 壳不变。
3. **窄 adapter**：`content-catalog-adapter.mjs` 增加无 fs 的 `toSitePostItem` / `siteManagedPostsFromGlob`；parity 在 config 字面量空时回退投影金标。

## 文件列表

- `docs/.vitepress/posts.ts`
- `docs/.vitepress/config.mts`
- `docs/.vitepress/content-catalog-adapter.mjs`
- `docs/.vitepress/managed-sidebar-fs.mjs`（新）
- `docs/.vitepress/site-projection.test.mjs`（新）
- `docs/.vitepress/README.md`
- `content-catalog/verify/parity.mjs`
- `content-catalog/project.test.mjs`
- `package.json`
- `docs/agents/phase2-t2-site-consume-projection-report.md`（本文件）

## 验证命令与结果

```bash
pnpm test:content
# 33 pass / 0 fail

pnpm docs:build
# exit 0（~4.45s）
```

dist/assets 未检出 `node:fs` / `project-fs` / `managed-sidebar-fs`（客户端未带入 Node adapter）。

## 偏差

- Wave B 中间态：面板仍可能对 config 做年份组字面量手术；投影注入后 needle 可能缺失并回退插入额外字面量组——属 T4 前已知中间态，未在本任务消除。
- 生活侧栏具名历程叶子故意保留（非范围 / T3）。

## 遗留

- T3：历程独立系列侧栏（生活去具名叶子）
- T4：面板去三写 + 删除 shadow manualPosts / 字面量手术
- T5：revisionDate 查询口径
- T6：验证收口

## outcome

`succeeded`
