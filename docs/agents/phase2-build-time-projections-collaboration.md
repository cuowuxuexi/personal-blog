# Phase 2 协同任务档：周记 / 历程构建期投影

本文件是 Agent-first 模块化 Phase 2 的单一协同任务档与可批准迭代基线。跨阶段架构路线仍以 `docs/agents/agent-first-modularization.md` 与 ADR 0002 为准；Phase 1 已验收基线见同目录 `phase1-content-contract-*.md`。本轮只做周记 / 历程的构建期投影与面板去三写，不扩到 Phase 3（投研 / 哲学 / 大问题结构投影）。

## 协同状态

```yaml
phase: accepted
plan_entry: docs/agents/phase2-build-time-projections-collaboration.md
planning_terminal: term_50027542-5c21-4e97-ad95-a7cff294ab29
dispatch_terminal: term_3eec0d19-8e8c-4f2a-932f-dbfb810fdccd
run_id: run_5b8be14ff75e
repair_round: 2
execution_attempt: 3
execution_report: docs/agents/phase2-build-time-projections-execution-report.md
acceptance_report: docs/agents/phase2-build-time-projections-acceptance-report.md
collaboration_display_name: 周记历程构建期投影
coordination_mode: s2
execution_authority: preauthorized
planning_engine: direct plan + native planner/explore subagents
architecture_baseline_ref: docs/agents/agent-first-modularization.md@2026-08-22 + docs/adr/0002-content-authority-and-build-time-projections.md
iteration_baseline: approved-v1
profiles:
  planning: Pi / current strong model
  dispatch: Cursor / Grok 4.6 / high effort / Fast
  execution: Cursor / model cursor-grok-4.5-high（本 Run T1–T6 approved/historical；approved-v1 不改写）
  execution_future_new_window: Cursor / model cursor-grok-4.5-high-fast（作者最新；本 repair_round=2 必须绑此 model，不得静默降级）
window_labels:
  planning: "【规划验收】周记历程构建期投影"
  dispatch: "【派发协调】周记历程构建期投影"
  execution: "【执行03】终验修复 R2"
logic_tasks:
  - id: T1
    display_name_zh: 投影生成器与 typed IA
  - id: T2
    display_name_zh: 站点消费投影
  - id: T3
    display_name_zh: 历程独立系列侧栏
  - id: T4
    display_name_zh: 面板去三写
  - id: T5
    display_name_zh: 首次公开与修订日期语义
  - id: T6
    display_name_zh: 验证与文档收口
last_progress_at: 2026-08-23T11:13:00+08:00
last_wake_reason: planning_window_narrow_fix_verified_and_phase_accepted
liveness_deadline: null
```

## 已关闭决策门（终验窄幅收口）

repair_round 2/2 后的独立复审发现 side-effect `node:fs` 护栏缺口与 panel 具名历程顺序重复真源。作者于 2026-08-23 明确授权规划验收窗口直接修复；本窗口已补齐 side-effect `node:fs` / `fs/promises` 变异测试，并让 panel 消费 catalog `namedChapterOrder`。五条回归命令全绿，最终独立 spec 复核无 findings。Phase 2 已接受，详见 `phase2-build-time-projections-acceptance-report.md`。

## 已关闭决策门（profile 契约）

2026-08-22 20:43 +08 规划裁定 **A**，门已关闭，不再阻塞终验。

认定：T1–T5 与 T6 主体在 `cursor-grok-4.5-high`（Fast 关闭）下执行。T6 `worker_done`（20:23）后，作者于 20:30 在宿主 UI 手动开启 Fast，属任务完成后的终态选择，不要求重跑。

两套 profile 不得混写：

- **本 Run approved/historical**（= approved-v1，不改写）：`cursor-grok-4.5-high`
- **作者最新、仅约束此后新建执行窗**：`cursor-grok-4.5-high-fast`

证据时间线仍见执行报告「Profile 契约」节。

## 目标

