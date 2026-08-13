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

# 静态构建
pnpm docs:build

# 预览构建产物
pnpm docs:preview
```

开发服务器默认：`http://localhost:5173/`（端口以终端输出为准）。

## 线上地址

| 入口 | URL |
| --- | --- |
| 生产（自定义域） | https://blog.cuowo.win/ |
| Cloudflare Pages | https://personal-blog-eue.pages.dev/ |
| 源码 | https://github.com/cuowuxuexi/personal-blog |

自动部署：push `main` 触发 `.github/workflows/deploy-pages.yml`。仓库需配置 Secrets：

- `CLOUDFLARE_API_TOKEN`（密码本 `cxks-agent-ops`）
- `CLOUDFLARE_ACCOUNT_ID`=`4b4fb1b1a6a89a919d58bfbbf913fd3d`

本机直接发布：

```bash
pnpm docs:build
npx wrangler pages deploy docs/.vitepress/dist --project-name=personal-blog
```

## 目录结构

```text
personal-blog/
  package.json
  README.md
  PROJECT.md                 # 工程权威与路径边界
  CONTEXT.md                 # 领域词汇与投研前端边界
  RESEARCH-FRONTEND.md       # 投研前端分阶段计划
  AGENTS.md                  # Agent 技能入口
  research-sources.local.yaml  # 本地回源索引（gitignore，不进仓库）
  docs/
    index.md                 # 首页（hero 插画 + features + 最近更新）
    关于.md
    投资/
    AI与生活/
    agents/                  # Agent 协议（非站点内容）
    adr/                     # 架构决策
    public/
      fonts/               # FiraCode-VF.woff2（可选保留）
      images/hero-fireworks.png
    .vitepress/
      config.mts             # nav / sidebar / search
      posts.ts               # 文章登记表（首页与板块列表）
      theme/
        Layout.vue           # PostMeta + HomeRecent 插槽
        index.ts
        style.css
        components/
          PostMeta.vue
          HomeRecent.vue
          CategoryList.vue
```

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

## 如何新增文章

1. 在对应板块目录新建 Markdown，文件名建议：`YYYY-MM-DD-标题摘要.md`。  
2. 写好 frontmatter：

```yaml
---
title: 文章标题
date: 2026-08-09
category: 投资   # 或 AI与生活
description: 一句话摘要（首页与板块列表展示）
# cover: /covers/xxx.jpg   # 可选；放到 docs/public/covers/
---
```

3. 正文用 `#` / `##` 组织标题；右侧「本页指引」按 h2–h4 生成大纲。  
4. **同步登记表** `docs/.vitepress/posts.ts`（按 date 倒序插入）。  
5. **同步侧栏** `docs/.vitepress/config.mts` → `themeConfig.sidebar`。  
6. 投资类文章请保留「非投资建议」提示；全站页脚与「关于」页已有总声明。

无 `cover` 时不渲染封面位（避免灰条占位）。有图时用 frontmatter `cover` 指向 `docs/public/` 下路径。

## 如何更新侧栏

文件：`docs/.vitepress/config.mts` → `themeConfig.sidebar`。

- 投资 → `'/投资/'`  
- AI与生活 → `'/AI与生活/'`  

约定：按 `date` 倒序；年份可分组；`link` 与路由一致（无 `.md`）；**不要**跨板块串栏。

## 顶栏与三栏布局

| 区域 | 行为 |
| --- | --- |
| 顶栏搜索 | 本地搜索（「搜索文档」） |
| 顶栏 nav | 「投资」「AI与生活」「关于」 |
| 左栏 | 当前板块时间序列 |
| 中栏 | 文首元信息 + Markdown 正文 |
| 右栏 | 本页指引（outline） |
| 首页 | hero + 双板块卡片（与最近更新同宽）+ **最近更新**列表 |
| 主题 | 明暗切换；浅色蓝系 / 深色黄系 brand |

## 验收相关能力（本轮）

- 双板块路径：`/投资/`、`/AI与生活/`  
- 文章页 `PostMeta`（日期、板块标签、可选 description/cover）  
- 首页 `HomeRecent` + 板块 `CategoryList`（同源 `posts.ts`）  
- 全量思源宋体 CN VF + FiraCode；local search、明暗模式、页脚免责  
- 不包含：Algolia、Giscus、RSS、公网部署、CMS  

## 许可与边界

- 站点代码与自有示例文可自行约定许可。  
- 勿拷贝第三方周刊正文、封面或品牌资产。  
- 勿将密钥写入仓库。  

最后更新：2026-08-10
