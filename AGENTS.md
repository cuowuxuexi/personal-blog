## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### Blog editor

Project skill for adding or revising public blog content, page design, theme styles, navigation, sidebars, posts index, or public assets.

- Formal skill: `.agents/skills/blog-editor/SKILL.md`
- Explicit invoke: `/blog-editor`
- When the user asks to add/edit blog content or page design, read and follow that skill first for intent routing and file location.
- AI 与生活周记固定模板：skill 内 `content.weekly-life` + `.agents/skills/blog-editor/templates/weekly-life.md`
- 投资周记固定模板：skill 内 `content.weekly-investment` + `.agents/skills/blog-editor/templates/weekly-invest.md`；版面与生活周记同一套，走投资门禁
- Platform discovery wrappers only: `.cursor/skills/blog-editor/`, `.claude/skills/blog-editor/`
- Do not auto commit, push, or deploy.
- The author may publish weekly notes through the local **publishing panel** (`panel/`, `pnpm panel`). See `docs/agents/publishing-panel.md`.

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

### Hermes diary（已停用）

2026-08-14 起不再新写 Hermes 日记。已发布页面保留；协议仅作历史说明：`docs/agents/hermes-diary.md`、`docs/AI与生活/Hermes日记/README.md`。

- Do not create new diary days unless the author explicitly reopens this protocol.
- Do not hand-edit `posts.ts` / sidebar for diary days (auto-scanned).
