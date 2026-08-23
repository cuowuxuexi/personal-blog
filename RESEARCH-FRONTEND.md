# Research frontend plan

Working note for the multi-phase research-frontend work. Durable rules live in `CONTEXT.md`, ADR 0001, and `docs/agents/research-publishing.md`. Execution tickets live in GitHub Issues.

## Parent and phases

| Item | Link | Status |
| --- | --- | --- |
| Parent spec | #1 | open |
| Phase 1 — governance and local source protocol | #2 | done (commit `85fe2cd` + review remediation) |
| Phase 2 — WuXi AppTec research-frontend experiment | #3 | local v1 drafted; UI/content design handoff to Cursor |
| Phase 3 — experiment review and solidification | #4 | blocked by Phase 2 review |

## Settled model

```text
Private research command
  = research authority for evidence, facts, campaigns, formal views

Local source index (gitignored)
  = agent-only page → command/material mapping
  = research-sources.local.yaml
  = resolves the private source root and registry-relative materials locally
  = private absolute paths never enter tracked project docs

Blog research frontend
  = curated public learning path, research maps, subject archives
  = human-gated publication only (two gates)
  = presentation architecture is independent of private campaign folders
```

### Publication gates

1. Discuss goal / scope / structure before drafting
2. Human preview + explicit approval before push / deploy

One approval applies only to that content instance.

### Public maturity labels

- `学习中`
- `持续补充`
- `阶段性完成`
- `已修订`
- `停止维护`

Do not expose private campaign status codes on public pages.

## Phase 1 (done)

Delivered:

- `PROJECT.md` authority split
- `CONTEXT.md` glossary
- ADR 0001
- `docs/agents/research-publishing.md`
- `AGENTS.md` entry for all `docs/投资/` weekly/research content
- VitePress `srcExclude` for `docs/agents/**` and `docs/adr/**`
- local gitignored source index path basis fix

## Phase 2 experiment design (provisional)

### Intent

Build a **local first version** of the research frontend around WuXi AppTec learning path. Recording and thinking aid matter more than polished exhibition. The three-page split is an **experiment**, not a permanent IA.

### Information architecture

```text
docs/投资/投研/医药/
├─ index.md
├─ 研究地图/
│  ├─ index.md
│  ├─ 创新药研发全流程/index.md
│  ├─ CXO与CRDMO/index.md
│  └─ 原研仿制与支付端/index.md
└─ 药明康德/index.md
```

Routes:

| Page | URL |
| --- | --- |
| 医药行业 | `/投资/投研/医药/` |
| 研究地图总览 | `/投资/投研/医药/研究地图/` |
| 创新药研发全流程 | `/投资/投研/医药/研究地图/创新药研发全流程/` |
| CXO 与 CRDMO | `/投资/投研/医药/研究地图/CXO与CRDMO/` |
| 原研、仿制与支付端 | `/投资/投研/医药/研究地图/原研仿制与支付端/` |
| 药明康德档案 | `/投资/投研/医药/药明康德/` |

### Sidebar IA (local experiment)

Sidebar is **industry-first**, not global map/subject pools:

```text
投资                    → 站内板块跳转
医药行业（默认展开）
  行业总览
  研究地图（默认收起）
    地图总览 / 各图
  标的档案（默认收起）
    药明康德 / 后续标的
互联网行业（默认展开）  → 与医药同级；壳已建，地图与标的待补
  行业总览
  研究地图（默认收起）
  标的档案（默认收起）
```

Later industries are **sibling groups** of 医药行业 / 互联网行业, each carrying their own maps + subjects.

Map and subject subgroups use `collapsed: true` so the sidebar stays short. VitePress expands groups that contain the current page.

File layout under `docs/投资/投研/医药/` may still use folders for URLs; presentation nav follows industry ownership, not a flat file tree.

### Page duties (experimental)

| Page | Answers | Does not do |
| --- | --- | --- |
| 创新药研发全流程 | stages from disease problem to commercialization | company conclusions |
| CXO 与 CRDMO | role boundaries + why CRDMO is more than pure manufacturing | valuation / holdings |
| 原研、仿制与支付端 | originator vs generic vs innovative; VBP vs NRDL | company pipelines / holdings |
| 药明康德主页 | why study, current stage, learning path, open questions | full company report, target price |

Shared recognition fields on research pages:

- question
- current stage
- as-of date
- confirmed basics
- current understanding
- open questions
- next research directions
- related maps / subjects
- important revisions

### Visual system (local v1)

Implemented as CSS + HTML blocks in existing research style language:

- process map (`.process-map`)
- relation map (`.relation-map`)
- stage cards (`.map-stage-card`)
- known/unknown cards (`.known-unknown`)
- learning path links (`.learning-path`)
- revision table (`.revision-table`)

No mermaid dependency. No graph database. No generic knowledge-graph engine.

Styles live in `docs/.vitepress/theme/style.css` under research/map sections. Sidebar entries live in `docs/.vitepress/config.mts`.

### Source provenance

Private command: `CMD-000003` 药明康德

Main consulted materials (local index only; never put absolute private paths in public markdown):

- `指挥部/药明康德/材料/知识图谱_00_总图_创新药到CRDMO与竞争格局.md`
- `指挥部/药明康德/材料/知识图谱_01_创新药研发路径.md`
- `指挥部/药明康德/材料/知识图谱_02_CMC与API.md`
- `指挥部/药明康德/材料/知识图谱_03_CXO到CRDMO关系.md`
- `指挥部/药明康德/材料/知识图谱_04_CRDMO商业模式.md`

Local index file: `research-sources.local.yaml` (gitignored)

### Current local v1 status

- Content + layout shell drafted locally
- `pnpm docs:build` previously passed for these routes
- **Not published** (no push/deploy authorization)
- User will continue **layout + content design in Cursor**

### Open design questions for Cursor pass

1. Information density: too dense / too sparse?
2. Keep three-page split, merge, or rename?
3. Are process/relation maps sufficient, or need stronger visual hierarchy?
4. Should WuXi homepage carry more company framing, or stay path-only?
5. Mobile breakpoints for map cards / process steps
6. Whether research-map pages should use article outline more aggressively
7. Typography / spacing alignment with weekly reading mode

## Phase 3 review questions

- Keep research-map + subject-archive as the default model?
- Which recognition fields and visual components are worth standardizing?
- What becomes default for later companies?
- What remains historical experiment only?

## Explicit non-goals for early phases

- auto-sync from private research
- public campaign status boards
- second research database inside the blog
- graph database / full knowledge-graph platform
- default portfolio disclosure
- putting private absolute paths into public docs
- treating this experiment as permanent IA without Phase 3 review

## Handoff artifact

Cursor handoff prompt: `docs/agents/handoff-phase2-research-ui.md`

最后更新：2026-08-10
