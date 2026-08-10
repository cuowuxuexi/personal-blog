# Research frontend plan

Working note for the multi-phase research-frontend work. Durable rules live in `CONTEXT.md`, ADR 0001, and `docs/agents/research-publishing.md`. Execution tickets live in GitHub Issues.

## Parent and phases

| Item | Link |
| --- | --- |
| Parent spec | #1 |
| Phase 1 — governance and local source protocol | #2 |
| Phase 2 — WuXi AppTec research-frontend experiment | #3 |
| Phase 3 — experiment review and solidification | #4 |

## Settled model

```text
Private research command
  = research authority for evidence, facts, campaigns, formal views

Local source index (gitignored)
  = agent-only page → command/material mapping

Blog research frontend
  = curated public learning path, research maps, subject archives
  = human-gated publication only
```

## Phase 1 scope

- project authority boundary
- domain glossary
- ADR
- agent publishing protocol
- local source index + gitignore
- no research article bodies
- no push/deploy unless later requested

## Phase 2 experiment (provisional)

Under pharmaceuticals:

1. Innovation-drug R&D full process research map
2. CXO / CDMO / CRDMO research map
3. WuXi AppTec subject archive homepage

This three-page split is an experiment. After local preview and real use, Phase 3 decides keep / merge / split / rename.

Provisional duties:

- process page explains discovery-to-commercialization
- CXO/CRDMO page explains participants and business model
- subject homepage records why this company is studied, current stage, learning path, related maps, open questions, and next steps

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

最后更新：2026-08-10
