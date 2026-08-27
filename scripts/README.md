# scripts

仓库级辅助脚本。站点与面板的日常入口优先使用 `package.json` scripts，本目录记录需要直接执行或被 CI 调用的脚本。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `write-build-metadata.mjs` | 向构建产物写入 `{ sha, builtAt }` 的 `build.json`；CI 和国内发布校验使用 |
| `publish-guonei.mjs` | 构建并上传 cuowo.cn；不 commit/push。作者说「上传」且站点改动已提交后跑 `pnpm publish:guonei` |
| `preview-ready.mjs` | 探 5173 是否可连（`127.0.0.1` / `localhost` / `::1`）；`pnpm preview:ready` |
| `check-standalone-html.mjs` | 独立 HTML 面包屑与站内链接合同；按 `<base>` 解析后的 `URL.hash` 验锚点；`pnpm check:html` |
| `create-panel-shortcut.ps1` | 在 Windows 桌面创建/更新发布面板快捷方式与图标 |
| `blog-diary-push.sh` | Hermes 历史发布脚本，会 commit + push；协议已停用，只有作者明确恢复并授权发布时才能运行 |

## 子目录

无。

最后更新：2026-08-27
