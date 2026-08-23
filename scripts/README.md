# scripts

仓库级辅助脚本。站点与面板的日常入口优先使用 `package.json` scripts，本目录记录需要直接执行或被 CI 调用的脚本。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `write-build-metadata.mjs` | 向构建产物写入 `{ sha, builtAt }` 的 `build.json`；CI 和国内发布校验使用 |
| `create-panel-shortcut.ps1` | 在 Windows 桌面创建/更新发布面板快捷方式与图标 |
| `blog-diary-push.sh` | Hermes 历史发布脚本，会 commit + push；协议已停用，只有作者明确恢复并授权发布时才能运行 |

## 子目录

无。

最后更新：2026-08-22
