# T2 交付报告：投影适配接线

outcome: succeeded  
task: task_f58efffc8fce  
dispatch: ctx_876580d0f2cb  
date: 2026-08-22

## 改动摘要

面板 `KINDS` 改为通过 `panel/lib/content-kind-adapter.mjs` 消费 T1 `content-catalog`：路径、标签、pageClass、资产、命名与年份组来自合同；`life` / `invest` / `journey` 与 capability UI copy 仍留在 adapter。站点 `recentPosts()` 名称不变，实现改为 `docs/.vitepress/content-catalog-adapter.mjs` → `selectRecentPosts`。未改 `weekly.mjs` 写盘协议、`config.mts` sidebar 结构、公开 Markdown / URL / 视觉。

## 文件列表

- `panel/lib/content-kind-adapter.mjs`
- `panel/lib/repo-paths.mjs`
- `panel/kind-adapter.test.mjs`
- `docs/.vitepress/content-catalog-adapter.mjs`
- `docs/.vitepress/posts.ts`
- `docs/.vitepress/recent-posts.test.mjs`
- `panel/lib/README.md`
- `docs/.vitepress/README.md`
- `content-catalog/README.md`
- `docs/agents/phase1-t2-adapter-wiring-report.md`（本报告）

## 验证

```bash
node --test panel/kind-adapter.test.mjs docs/.vitepress/recent-posts.test.mjs content-catalog/catalog.test.mjs
pnpm test:panel
```

定向 12/12 pass；`pnpm test:panel` 154/154 pass。当前 posts 快照（无 research）在 limit 1/6/8 与接线前 date-desc 排序一致；注入 research 后不会进入最近更新。未跑 live 对等（T3）与 `pnpm test:content` / `docs:build`（T4）。未 commit / push / deploy。

## 自审证据

Cursor 新鲜 native verifier（generalPurpose，非 /check-work）对 T2 适配与兼容契约做只读审查，verdict **PASS**。确认：KINDS 仍为 life/invest/journey；capability 十个公共字段与 HEAD 一致；`recentPosts` 名称未改且消费合同可见性；当前快照列表不变；research 被过滤；`weekly.mjs` 未改；sidebar 字面量结构未改；未改写合同语义。

## 偏差

无目标/非目标偏差。`WEEKLY_IMAGES` 改为 `path.join(repoRoot, catalog.assets.directory)`，解析结果仍是 `docs/public/images/weekly`。站点测试用冻结快照证明 `recentPostsFromCatalog`，不直接 `import posts.ts`（避免 Vite `import.meta.glob`）；`posts.ts` 仅转发到该 helper。

## 遗留

- T3：live 仓扫描与 file ↔ posts ↔ sidebar 对等。
- T4：`pnpm test:content`、`pnpm docs:build` 与工程地图收口。
- 哲学 / 大问题 / 大事件仍不接线。
