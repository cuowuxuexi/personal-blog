# 误君在脑海里放烟花

个人博客站点（slug: `personal-blog`）。双主题：**投资**、**AI与生活**。基于 VitePress 1.6.x，本地开发、静态构建。

阅读体验对齐 VitePress 默认三栏骨架与参考周刊主题手法（磨砂顶栏、橙系正文链、引用装饰条、大纲激活高亮、图片点击放大）；站名与品牌为「误君在脑海里放烟花」。字体策略为**自托管全量思源宋体 CN VF（~10MB）+ FiraCode**。不搬第三方内容与评论/订阅组件。

> 本站投资相关内容**非投资建议**，仅供学习交流。

## 快速开始

```bash
# 依赖（推荐 pnpm；无 pnpm 可用 npm install）
pnpm install

# 本地开发
pnpm docs:dev

# 发布面板（两类周记 + 我的AI历程，无需打开 Cursor）
pnpm panel
pnpm panel:shortcut   # 首次：在桌面创建快捷方式

# 静态构建
pnpm docs:build

# 预览构建产物
pnpm docs:preview
```

开发服务器默认：`http://localhost:5173/`（端口以终端输出为准）。

## 线上地址

| 入口 | URL |
| --- | --- |
| 国内站（备案） | https://cuowo.cn/ |
| 海外备份（自定义域） | https://blog.cuowo.win/ |
| Cloudflare Pages | https://personal-blog-eue.pages.dev/ |
| 源码 | https://github.com/cuowuxuexi/personal-blog |

自动部署：push `main` 触发 `.github/workflows/deploy-pages.yml`，只更新 Pages / `blog.cuowo.win`。发布面板确认发布时会额外把同一快照的生产构建传到 guonei（`https://cuowo.cn`）。手动上传见 `ops/腾讯云备案与博客接入-Cursor操作说明.md`。仓库需配置 Secrets：

- `CLOUDFLARE_API_TOKEN`（密码本 `cxks-agent-ops`）
- `CLOUDFLARE_ACCOUNT_ID`=`4b4fb1b1a6a89a919d58bfbbf913fd3d`

本机直接发布：

```bash
pnpm docs:build
npx wrangler pages deploy docs/.vitepress/dist --project-name=personal-blog
```

## 源码导航

| 入口 | 用途 |
| --- | --- |
| `PROJECT.md` | 六个能力的源码地图、依赖方向、常见任务与验证入口 |
| `content-catalog/` | 共享 ContentKind 合同（站点 / 面板 / 验证器） |
| `CONTEXT.md` | 领域词汇、权威边界、最新一期/最近更新等语义 |
| `docs/adr/` | 已接受的长期架构决策 |
| `docs/.vitepress/README.md` | VitePress 配置、内容查询、主题组件与构建插件索引 |
| `docs/public/html/` | 先做好的独立 HTML；嵌进文章用 `<StandaloneHtml>` |
| `panel/README.md` | 发布面板使用说明与源码入口 |
| `panel/lib/README.md` | 发布面板后端能力索引 |
| `panel/public/README.md` | 发布面板前端 DOM 与模块索引 |
| `scripts/README.md` | 预览探活、独立 HTML 链接合同、构建元数据、快捷方式与历史发布脚本 |
| `.agents/skills/blog-editor/SKILL.md` | 公共内容和站点设计的 Agent 意图路由 |
| `docs/agents/` | 发布、投研与协作协议；不进入公开站点 |

## 投研内容工作流（作者）

投资板块是**投研前端**：记录研究成果、学习路径、研究思路和投资思路，而不是把私有投研指挥系统原样公开。

1. 研究与取证在私有投研指挥系统中进行。  
2. 准备发到博客时，先讨论页面目标、范围和结构。  
3. Agent / 作者按 `docs/agents/research-publishing.md` 回源并本地起草。  
4. 本地 `pnpm docs:dev` / `docs:preview` 检查。  
5. 你明确批准后，才 push / 部署。  

