# T4 执行回报：面板去三写

- taskId: `task_5d36385fc524`
- dispatchId: `ctx_2a61e8a5c1fa`
- outcome: **succeeded**
- wave: D（applyDraft 只写 Markdown + 引用图；posts/config 不再由面板维护）

## 改动摘要

1. **`applyDraft`**：`newIssue` / `editChrome`（含投资主题重命名）不再调用 `insertManualPost` / `updateManualPost` / `insertSidebarItem` / `updateSidebarItem`；`files` 不再含 `posts.ts` / `config.mts`；历程不再双写生活侧栏。
2. **发布范围**：`scope.mjs` 剔除 posts/config 白名单；`dirtyJourneyMetaPaths` 恒为空；`publish-job` 不再并入索引源。
3. **测试 / 文档**：panel 测试改为 MD-only 契约；fixture 证明只写 MD 后 `projectManagedPostsFromFs` 可见新期；README 同步。

## 文件列表

- `panel/lib/weekly.mjs`
- `panel/lib/scope.mjs`
- `panel/lib/publish-job.mjs`
- `panel/lib/README.md`
- `panel/README.md`
- `panel/weekly.test.mjs`
- `panel/journey.test.mjs`
- `panel/publish-api.test.mjs`
- `docs/agents/phase2-t4-panel-de-triple-write-report.md`（本文件）

## 验证命令与结果

```bash
pnpm test:panel
# 155 pass / 0 fail
```

补充：`journey newIssue` 断言 posts/config 未改，且投影集合含新期 link。

## 偏差

- Legacy `insertManualPost` 等字符串手术函数仍保留并有单测（标明 unused by applyDraft），便于对照；未在本任务物理删除。
- `posts.ts` 内 shadow `manualPosts` 字面量仍在（站点已读投影）；清理属 T6。

## 遗留

- T5：revisionDate 查询口径
- T6：验证收口、删除 shadow manualPosts / 死亡手术代码、文档与 skill 路由

## outcome

`succeeded`