在 Phase 1 对等基线上，把 weekly-life、weekly-investment、journey 的内容身份权威收束到 Markdown/frontmatter，把分组顺序与历程系列关系收束到 typed IA，并让 `posts`、年份 sidebar、最新一期、最近更新在开发/构建期由投影派生。发布面板与 blog-editor 两条创作路径最终产生同一 catalog 结果；公开 URL、排序语义（除生活侧栏历程条目去重这一既定目标外）与页面输出尽量保持。

本轮结束时应满足：

1. Markdown/frontmatter 是周记与历程的身份真源；`manualPosts` 不再是权威，也不再被面板字符串手术维护。
2. typed IA 声明年份组模板、具名篇章顺序、历程系列入口关系；生活侧栏只保留历程系列入口，不再枚举具名篇章叶子。
3. 历程侧栏拥有具名篇章与日期期数（年份组）；日期期数当前 live 为空集亦可，但投影与写入路径必须支持。
4. `posts`、年份 sidebar、`postsByCategory` / `recentPosts` / `LatestWeeklyRedirect` 所依赖的查询改为构建期或开发期投影。
5. 面板 `applyDraft` 只写目标 Markdown 与被引用图片；删除对 `posts.ts` / `config.mts` 字面量的插入与更新。
6. 引入稳定的首次公开日期与可选重要修订日期语义（字段可增量、默认兼容现有 `date`）。
7. `pnpm test:content`、`pnpm test:panel`、`pnpm docs:build` 通过；对等测试从“三写互证”演进为“文件权威 → 投影 ≡ 期望 IA”。

## 非目标

- 不进入 Phase 3：不投影投研 hub / 哲学 / 大问题 / 行业地图结构事实。
- 不拆分 `style.css`、`Layout.vue`、`panel/public/app.js` 发布状态机（属 Phase 4/5）。
- 不改变投研发布门禁；research 仍不进入首页最近更新。
- 不重写公开正文观点、不批量改 URL、不批量改期号标题，除非决策门明确要求。
- 不引入 CMS、前端框架、DI 容器或代码生成平台；默认不新增 npm 依赖。
- 不 commit、push、发布、部署、上传国内站；不整理与本轮无关的工作区 dirty 修改。
- 不要求本轮完成统一 `pnpm verify` 或浏览器视觉 smoke（属后续阶段）。

## 作者已确认的字段与 IA 决策

1. `date` 继续表示稳定的首次公开日期或期数日期，普通修订不得修改。
2. 新增可选 `revisionDate: YYYY-MM-DD`，仅表示重要修订；必须不早于 `date`，既有内容无需回填。
3. 首页“最近更新”的 freshness 为 `revisionDate ?? date`；所有本来可见的生活周记、投资周记和历程（含具名篇章）均可因重要修订重新进入排序。Hermes 不启用该字段，research 仍不可见。
4. “最新一期”只依据系列内的 `issue` / `date`，不受 `revisionDate` 影响。
5. 日期型历程的年份组标题固定为 `历程 · {year}年`。
6. VitePress 现有 Git `lastUpdated` 可保留，但它不是重要修订日期，不得作为 catalog 的 `revisionDate` 来源。
7. `execution_authority: preauthorized`：迭代基线批准后，批准范围内连续执行；范围增长、架构改写、破坏性或外部副作用仍进入决策门。

## 现状摘要（只读核验）

| 面 | 当前事实 | Phase 2 目标 |
| --- | --- | --- |
| 身份权威 | MD frontmatter 已有 title/date/category/type/issue；同时 `manualPosts` 手写副本 | MD 为唯一身份权威 |
| IA / 顺序 | `namedChapterOrder` 已在 catalog；sidebar 字面量仍手写；生活侧栏重复枚举具名历程 | typed IA 拥有分组与系列关系；生活侧栏只留系列入口 |
| posts | `posts.ts` = `manualPosts` + Hermes glob | weekly/journey 由扫描投影；Hermes 保持 file-is-index |
| sidebar | `config.mts` 字面量；面板 `insertSidebarItem` / `updateSidebarItem` | 受管年份组与历程组由投影注入；静态壳保留 |
| 面板写盘 | `applyDraft` 原子写 MD + posts.ts + config.mts | 只写 MD + 引用图 |
| 查询 | `HomeRecent`→`recentPosts`（已接 catalog 可见性）；`CategoryList` / `LatestWeeklyRedirect`→`postsByCategory` | 数据源改为投影后的 posts，API 名可保留 |
| 日期语义 | CONTEXT 已定义首次公开 / 重要修订；代码仍主要用 `date` | 增量接入字段与查询口径，兼容现网 |

