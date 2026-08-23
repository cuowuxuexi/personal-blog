# Phase 1 协同任务档：内容合同基线

本文件是 Agent-first 模块化 Phase 1 的单一协同任务档，包含协同状态、用户批准后的迭代基线，以及执行/验收报告指针。跨阶段架构路线仍以 `agent-first-modularization.md` 与 ADR 0002 为准；Orca 保存实时 Run / Task / Dispatch 状态，本文件不复制 Worker 进度。

## 协同状态

```yaml
phase: accepted
plan_entry: docs/agents/phase1-content-contract-collaboration.md
planning_terminal: term_d3bbbc7d-e7e5-47d8-b942-924fa1abb374
dispatch_terminal: term_f25140e8-8d5b-4471-bd12-37e505cd80f1
run_id: run_066268cc4d6b
repair_round: 1
execution_attempt: 0
execution_report: docs/agents/phase1-content-contract-execution-report.md
repair_report: docs/agents/phase1-r1-r7-false-green-repair-report.md
acceptance_report: docs/agents/phase1-content-contract-acceptance-report.md
architecture_effect: compatible_extension
collaboration_display_name: 内容合同基线
coordination_mode: s2
execution_authority: normal
planning_engine: current_strong_model_direct_plan
architecture_baseline_ref: docs/agents/agent-first-modularization.md@2026-08-22 + docs/adr/0002-content-authority-and-build-time-projections.md
iteration_baseline: approved-v1
profiles:
  planning: Pi / gpt-5.6-sol / xhigh
  dispatch: Cursor / user-default model and effort
  execution: Cursor / Grok 4.5 High Fast（modelId=grok-4.5, effort=high, fast=true）
  execution_launch: "orca orchestration worker-start … --agent cursor --model grok-4.5 --effort high"
window_labels:
  planning: "【规划验收】内容合同基线"
  dispatch: "【派发协调】内容合同基线"
  execution: "【执行01·修复】对等假绿收口"
last_wake_reason: final_accept_passed
liveness_deadline: null
```

## 目标

在不改变当前公开站点输出和发布行为的前提下，建立可被站点、发布面板和验证器共同消费的 `ContentKind` 深模块，并以自动化对等测试锁定现有 Markdown、`posts.ts`、`config.mts` 与 Hermes 投影关系。

本轮结束时应满足：

1. 内容类型的路径、生命周期、分类、资产位置、创作入口、最近更新可见性和验证策略只在共享合同中声明一次。
2. 发布面板通过 adapter 继续暴露与当前 `KINDS` / capability 相同的接口；站点通过 adapter 消费至少一项真实合同语义；验证器直接消费共享合同。
3. `pnpm test:content` 能对 live 仓库发现未登记文件、重复链接/期号、错误侧栏投影、Hermes 误登记、缺失图片和非法可见性。
4. 当前三写仍可继续工作，但其漂移会在进入 Phase 2 前被测试捕获。

## 非目标

- 不在本轮生成或重写 `posts.ts`、sidebar、hub、nav。
- 不删除 `panel/lib/weekly.mjs` 的 `manualPosts` / sidebar 字符串手术。
- 不迁移、重命名或修订公开 Markdown、图片、URL、标题、期号、视觉样式。
- 不拆分 `style.css`、`Layout.vue`、`panel/public/app.js` 或发布状态机。
- 不改变投研发布门禁，不让 research 自动进入首页最近更新。
- 不引入 CMS、前端框架、DI 容器或代码生成平台。
- 不 commit、push、发布、部署、上传国内站或整理无关工作区修改。

## 架构与约束

### 允许的架构增量

新增一个根级共享深模块，建议入口为 `content-catalog/`。模块应提供小而稳定的公共接口；具体内部文件可由执行层按现有风格决定，但调用者不得读取其内部数据结构。

合同至少覆盖当前迁移所需的五类：

- `weekly-life`
- `weekly-investment`
- `journey`
- `hermes`
- `research`

哲学、大问题、AI 大事件的 typed IA 归 Phase 3；本轮可保留可扩展接口，但不得预实现其投影生成器。

### 依赖方向

```text
content-catalog core
├─► site adapter（当前输出保持不变）
├─► panel adapter（保留 KINDS / capability 公共形状）
└─► content verifier（扫描 Markdown 与当前源投影）
```

