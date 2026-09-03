# Agent docs

Agent-facing operating notes for this repository. Root routing starts at `AGENTS.md`; the repository capability/source map is `PROJECT.md`.

## Current protocols

| File | Purpose |
| --- | --- |
| [publishing-panel.md](./publishing-panel.md) | Current publishing-panel scope, safety gates, and agent boundaries |
| [research-publishing.md](./research-publishing.md) | Research frontend source resolution, author triggers, and publication gates |
| [issue-tracker.md](./issue-tracker.md) | GitHub Issues workflow via `gh` |
| [triage-labels.md](./triage-labels.md) | Five-role triage label vocabulary |
| [domain.md](./domain.md) | How to consume the root `CONTEXT.md` and ADRs |

## Current architecture plan

| File | Purpose |
| --- | --- |
| [agent-first-modularization.md](./agent-first-modularization.md) | Phased plan for content authority, capability modules, source maps, verification, and cleanup |
| [agent-routing-benchmark.md](./agent-routing-benchmark.md) | Eight-task routing benchmark, scoring method, current result, and rerun cadence |

## Accepted architecture deepen (2026-08-24)

阶段 3 与阶段 5 按六条已批提案（改刚好/中档）完成，已进入 `origin/main`。阶段 4 样式拆分与阶段 6 大扫除未做。过程证据仍在 `.planning/架构加深/`，现行入口以本表和模块化计划为准。该包中的“Herdr S3”是 2026-08-24 执行时的历史角色标签；现役 `herdr-collaboration` 仅有 S1/S2，不得按旧 S3 拓扑复刻。

| File | Purpose |
| --- | --- |
| [验收报告.md](../../.planning/架构加深/验收报告.md) | 独立验收结论与验证数字 |
| [对照模块化计划.md](../../.planning/架构加深/对照模块化计划.md) | 六条提案与阶段 3–6 的重叠/缺口 |

## Accepted Phase 2 package

| File | Purpose |
| --- | --- |
| [phase2-build-time-projections-collaboration.md](./phase2-build-time-projections-collaboration.md) | Approved S2 baseline and final coordination state for weekly/journey build-time projections |
| [phase2-build-time-projections-execution-report.md](./phase2-build-time-projections-execution-report.md) | Integrated T1–T6 and repair execution evidence |
| [phase2-r1-repair-report.md](./phase2-r1-repair-report.md) | First independent-review repair evidence |
| [phase2-r2-final-repair-report.md](./phase2-r2-final-repair-report.md) | Second repair-round evidence for frontmatter identity and verification guards |
| [phase2-build-time-projections-acceptance-report.md](./phase2-build-time-projections-acceptance-report.md) | Final acceptance verdict, planning-window closure, and verification results |

Phase 2 task-level evidence：

| File | Purpose |
| --- | --- |
| [phase2-t1-projection-typed-ia-report.md](./phase2-t1-projection-typed-ia-report.md) | T1 projection core and typed IA report |
| [phase2-t2-site-consume-projection-report.md](./phase2-t2-site-consume-projection-report.md) | T2 site projection wiring report |
| [phase2-t3-journey-series-sidebar-report.md](./phase2-t3-journey-series-sidebar-report.md) | T3 journey series sidebar report |
| [phase2-t4-panel-de-triple-write-report.md](./phase2-t4-panel-de-triple-write-report.md) | T4 panel de-triple-write report |
| [phase2-t5-publication-revision-date-report.md](./phase2-t5-publication-revision-date-report.md) | T5 publication and revision-date semantics report |
| [phase2-t6-verification-wrapup-report.md](./phase2-t6-verification-wrapup-report.md) | T6 verification wrap-up evidence; not an acceptance verdict |

## Accepted Phase 1 package

| File | Purpose |
| --- | --- |
| [phase1-content-contract-collaboration.md](./phase1-content-contract-collaboration.md) | S2 iteration baseline and final coordination state for Phase 1 content contracts and parity tests |
| [phase1-t1-shared-contract-report.md](./phase1-t1-shared-contract-report.md) | T1 shared `ContentKind` contract implementation report |
| [phase1-t2-adapter-wiring-report.md](./phase1-t2-adapter-wiring-report.md) | T2 site and panel adapter wiring report |
| [phase1-t3-content-parity-report.md](./phase1-t3-content-parity-report.md) | T3 live content parity verifier report |
| [phase1-t4-verification-wrapup-report.md](./phase1-t4-verification-wrapup-report.md) | T4 verification integration report |
| [phase1-content-contract-execution-report.md](./phase1-content-contract-execution-report.md) | Integrated execution evidence and verification results |
| [phase1-r1-r7-false-green-repair-report.md](./phase1-r1-r7-false-green-repair-report.md) | Repair-round evidence closing R1–R7 false-green paths |
| [phase1-content-contract-acceptance-report.md](./phase1-content-contract-acceptance-report.md) | Final acceptance verdict and architecture effect |

## Retired or historical

| File | Purpose |
| --- | --- |
| [hermes-diary.md](./hermes-diary.md) | Retired Hermes diary protocol retained for historical reference |
| [handoff-phase2-research-ui.md](./handoff-phase2-research-ui.md) | One-time Phase 2 Cursor handoff; not a current operating contract |

Content/design routing: `.agents/skills/blog-editor/SKILL.md`.

Domain language: `CONTEXT.md`. Durable decisions: `docs/adr/`.

最后更新：2026-08-28
