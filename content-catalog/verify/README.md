# content-catalog/verify

Node-only 内容对等校验。消费 `content-catalog` 公共入口，扫描 Markdown 并有界解析 `posts.ts` / `config.mts`。不要从站点或面板浏览器路径导入本目录。

## 入口

```js
import { checkContentParity } from './parity.mjs'
```

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `parity.mjs` | file ↔ posts ↔ sidebar 对等与可见性检查 |
| `scan.mjs` | 先发现候选 Markdown 再分类；Hermes 走生产纯适配 |
| `projections.mjs` | 有界解析 manualPosts 与 sidebar 字面量 |
| `frontmatter.mjs` | 扁平 frontmatter |
| `brackets.mjs` | 括号匹配，不 eval 源码 |
| `exceptions.mjs` | 单一已知例外表 |
| `fixture-repo.mjs` | fixture 红绿仓库 |
| `import-graph.mjs` | 递归分析静态/动态 import 与 require，阻止 Node-only 依赖进入浏览器路径 |
| `sidebar-wiring.mjs` | 去除注释后验证受管 sidebar 接线和字面量基数 |

测试在上一级：`parity.live.test.mjs`、`parity.fixture.test.mjs`。仓库根运行 `pnpm test:content`。

最后更新：2026-08-24