本地来源索引 `research-sources.local.yaml` 只给本机 Agent 使用，不进 Git，也不进网站。  
分阶段计划见 `RESEARCH-FRONTEND.md` 与 GitHub Issues `#1`–`#4`。  
Phase 2 版面/内容设计交接（Cursor）：`docs/agents/handoff-phase2-research-ui.md`。

## 发布面板（两类周记 + 我的AI历程）

投资周记、AI与生活周记，以及「我的AI历程」的按期新开与既有篇章更新，走本地**发布面板**：选栏目、填标题/正文/图/链接，可选 AI 润色，同时预览博客页面与公众号排版；生产版本校验成功，或单独检查确认引用图片均已在线后，可一键复制公众号富文本。历程可以像周记一样开新一期并设置封面；具名篇章文件的新增、重命名或删除仍走 Cursor。

```bash
pnpm panel
```

桌面快捷方式：`pnpm panel:shortcut`。clipro 配置放根目录 `.env`（见 `.env.example`）。协议：`docs/agents/publishing-panel.md`。投研页、投资哲学和大问题等仍在维护的其它栏目走 Cursor / blog-editor；Hermes 日记已于 2026-08-14 停用，仅保留历史页面。

## 如何新增文章

先按 `.agents/skills/blog-editor/SKILL.md` 选择内容类型；不同内容域的 frontmatter、索引副作用和研究门禁并不相同。基础步骤：

1. 在对应板块目录新建 Markdown，并按该内容类型填写 frontmatter：

```yaml
---
title: 文章标题
date: 2026-08-09
category: 投资   # 或 AI与生活
description: 一句话摘要（首页与板块列表展示）
# cover: /covers/xxx.jpg   # 可选；放到 docs/public/covers/
---
```

2. 正文用 `#` / `##` 组织标题；右侧「本页指引」按 h2–h4 生成大纲。
3. 周记与「我的AI历程」只维护 Markdown/frontmatter 和引用资产；`posts.ts` 与受管 sidebar 由 `content-catalog` 在开发/构建期投影，**不要手工登记**。
4. 投研、投资哲学和大问题等尚未接入该投影的内容，按 Skill 对应分支维护当前 hub/sidebar，并遵守各自门禁。
5. 运行与内容类型相称的验证；周记/历程至少运行 `pnpm test:content` 和 `pnpm docs:build`。

投资类文章请保留「非投资建议」提示；全站页脚与「关于」页已有总声明。无 `cover` 时不渲染封面位；有图时用 frontmatter `cover` 指向 `docs/public/` 下路径。

## 侧栏与内容目录

- 周记与「我的AI历程」：由 Markdown/frontmatter + typed IA 投影，入口见 `content-catalog/`；不要为登记条目手改 `posts.ts` 或受管 sidebar。
- 投研、投资哲学、大问题及其它未投影结构：仍以 blog-editor 对应分支列出的 live hub 与 `docs/.vitepress/config.mts` 为准。
- 所有公开链接均不带 `.md`，且不得跨板块串栏。

## 顶栏与三栏布局

| 区域 | 行为 |
| --- | --- |
| 顶栏搜索 | 本地搜索（「搜索文档」） |
| 顶栏 nav | 「投资哲学档」「大问题」「关于」；投资与 AI与生活从首页入口进入 |
| 左栏 | 当前板块时间序列 |
| 中栏 | 文首元信息 + Markdown 正文 |
| 右栏 | 本页指引（outline） |
| 首页 | hero + 双板块卡片（与最近更新同宽）+ **最近更新**列表 |
| 主题 | 明暗切换；浅色蓝系 / 深色黄系 brand |

## 验收相关能力（本轮）

- 双板块路径：`/投资/`、`/AI与生活/`  
- 普通文章页 `PostMeta`；周记、Hermes 与历程使用各自版式
- 首页 `HomeRecent` + 板块 `CategoryList`（同源 `posts.ts`）  
- 全量思源宋体 CN VF + FiraCode；local search、明暗模式、页脚免责  
- 不包含：Algolia、Giscus、RSS、CMS

## 许可与边界

- 站点代码与自有示例文可自行约定许可。  
- 勿拷贝第三方周刊正文、封面或品牌资产。  
- 勿将密钥写入仓库。  

最后更新：2026-08-24