关键 live 锚点：

- 合同：`content-catalog/{index,kinds,schema,query,paths}.mjs`
- 对等：`content-catalog/verify/*`、`parity.live.test.mjs`、`parity.fixture.test.mjs`
- 站点：`docs/.vitepress/posts.ts`、`config.mts`、`hermes-diary-*.{mjs,ts}`、`content-catalog-adapter.mjs`
- 消费方：`theme/components/{HomeRecent,CategoryList,LatestWeeklyRedirect}.vue`
- 面板：`panel/lib/weekly.mjs`（`applyDraft` / sidebar 手术）、`panel/lib/content-kind-adapter.mjs`

## 架构与模块 seam

### 权威分层（沿 ADR 0002）

```text
Markdown/frontmatter          → 内容身份与正文
typed IA（content-catalog）   → 分组、顺序、系列关系、生命周期、可见性
build/dev projection          → posts、年份 sidebar、latest/recent 查询输入
panel / blog-editor           → 只写 MD（+ 引用资产）；不再写索引源
```

### 建议模块边界

| 模块 | 职责 | 不负责 |
| --- | --- | --- |
| `content-catalog` core | kind 合同、typed IA 字段、纯查询、路径规则 | fs、VitePress、面板 UI |
| `content-catalog` projection core（新建，纯 ESM） | 解析受管 frontmatter、把 kind+相对路径映射为 PostItem、排序并生成 sidebar 模型 | `node:fs`、VitePress glob、写盘、发布、主题渲染 |
| Node fs adapter | 扫仓后调用纯 core；供 `config.mts`、verifier 与 live 对账 | 进入浏览器 bundle |
| Vite glob adapter | 将 `import.meta.glob(..., { eager:true, query:'?raw' })` 的 raw Markdown 交给同一纯 core；供 `posts.ts` | `node:fs`、第二套字段/排序规则 |
| site adapter | `posts.ts` / `config.mts` 分别消费 glob/fs adapter；保留对外 API 名 | 面板写协议 |
| panel adapter / `weekly.mjs` | 读写目标 MD、listIssues 读磁盘、原子写仅 MD+图 | posts/config 字符串手术 |
| verifier | 文件权威 ↔ 同一 projection core ↔（迁移期）旧字面量金标 | 自动改公开内容 |

### 依赖方向

```text
content-catalog core
├─► projection core（纯函数、无 fs/VitePress）
│    ├─► Vite glob adapter ─► posts.ts
│    ├─► Node fs adapter ───► config.mts
│    └─► verifier / test:content
├─► panel content-kind adapter（只读合同）
└─► verifier rules
panel weekly.mjs ─► 只写 docs/**/*.md + 引用图
```

两个 adapter 必须共享同一个 frontmatter→PostItem、排序和 sidebar 模型核心；不得分别重写字段映射。生产 core 不得反向依赖 `content-catalog/verify/`，需要复用的 frontmatter 解析应提升到 core 后由 verifier re-export 或调用。

### 投影契约（对外稳定形状）

投影至少提供（名称可微调，语义不可漂）：

1. `postFromManagedMarkdown({ kindId, relativePath, raw }) → PostItem | null`  
   纯函数；覆盖 weekly-life、weekly-investment、journey，解析与校验 `date` / `revisionDate`；不含 research/Hermes。
2. `managedPostsFromSources(sources) → PostItem[]`  
   纯集合入口；Node fs 与 Vite glob adapter 都只负责提供 `{kindId, relativePath, raw}`。
3. `projectManagedPostsFromFs(repoRoot) → PostItem[]` 与 `managedPostsFromGlob(modulesByKind) → PostItem[]`  
   两条环境适配必须对同一 fixture/live 树给出相同标准化记录。
