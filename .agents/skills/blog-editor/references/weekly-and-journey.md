# 周记与我的AI历程工作流

仅在 `content.weekly-investment`、`content.weekly-life` 或 `content.journey` 分支读取。可复制的周记 DOM 骨架以 `../templates/weekly-invest.md` 和 `../templates/weekly-life.md` 为准，本文件只记录分支、当前副作用与非模板规则。

## 创作入口

| 意图 | 首选入口 | Agent 行为 |
| --- | --- | --- |
| 用户在 chat 要求新开/修改投资或生活周记 | blog-editor | 只编辑目标 Markdown（与被引用公开图）；不要自行启动面板，不要手改 `posts.ts` / 受管 sidebar |
| 用户明确要求通过发布面板新开周记/日期型历程 | 发布面板 | 转读 `docs/agents/publishing-panel.md`；历程图片进入 `/images/journey/` |
| 修改既有周记/历程条目 | blog-editor | 只改被点名的 Markdown；索引由构建期投影刷新 |
| 新增/重命名/删除具名历程篇章 | blog-editor | 同步篇章 Markdown、系列 `index.md`、本目录 `README.md`，以及 `content-catalog` 中 `namedChapterOrder`（若顺序合同变更）；不要手改 `posts.ts` / 生活与历程侧栏字面量 |
| 修改具名篇章封面/说明 | 发布面板优先 | 不改变篇章名、H1、路由或目录顺序 |

## 索引与投影

Markdown/frontmatter 是周记与历程的身份真源。`posts` 与受管年份/篇章侧栏由开发/构建期投影生成：

- 投资 / 生活周记、日期型历程、具名篇章：只写目标 Markdown（+ 约定图片目录）。
- 具名篇章增删改名：还要维护系列 `index.md`、目录 `README.md`，以及 kind 的 `namedChapterOrder`（顺序合同）。
- 修改正文条目通常只改目标 Markdown；标题或路由变化后靠投影与 `pnpm test:content` 验证。
- 不要把条目登记进 `posts.ts`，也不要手写受管 sidebar 年份组或历程具名叶子。

创建前检查重复 `date`、`title`、`link`、`issue`。投资和生活周记各自计数；历程日期期数也独立计数。开篇约定页不算期数。

## 页面族

| 类型 | 路径 | `pageClass` | 图片目录 |
| --- | --- | --- | --- |
| 投资周记 | `docs/投资/周记/YYYY-MM-DD-标题.md` | `weekly-post weekly-post--invest` | `docs/public/images/weekly/` |
| AI与生活周记 | `docs/AI与生活/YYYY-MM-DD.md` | `weekly-post weekly-post--life` | `docs/public/images/weekly/` |
| 日期型历程 | `docs/AI与生活/我的AI历程/YYYY-MM-DD.md` | `weekly-post weekly-post--life` | `docs/public/images/journey/` |
| 具名历程篇章 | `docs/AI与生活/我的AI历程/<篇章>.md` | `weekly-post weekly-post--life` | `docs/public/images/journey/` |

周记和日期型历程使用模板中的封面、主题说明、单个「看烟花！！！」分割点与 `WeeklyEntry`。具名篇章保留篇章 H1，不把临时「当期主题」写入 H1、frontmatter title 或侧栏文案。

## `WeeklyEntry` 合同

完整可复制用法见模板和 `docs/.vitepress/theme/components/WeeklyEntry.vue`。修改条目时保持：

- 每条组件前有同名隐藏 `###`，供右侧大纲使用。
- `link-href` 挂主标题；副标题默认纯文本，只有明确要求才用 `subtitle-href`。
- 无值的可选 prop 直接省略。
- 条目长文可继续使用 Markdown 标题；构建插件会把层级挂到条目下。
- 连续正文图片各自成段；不手写额外间距 HTML。

## 历程系列边界

「我的AI历程」是独立系列：生活侧栏只保留系列入口；历程 sidebar 拥有具名篇章与日期期数（由投影注入）。日期型历程只进入历程 sidebar。

具名篇章排序受 `content-catalog` `namedChapterOrder` 与系列 `index.md` 约束。要挂到另一篇章的下拉里时，同步 `namedChapterNesting`（子篇仍是同目录文件，不建子文件夹）。改名或增删前搜索全部入站链接。

独立 HTML（先做好再拷进仓）放 `docs/public/html/<名字>/`。约定见该目录 README。已上线的 Pi / Grok 图解仍在 `docs/public/journey-guides/`。

- 嵌进普通文章：正文用 `<StandaloneHtml src="/html/<名字>" />`。
- 具名篇章整页就是这份 HTML：frontmatter 写 `publicHref: /html/<名字>`（只允许 `/html/` 或 `/journey-guides/`），系列 `index.md` 和侧栏投影走这个地址；正文放 `<JumpToStandalone />`，给旧 Markdown 路由跳走。不要再嵌 iframe。

## 大事件与润色

大事件记录位于 `docs/AI与生活/大事件/YYYY.md` 和 AI与生活侧栏，不写入周记正文。

用户手打内容默认轻度加工：修正错字、标点、病句和产品名称大小写；保留观点、即时语气与 `💡`。投资周记先过研究内容 Gate 1，持仓、成本和交易可按作者意愿写入。

最后更新：2026-08-24
