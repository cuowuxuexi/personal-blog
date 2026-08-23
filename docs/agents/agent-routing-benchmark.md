# Agent routing benchmark

对 Cursor/Pi 类 coding agent 的可复测任务路由检查。它衡量能否从自然语言任务快速进入正确能力、少量源码和正确验证；不以回答篇幅或主观“看起来聪明”作为通过标准。

## Method

2026-08-22 在当前工作区启动 8 个相互独立的只读 explore worker。每个 worker 都以首次进入仓库为前提：

1. 从项目 `AGENTS.md` 开始。
2. 按最短分支打开路由文档。
3. 立刻打开第一个目标源码/内容文件。
4. 只在首个源文件之后加载该分支的 reference、protocol 和副作用资料。
5. 不实施修改，不打开本基准文件，不全仓扫描。

关键文档预算按磁盘实际字节计算，包含项目 `AGENTS.md`，不包含宿主全局规则、目标源码、目标 Markdown、模板和首源之后的 branch reference。

每项通过需要同时满足：

- 正确能力 / blog-editor mode。
- 首个目标源文件前读取关键文档不超过 3 份、合计不超过 10 KB。
- 第一组验证与风险相称。
- 不误入发布面板、`posts.ts`、研究门禁或部署链等无关能力。

另记“生产实现局部性”：协议、模板、测试、目录 README、图片资源和待新增文件的导航 README 不计入主要生产实现文件；当前结构强迫修改 4 个以上生产事实文件时，标为 locality fail。

## Iteration result

首轮基准虽然 8/8 选对能力，但只有 1/8 在打开源文件前控制在 3 份关键文档内。主要原因是 `AGENTS.md` 把 `PROJECT.md`、`CONTEXT.md`、协议和 Skill 同时暴露为默认入口。

据此收紧路由：

- `AGENTS.md` 改为互斥分支，不再默认读取全部项目文档。
- blog-editor 明确“先打开 Routing 行的 Start here，再按需读 branch reference”。
- 面板 UI 直接走 `panel/README.md`；部署任务才走 `PROJECT.md`。
- 补 `references/content-domains.md`，集中投研、哲学、大问题和大事件的当前发现面。

第二轮 8 个 worker 全部正常完成，结果如下。

## Phase 0 result

| # | Scenario | Route | First source | Docs / bytes before source | Main production files | First verification | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 新增一期 AI与生活周记 | `content.weekly-life` | 最新生活周记 Markdown | 2 / 8,592 B | 新 Markdown、`posts.ts`、`config.mts` | `pnpm docs:build` | Pass |
| 2 | 修改既有 `WeeklyEntry` 正文并加图 | 对应 weekly content mode | 目标周记 Markdown | 2 / 8,592 B | 目标 Markdown + 图片 | `pnpm docs:build` | Pass |
| 3 | 调整周记标题/标签/插图间距 | `design.weekly` | `WeeklyEntry.vue` | 2 / 8,592 B | `WeeklyEntry.vue`、`style.css` | 构建 + 1440/768/390 | Pass |
| 4 | 在既有行业新增投研标的 | `content.research-*` | 同行业标的 `index.md` | 2 / 8,592 B | 新页、行业 hub、投研 hub、投资 hub、`config.mts` | Gate 1 → `pnpm docs:build` → Gate 2 | **Locality fail** |
| 5 | 修改首页 hero 与最近更新数量 | `design.home` | `docs/index.md` | 2 / 8,592 B | `docs/index.md`、`HomeRecent.vue` | 构建 + 首页三视口 | Pass |
| 6 | 修改面板预览按钮文案并加确认 | 发布面板 UI | `panel/public/index.html` | 2 / 7,137 B | `index.html`、`app.js` | 定向交互测试 → `pnpm test:panel` | Pass |
| 7 | 显式重试生产校验且 GET 纯查询 | 发布部署 | `publish-job.mjs` | 2 / 8,681 B | `publish-job.mjs`、`server.mjs`、`app.js` | `publish-api.test.mjs` → `pnpm test:panel` | Pass |
| 8 | 新增“大问题”主题并接 nav/sidebar | `content.big-question` | 大问题 hub / 兄弟主题页 | 2 / 8,592 B | 新主题页、hub、`config.mts` | `pnpm docs:build` | Pass |

字节组合由本机 `Path.stat().st_size` 复核：

- 公共内容/设计：`AGENTS.md` + blog-editor `SKILL.md` = 8,592 B
- 面板 UI：`AGENTS.md` + `panel/README.md` = 7,137 B
- 发布部署：`AGENTS.md` + `PROJECT.md` = 8,681 B

汇总：

- 正确能力 / mode：8/8
- 关键文档 ≤3 且 ≤10 KB：8/8
- 第一验证正确：8/8
- 跨能力误路由：0/8
- 生产实现文件 ≤3：7/8
- 路由总体通过：8/8

任务 4 的失败不是“找不到代码”，而是投研标的同时写在行业 hub、投研 hub、投资 hub 与 sidebar。它是 ADR 0002 typed IA / build-time projections 的首要实施样本。

## Observations

- 新周记可以在 2 份路由文档后直接进入最新同类 Markdown；面板不再被默认启动。
- 条目正文修改正确排除 `posts.ts` / `config.mts`；新一期才有三写副作用。
- 视觉任务通过 `pageClass` 与组件 class 命中 `.weekly-post .weekly-entry*`，没有进入全站 token。
- 首页任务区分 `docs/index.md` 的 hero 与 `HomeRecent.vue` 的展示数量，不修改 `recentPosts` 算法。
- 面板按钮从静态 `#btn-preview` 进入，行为落在 `saveAndPrepare()`；没有误改发布确认按钮。
- 发布任务确认现有 `retry-verify` 已存在，核心缺口是 `getPublication()` 会在 GET 中推进 `verifyProduction()`。
- 大问题主题不进入 `posts.ts`；当前改动面是新页、hub、nav/sidebar，README 仅作目录索引。

## Re-run cadence

- Phase 1 后：重点复测 1、2、4、8。
- Phase 2 后：任务 1 应从三写降为 Markdown + 图片。
- Phase 3 后：任务 4 应降为新页 + 一份 typed IA 声明，满足局部性门槛。
- Phase 4 后：复测任务 3、5 的视觉入口和代表页。
- Phase 5 后：复测任务 6、7；GET job 必须可证明为纯查询。
- Phase 6：重跑全部 8 项，并记录首次入口、主要文件、误搜候选、返工次数和验证结果；token 只作辅助指标。

最后更新：2026-08-22
