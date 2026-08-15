# personal-blog

个人博客「误君在脑海里放烟花」工程说明（源码权威路径登记）。

## 当前权威

| 项 | 值 |
| --- | --- |
| 源码根 | `D:\项目\personal-blog` |
| 远程仓库 | https://github.com/cuowuxuexi/personal-blog |
| 生产 | https://blog.cuowo.win |
| Cloudflare Pages | https://personal-blog-eue.pages.dev（project: `personal-blog`） |

### 权威分层

| 权威类型 | 位置 | 覆盖范围 |
| --- | --- | --- |
| **站点源码权威** | 本仓库 | 代码、主题、可部署公开内容、站点信息架构 |
| **投研来源权威** | 私有投研指挥系统（本机本地索引指向） | 证据、公司事实、战役结论、正式研究视图、质检与认知原件 |

说明：

- 日常开发、主题优化、公开内容落库**只在本仓库**进行，不再依赖 `cxks` 工作区。
- 投研内容的事实与研究结论以私有投研指挥系统为准；博客是**投研前端**，按自身认知与表达逻辑整理公开发布内容。
- 私有绝对路径、本地来源索引和原件冻结副本不进入公开站点内容。
- 本地 Agent 通过 `research-sources.local.yaml`（gitignored）回源；协议见 `docs/agents/research-publishing.md`。
- 所有周记与投研内容都需要人工讨论和发布批准，不做自动同步、自动生成或自动部署。

## 历史来源

| 时间 | 说明 |
| --- | --- |
| 2026-08-09 前后 | 在 `D:\cxks\正在开发的项目\personal-blog` 孵化、上线 |
| 2026-08-10 | 整仓迁出至 `D:\项目\personal-blog`（含 `.git`）；`cxks` 仅保留索引指针与任务档 |
| 2026-08-10 | 确立投研前端边界：私有投研指挥系统为研究权威，本仓为站点与公开发表权威 |

`cxks` 侧任务档（历史计划/验证）：`D:\cxks\任务工作台\T0808-个人博客投资AI生活`（若存在）。

## 本地命令

```bash
pnpm install
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

## 相关文档

| 文件 | 用途 |
| --- | --- |
| `README.md` | 站点约定与操作手册 |
| `CONTEXT.md` | 领域词汇与权威边界 |
| `RESEARCH-FRONTEND.md` | 投研前端分阶段计划 |
| `docs/agents/research-publishing.md` | Agent 回源与发布协议 |
| `docs/adr/0001-research-authority-and-publication-boundary.md` | 架构决策 |
| `panel/` | 发布面板：本地更新投资 / AI与生活周记 |
| `docs/agents/publishing-panel.md` | 发布面板与 agent 的分工 |

更完整的站点约定见 `README.md`。
