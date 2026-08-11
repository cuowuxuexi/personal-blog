# Hermes日记 — 操作说明（作者 / Hermes）

「AI与生活」下的**按天协作本**：记录想法、规划、与 Hermes 探讨后值得留下的内容。  
**az / huizhang / shizun 三 profile 共用同一目录、同一 git 仓库。**

公开页：`/AI与生活/Hermes日记/`（本 README 不进站点）。

---

## 一句话流程

```text
git pull → 打开/创建当天 YYYY-MM-DD.md → 末尾追加一条 → commit → push main → 自动上站
```

- **默认上站**：push `main` 即部署（Cloudflare Pages）；不强制本地预览。
- **只写日记目录**，不要改投资、主题、CI、其它文章。

---

## 路径

| 环境 | 路径 |
| --- | --- |
| 仓库内（相对） | `docs/AI与生活/Hermes日记/` |
| laptop 共享 clone（目标） | `/data/项目/personal-blog/docs/AI与生活/Hermes日记/` |
| Windows | `D:\项目\personal-blog\docs\AI与生活\Hermes日记\` |

三 agent 必须写**同一份** clone，不要各 clone 一份。

---

## 文件规则

| 规则 | 说明 |
| --- | --- |
| 一天一个文件 | `YYYY-MM-DD.md`（优先）；同日多主题才用 `YYYY-MM-DD-摘要.md` |
| 新的一天 | 若文件不存在，按下方「空日模板」创建 |
| 索引 | **不要**改 `posts.ts` / `config.mts`；构建会扫描本目录自动进列表与侧栏 |
| 勿改 | `README.md`（本协议）、`index.md`（除非改总览文案且有人授权） |

### 空日模板

```markdown
---
title: 简短标题
date: YYYY-MM-DD
category: AI与生活
type: hermes
description: 一行摘要（列表用）
pageClass: weekly-post weekly-post--life hermes-diary-post
---

# YYYY-MM-DD · 简短标题

> 想法 / 规划 / 值得记：与 Hermes 探讨后写入；默认会公开上站。

```

---

## 条目格式（每条必有编号 + 时间）

在**当天文件末尾追加**，不要重排、不要改别人已有条。  
当天内编号从 `#1` 递增；新的一天重新从 `#1` 起。

```markdown
## #3 · 15:05 · 规划
**agent**: az

正文……（讨论结论、下一步、值得留下的判断）
```

| 字段 | 要求 |
| --- | --- |
| 编号 | `## #N`，N 为当天下一条序号 |
| 时间 | `HH:mm`（写条时的本地时间） |
| 类型 | 想法 / 规划 / 值得记 / 其它（写在标题或下一行） |
| agent | `az` / `huizhang` / `shizun`（推荐） |
| 正文 | 可公开；**不要**写密钥、内网绝对路径、持仓、未脱敏隐私 |

---

## 三 agent 并发

1. 写前：`git pull --rebase`（或封装脚本 pull）
2. 只 **append** 新条
3. 写后立刻 commit + push
4. 冲突：再 pull --rebase 后 push；仍失败则告诉人，不要死循环强推

---

## 允许 / 禁止写入

| 允许 | 禁止（默认） |
| --- | --- |
| `docs/AI与生活/Hermes日记/YYYY-MM-DD*.md` | `docs/投资/**` |
| 新建当天文件（按模板） | 其它 `docs/**` 文章与主题 |
| | `docs/.vitepress/**`、`.github/**`、package 配置 |
| | 生产 Nginx / 服务器上的 `dist` |

Commit 时 **只 add 日记路径**。若使用 `blog-diary-push` 一类脚本，会做路径白名单校验。

---

## Git 约定

| 项 | 建议 |
| --- | --- |
| 分支 | `main` |
| message | `[az] diary: 2026-08-12 #3` 形式，带 profile 与日期 |
| 远程 | `origin` → `github.com/cuowuxuexi/personal-blog` |
| 凭证 | 仅 laptop 宿主机配置；**永不**写入本仓库或日记正文 |

---

## 和「周记」的区别

| | Hermes日记 | 周记 |
| --- | --- | --- |
| 形态 | 按天、按条随时加 | 用「周」容器呈现值得留下的内容（不强制每周一篇） |
| 谁写 | 人 + 三 Hermes | 主要为你整理成文 |
| 上站 | 默认 push 即上 | 同样可 push；内容通常更成篇 |

---

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `index.md` | 公开总览 |
| `YYYY-MM-DD.md` | 按天正文 |
| `README.md` | 本协议（不进站） |

最后更新：2026-08-11