4. `projectYearSidebarGroups(kindId, posts) → { text, collapsed, items:[{text,link}] }[]`  
   年份倒序；组内按现网排序（通常日期/期号新到旧）。
5. `projectJourneySidebar(posts) → groups`  
   = 具名篇章组（`namedChapterOrder`）+ 日期期数年份组。
6. `projectLifeSidebarManagedParts(posts)`  
   = 周记年份组；**不**再输出具名历程叶子。历程只通过系列入口 link 出现在生活壳里。
7. latest / recent：继续经现有 `postsByCategory(..., 'weekly')[0]` 与 `selectRecentPosts`；数据源改为投影 posts。

### 配置壳 vs 受管投影

`config.mts` 保留不可投影的静态壳：nav、outline、生活「最新周记」入口、历程系列入口、大事件区、Hermes 标题壳等。仅以下受管片段改为投影插入：

- `/投资/周记/` 年份组与开篇项
- `/AI与生活/` 的「周记 · {year}年」组
- `/AI与生活/我的AI历程/` 的具名篇章组与日期期数年份组

生活侧栏中现有「我的AI历程」**叶子枚举组**删除，只保留顶部系列入口——这是本阶段既定 IA 变更，不是回归。

### 面板写盘新协议

`applyDraft` 成功后工作区变更集合：

- 目标 Markdown（新建 / 改条目 / 改期头 / 可能的投资主题重命名）
- 被引用图片（现有 `collectReferencedImages`）
- **不再**包含 `docs/.vitepress/posts.ts`、`docs/.vitepress/config.mts`

`listIssues` / `nextIssueNumber` / 预览链接继续以磁盘 MD + catalog 路径规则为准（Phase 1 后 panel 已部分接 adapter；本轮须切断对 manualPosts 的任何权威依赖）。

## 迁移顺序（必须按此推进）

```text
Wave A  投影可生成且 ≡ 当前金标（含生活侧栏具名叶子的旧形状，或双金标）
Wave B  站点改读投影；旧 manualPosts 可暂作 shadow / 测试金标
Wave C  切换历程独立系列 IA（生活侧栏去具名叶子；历程侧栏含篇章+日期组）
Wave D  面板停止写 posts/config；删除字符串手术与相关测试断言
Wave E  首次公开 / 修订日期语义落地（可与 D 部分重叠，但不可阻塞 D 的去三写）
Wave F  验证收口、文档与 skill 路由同步、清理死亡代码
```

约束：

- 未证明投影 ≡ 旧输出前，不得删除 `manualPosts` marker 或 sidebar 字面量手术。
- 历程独立系列侧栏变更会故意打破 Phase 1 R3「两份 sidebar 都枚举具名篇章」的现状锁；必须先把对等期望升级为目标 IA，再改 `config.mts`。
- 面板去三写必须发生在站点已消费投影之后，否则本地预览会丢索引。
- 全程使用当前 dirty worktree；不得 reset / stash / 覆盖无关修改。

## 逻辑任务

### T1 — 投影生成器与 typed IA

- `display_name_zh`: 投影生成器与 typed IA
- 目标：在 catalog 上补齐 journey/weekly 的 typed IA，并实现共享纯投影 core、Node fs adapter 与 Vite glob adapter，使扫描 MD 能得到与现网等价的 posts 与受管 sidebar 片段。
- 责任边界：
  - 扩展 kind / IA：journey 年份组模板与生活周记解耦；系列入口关系；indexing 从 `manual-posts` 迁向派生语义（可分步：先保留字段，投影路径优先）。
  - 单一 frontmatter → PostItem 映射（title/date/revisionDate/category/type/issue/description/link），由 fs/glob 两个 adapter 共用。
  - 投资开篇无 issue 例外继续精确到既有 link。
  - 具名篇章 vs 日期期数分流。
  - 单测：fixture 红绿；与 Phase 1 live 扫描集合对账。
- 已知依赖：Phase 1 `content-catalog`、`verify/scan.mjs`、`paths.mjs`、Hermes core。
- 预期产物：纯投影 core + fs/glob adapter + 测试；core 仍无 `node:fs`、VitePress/Vue/panel 依赖。
- 验收：对当前 live 仓，投影 posts 的 `{title,date,category,type,issue,link}` 集合与顺序规则匹配现 `manualPosts`；年份 sidebar 投影匹配现网受管组（Wave A 金标）。不得改公开 MD。

