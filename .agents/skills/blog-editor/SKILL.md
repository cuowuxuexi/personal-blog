---
name: blog-editor
description: >-
  Edit this personal blog quickly: add or revise weekly notes, Hermes diary
  entries, research/philosophy pages, homepage copy, navigation, sidebars,
  posts index, VitePress theme components, and CSS. Use when the user adds
  blog content, edits a page, redesigns layout/styles, mentions Design Mode,
  or invokes /blog-editor.
---

# Blog Editor

VitePress 个人博客的统一编辑入口。目标：先做意图路由，再只读相关文件并修改；不要每次宽泛搜索全仓。

权威正文只在本文件。平台目录下的同名 Skill 仅为发现入口。

## When to use

启用本 Skill：

- 显式调用 `/blog-editor`
- 新增或修改博客内容
- 修改页面设计、布局、组件、CSS、响应式
- 修改导航、侧边栏、`posts.ts`、公开资源
- Design Mode 相关页面设计

不替代：

- 投研发布协议：`docs/agents/research-publishing.md`
- 作者本人的周记发布：本地发布面板（`panel/`，`docs/agents/publishing-panel.md`）
- Hermes 专用协议（已停用）：`docs/agents/hermes-diary.md` 与 `docs/AI与生活/Hermes日记/README.md`
- 领域词与 ADR：`CONTEXT.md`、`docs/adr/`

## Startup

1. 判定任务模式（见 Routing）。
2. 按定位顺序确定目标页面/文件。
3. 输出一行路由提示；跨页面或结构性任务输出修改地图。
4. 读取最小相关文件后执行。
5. 按验证规则检查结果。

### Location order

1. Design Mode 当前页面或选中元素
2. 当前打开/正在编辑的文件
3. 用户给出的 URL、标题、文案、截图
4. 本 Skill 路由表
5. 仍有多个候选时，只问一个最小澄清问题

### Routing one-liner examples

```text
已定位为 AI 与生活周记：将修改文章文件、posts.ts 和 AI 侧边栏。
已定位为 Hermes 日记：只追加当天文件，不修改 posts.ts 或侧边栏。
已定位为首页设计：将检查 index.md、首页组件与 style.css。
```

### Modification map (large tasks only)

```text
设计修改地图
- 页面内容：...
- 组件：...
- 样式范围：...
- 可能影响：...
- 验证：1440 / 768 / 390 + docs:build
```

## Routing

| Mode | Trigger | Primary files | Side effects |
| --- | --- | --- | --- |
| `content.weekly-investment` | 投资周记新增/修改 | `docs/投资/周记/*.md` | 更新 `posts.ts` + `/投资/周记/` 侧栏；`/投资/周记/` 经 `LatestWeeklyRedirect` 进最新一期；走投资门禁 |
| `content.weekly-life` | AI与生活周记新增/修改 | `docs/AI与生活/*.md`（非 Hermes） | 更新 `posts.ts` + `/AI与生活/` 侧栏；`/AI与生活/` 经 `LatestWeeklyRedirect` 进最新一期 |
| `content.hermes-diary` | Hermes 日记（**已停用**，除非作者明确要求恢复） | `docs/AI与生活/Hermes日记/YYYY-MM-DD.md` | **禁止**改 `posts.ts` / `config.mts` |
| `content.research-*` | 行业/地图/标的 | `docs/投资/投研/**` | 更新入口、侧栏、硬编码计数/卡片；走投资门禁 |
| `content.philosophy` | 投资哲学 | `docs/投资哲学/**` | 新增主题时更新 nav/sidebar |
| `content.big-question` | 大问题 | `docs/大问题/**` | 路由变化时更新 nav/sidebar |
| `content.about` | 关于 | `docs/关于.md` | 通常无索引副作用 |
| `design.home` | 首页 | `docs/index.md`、`HomeHeroCta.vue`、`HomeRecent.vue`、`style.css` | 检查 `posts.ts` 驱动区块 |
| `design.weekly` | 周记阅读/归档样式 | 周记 md、`CategoryList.vue`、`style.css` | 同时核对 invest/life 修饰类 |
| `design.research` | 投研/哲学视觉 | 研究 md、`style.css` 研究区 | 不把医药实验页当永久全站模板 |
| `design.global-shell` | 顶栏/大纲/布局 | `Layout.vue`、主题组件、`config.mts`、`style.css` | 回归首页/文章/归档/研究页 |
| `navigation-indexing` | 导航/索引 | `config.mts`、`posts.ts`、各 hub | 搜索全部入站链接 |
| `assets` | 图片/字体 | `docs/public/**` + 引用处 | 勿用 `.vitepress/.temp` 当源 |

