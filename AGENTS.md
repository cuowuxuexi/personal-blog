## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### Research publishing

Investment research content uses the research-frontend protocol. See `docs/agents/research-publishing.md`.

Before creating, restructuring, or materially updating **any** investment weekly note or research content under `docs/投资/` (including `周记/` and `投研/`):

1. Read `CONTEXT.md` and `docs/agents/research-publishing.md`.
2. Apply the two human publication gates for that content instance:
   - discuss goal/scope/structure before drafting
   - explicit human approval before any push/deploy
3. When the content depends on private research, resolve origins through the local gitignored index `research-sources.local.yaml` when present, then the private research registry.
4. Treat private research as research authority; treat this repo as site-source and public-presentation authority.
5. Do not auto-sync, auto-publish, push, or deploy research content without explicit human approval for that content instance.
6. Never write private absolute paths, handoff prompts, raw review files, workpapers, cognition originals, or non-redistributable source copies into public docs.
