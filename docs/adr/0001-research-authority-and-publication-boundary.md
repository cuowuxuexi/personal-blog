# ADR 0001: Research authority and publication boundary

- Status: Accepted
- Date: 2026-08-10
- Related: #1, #2
- Superseded in part by: ADR 0003 (Decision 7 only)

## Context

This blog's investment section needs to grow from empty archive shells into a real research frontend. There is already a private research command system that owns evidence, campaigns, adjudication, and formal research views.

Without an explicit boundary, agents and future work can confuse:

- the blog repository as the complete research system
- the private research workspace as something that should be auto-synced or fully mirrored
- research pages as either empty shells or finished investment advice

The blog also needs agents to re-locate private research origins when updating public research pages, without publishing private paths or internal process files.

## Decision

1. **This repository is the site-source authority.** Deployable code and public content live here.
2. **The private research command is the research-source authority.** Evidence, company facts, campaign conclusions, adjudication, and formal research views are owned there.
3. **The blog is a research frontend, not a command-system UI.** Public architecture follows the author's learning and narrative logic, not private campaign folders.
4. **Publication is human-gated and deny-by-default.** All weekly and research content requires discussion before drafting and explicit approval before push/deploy. There is no auto-sync and no auto-publish.
5. **Agents resolve research origins through a local, gitignored source index**, then through the private research registry and related state files. Public docs must not embed private absolute paths.
6. **Blog writing may create questions and hypotheses first.** Formal research conclusions still require private research promotion before being treated as verified research.
7. **Account details are private by default.** Holdings, costs, orders, account size, and trade logs are not part of the default research-frontend model.

## Consequences

### Positive

- Agents have a durable rule for where research truth lives.
- Public pages can record learning paths without exposing private ops files.
- Future content experiments can proceed without inventing a second research database.

### Negative / costs

- Updating research pages requires access to the private research workspace on the author's machine.
- Local source index must be maintained manually.
- CI/deploy environments cannot read private research; only already-curated public content can ship.

### Follow-through

- Phase 1 implements governance, ADR, agent protocol, and local source index.
- Phase 2 experiments with pharmaceutical research maps and the WuXi AppTec subject archive.
- Phase 3 decides which experimental patterns become durable defaults.

## Rejected alternatives

- Treating the blog as a full public mirror of private research
- Auto-syncing private research into the blog repository
- Storing private absolute paths in public project docs
- Making the blog the sole research source of truth
- Freezing the first three-page WuXi experiment as a permanent global template before review
