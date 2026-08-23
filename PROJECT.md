# personal-blog 工程地图

本文件是仓库级架构与源码导航入口。只在 `AGENTS.md` 的直接分支没有命中，或任务涉及部署/跨能力边界时读取；普通内容与设计任务直接从 blog-editor Skill 进入。领域词汇见 `CONTEXT.md`，操作方法见对应协议和 Skill。

## 阅读顺序

| 需要知道什么 | 权威入口 |
| --- | --- |
| 如何启动、预览和使用博客 | `README.md` |
| 项目领域词与权威边界 | `CONTEXT.md` |
| 难以逆转的架构决定 | `docs/adr/` |
| 当前模块和源码入口 | 本文件 |
| 某类内容或发布任务怎么做 | `docs/agents/` 与 `.agents/skills/blog-editor/SKILL.md` |
| Agent-first 模块化实施阶段 | `docs/agents/agent-first-modularization.md` |

## 部署表面

| 表面 | 地址 / 入口 | 所有者 |
| --- | --- | --- |
| 国内站（备案） | https://cuowo.cn | 发布面板确认后的国内部署 |
| 海外备份 | https://blog.cuowo.win | `main` → Cloudflare Pages |
| Cloudflare Pages | https://personal-blog-eue.pages.dev | `.github/workflows/deploy-pages.yml` |
| 本地站点预览 | `pnpm docs:dev` | VitePress |
| 本地发布面板 | `pnpm panel` | `panel/` |

站点源码、主题和可部署公开内容以本仓库为权威。投研事实、证据和正式研究结论以私有投研指挥系统为权威，本地回源只通过 gitignored 的 `research-sources.local.yaml`。

## 六个能力

| 能力 | 对外接口 | 当前源码入口 | 拥有的事实 |
| --- | --- | --- | --- |
| **内容创作** | 新增或修改一种公开内容 | `docs/**/*.md`、`.agents/skills/blog-editor/`、`docs/agents/research-publishing.md` | 正文、frontmatter、作者叙事、发布门禁 |
| **内容目录 / 信息架构** | 按内容类型查询列表、最新一期、导航和结构关系 | `content-catalog/`（共享合同）、`docs/.vitepress/posts.ts`、`docs/.vitepress/config.mts`、`panel/lib/repo-paths.mjs` | 内容类型、导航分组、顺序、可见性；周记/历程已按 ADR 0002 接入构建期投影 |
| **站点呈现** | 把内容目录和 Markdown 渲染为公开页面 | `docs/.vitepress/theme/index.ts`、`Layout.vue`、`theme/components/`、`theme/style.css` | 页面组件、布局、交互、视觉与响应式 |
| **发布面板** | 作者在本地编辑周记/历程并准备、确认发布 | `panel/start.mjs`、`panel/server.mjs`、`panel/public/`、`panel/lib/` | 编辑会话、工作区内容变更、发布任务交互 |
| **发布部署** | 从已确认快照提交、推送、部署并校验生产 SHA | `panel/lib/publish-job.mjs`、`probes.mjs`、`guonei.mjs`、`.github/workflows/`、`ops/` | 发布状态、Git/构建/网络副作用、双站部署 |
| **Agent 导航** | 把自然语言任务路由到正确能力、协议、源码和验证 | `AGENTS.md`、本文件、`docs/agents/`、`.agents/skills/` | 路由条件、红线、源码地图和最小验证指针 |

> 周记与「我的AI历程」已完成去三写：Markdown/frontmatter 是内容身份真源，`posts.ts` 与受管 sidebar 由构建期投影生成。投研、投资哲学、大问题等尚未接入投影的内容仍可能需要维护 hub/sidebar；以 blog-editor Skill 的当前副作用表为准。

## 任务路由