### T2 — 站点消费投影

- `display_name_zh`: 站点消费投影
- 目标：`posts.ts` 与查询消费方改为使用投影；Hermes 合并方式保持；`recentPosts` / `postsByCategory` / `formatIssue` 对外名称不变。
- 责任边界：
  - `posts.ts`：weekly/journey 来自投影；Hermes 仍 glob + core。
  - `config.mts`：受管 sidebar 组改为调用投影（Node 侧）；静态壳手写保留。
  - `HomeRecent` / `CategoryList` / `LatestWeeklyRedirect` / `HomeHeroCta` 若只经 posts API，可不改组件。
  - 适配测试与 `docs:build`。
- 已知依赖：T1。
- 预期产物：站点接线；必要时薄 site adapter。
- 验收：构建后 posts 集合、最新周记跳转目标、最近更新列表（在 IA 未切系列前）与切换前快照一致；research 仍不可见。

### T3 — 历程独立系列侧栏

- `display_name_zh`: 历程独立系列侧栏
- 目标：落实 CONTEXT「Journey series」：生活侧栏只留系列入口；历程侧栏拥有具名篇章 + 日期期数年份组。
- 责任边界：
  - 更新 typed IA 与投影输出形状。
  - 改 live `config.mts` 受管片段以匹配目标 IA。
  - 将对等测试从「五处具名叶子」改为「系列入口 + 历程侧栏/系列 index/posts/文件」。
  - 更新 fixture 金标。
- 已知依赖：T1、T2（至少投影 API 稳定；可与 T2 同窗串行）。
- 预期产物：目标侧栏结构 + 测试期望升级。
- 验收：`/AI与生活/` 不再出现三个具名历程叶子；系列入口仍在；`/AI与生活/我的AI历程/` 含篇章组且年份组机制可用；公开 URL 不变。

### T4 — 面板去三写

- `display_name_zh`: 面板去三写
- 目标：`applyDraft` 与相关路径不再读写 `posts.ts` / `config.mts`；创作后站点索引仅靠投影刷新。
- 责任边界：
  - 删除或停用 `insertManualPost` / `updateManualPost` / `insertSidebarItem` / `updateSidebarItem` 在 applyDraft 中的调用。
  - 返回的 `files` 清单不再包含这两类索引源。
  - `listIssues` 等读路径确认只依赖 MD。
  - 旅程改 meta 时不再双写生活侧栏。
  - 更新 `panel/*.test.mjs`；保留 legacy KINDS 冻结快照精神，但写盘契约改为新协议。
- 已知依赖：T2（站点已不依赖手写索引）；T3 建议先完成以免面板与 IA 中间态纠缠。
- 预期产物：`weekly.mjs` 写盘协议变更 + 面板测试。
- 验收：`pnpm test:panel` 全绿；针对 newIssue/editChrome 的测试证明不再触碰 posts/config；手工或 fixture 证明只写 MD 后投影仍能看到新期。

### T5 — 首次公开与修订日期语义

- `display_name_zh`: 首次公开与修订日期语义
- 目标：把 CONTEXT 中的 Publication date / Revision date 落成可消费字段与查询口径，且不破坏现有 `date` 排序兼容。
- 责任边界：
  - frontmatter 合同：`date` = 首次公开/期次日期（稳定）；可选 `revisionDate` = 重要修订，且不得早于 `date`。
  - 投影与 recent 排序：recent 使用 `revisionDate ?? date`；所有本来可见的周记和历程均适用；latest issue 仍严格按系列内期次/期次 date。
  - Hermes 不启用 `revisionDate`；research 继续不可见。
  - 文档：CONTEXT / catalog README / publishing-panel 或 blog-editor 最短说明。
  - 现有页面不回填 `revisionDate`；缺省时行为与现在一致。
