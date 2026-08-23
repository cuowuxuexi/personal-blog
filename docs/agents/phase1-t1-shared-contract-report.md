# T1 交付报告：共享合同核心

outcome: succeeded  
task: task_162a19968e5b  
dispatch: ctx_26b2d136f3ac  
date: 2026-08-22

## 改动摘要

新增根级 `content-catalog/` 深模块，把五类内容事实（`weekly-life` / `weekly-investment` / `journey` / `hermes` / `research`）只声明一次，并提供最近更新可见性、路径归属、文件名/链接与资产规则的纯函数。面板 `life` / `invest` 映射未做（T2）。未改公开 Markdown、URL、视觉、sidebar，也未接线 panel / site 运行时。

## 文件列表

- `content-catalog/index.mjs`
- `content-catalog/schema.mjs`
- `content-catalog/kinds.mjs`
- `content-catalog/query.mjs`
- `content-catalog/paths.mjs`
- `content-catalog/catalog.test.mjs`
- `content-catalog/README.md`
- `PROJECT.md`（内容目录能力入口与任务路由）
- `README.md`（源码导航一行）
- `docs/agents/phase1-t1-shared-contract-report.md`（本报告）

## 验证命令与结果

```bash
node --test content-catalog/catalog.test.mjs
```

8/8 pass，exit 0。覆盖：id 唯一且字段完整、research 最近更新不可见、与 `repo-paths.mjs` 的路径/资产/fileName/siteLink/yearText 对等、Hermes/research 扫描约定、路径分类不误伤历程/Hermes、查询函数过滤 research、核心源码无 fs / VitePress / Vue / panel import。

未跑 `pnpm test:content`（T4）、live 仓扫描（T3）、panel/site 接线回归（T2）。未 commit / push / deploy。

## 自审证据

Cursor 新鲜 native verifier（generalPurpose 子 Agent，非 /check-work）对 T1 合同与 live 路径约定做只读审查，verdict **PASS**。接受项均确认：唯一 id、字段完整、核心无 fs/VitePress/panel、research `recentVisible === false`、周记/历程路径资产对等、Hermes file-is-index 且不可创建、无公开内容或运行时接线。

审查备注已吸收：把 `createFileName` 升为必填字段，并校验可选的 `yearGroupTemplate` / `namedChapterOrder`。复跑单测仍 8/8。

## 偏差

无目标/非目标偏差。内部文件拆为 schema / kinds / query / paths，公共入口仍只有 `content-catalog/index.mjs`。Hermes 最近更新保持可见，与当前 `posts.ts` 合并 glob 结果一致；仅 research 强制不可见。

## 遗留

- T2：panel `life` / `invest` / `journey` adapter，以及站点对 `selectRecentPosts` / `isRecentVisible` 的真实消费。
- T3：live 仓扫描与 file ↔ posts ↔ sidebar 对等。
- T4：`pnpm test:content` 与更完整的工程地图收口。
- 哲学 / 大问题 / 大事件未预实现投影，仅保留可扩展 id 接口。