| 用户意图 | 首读 | 常见实现入口 | 最小验证 |
| --- | --- | --- | --- |
| 新增/修改周记、历程、投研或其它正文 | blog-editor Skill 的 Routing；投资内容再读对应协议 | 目标 Markdown；周记/历程目录自动投影，其它内容域按 Skill 维护 live hub/sidebar | `pnpm test:content` + `pnpm docs:build`；面板相关再跑 `pnpm test:panel` |
| 修改首页、文章布局或组件 | blog-editor Skill 的 design 路由 | `docs/index.md`、`theme/components/`、`Layout.vue` | `pnpm docs:build` + 目标视口检查 |
| 先做好独立 HTML 再嵌进文章/单独打开 | `docs/public/html/README.md` | 拷进 `docs/public/html/<名字>/`；正文 `<StandaloneHtml src="/html/<名字>" />` | 直开 `/html/<名字>`；从文章点「单独打开」应新开完整 HTML，不是 VitePress 404 |
| 修改某类页面样式 | 目标页面 `pageClass` | `docs/.vitepress/theme/style.css` 对应段 | `pnpm docs:build` + 1440/768/390 检查 |
| 修改栏目、侧栏、最近更新或最新一期 | 内容目录 / 信息架构能力 | 先读 `content-catalog/`；`posts.ts` / `config.mts` 是站点消费者，面板经 adapter 消费同一合同 | `pnpm test:content`；接线后还要 `pnpm docs:build` + 相关面板测试 |
| 修改发布面板字段或交互 | `panel/README.md` → `panel/public/README.md` | `panel/public/index.html`、`app.js`、相关 `public/*.mjs` | 定向 `node --test panel/<feature>.test.mjs` |
| 修改发布清单、确认、推送或国内部署 | 发布面板协议与 `ops/` runbook | `panel/lib/publish-job.mjs`、`scope.mjs`、`probes.mjs`、`guonei.mjs` | 定向测试 + `pnpm test:panel` |
| 修改 Agent 规则或源码导航 | 本文件、`docs/agents/README.md` | `AGENTS.md`、Skill、协议、目录 README | 检查每项事实只有一个权威入口 |

## 依赖方向

```text
内容创作 ──► 内容目录 / 信息架构 ──► 站点呈现
    ▲                 ▲
    │                 │
发布面板 ──────────────┘
    │
    └──► 发布部署（只消费已确认快照）

Agent 导航只指向以上能力，不拥有它们的产品事实。
```

约束：

- 内容创作不直接拥有导航投影。
- 站点呈现只消费内容目录，不读取发布面板状态。
- 发布面板只编辑获准的内容类型；投研门禁不因共享内容模型而放宽。
- 发布部署的 Git、构建和网络操作必须是显式副作用。
- Agent 文档只保存无法从代码直接看出的规则、理由和入口，不缓存可轻易查询的实现细节。

## 当前验证入口

```bash
pnpm test:content
pnpm test:panel
pnpm docs:build
```

内容合同与 file ↔ posts ↔ sidebar 对等用 `pnpm test:content`。面板用 `pnpm test:panel`。VitePress 标题/公式归一化用 `node --test docs/.vitepress/normalize-math.test.mjs docs/.vitepress/normalize-weekly-headings.test.mjs`。视觉修改还需检查 1440px、768px、390px。统一 `pnpm verify` 和浏览器 smoke 仍属后续阶段，落地前不得声称已存在。

## 不变量

- 公开 URL、正文观点、整体视觉、发布门禁和双站部署模型默认保持不变。
- 「我的AI历程」是 AI与生活下的独立系列：生活侧栏只保留系列入口，历程侧栏由 typed IA 投影具名篇章和日期期数。
- 面板发布、commit、push、部署始终需要作者显式确认。
- 私有绝对路径、凭据、工作底稿和不可再分发材料不进入公开文档。
- 当前工作区存在未提交功能修改时，结构迁移先等待该功能基线稳定，不覆盖或整理无关改动。

最后更新：2026-08-24