- 已知依赖：T1 投影映射；可与 T4 并行，但不得倒逼批量改文。
- 预期产物：字段合同 + 投影/查询行为 + 最小文档。
- 验收：无 revisionDate 时 recent/latest 快照不变；有 revisionDate 的 fixture 按约定排序；不把 typo 级编辑写成自动更新逻辑。

### T6 — 验证与文档收口

- `display_name_zh`: 验证与文档收口
- 目标：全量回归、源码地图与 Agent 路由同步到“投影真源”，宣告 Phase 2 完成条件可验收。
- 责任边界：
  - `test:content` 主路径改为文件权威 → 投影；迁移期 shadow 金标删除或标明废弃。
  - 更新 `docs/.vitepress/README.md`、`content-catalog/README.md`、`docs/agents/publishing-panel.md` / blog-editor 中与三写相关的过期句子。
  - 更新 `agent-first-modularization.md` Phase 2 checkbox（仅在终验通过后）。
  - 跑：`pnpm test:content`、`pnpm test:panel`、normalizer tests、`pnpm docs:build`、`git diff --check`。
- 已知依赖：T1–T5。
- 预期产物：执行报告材料所需证据；文档最小同步。
- 验收：完成条件清单全部有命令/ diff 证据；无第二事实源教 Agent 继续三写。

## 任务关系（建议逻辑 DAG）

```text
T1 投影生成器与 typed IA
└─► T2 站点消费投影
     └─► T3 历程独立系列侧栏
          └─► T4 面板去三写
T1 ─► T5 首次公开与修订日期语义
T4 + T5 ─► T6 验证与文档收口
```

并行提示（派发层可选用，不预绑定窗数）：

- T5 可在 T1 后与 T2/T3/T4 部分并行，但避免同时大改 `query.mjs` 与面板写盘而无集成窗。
- dirty worktree 下优先单执行窗串行 T1→T6，避免 `content-catalog/`、`posts.ts`、`weekly.mjs` 冲突。
- 逻辑任务中文名是命名种子；派发层可按文件所有权合并窗口，但不得合并到 Phase 3 范围。

## 测试策略

### 原则

- 先金标后切线：Wave A 用现网字面量做金标证明投影；Wave C 起金标改为目标 IA。
- 测外部行为：投影输出、sidebar 受管组、面板写盘文件集合、recent/latest 列表；不测实现私有函数拼盘。
- 延续 Phase 1 fail-closed：未登记活跃文件、重复 link/issue、sidebar 未识别叶子必须红。
- 红绿 fixture 优先复用 `content-catalog/verify/fixture-repo.mjs` 模式。

### 必测矩阵

| 场景 | 期望 |
| --- | --- |
| live 周记/投资/历程 MD → posts 投影 | 字段对等；开篇无 issue 例外仍精确 |
| 年份 sidebar 投影 | 组标题模板正确；journey 固定使用「历程 · {year}年」，不误用生活周记文案 |
| 生活侧栏（目标 IA） | 有系列入口；无具名历程叶子；有生活周记年份组 |
| 历程侧栏 | 具名顺序 = `namedChapterOrder`；日期期可空；若有日期期则进年份组 |
| Hermes | 仍 file-is-index；不进 manual/投影 managed posts；glob/fs/core 一致 |
| recent | research 不可见；无 revisionDate 时与现网一致 |
| latest weekly | 分类内 weekly 日期倒序第一条；不等于跨站 recent |
| 面板 newIssue | 只写 MD（+图）；投影可见新期；不改 posts/config |
| 面板 editChrome / 投资改主题重命名 | 只动 MD（及旧文件删除）；索引靠投影 |
| 缺图 / 重复 issue / 未登记文件 | test:content 失败 |

### 回归命令（终验最小集）

```bash
pnpm test:content
pnpm test:panel
node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs
pnpm docs:build
git diff --check
```

## 风险与用户决策门

### 已知风险