## Route and path rules

- 站点源根：`docs/`
- `cleanUrls: true`
- `docs/<dir>/index.md` → `/<dir>/`
- `docs/<dir>/<file>.md` → `/<dir>/<file>`
- 链接不写 `.md`；`index.md` 路由保留尾斜杠
- 公开资源：`docs/public/`，引用以 `/` 开头
- 非站点内容：`docs/agents/**`、`docs/adr/**`、所有 `README.md`（`srcExclude`）
- 勿编辑生成物：`docs/.vitepress/dist/`、`.temp/`、`cache/`

### Default pageClass

| Family | pageClass |
| --- | --- |
| 投资周记 | `weekly-post weekly-post--invest` |
| AI与生活周记 | `weekly-post weekly-post--life` |
| Hermes | `weekly-post weekly-post--life hermes-diary-post` |
| 周记归档 | `weekly-archive` + 主题修饰 |
| 行业总览 | `industry-index` |
| 研究地图 | `map-index` |
| 标的/哲学主题 | `subject-index` |
| 大型 hub | `investment-hub` |

## Content workflows

### Weekly notes

1. 文件：
   - 投资：`docs/投资/周记/YYYY-MM-DD-标题.md`
   - 生活：`docs/AI与生活/YYYY-MM-DD.md`（live 惯例；可带标题后缀，但第 001 期起用纯日期）
2. Frontmatter：`title`、`date`、`category`、`type: weekly`、`issue`、`description`、`pageClass`
3. 共用组件：
   - 正文由多条 `<WeeklyEntry>` 组成；组件：`docs/.vitepress/theme/components/WeeklyEntry.vue`
   - 每条：`tag` 或 `tags`（多标签用 `/` 分隔）+ `title` + 独立 `image`（可省）+ 默认 slot 正文；条目内可再插图（连续插图各自单独成段，间距由 CSS 处理）
   - 标签固定显示在条目标题**下方**（主题 CSS，全站周记共用）；不要排到标题右侧
   - 可选标题外链：`link-href` 始终挂主标题（橙色 ↗）。副标题默认纯文本；只有用户明确要求时才加 `subtitle-href`。可选 `subtitle`；可选 `badge-image`（标题下无链接小图）；正文外链可加 class `weekly-ext-link`
   - 条目标题图默认完整显示（`contain`）；照片封面要裁切时才加 `image-fit="cover"`
   - 可选 `date`（`YYYY-MM-DD`）：条目创建日；默认用文章 frontmatter.date。有「展开 / 收起」时，日期出现在按钮右侧，格式 `YYYY年MM月DD日`（月日补零）
   - 右侧大纲：栏目 `##`、条目标题 `###`（组件内标题用 `weekly-outline-only` 同名 `###`）。条目里的长文按普通文章写 `#`/`##`/`###` 即可，构建时自动挂到该条目下；有下级的条目默认收起，只点三角才展开
   - 正文默认约 6 行折叠，超出显示「展开 / 收起」
4. 同步：
   - `docs/.vitepress/posts.ts` 的 `manualPosts`
   - `docs/.vitepress/config.mts` 对应年份侧栏项
5. 创建前检查重复 date/title/link/issue；issue 取同分类最高值 + 1
6. 当前实践：**不要**把研究页自动登记进 `manualPosts`（会进首页最近更新）；仅在用户明确要求时再登记

#### 投资周记结构（固定模板）

权威可复制骨架：`templates/weekly-invest.md`。参考实例：`docs/投资/周记/2026-08-13-看烟花.md`。

版面与 AI 与生活周记同一套（封面、一句说明、「看烟花！！！」栏目、其下多条 `WeeklyEntry`）。差异只在栏目归属与门禁：

- 文件：`docs/投资/周记/YYYY-MM-DD-标题.md`
- `pageClass` 固定：`weekly-post weekly-post--invest`
- 标题风格：`# 第NNN期-主题`（无空格，与生活周记一致；投资与生活各自从 001 起算；开篇约定页不算期数）
- 封面默认复用 `/images/hero-fireworks.png`（与 AI 第001期头图相同）；用户另给封面时再换
- `/投资/周记/` 经 `LatestWeeklyRedirect` 进入最新一期
- 起草正文前过 Gate 1；不编造研究事实或结论；持仓、成本、交易可按作者意愿写入（2026-08-14 起不再默认禁写）
- 保留作者原话与「想法：」/`💡` 标记；不润色成复盘腔

