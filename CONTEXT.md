# personal-blog domain context

Single-context glossary for this repository.

## Purpose

This repository is a personal blog. Recording matters more than polished exhibition. The investment section is a **research frontend**: it publishes curated research results, learning paths, research thinking, and investment thinking. It is not a web mirror of the private research command system.

## Glossary

| Term | Meaning |
| --- | --- |
| **Research frontend** | The blog's investment research surface. It presents curated public research records according to the author's own architecture and narrative logic. |
| **Private research command** | The upstream private research system that owns evidence, company facts, campaign conclusions, adjudication, and formal research views. |
| **Research map** | An industry- or theme-level public page that captures reusable knowledge, process structure, open questions, and learning path. It is not a finished textbook and may remain under active learning. |
| **Subject archive** | A long-lived public page for one research subject (usually a company). It records why the subject is studied, current stage, learning path, related research maps, open questions, and later reports or revisions. |
| **Local source index** | A machine-readable, gitignored local file that maps blog research pages back to private research command IDs and consulted materials. Used by agents only. Never published. |
| **Publication gate** | The two-step human approval process required before any research or weekly content is published. Drafting is not publishing. |
| **Learning path** | The discoverable sequence of what was studied, in what order, and how understanding changed. |
| **Important revision** | A material change in understanding that should remain visible on the public page. Minor wording edits are not important revisions. |
| **Confirmed basics** | Knowledge treated as established enough for the page's current purpose, usually grounded in public primary sources. |
| **Current understanding** | The author's present interpretation. It may be incomplete, provisional, or later revised. |
| **Open questions** | Explicit unresolved problems that define the next research direction. |
| **Origin kind** | How a blog page was formed relative to private research: `command` (mainly from private research), `blog` (mainly from writing/thinking on the blog), or `mixed`. |
| **Publishing panel (发布面板)** | The local, non-coding publishing tool for weekly notes (investment + AI/life). The author drafts, AI-polishes, previews, and self-publishes through it; its preview-and-confirm step satisfies the publication gates for that weekly note. Research pages are outside its scope. |

## Authority boundaries

| Concern | Authority |
| --- | --- |
| Site source code, theme, deployable public content | This repository |
| Evidence, company facts, campaign conclusions, formal research views | Private research command |
| Public narrative structure, reading order, diagrams, learning-path presentation | This repository |
| Whether a page may be pushed or deployed | Human publication gate |

### Conflict rules

1. When blog text and private research disagree about facts, evidence, or formal conclusions, private research wins.
2. When blog text and private research disagree about public narrative structure or reading order, the blog wins.
3. Blog writing may create questions and hypotheses first. Those remain blog-origin thinking until promoted through private research.
4. A private file existing upstream never makes it public.

## Publication model

All weekly notes and research content require two human gates:

1. Discuss page goal, scope, and structure before drafting.
2. Review local draft/preview before any push or deploy.

One approval applies only to that content instance. There is no auto-sync and no auto-publish.

The gates constrain **agent-mediated** drafting and publishing. When the author personally drafts and publishes a weekly note through the local publishing panel, the author's own preview-and-confirm action satisfies both gates for that weekly note instance. Research pages (`docs/投资/投研/`) are outside panel scope and keep the full agent-mediated gate process.

## Public research page states

Public pages use reader-facing maturity language, not private campaign status codes:

- `学习中` — learning
- `持续补充` — expanding
- `阶段性完成` — stage-complete
- `已修订` — revised after material change
- `停止维护` — no longer maintained

## Shared recognition fields

Research pages should make these easy to find, without forcing a rigid body template:

- question the page is trying to answer
- current research stage
- as-of date
- confirmed basics
- current understanding
- open questions
- variables that may change judgment
- next research directions
- related research maps / subject archives
- important revisions

## Source citation and materials

- Important public facts and numbers should cite public primary sources.
- Public pages may list source title, publisher, publication date, original URL, and as-of date.
- Important originals are frozen in private research first.
- Public upload of source copies requires human approval and redistributability.
- Private absolute paths, manifests, handoff prompts, raw review files, workpapers, cognition originals, and non-redistributable source files stay out of public content.

## Account privacy

Holdings, costs, orders, account size, and trade logs may be disclosed at the author's discretion. There is no default privacy restriction on them, and agents do not need to screen weekly content for them. (Relaxed 2026-08-14; previously private by default.)

## Experimental content architecture

The first pharmaceutical experiment uses:

- research maps for reusable industry/business knowledge
- a subject archive for WuXi AppTec

The first three-page split is experimental and may change after preview and use. Do not treat it as a permanent template for every future subject until Phase 3 review.

## Avoid these synonyms in project docs

| Prefer | Avoid as synonyms for the same concept |
| --- | --- |
| research frontend | command dashboard, research OS UI, full research mirror |
| private research command | blog research database, public research backend |
| research map | finished industry textbook, campaign status board |
| subject archive | one-off company report only, private campaign folder |
| local source index | public source dump, auto-sync database |
| publication gate | auto deploy, silent publish |
| publishing panel / 发布面板 | 微博后台, CMS, 云端编辑器 |

最后更新：2026-08-14