1. **故意 IA 变更**：生活侧栏去掉具名历程叶子，会改变导航信息密度；这是目标行为，但需在验收时做一次人工点选确认。
2. **VitePress 加载边界**：`posts.ts` 进客户端 bundle，只能使用 Vite raw glob adapter；`node:fs` 只允许进入 `config.mts` / verifier 的 Node adapter。测试必须证明 browser 入口的传递依赖不含 `node:fs`。
3. **中间态预览**：若先去三写、后接投影，面板保存后侧栏/首页会暂时缺失——迁移顺序禁止该翻转。
4. **journey 年份组命名**：当前 kind 误用生活周记模板；T1/T3 必须固定为作者已确认的「历程 · {year}年」。
5. **dirty worktree**：既有无关修改与本轮文件交织；禁止整理无关 diff，审查时需按路径过滤。
6. **blog-editor 三写习惯**：面板去三写后，skill/文档若仍要求手改 posts/config，会制造人机第二事实源——T6 必须改路由描述。

### 必须暂停并回到用户的决策门

1. 投影与 live 对账发现必须改公开 URL、标题、期号或正文才能一致。
2. 需要新增第三方依赖，或改为“每次提交前手动 codegen 检查入仓大文件”作为主路径。
3. 希望保留生活侧栏具名历程叶子（即撤回独立系列 IA）。
4. 投影发现既有 `date` 无法可靠表示首次公开/期数日期，或实现必须批量回填历史 `revisionDate`。
5. 需要 reset/stash/覆盖无关修改，或需要 commit/push/deploy。
6. 范围膨胀到投研 hub / 哲学 / 大问题（Phase 3）或面板 UI 深拆（Phase 5）。

### 默认决策原则（无决策门时）

- 兼容优先：能派生则不手写；能保留 API 名则不改调用方。
- 路径适配优先：frontmatter 只增量，不批量改历史文。
- journey 日期年份组固定为 `历程 · {year}年`。
- 修订日期字段固定为 `revisionDate`，不得同时兼容 `updated` 等第二字段。
- `revisionDate` 只由作者或创作入口显式声明，不从 Git 时间、文件 mtime 或普通编辑自动生成。
- 不为额外展示 UI 阻塞去三写：本阶段只落实合同、投影与查询语义。

## 整体验收标准

1. Markdown/frontmatter 为 weekly-life、weekly-investment、journey 身份真源；面板与 blog-editor 不再维护 posts/config 副本。
2. typed IA 拥有分组顺序与历程系列关系；生活侧栏仅系列入口；历程侧栏含具名篇章与日期期机制。
3. posts / 受管 sidebar / latest / recent 均来自开发或构建期投影；Hermes 仍文件即索引。
4. 公开 URL 保持；除既定生活侧栏历程去重外，页面列表与跳转目标有快照或测试证据。
5. 首次公开日期与可选重要修订日期语义在合同与查询中可定位；缺省兼容现网。
6. `pnpm test:content`、`pnpm test:panel`、normalizer、`pnpm docs:build`、`git diff --check` 均为退出码 0。
7. 文档不再教导三写；Agent 路由仍能一跳到正确能力。
8. 无 commit/push/deploy；`architecture_effect` 预期为 `compatible_extension`（含既定 IA 导航增量）。

## 追踪矩阵

| 目标 / 不变量 | 逻辑任务 | 终验主要证据 |
| --- | --- | --- |
| MD 身份权威 | T1/T4 | 投影对账、applyDraft 文件清单 |
| typed IA 分组与系列 | T1/T3 | kinds/IA 声明、sidebar 投影测试 |
| 构建期 posts/sidebar | T1/T2 | posts.ts/config 接线、docs:build |
| 面板去三写 | T4 | panel 测试、写盘 diff |
| 日期语义 | T5 | 合同字段、recent/latest fixture |
| 不扩 Phase 3 / 不改门禁 | 全任务 | diff 审查、research 不可见测试 |
| 工程可回归 | T6 | 五条命令退出码 |

## 批准状态

`iteration_baseline: approved-v1`。

作者已批准并要求立即启动派发；字段、IA、逻辑任务、验收边界和窗口 profile 均已冻结。批准范围内采用 `execution_authority: preauthorized` 连续执行；范围增长、架构改写、破坏性或外部副作用仍必须进入决策门。

批准时间：2026-08-22。未授权 commit、push、发布、部署或国内站上传。

最后更新：2026-08-22
