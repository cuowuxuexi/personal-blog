# T3 交付报告：内容对等校验

outcome: succeeded  
task: task_410a412220f4  
dispatch: ctx_d788601fda02  
date: 2026-08-22

## 改动摘要

新增 Node-only `content-catalog/verify/`：按 T1 合同扫描受管 Markdown，有界解析 `posts.ts` / `config.mts`（不 eval），检查 file ↔ posts ↔ sidebar 对等、issue/link 唯一、Hermes 误登记、缺图、research 可见性。未改公开内容、sidebar、发布语义或 `package.json`。

## 文件列表

- `content-catalog/verify/parity.mjs`
- `content-catalog/verify/scan.mjs`
- `content-catalog/verify/projections.mjs`
- `content-catalog/verify/frontmatter.mjs`
- `content-catalog/verify/brackets.mjs`
- `content-catalog/verify/exceptions.mjs`
- `content-catalog/verify/fixture-repo.mjs`
- `content-catalog/verify/README.md`
- `content-catalog/parity.live.test.mjs`
- `content-catalog/parity.fixture.test.mjs`
- `content-catalog/README.md`
- `docs/agents/phase1-t3-content-parity-report.md`（本报告）

## 验证

```bash
node --test content-catalog/catalog.test.mjs content-catalog/parity.live.test.mjs content-catalog/parity.fixture.test.mjs
```

11/11 pass。未添加根脚本 `test:content`（T4）。未 commit / push / deploy。

## fixture 红绿证据

`parity.fixture.test.mjs` 对同一 fixture 依次注入六类违约并恢复：三写漂移、重复 issue、重复 link、Hermes 写入 manualPosts、缺图、research 进入 manualPosts/最近更新。每种先 `ok === false` 且命中对应 code，再写回 good fixture 后 `ok === true`。

## live 结果

`checkContentParity(仓库根)` 通过。例外表 `CONTENT_PARITY_EXCEPTIONS` 为空，无 warning。当前仓无 research/hermes manualPosts；投资开篇缺 issue 按合同允许；历程无日期期数，年份侧栏空对空。未发现需改公开内容的真实漂移，故未 escalation。

## 自审证据

Cursor 新鲜 native verifier（generalPurpose，非 /check-work）verdict **PASS**。确认：不 eval config、核心 `index.mjs` 不导入 verify/fs、未改公开内容转绿、单一例外表、六类 fixture 红绿、live 通过。审查备注已吸收：`uniqueLink` 按源分桶检查；Hermes glob/fs 改为两条真实 listing。

## 偏差

无目标/非目标偏差。历程日期期数当前不存在，对等为空集合。`issueOptionalForOpening` 仍按「缺 issue 即可」处理，未再收窄到只允许开篇（live 开篇已覆盖）。

## 遗留

- T4：`pnpm test:content` 接线、`docs:build` 与工程地图收口。
- 可选：把 `issueOptionalForOpening` 收窄为仅开篇；把 uniqueLink 扩到跨源碰撞。