- 核心合同不得依赖 VitePress、Vue、面板状态、Git 或网络。
- Node-only 文件扫描与 source projection 解析必须位于 adapter / verifier，不进入浏览器 bundle。
- `config.mts` 中 sidebar 字面量、`posts.ts` 中 `const manualPosts: PostItem[] = [`、年份标题和现有链接格式在 Phase 2 前仍是冻结兼容接口。
- 当前工作区基线为 `main`、HEAD `eab5c46c94cb8a4d1558b997431d546fd2f3eee2`，且存在大量用户/前序未提交修改。执行必须使用当前工作区，不得 reset、checkout、stash、格式化全仓或覆盖无关变更；是否开多个 Cursor 窗口由派发层按文件冲突决定。
- 新持久目录需有短 `README.md`，并同步父级导航；README 只做入口和文件索引，不复制合同正文。
- 默认不新增依赖。若现有扁平 frontmatter 与有界 source scanner 无法可靠满足合同，必须以失败样例和候选依赖进入决策门，不得静默加包。

### 当前行为兼容

- `posts`、`postsByCategory`、`recentPosts` 对现有内容的集合、顺序和公开链接不变。
- `research` 的最近更新可见性固定为 false；当前仓没有 research `manualPosts`，所以接线不得改变现有首页输出。
- `createRepoPaths(repoRoot).KINDS`、`kindCapability()`、`publicKindCapability()` 与前端 bootstrap 所见字段保持兼容。
- `applyDraft()` 的写盘文件集合、原子写语义和发布清单不变。
- Hermes 继续保持“文件即索引”，且不得写进 `manualPosts`。

## 逻辑任务

### T1 — 共享合同核心

- `display_name_zh`: 共享合同核心
- 目标：实现跨站点、面板和验证器可消费的 `ContentKind` 公共接口。
- 责任边界：合同 schema、五类声明、查询/可见性等纯函数、模块 README 与单元测试。
- 已知依赖：ADR 0002、`panel/lib/repo-paths.mjs`、`docs/.vitepress/posts.ts`。
- 预期产物：`content-catalog/`（建议）、公共入口与测试；必要的工程地图索引更新。
- 验收：同一 `id` 唯一；字段完整；纯函数无 fs / VitePress / panel 依赖；research 最近更新不可见；既有类型的路径与资产规则和 live 代码一致。

### T2 — 投影适配接线

- `display_name_zh`: 投影适配接线
- 目标：让面板与站点通过窄 adapter 消费共享合同，且当前行为不变。
- 责任边界：panel `KINDS` 适配、site 最近更新可见性或等价真实消费点、兼容测试。
- 已知依赖：T1；`repo-paths.mjs` 的 UI copy / filename / siteLink 仍可留在 panel adapter；`posts.ts` 当前查询 API 不改名。
- 预期产物：相关 adapter 与最小调用方修改；现有 panel tests 继续覆盖公共形状。
- 验收：当前 `KINDS` 字段和值不变；`recentPosts()` 对现有数据快照不变；不改 `config.mts` sidebar 结构；不改 `weekly.mjs` 字符串写入协议。

### T3 — 内容对等校验

- `display_name_zh`: 内容对等校验
- 目标：以 shared contract 驱动 live 仓扫描和 file ↔ posts ↔ sidebar 对等测试。
- 责任边界：Node-only 扫描、扁平 frontmatter 读取、现有 source projection 的有界解析、fixture 与 live parity tests。
- 已知依赖：T1；可复用现有 bracket/source scanner 思路，但不得 eval `config.mts` 或执行不受控源码。
- 预期产物：`test:content` 覆盖的测试文件，以及必要的单一已知例外声明。
- 验收规则：
  - 投资周记、AI与生活周记：日期文件与 `manualPosts`、对应年份 sidebar 的 title/link 一一对应；投资开篇允许 `issue` 缺省。
  - 历程日期期数：文件、`manualPosts`、历程年份 sidebar 对等。
  - 历程具名篇章：文件、`manualPosts`、当前两份具名 sidebar 与系列 `index.md` 对等；这是现状锁定，不把目标架构误当当前事实。
  - Hermes：文件扫描结果可解析；`manualPosts` 中不得出现 `hermes`；站点 glob/fs 适配语义一致。
  - 同一内容 kind 内 issue 唯一；所有受管条目 link 唯一；活跃内容引用图存在。
  - `research` 不得进入 `manualPosts` / 最近更新；投研门禁不因 catalog 放宽。
  - 未列出的活跃内容违约必须令测试失败；确有历史兼容例外时，只能在一个带理由的 exception 表中告警，不得散落跳过。
