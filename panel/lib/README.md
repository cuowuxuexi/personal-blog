# panel/lib

发布面板后端能力层。`server.mjs` 负责 HTTP 装配，本目录拥有内容变更、发布任务、外部系统 adapter、校验与持久化。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `context.mjs` | 创建面板运行上下文，装配路径、store、probes 与 supervisor |
| `repo-paths.mjs` | 栏目 `KINDS`、capability 和仓库路径的后端权威；KINDS 由 adapter 组装 |
| `content-kind-adapter.mjs` | 面板 `life` / `invest` / `journey` → `content-catalog` 的窄 adapter；UI copy 留在本层 |
| `paths.mjs` | 默认仓路径、环境变量、日期/期号辅助与兼容导出 |
| `weekly.mjs` | 周记/历程解析、条目/期头变更与原子写盘（Wave D：只写 Markdown；posts/config 字符串手术已停用） |
| `atomic-write.mjs` | 多目标原子写入与失败回滚 |
| `images.mjs` | 按栏目压缩并保存周记/历程图片；WebP 旁写出公众号用的 JPEG 伴生文件 |
| `content-validation.mjs` | 发布快照的重复条目、图片与基本结构校验 |
| `publish.mjs` | 从正文收集实际引用的发布图片 |
| `scope.mjs` | 发布文件白名单、黑名单与 journey 清单约束 |
| `publish-job.mjs` | 发布任务门口：确认编排、只读问进度、继续核对、重试 |
| `publish-job-record.mjs` | 任务记录、公开 DTO、中断恢复、公众号查图与快照路径 |
| `prepare-publication.mjs` | 准备发布：清单、隔离快照、双预览、确认令牌；不动 Git |
| `execute-publication.mjs` | 执行发布：提交并推送，停在已推送 |
| `production-check.mjs` | 上线核对：上传国内站并对 SHA |
| `probes.mjs` | Git、job-scoped preview base、根 SSR 合并、纯根生产候选持久化、目标页/锚点校验、push、部署与生产 HTTP 等默认外部 adapter |
| `git.mjs` | Git 命令封装 |
| `guonei.mjs` | 国内站构建元数据、生产候选契约、SHA-256 清单增量上传、全量回退与目录原子替换 |
| `wechat.mjs` | 公众号预览 HTML 与剪贴板 payload 生成 |
| `preview-nav.mjs` | 发布预览文章位置与 hash 导航 |
| `vitepress-supervisor.mjs` | 本地 VitePress 预览进程保活 |
| `polish.mjs` | clipro 模型发现与条目润色 |
| `form-draft.mjs` | 服务端表单草稿备份读写 |
| `json-store.mjs` | JSON 文件持久化 store |
| `hash.mjs` | 哈希、ID 与确认 token |
| `redact.mjs` | 日志/错误信息脱敏 |

## Behavioral warnings

- `POST /api/draft` 当前调用 `applyDraft()`，会立即原子写工作区，并非纯内存草稿。
- `preparePublication()` 在线上图片 probe 完成前就返回 `PreviewReady`；公众号复制门保持锁定。检查在后台继续，经 `publish-job-record` 的 in-memory 互斥幂等继续/重试，不把 Promise 写入 job JSON。
- `confirmPublication()` 仍一次点完：先执行发布，再上线核对。长请求期间 UI 用 `getPublication()` 展示真实阶段。
- `getPublication()` 只读，不上传、不对国内站 SHA。核对未结束由 `continueVerify()` 推进；面板在确认请求结束后才自动发 `POST .../continue-verify`。
- 准备 / 执行 / 上线核对分别在 `prepare-publication.mjs`、`execute-publication.mjs`、`production-check.mjs`。Git、构建、SSH 仍走现有 `probes`，不新套一层。
- `weekly.mjs` 仍较宽；改发布阶段先进入对应深模块。
- job 级 release preview 必须保留双构建：先生成根路径 SSR，再生成 `/release-preview/<jobId>/` base 的客户端资源，并把根 SSR app 区合入后者。它规避 Windows + VitePress 非根 base 可能生成 `NotFound` SSR 壳的问题；不要在缺少目标页、锚点和资源前缀回归测试时简化为单次构建。合并时跳过 `public/` 拷进 dist 的独立 HTML（没有 VitePress app 壳），不要把它们当成 SSR 页。
- 非根预览的第一次根构建必须在合并前原样持久化为快照内 `.panel-production-candidate`。该目录是未 merge 的纯根产物，不能带 `/release-preview/` 前缀，也不能写入预览 `build.json`。确认发布时 `prepareProductionDist` 先检查该候选：有效则只复制到 `.panel-production-dist` 并注入生产 `build.json`，跳过第三次 `docs:build`；缺失、损坏、带预览前缀或带预览 meta 时 fail-closed 回退现有根构建。生产准备后必须恢复 live `docs/.vitepress/dist` 的 release-preview 产物，绝不能把 prefixed/merged 预览上传生产。
- 国内站上传先写快照内 `.panel-dist-manifest.json`（SHA-256 文件清单）。远端清单可读且与 `build.json` / 预期基线 SHA 一致时，只打包 changed/new，远端 `cp -a` 当前站点到 `.new` 后覆盖增量、按清单删除，再沿用 `.new → 原子替换`。缺清单、解析失败、路径不安全、基线不匹配或增量准备/SSH 失败时 fail-closed 回退现有全量 tar。清单路径拒绝绝对路径、`..`、换行和命令注入；打包排除 `release-preview/` 与 `.panel-*` 候选/预览元数据。不要求 rsync。

## Tests

测试固定放在 `panel/*.test.mjs`，因为 `pnpm test:panel` 的 glob 不扫描本目录。定向运行时从仓库根使用 `node --test panel/<name>.test.mjs`。

## 子目录

无。

最后更新：2026-08-25