固定骨架与栏目规则同下方「AI与生活周记结构」，只把 `pageClass` / `category` / 文件路径换成投资周记。

#### AI与生活周记结构（固定模板）

权威可复制骨架：`templates/weekly-life.md`。参考实例：`docs/AI与生活/2026-08-12.md`。

固定骨架（自上而下）：

1. `# 第NNN期-主题`（无空格风格与第 001 期一致）
2. 主题封面：`weekly-theme-cover` 图
3. 一句主题说明：`weekly-theme-caption`
4. **唯一栏目分割点**（默认）：
   ```md
   <div class="weekly-fireworks-section">
   ## <img class="weekly-section-icon" src="/images/hero-fireworks.png" alt="" /> 看烟花！！！ {#kan-yanhua}
   ```
5. 栏目下多条 `WeeklyEntry`（每条前放同名隐藏 `###`）
6. 闭合 `</div>`

规则：

- `## 看烟花！！！` 是**主题封面区与正文栏目区的分割点**，不是每条内容的标题
- 默认整期只有这一栏目；栏目下的每个小标题 = 一条 `WeeklyEntry`
- 不要为每条内容再机械加一层 `##`
- 用户未明确要求时，不自行发明第二栏目
- 可选字段按条目需要：`image`、`link-href`、`subtitle`、`subtitle-href`、`badge-image` / `badge-alt`、`date`、`image-fit`；没有就省略。`date` 缺省时用文章 frontmatter 日期；「展开 / 收起」右侧显示创建日期
- 图片放到 `docs/public/images/weekly/`，正文引用以 `/images/weekly/...` 开头
- `pageClass` 固定：`weekly-post weekly-post--life`
- 用户给原始素材即可：主题、封面、主题说明、条目（标题/标签/链接/图片/原文）；由 agent 套模板、编号、索引与轻度润色

大事件记录区在 AI 与生活**左侧栏**，不写进周记正文。文件：`docs/AI与生活/大事件/YYYY.md`；侧栏组名「大事件记录区」，子项「YYYY年大事件」。闭门材料不要把卡量、融资安排和不可再分发原文写进公开页。

#### AI与生活周记润色

对用户手打原文默认执行轻度加工：

- 纠正错别字、标点、病句
- 统一常见产品/模型名称大小写（如 Grok Bot、Cursor、GitHub、Hermes）
- 理顺不流畅句子，去掉明显重复用词
- 保留观点、立场、即时语气与 `💡` 想法标记
- 不改写成正式复盘、总结报告或第三人称评测
- 未要求“重写”时不做大幅改写；核心判断句保持作者立场

### Hermes diary（已停用）

2026-08-14 起默认不再新写。完整历史规则：`docs/AI与生活/Hermes日记/README.md`

- 只写 `docs/AI与生活/Hermes日记/YYYY-MM-DD.md`
- 按天一个文件；末尾追加 `## #N · HH:mm · 类型`
- 不重排已有条目
- 不改 `posts.ts`、`config.mts`、投资内容、主题、CI
- 不写密钥、持仓、私有绝对路径、未脱敏隐私
- `scripts/blog-diary-push.sh` 会 commit + push main；**只有用户明确要求发布时才运行**

### Research and philosophy

投资内容必读：

1. `CONTEXT.md`
2. `docs/agents/research-publishing.md`
3. `docs/adr/0001-research-authority-and-publication-boundary.md`
4. 相关 issue / `RESEARCH-FRONTEND.md`（实验边界）
5. 若存在：`research-sources.local.yaml`（gitignored，直接读）

| Change type | Behavior |
| --- | --- |
| 纯视觉/排版/既有文案呈现 | 可直接执行 |
| 新增或改变研究事实、证据、结论、公开状态 | Gate 1 后再起草 |
| push / deploy | Gate 2 + 用户明确授权 |

Gate 1 最小卡片：

```text
目标：
范围：
页面结构：
实验性还是长期结构：
允许使用的材料：
是否改变公开研究结论：
```

研究页常见副作用：

- `docs/投资/投研/index.md` 计数与列表
- `docs/投资/index.md` 跟踪标的卡片
- 行业 hub / 地图目录链接
- `config.mts` 投研侧栏
- breadcrumb 与相关页链接

医药三页为实验结构，未经 Phase 3 评审不得推广为全站模板。

### Metadata and rewrite policy

可自动推导：

