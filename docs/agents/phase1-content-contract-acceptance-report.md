# Phase 1 终验报告：内容合同基线

verdict: accepted  
architecture_effect: compatible_extension  
run_id: run_066268cc4d6b  
repair_round: 1  
date: 2026-08-22

## 结论

Phase 1 在第 1 轮修复后通过最终验收。共享 `ContentKind`、站点与 panel adapter、live 内容对等检查、Hermes 真实生产适配和冻结 legacy 快照已经形成可供 Phase 2 使用的可靠基线；本轮未改变公开 URL、视觉、内容语义、`weekly.mjs` 写盘协议或发布部署行为。

首轮独立终验曾因多条可假绿路径判定失败，R1–R7 已逐项修复并由 live 代码、红绿 fixture、派发复验和规划验收窗口的独立命令复核。修复后的额外 Sol Medium 子审查因本机 OpenRouter 凭据不可用未能启动，未用其它模型静默替代；最终接受依据三层质量门、首轮独立审查的闭环证据、规划验收窗口的源码复核及全量验证结果。

## 最终验收证据

- `pnpm test:content`：22/22，退出码 0。
- `pnpm test:panel`：155/155，退出码 0。
- normalizer tests：6/6，退出码 0。
- `pnpm docs:build`：通过，退出码 0。
- `git diff --check`：退出码 0，仅现有 CRLF 提示。
- R1：opening 例外按精确链接收口，Markdown 与 posts 的 `date` / `issue` / `category` / `type` 进入对等比较。
- R2：扫描先发现再分类，未登记 weekly/Hermes 会失败，`大事件/` 不误报。
- R3：三篇具名历程在文件、posts、两份 sidebar 与系列 index 上锁定集合、基数和顺序。
- R4：`posts.ts` glob、Node fs 与 verifier 共用 `hermes-diary-core.mjs`，浏览器路径无 `node:fs`。
- R5：受管 link 检查 cardinality；sidebar/index 重复与未识别叶子 fail closed。
- R6：日期、POSIX/Windows traversal 与非法文件名片段受路径构造器约束。
- R7：`panel/legacy-kinds-fixture.test.mjs` 不依赖新 catalog，冻结三类 panel `KINDS` 的完整可观察兼容面。
- 无新增依赖、无 commit、push、发布、部署或上传。

## 首轮已通过覆盖

- 五类 `ContentKind` 与窄公共入口已经建立；core 无 fs / VitePress / Vue / panel 依赖。
- panel 仍暴露 `life` / `invest` / `journey`，站点 `recentPosts()` 已消费 catalog；research 保持不可见。
- live 仓在当前检查口径下通过；现有六类 fixture 红绿存在。
- 派发层复验：`test:content` 13/13、`test:panel` 154/154、normalizer 6/6、`docs:build`、`git diff --check` 均为退出码 0。
- 未发现本轮修改公开内容、URL、视觉、写盘协议、发布或部署行为。

## 第 1 轮必修项（已完成）

### R1 — 精确建模 issue 与 opening 例外

- 投资周记只允许当前明确开篇 `/投资/周记/2026-08-08-写在投资笔记开始之前` 缺 `issue`；不得把整个 kind 放宽。
- 日期 journey 不得被无条件豁免。
- file ↔ `manualPosts` 必须比较 `date`、`issue`、`category`、`type`，不能只比较 title/link。
- issue 唯一性至少同时覆盖 Markdown 权威数据和投影；增加“只改 Markdown issue”“只改 posts date/issue”的红灯 fixture。

### R2 — 发现未登记活跃文件

- 扫描器必须先发现受管目录的候选 Markdown，再区分明确排除项、合法受管项和未登记项；不能在 parity 前静默过滤非法命名文件。
- 为 weekly 目录显式声明 `index.md` / `README.md` 等合法排除项。
- 增加未登记 weekly/Hermes 文件的红灯 fixture；不得把 `大事件/` 等其它能力目录误报为 weekly。

### R3 — 锁定具名 journey 的完整集合、基数与顺序

- 消费 `namedChapterOrder`，锁定当前三篇：`基础设施篇.md`、`工具篇.md`、`AI开支记录与优化.md`。
- 文件、`manualPosts`、生活 sidebar、历程 sidebar、系列 `index.md` 都必须完整、一一对应且每个 link 基数恰好为 1。
- 两份 sidebar 与系列 index 的顺序必须与合同一致。
- 增加整篇同时从五处删除、sidebar/index 重复、顺序交换、单侧漏项的红灯 fixture。

### R4 — Hermes 对等必须连接真实站点语义

- 不得继续用 verifier 内两套共享同一 parser 的模拟函数证明 glob/fs 等价。
- 抽出或复用真实生产纯适配逻辑，使 `posts.ts` 的 glob 路径、`hermes-diary-fs.ts` 的 fs 路径和 verifier/test 共享同一真实 parser/sort 语义；保持 Node-only fs 不进浏览器 bundle。
- fixture 至少覆盖 index/README 排除、非法文件名忽略、frontmatter title/date/description 与排序一致。

### R5 — 对等检查必须 fail closed

- `pairTitleLink` 不得只取重复 bucket 的第一项；文件、posts、sidebar、index 的受管 link 必须检查 cardinality。
- sidebar/index 进入重复 link 检查。
- bounded sidebar parser 不得对受管组中“字段换序/附加字段/未识别对象”静默漏项；可改用 bracket + quoted-field 读取，或对未解析对象显式失败。

### R6 — 收紧共享路径/文件名构造不变量

- `date` 验证为 `YYYY-MM-DD`。
- 文件名片段拒绝 `/`、`\\`、NUL、`.`/`..` 路径段和 Windows 非法文件名字符；research relative path 规范化后仍必须位于 `docs/投资/投研/`。
- 增加 POSIX/Windows traversal 与非法片段单测；不得改变当前合法中文主题、文件名和公开链接。

### R7 — 加强兼容快照

- 用不依赖新 catalog 的冻结 legacy fixture 锁定三类 panel `KINDS` 的完整可观察值与函数结果，避免同源比较假绿。
- 仍需保持现有 `manualPosts` marker、sidebar 字面量与 `weekly.mjs` 写盘协议不变。

## 修复验收（已通过）

1. 上述每个假绿路径都有先红后绿测试；现有 live 仓无需修改公开内容即可通过。
2. `pnpm test:content`、`pnpm test:panel`、normalizer tests、`pnpm docs:build`、`git diff --check` 全部退出码 0。
3. 无新增依赖；无 `eval` / 不受控源码执行；浏览器 bundle 不引入 fs。
4. 执行报告补充修复文件、命令、退出码与剩余风险；派发层独立复验后再次交终验。

## 证据指针

- approved baseline：`docs/agents/phase1-content-contract-collaboration.md`
- 执行报告：`docs/agents/phase1-content-contract-execution-report.md`
- 关键实现：`content-catalog/verify/parity.mjs`、`scan.mjs`、`projections.mjs`、`paths.mjs`
- 首轮独立终验复现重点：opening 全 kind 豁免、未登记文件预过滤、`namedChapterOrder` 未消费、Hermes 模拟双扫描、date/issue 未对等、sidebar/index 重复与顺序未检查、路径片段 traversal。
- 第 1 轮修复报告：`docs/agents/phase1-r1-r7-false-green-repair-report.md`
