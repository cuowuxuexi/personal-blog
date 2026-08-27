# VitePress source map

站点构建、内容查询、导航配置与主题装配入口。页面内容仍在 `docs/` 各栏目；本目录只拥有站点运行时与构建期投影。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `config.mts` | VitePress 配置；受管 sidebar 组由 `managed-sidebar-fs` 投影注入，静态壳手写；base 读取 `VITEPRESS_BASE` |
| `posts.ts` | `PostItem`、周记/历程 glob 投影、Hermes 合并、查询 API（无 `manualPosts` 副本） |
| `content-catalog-adapter.mjs` | 站点窄 adapter：recent 可见性 + `siteManagedPostsFromGlob`（无 fs） |
| `managed-sidebar-fs.mjs` | Node-only：config 受管 sidebar 投影；勿进客户端 |
| `standalone-html.mjs` | 开发/预览/构建直出 `public/html/` 与 `public/journey-guides/` 下的独立 HTML |
| `site-projection.test.mjs` | 站点接线与 bundle 边界测试 |
| `recent-posts.test.mjs` | 当前 posts 快照与 research 不可见的定向测试 |
| `hermes-diary-core.mjs` | Hermes 纯解析/排序；posts glob、fs 扫描与 verifier 共用 |
| `hermes-diary.ts` | 给站点的类型包装，转发 core |
| `hermes-diary-fs.ts` | 构建配置侧的文件系统扫描适配器 |
| `normalize-weekly-headings.mjs` | 将 `WeeklyEntry` 内的长文标题归入条目大纲 |
| `normalize-weekly-headings.test.mjs` | 周记标题变换测试；当前不在 `test:panel` glob 内 |
| `normalize-math.mjs` | 展示公式输入归一化 |
| `normalize-math.test.mjs` | 公式归一化测试；当前不在 `test:panel` glob 内 |

`cache/` 与 `dist/` 是生成物，不作为编辑入口。

## `theme/`

| 文件 | 说明 |
| --- | --- |
| `index.ts` | 主题入口、Markdown 组件注册、preview base 路由修正 |
| `Layout.vue` | VitePress 插槽装配；当前还包含图片放大和周记大纲折叠行为 |
| `href-with-base.ts` | 发布预览下的站内绝对路径补 base；识别独立 HTML 路径 |
| `style.css` | 当前全站 CSS；按页面族定位，计划分阶段拆分 |

### `theme/components/`

| 文件 | 说明 |
| --- | --- |
| `WeeklyEntry.vue` | 周记/历程条目的深组件：标题、标签、图片、折叠与日期 |
| `StandaloneHtml.vue` | 嵌入独立 HTML，并用新标签单独打开 |
| `CategoryList.vue` | 按 `posts.ts` 查询结果渲染分类列表 |
| `LatestWeeklyRedirect.vue` | 跳转某分类最新 `weekly` 期数 |
| `HomeHeroCta.vue` | 首页 hero 行动入口 |
| `HomeRecent.vue` | 首页最近更新列表 |
| `PostMeta.vue` | 普通文章元信息；周记/Hermes/历程不显示 |
| `SiteTitleMenu.vue` | 站名回首页入口，不是下拉菜单 |
| `SiteBeian.vue` | 非首页布局的备案信息组件 |
| `WeeklyEvents.vue` | 大事件组件候选；当前无公开 Markdown 引用 |
| `WeeklyEventYear.vue` | 大事件年份组件候选；当前无公开 Markdown 引用 |

## Current contracts

- 周记 / 历程身份真源是 Markdown frontmatter；`posts` 与受管 sidebar 由构建期投影生成。不要手改 `posts.ts` / `config.mts` 去登记周记或历程条目。
- 投研 / 投资哲学 / 大问题侧栏由 `managed-sidebar-fs` 投影注入。新标的或章节只写目录和文头，不要手改 `config.mts`。
- `config.mts` 的 base 必须读取 `VITEPRESS_BASE` 并默认 `/`；job 级 release preview 依赖该契约，非根路径 SSR 修复由 `panel/lib/probes.mjs` 负责。
- VitePress 排除 `docs/agents/**`、`docs/adr/**` 和所有 `README.md`。
- 修改内容目录 / 信息架构先读根 `PROJECT.md`；修改页面设计读 blog-editor 的 `references/site-design.md`。

## Verification

- 构建：`pnpm docs:build`
- 内容合同 / 最近更新 / 投影对等：`pnpm test:content`
- 归一化定向测试：`node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs`

最后更新：2026-08-27
