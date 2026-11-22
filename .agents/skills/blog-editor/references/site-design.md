# 站点设计工作流

仅在 `design.*` 分支读取。先从目标页面的 `pageClass` 或可见组件定位，再进入对应源文件；不要先通读整份全局 CSS。

## Source map

| Concern | Source |
| --- | --- |
| VitePress 壳、nav、sidebar、Markdown 管道 | `docs/.vitepress/config.mts` |
| 内容查询与最近列表 | `docs/.vitepress/posts.ts` |
| 主题注册与 Markdown 组件 | `docs/.vitepress/theme/index.ts` |
| Layout 插槽 | `docs/.vitepress/theme/Layout.vue` |
| 自定义绝对链接的 preview base | `docs/.vitepress/theme/href-with-base.ts` |
| 周记条目 | `docs/.vitepress/theme/components/WeeklyEntry.vue` |
| 独立 HTML 嵌入 | `docs/.vitepress/theme/components/StandaloneHtml.vue` |
| 首页头条式页头 / 归档清单 / 研报卡 | `SiteMasthead.vue` / `ArchiveIndex.vue` / `ResearchDesk.vue` |
| 视频区 / 视频数据 | `VideoShelf.vue` / `docs/视频/videos.json` |
| 分类列表 / 最新一期跳转 | `CategoryList.vue` / `LatestWeeklyRedirect.vue` |
| 文章元信息 / 站名入口 / 备案（全站一行） | `PostMeta.vue` / `SiteTitleMenu.vue` / `SiteBeian.vue` |
| 周记标题与公式预处理 | `normalize-weekly-headings.mjs` / `normalize-math.mjs` |
| 全站样式（迁移前） | `docs/.vitepress/theme/style.css` |

视频只存元数据（外链托管）：加视频即往 `docs/视频/videos.json` 追加一条，首页视频区和顶栏「视频」会自动出现。

`SiteTitleMenu` 当前是站名回首页入口，不是下拉菜单。`WeeklyEvents.vue` / `WeeklyEventYear.vue` 已注册但没有公开 Markdown 调用；删除前仍需证明无引用。

## 三种版式

`transformPageData`（`config.mts`）按路径给页面追加版式 class：`site-list`（研报清单与视频：`/`、`/投资/`、`/视频/`）、`site-article`（方法：`/投资哲学/` 及其下）、`site-archive`（`/归档`）。研报页是独立 HTML，不在站内版式之内。局部样式挂在这三个 class 下。

- D1：文章页单栏只指正文、论点、公式收成一条版心（`--prose-max`，740px）；方法页左侧主题栏和右侧大纲保留，做安静（无底色、细线）。
- D3：归档旧文只继承全站的字、色和正文排版（`.vp-doc` 基础规则），周记卡片、旧投研档案头、医药图谱等页面族结构不改。
- 首页 `docs/index.md` 另挂 `home-masthead`：柔炭通栏刊头与首页炭色顶栏只挂在它下面，`/投资/` 不挂；刊头与首页顶栏明暗模式同色。

## 样式变量

颜色和字体来自研报 `report.css` 的 `:root`，由 `config.mts` 的 `head` 注入（改 `report.css` 需重启 dev）。组件只引用 `--vp-c-*`、`--font-*`、`--prose-max` / `--content-max`。没有研报时回退到 `style.css` 原配色。

- D2：字体完全跟研报：标题 `--font-serif`，正文 `--font-sans`；不再用自托管思源宋体。
- 研报区色彩用 `.research-desk` 下的 `--desk-*` 变量（暗色另给值，因为研报变量只注入在浅色模式下）；立场色调由 `research-reports.mjs` 的 `stanceTone` 在构建期算成 `tone`（bear / bull / neutral）。研报卡的底色与分隔线用 `--desk-card-*`（明暗各给值），清单顺序由 `sortReports` 按 `updatedAt` 定，组件不另排。

## 页面族

| Family | `pageClass` / marker |
| --- | --- |
| 投资周记 | `weekly-post weekly-post--invest` |
| AI与生活 / 历程 | `weekly-post weekly-post--life` |
| Hermes 历史页 | `weekly-post weekly-post--life hermes-diary-post` |
| 周记入口 | `weekly-archive` + 主题修饰 |
| 投研目录 | `research-index` / `industry-index` / `map-index` / `subject-index` |
| 投资哲学 / 大问题等 hub | `investment-hub` |

`.investment-index` 和 `.journal-index` 是遗留候选，不作为新设计入口。

## Workflow

1. 从目标 Markdown 确认 `pageClass`、HTML class 与组件。
2. 在组件或 `style.css` 中搜索这些稳定 marker。
3. 记录会受影响的页面族和 1440 / 768 / 390 代表页。
4. 局部样式挂在页面族或组件 class 下；全局 token 只用于真正跨站点的变化。
5. Design Mode 只用于探索；确认后修改真实 Markdown / Vue / CSS。
6. 运行定向测试（若有）和 `pnpm docs:build`，再完成视口检查。

## Scale gate

| Scale | Action |
| --- | --- |
| 文案、颜色、间距、单组件局部样式 | 直接改并验证 |
| 单页结构或一个页面族 | 先写修改地图，再执行 |
| 全站视觉语言、导航体系、跨页面组件 | 先确认方向，再改真实文件 |

## Preview caveat

发布预览使用 `/release-preview/<jobId>/` base。通过 VitePress router 的站内导航会由 `href-with-base.ts` 补 base；Markdown 中手写的绝对 `<a href="/...">` 可能跳出预览。改导航或自定义链接时同时验证普通站点与发布预览。

## Visual evidence

最小代表页：首页、周记/历程阅读页、周记入口、投研 hub、研究正文、普通文章。构建通过只证明编译正确；没有浏览器证据时明确标记未做视觉验收。

最后更新：2026-11-22
