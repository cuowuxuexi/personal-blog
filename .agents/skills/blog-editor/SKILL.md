---
name: blog-editor
description: >-
  Edit this personal blog's public content and presentation: weekly notes,
  我的AI历程 chapters, research/philosophy/big-question pages, homepage copy,
  navigation and indexes, public assets, VitePress components, CSS, and
  responsive layout. Use when the user adds or revises blog content, changes a
  public page or its design, mentions Design Mode, or invokes /blog-editor.
---

# Blog Editor

统一的博客编辑路由。先把自然语言任务落到一个 mode，再读取该分支的目标文件与 reference；不要先宽泛搜索全仓。

## Startup

1. 用下表判定唯一 mode。
2. 先打开该行 `Start here` 的目标源码或目标目录；这是最短路由的结束点。
3. 仅加载该行点名的 branch reference / protocol，不叠加读取 `PROJECT.md`、`CONTEXT.md`、ADR 或其它协议，除非该行或协议明确要求。
4. 结构性任务先输出修改地图；再执行最小修改并完成该分支验证。

无法唯一定位时，只问一个会改变方案的最小问题。

### 修改地图

跨页面、路由、组件或视觉系统的任务先列：

```text
- 内容/结构：...
- 组件：...
- 样式范围：...
- 索引/导航副作用：...
- 验证：...
```

## Routing

| Mode | Trigger | Start here | Required branch reference / side effects |
| --- | --- | --- | --- |
| `content.weekly-investment` | 新增或修改投资周记 | `docs/投资/周记/*.md` | `templates/weekly-invest.md` + `references/weekly-and-journey.md`；再读 `CONTEXT.md` 与 `docs/agents/research-publishing.md` |
| `content.weekly-life` | 新增或修改 AI与生活周记 | `docs/AI与生活/*.md`（不含子目录） | `templates/weekly-life.md` + `references/weekly-and-journey.md` |
| `content.journey` | 我的AI历程篇章/日期期数 | `docs/AI与生活/我的AI历程/` | `references/weekly-and-journey.md`；只有用户明确指定面板时才转面板 |
| `content.research-*` | 行业、研究地图、标的档案 | `docs/投资/投研/**` | `references/content-domains.md` + `docs/agents/research-publishing.md`；起草前再按协议读领域资料 |
| `content.philosophy` | 投资哲学内容 | `docs/投资哲学/**` | `references/content-domains.md` |
| `content.big-question` | 大问题内容 | `docs/大问题/**` | `references/content-domains.md` |
| `content.about` | 关于页 | `docs/关于.md` | 通常没有索引副作用 |
| `content.hermes-diary` | 作者明确要求恢复 Hermes | `docs/agents/hermes-diary.md` | 默认停用；自动扫描，禁止手改 `posts.ts` / sidebar |
| `design.home` | 首页文案、区块或视觉 | `docs/index.md` | `references/site-design.md` 的首页分支 |
| `design.weekly` | 周记/历程阅读与归档视觉 | 目标 md + `WeeklyEntry.vue` | `references/site-design.md` 的周记分支 |
| `design.research` | 投研、哲学、大问题视觉 | 目标 md | `references/site-design.md` 的研究/hub 分支 |
| `design.global-shell` | 顶栏、布局、大纲、全局样式 | `Layout.vue`、`theme/index.ts` | `references/site-design.md`；回归首页、文章、归档、研究页 |
| `navigation-indexing` | nav、sidebar、文章目录关系 | `docs/.vitepress/README.md` | 从该索引进入投影入口（`posts.ts` / `config.mts` / catalog）；受管周记历程勿手改字面量 |
| `assets` | 图片、字体、公开文件、独立 HTML | `docs/public/**` + 引用处 | 独立 HTML 见 `docs/public/html/README.md`；只使用源资源，不编辑 `.vitepress/.temp`、`cache`、`dist` |

发布面板本身的 UI 或发布流程代码不是内容编辑分支：UI 从 `panel/README.md` 进入；发布语义再读 `docs/agents/publishing-panel.md`；部署副作用从 `PROJECT.md` 的「发布部署」能力进入。

## Common route rules

- 站点源根：`docs/`；`cleanUrls: true`。
- `docs/<dir>/index.md` → `/<dir>/`；`docs/<dir>/<file>.md` → `/<dir>/<file>`。
- 内部链接不写 `.md`；`index.md` 路由保留尾斜杠。
- 公开资源位于 `docs/public/`，正文引用以 `/` 开头。先做好的独立 HTML 放到 `docs/public/html/<名字>/index.html`，文章里用 `<StandaloneHtml src="/html/<名字>" />` 嵌入并单独打开。
- `docs/agents/**`、`docs/adr/**` 和所有 `README.md` 不进入站点构建。
- 周记 / 历程登记靠构建期投影；索引副作用以 `references/weekly-and-journey.md` 为准，不要手改 `posts.ts` 或受管 sidebar 字面量。

## Content policy

- 保留作者观点、立场和即时语气；可修正错字、病句、Markdown 与名称大小写。
- 未明确要求重写时，不做大幅改写；不编造投资事实或研究结论。
- `date` 表示首次公开/期数日期，普通修订不改变它。重要修订时由作者显式写可选 frontmatter `revisionDate`（不得早于 `date`）；不要发明 `updated` 等第二字段，也不要从 Git/mtime 自动填。Hermes 不使用该字段。
- 图片进入该内容类型约定的公开目录；新增持久目录时维护对应 `README.md` 索引。

## Risk gates

可直接执行：唯一定位的局部文案、单篇正文、局部样式和既有页面排版。

先停再问：

1. 无法唯一定位目标页面或内容类型。
2. 会改变作者核心观点、研究事实/结论或公开状态。
3. 会删除、重命名或改变公开路由。
4. 会改变全站视觉语言、导航体系或内容分类。
5. 可能覆盖用户已有且无关的修改。
6. 需要 commit、push、发布、部署或国内站上传。

## Verification

| Task | Minimum evidence |
| --- | --- |
| 公共内容或索引 | `pnpm docs:build` |
| 组件/主题逻辑 | 相关定向测试（若有）+ `pnpm docs:build` |
| 视觉修改 | 构建 + 1440 / 768 / 390 代表页面检查 |
| 面板 UI/流程 | 对应 `panel/*.test.mjs` + `pnpm test:panel`；涉及站点快照再跑构建 |

浏览器不可用时，明确列出未检查页面/视口，不把构建成功表述为视觉通过。

## Drift handling

- 路由与能力入口：`PROJECT.md`、本路由表、各目录 `README.md`。
- 行为事实：live 源文件与当前兄弟页面。
- 领域与门禁：`CONTEXT.md`、ADR、`docs/agents/` 现行协议。
- 历史 handoff、旧 `.planning/` 和停用协议不作为现行行为依据。

只有当路径、能力边界、内容类型或编辑工作流发生变化时才更新本 Skill；普通正文和局部样式任务不要顺手改它。