- `date`：本地当天
- `title`：用户标题或正文
- `description`：简洁摘要
- `category` / 目录：用户意图
- `issue`：同分类最高 + 1
- slug：保留中文路径风格

内容加工：

- 默认保留观点、立场、语气
- 可修正病句、错字、Markdown 排版
- 可优化标题、摘要、结构
- 未要求“重写/润色”时不大幅改写
- AI与生活周记：默认执行上文「AI与生活周记润色」的轻度加工
- 不编造投资事实或研究结论

### Fractal README

新建持久化目录时补简洁 `README.md`；增删改文件/子目录时同步所属目录索引。`README.md` 不进公开站点。

## Design workflows

### Autonomy

| Scale | Action |
| --- | --- |
| 文案、颜色、间距、局部样式 | 直接改 |
| 单页结构 | 先修改地图，再执行 |
| 全站视觉语言、导航体系、跨页面组件 | Design Mode 确认方向后再改真实文件 |

### Design Mode loop

1. 定位页面、组件、样式与影响面
2. 给出设计目标与约束
3. Design Mode 探索方向
4. 确认后映射到 Markdown / Vue / CSS
5. 视觉检查 1440 / 768 / 390
6. `pnpm docs:build`

Design Mode 是探索工具；真实源文件是最终事实。

### Style entrypoints

| Concern | Path |
| --- | --- |
| 全局样式 | `docs/.vitepress/theme/style.css` |
| 主题注册 | `docs/.vitepress/theme/index.ts` |
| 布局槽位 | `docs/.vitepress/theme/Layout.vue` |
| 首页 CTA | `docs/.vitepress/theme/components/HomeHeroCta.vue` |
| 首页最近 | `docs/.vitepress/theme/components/HomeRecent.vue` |
| 归档列表 | `docs/.vitepress/theme/components/CategoryList.vue` |
| 文章 meta | `docs/.vitepress/theme/components/PostMeta.vue` |
| 站名菜单 | `docs/.vitepress/theme/components/SiteTitleMenu.vue` |
| 站点配置 | `docs/.vitepress/config.mts` |

设计修改前：

1. 在页面 md 中找出自定义 class
2. 在 `style.css` 中定位这些 class
3. 检查 `700px` / `767px` / `1280px` 附近响应式
4. 优先把新样式挂到 `pageClass` 下，避免污染全局
5. 避免未使用的遗留族：`.investment-index`、`.journal-index`

## Risk gates

直接执行：

- 明确栏目的新文章/日记
- 局部文案
- 局部样式
- 既有页面排版

先停再问：

1. 无法唯一定位目标页面或栏目
2. 可能改变原文核心观点
3. 改变投资研究事实、证据、结论或公开状态
4. 删除、重命名或改变公开路由
5. 大范围调整全站视觉、导航或内容分类
6. 可能覆盖用户已有且无关的修改
7. 需要 commit / push / deploy
8. Design Mode 存在本质不同方向

永不自动：

- commit / push / deploy
- 把私有投研材料写入公开 docs
- 把构建成功描述成视觉检查通过
- 用 `.vitepress/.temp` 资产冒充源资源

## Verification

| Task | Required |
| --- | --- |
| 内容修改 | `pnpm docs:build` |
| 设计修改 | 构建 + 视口检查 |
| 默认视口 | 1440px、768px、390px |
| 全局颜色改动 | 额外检查深浅色（若主题支持） |

若浏览器 / Design Mode 不可用：

1. 仍完成合理代码修改与构建
2. 明确列出未检查页面与视口
3. 不声称视觉已通过

完成后简洁汇报：改了什么、如何验证、剩余限制。

## Self-maintenance

正常任务直接使用本路由表。

仅在以下情况重新探索 live 结构，并在架构职责变化时更新本 Skill：

- 路由表路径不存在
- live 代码与本 Skill 冲突
- 出现新内容类型
- 导航 / 索引 / 主题入口被重构
- 当前任务本身改变博客编辑工作流

普通正文或局部样式修改不要顺手改 Skill。

### Authority order on drift

1. live 源文件与当前兄弟页
2. `config.mts`、`posts.ts`、theme 实现
3. `AGENTS.md`、`CONTEXT.md`、ADR / agents 协议
4. 根 `README.md`（可能滞后）

## Quick commands

本地预览由 Cursor 打开本仓库时自动启动（`.vscode/tasks.json`，`127.0.0.1:5173`）。不要另起一份 `docs:dev`，除非用户说预览打不开。改完文件后热更新即可，不必重启。

```powershell
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

推送到 `main` 会触发生产部署；未经用户明确授权不得推送。
