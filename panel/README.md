# 发布面板

本地周记发布工具。作者用它更新**投资周记**和 **AI与生活周记**，不必打开 Cursor。

投研页、哲学、大问题等仍走 Cursor / blog-editor。

界面风格遵循 `panel/DESIGN.md`（「误君墨纸」设计系统，google-labs `DESIGN.md` 格式）。改面板样式前先读它；改完可用 `npx -y -p "@google/design.md" designmd lint panel/DESIGN.md` 校验。

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

没有 key 也能写周记和发布；只是 AI 润色不可用。

## 发布流程

1. 选栏目 → 追加 / 开新期 / 点开已有条目修改；已有条目右侧可删除
2. 可选：AI 润色（左右对照，逐项采用）
3. 保存并生成发布预览：一次完成写入草稿、快速内容校验、从 main HEAD + 本次清单创建隔离快照和生产构建
4. 核对文件清单与发布前预览后，确认发布
5. 面板轮询自定义域名的 `build.json`；只有线上 SHA 对上才显示发布完成

完整面板测试由 CI 执行；日常发布前运行面向周记快照的快速门禁（重复条目、缺失图片、基本结构）和完整 VitePress 构建。VitePress 本地预览每 5 秒检查一次，意外退出后由面板自动恢复。

图片会压到约 1600px 宽的 WebP，按 `YYYY-MM-DD-序号-slug.webp` 写入 `docs/public/images/weekly/`。

最后更新：2026-08-15
