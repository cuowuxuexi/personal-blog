# 发布面板

本地发布工具。作者用它更新**投资周记**、**AI与生活周记**和「我的AI历程」，不必打开 Cursor。

「我的AI历程」可以像周记一样开新一期（日期文件、主题、封面、说明），也可以维护具名篇章（基础设施篇 / 工具篇 / cli篇 / AI开支记录与优化）的期头和条目。不能从面板创建、重命名或删除具名篇章文件。独立 HTML 不走面板，拷到 `docs/public/html/` 后用 `<StandaloneHtml>` 嵌入。投研页、投资哲学、大问题和大事件等仍走 Cursor / blog-editor；Hermes 日记已于 2026-08-14 停用。

界面风格遵循 `panel/DESIGN.md`（「误君墨纸」设计系统，google-labs `DESIGN.md` 格式）。改面板样式前先读它；改完可用 `npx -y -p "@google/design.md" designmd lint panel/DESIGN.md` 校验。

## 源码导航

| 入口 | 职责 |
| --- | --- |
| `start.mjs` | 启动面板服务、执行本地备份轮转并打开本地页面 |
| `cleanup.mjs` | 本地正文备份与发布快照的手动/启动时清理入口 |
| `server.mjs` | HTTP/静态资源装配；普通路由表和发布 job 路由入口 |
| `public/README.md` | 前端动态区域、稳定 DOM 锚点与文件索引 |
| `lib/README.md` | 内容变更、发布状态机、部署 adapter 与后端文件索引 |
| `*.test.mjs` | 面板测试；`pnpm test:panel` 只扫描 `panel/` 顶层 |

更高层的能力边界与常见任务入口见根 `PROJECT.md`。

## 启动

桌面双击「发布面板」，或在仓库根目录：

```bash
pnpm panel
```

首次创建快捷方式：

```bash
pnpm panel:shortcut
```

会打开 `http://127.0.0.1:4177`，并尽量复用已有的 VitePress 预览（`127.0.0.1:5173`）。

快捷方式图标使用白底增强线稿的 `publishing-panel-white.ico`；重新运行 `pnpm panel:shortcut` 时会自动应用。

## 环境

根目录 `.env`（gitignored），模板见 `.env.example`：

- `CLIPRO_BASE_URL` / `CLIPRO_API_KEY` / `CLIPRO_DEFAULT_MODEL`
- 默认模型：`grok-4.5`
- `PANEL_PRODUCTION_ORIGIN`（默认 `https://cuowo.cn`）
- `PANEL_GUONEI_HOST` / `PANEL_GUONEI_USER` / `PANEL_GUONEI_KEY` / `PANEL_GUONEI_SITE_DIR`：国内机上传。私钥默认识别 `~/.ssh/id_ed25519_servers`

没有 clipro key 也能写周记、维护历程篇章和发布；只是 AI 润色不可用。上传国内站需要 Tailscale 与 SSH 私钥。

## 本地备份保留

面板每次启动会自动轮转 `panel/.local-backups/`，也可在仓库根手动执行：

```bash
pnpm panel:cleanup
```

清理规则保持 fail-closed：当前 HEAD 上 7 天内最多保留最近 10 个 `PreviewReady`，所有进行中任务不动；基线已漂移的预览立即失效；已发布任务保留 2 天，普通失败、中断的 `Preparing`、取消/取代任务和孤儿快照保留 1 天，带 `retry-push` / `retry-verify` 等恢复能力的失败任务保留 7 天。正文修改前备份每篇最多保留最近 10 份，超过 30 天后只保留最新一份。清理会同步删除对应历史任务记录，但不触碰 `drafts.json`、`form-draft.json` 或当前仍可确认的发布快照。

## 发布流程

1. 选栏目 → 可追加 / 开新期 / 改期头 / 点开已有条目修改（开新期或改编号期头时在左栏设置主题、封面和说明）。具名篇章的期头只改封面和说明，不出现「当期主题」，也不会改篇章名。点「开新一期」会清空主题和封面、日期预填今天，避免把当前篇章标题写成新期主题；历程还能选到三个具名篇章。已有条目右侧可删除
2. 可选：AI 润色（左右对照，逐项采用）
3. 保存并生成发布预览：一次完成写入草稿、快速内容校验、从 main HEAD + 本次清单创建隔离快照和生产构建。条目列表刷新和公众号线上图片检查不阻塞预览返回
4. 同一快照同时生成「博客发布前预览」和「公众号预览」；博客预览在 `/release-preview/<jobId>/` 独立 base 下构建，并在开放预览前校验目标文章与编辑锚点没有被渲染成 404；公众号预览可以立即查看，复制门在线上图片检查完成或国内站校验前保持锁定
5. 核对文件清单与两种预览后，确认发布。确认仍是一次点击；长请求期间面板用只读 job 查询展示 `Committing / Pushed / Deploying / VerifyingProduction`
6. 面板提交并 `push main`（海外 Pages 仍会跟着更新），再从同一快照做生产构建并上传到 `cuowo.cn`
7. 轮询国内站 `/build.json`；只有 SHA 对上才显示发布完成
8. 国内站校验成功，或单独确认公众号引用的图片均已在线后，公众号预览页解锁「复制公众号全文」。复制时把快照里的图转成 JPEG 写入剪贴板，不让公众号去拉 WebP

公众号版直接从所选正文 Markdown 快照生成，不另存一份正文。历程篇章沿用 AI与生活周记的视觉主题。预览时图片读取本地快照；复制时写入 JPEG 数据，避免公众号编辑器转存 WebP。上传 WebP 时仍会同时写出同名 JPG 伴生文件并进入发布清单，正文 Markdown 仍只引用 WebP。公众号 HTML 是任务临时产物，不进入 Git 发布清单。

日常发布任务里，周记清单可含当期正文与引用的 `/images/weekly/` 图片；历程清单含恰好一篇 `type: journey` 正文及其实际引用的 `/images/journey/` 图片。站点 posts / 受管 sidebar 由构建期投影派生，面板 `applyDraft` 不再改写 `posts.ts` / `config.mts`。具名篇章改封面/说明不改标题。

完整面板测试由 CI 执行；日常发布前运行面向快照的快速门禁（重复条目、缺失图片、基本结构）和完整 VitePress 构建。VitePress 本地预览每 5 秒检查一次，意外退出后由面板自动恢复。

图片会压到约 1600px 宽的 WebP，按 `YYYY-MM-DD-序号-slug.webp` 写入对应栏目目录：周记进 `docs/public/images/weekly/`，历程进 `docs/public/images/journey/`。上传时由当前栏目决定目录，不能自选任意路径。

最后更新：2026-08-25
