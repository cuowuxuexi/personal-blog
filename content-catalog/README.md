# content-catalog

共享 `ContentKind` 合同。站点、发布面板和内容验证器只通过本目录公共入口消费已登记种类；不要读取内部文件或复制合同字段到调用方。周记/历程做身份投影；投研/哲学/大问题做树结构投影。站点侧栏经 `docs/.vitepress/managed-sidebar-fs.mjs` 消费，不要在调用方再抄一份路径或种类表。

## 入口

```js
import {
  listContentKinds,
  getContentKind,
  isRecentVisible,
  selectRecentPosts,
  kindIdForPath,
} from './index.mjs'
```

本模块无 VitePress / Vue / 面板 / `fs` 依赖。面板映射在 `panel/lib/content-kind-adapter.mjs`；站点最近更新在 `docs/.vitepress/content-catalog-adapter.mjs`。

## 日期字段

| 字段 | 含义 | 查询口径 |
| --- | --- | --- |
| `date` | 首次公开 / 期次日期（稳定） | `postsByCategory` / 系列「最新一期」只按 `date` |
| `revisionDate`（可选） | 重要修订；不得早于 `date`；仅作者或创作入口显式声明 | `selectRecentPosts` / `freshnessDate` 使用 `revisionDate ?? date` |

Hermes 不启用 `revisionDate`；research 仍不进最近更新。缺省无 `revisionDate` 时 recent 排序与仅按 `date` 一致。不得从 Git / mtime / 普通编辑自动生成，也不兼容 `updated` 等第二字段。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `index.mjs` | 公共入口：种类查询、最近更新可见性、路径/资产与纯投影 API |
| `schema.mjs` | 字段合同与完整性校验 |
| `kinds.mjs` | 种类声明（周记/历程/Hermes/投研/哲学/大问题） |
| `query.mjs` | 最近更新可见性与 posts 查询纯函数 |
| `paths.mjs` | 路径归属、文件名、公开链接与资产规则 |
| `frontmatter.mjs` | 扁平 frontmatter 解析（投影与 verifier 共用） |
| `project.mjs` | 周记/历程纯投影 core（PostItem / sidebar 模型） |
| `project-structure.mjs` | 投研/哲学/大问题树结构纯投影 |
| `project-fs.mjs` | Node-only fs adapter；不进浏览器 bundle |
| `catalog.test.mjs` | 模块单测 |
| `project.test.mjs` | 投影 fixture 红绿与 live 对账 |
| `project-structure.test.mjs` | 投研/哲学/大问题树投影 |
| `overview.test.mjs` | 总览清单生成或对账 |
| `hermes-adapter.test.mjs` | Hermes 生产纯适配与 verifier 共用 |
| `parity.live.test.mjs` | live 仓 file ↔ posts ↔ sidebar 对等 |
| `parity.fixture.test.mjs` | fixture 红绿：文件权威 → 投影/侧栏漂移、假绿路径与具名篇章锁定 |
| `import-graph.test.mjs` | 浏览器入口依赖图护栏：阻止 `fs` / `node:fs` 及动态导入泄漏 |
| `scan-identity.test.mjs` | frontmatter 身份真源与错误字段 fail-closed 回归 |
| `sidebar-wiring.test.mjs` | 受管 sidebar 接线去注释并验证恰好一次 |
| `verify/` | Node-only 扫描与有界投影解析；不进浏览器 bundle |

## Tests

从仓库根运行：

```bash
pnpm test:content
```

最后更新：2026-08-24