- 禁止：为让测试转绿而擅自改公开内容或索引；发现 live 漂移时进入决策门。

### T4 — 验证与文档收口

- `display_name_zh`: 验证接线收口
- 目标：提供稳定的 `pnpm test:content`，更新最短源码地图并完成全量回归。
- 责任边界：`package.json` 脚本、目录 README / `PROJECT.md` 的必要入口更新、验证证据。
- 已知依赖：T1、T2、T3。
- 预期产物：根脚本和最小文档同步；不创建第二套架构计划。
- 验收：`pnpm test:content`、`pnpm test:panel`、VitePress normalizer tests、`pnpm docs:build`、`git diff --check` 全部通过。

## 任务关系

```text
T1 共享合同核心
├─► T2 投影适配接线
└─► T3 内容对等校验
T2 + T3 ─► T4 验证与文档收口
```

这是逻辑依赖，不预绑定执行窗口数量。派发层可按真实文件所有权合并或串行；当前 dirty worktree 下不得以并行便利为由创建冲突 checkout。

## 整体验收标准

1. 所有目标与非目标均有 diff / 测试证据，没有公开内容、URL、视觉、面板写盘或部署行为变化。
2. shared contract 成为五类内容域事实的唯一新声明点；adapter 不反向泄漏调用方状态。
3. `test:content` 对至少一个 fixture 的三写漂移、重复 issue、重复 link、Hermes 误登记、缺图和 research 可见性错误能先红后绿。
4. live 仓对等结果通过，或出现的真实漂移被报告到决策门而不是被自动修正文档。
5. 现有 API 与字符串兼容点有回归保护，Phase 2 可在该基线上删除三写而不是重做扫描。
6. 最小充分验证均有真实命令和退出结果；构建成功不被虚报为视觉验收。
7. Worker 不 commit/push/deploy；所有已接受执行窗口默认 retain，只有用户明确清理时 release。

## 追踪矩阵

| 目标 / 不变量 | 逻辑任务 | 终验主要证据 |
| --- | --- | --- |
| 内容事实单一声明 | T1 | 公共 API、合同单测、模块依赖检查 |
| 站点/面板兼容消费 | T2 | panel 定向测试、现有 posts 查询快照、构建 |
| 三写漂移可检测 | T3 | fixture 红绿测试、live parity 结果 |
| 工程入口可复用 | T4 | `test:content`、工程地图、全量回归 |
| 不改公开行为和发布门 | T2/T3/T4 | diff 审查、`test:panel`、`docs:build` |

## 默认决策原则

- 兼容优先、先断言后迁移、先窄接口后生成器。
- 遵循现有 Node ESM / node:test 风格，不为少量重复引入框架。
- 只修本轮引入的回归；无关 dirty 修改只观察不整理。
- 文件名和内部拆分可由执行层按深模块原则微调，但公共语义、非目标和验收不变。
- 执行偏差必须附证据；不得静默扩大到 Phase 2/3。

## 用户决策门

出现以下任一情况必须暂停并回到用户：

1. live 对等测试发现需要修改公开内容、标题、URL、期号或 sidebar 才能通过。
2. 需要新增第三方依赖或改变 `posts.ts` / `config.mts` 的冻结字符串接口。
3. 需要让 research 进入最近更新，或改变周记/历程的公开排序语义。
4. 需要 reset/stash/删除/覆盖当前工作区修改，或需要 commit/push/deploy。
5. 需要超出 ADR 0002 的架构改写，而不是兼容扩展。

## 批准状态

用户已批准 `approved-v1`。Phase 1 已在第 1 轮修复后终验通过（`verdict=accepted`，`architecture_effect=compatible_extension`）。执行报告：`docs/agents/phase1-content-contract-execution-report.md`；验收报告：`docs/agents/phase1-content-contract-acceptance-report.md`。执行窗口保持 retain；无 commit / push / deploy。

最后更新：2026-08-22
