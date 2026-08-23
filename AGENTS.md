# Agent routing

## Choose one route

- Public content, page design, navigation, VitePress theme, or public assets: open `.agents/skills/blog-editor/SKILL.md` first, then open the selected row's source before any optional background docs.
- Publishing-panel UI/code: open `panel/README.md`; read `docs/agents/publishing-panel.md` only when the task concerns author workflow or publish semantics.
- Deployment behavior: open the deployment section of `PROJECT.md`, then the named implementation or `ops/` runbook.
- If none of those routes match, use `PROJECT.md` as the capability/source map. Do not read `PROJECT.md`, `CONTEXT.md`, ADRs, and protocols all by default.
- Shared project memory: `.agents/memory/MEMORY.md`; keep project facts there rather than host-private memory.

## Public blog content or design

When adding or revising public content, homepage copy, navigation, sidebars, public assets, VitePress components, CSS, or responsive layout, follow `.agents/skills/blog-editor/SKILL.md` (`/blog-editor`). Its selected row owns further disclosure; platform wrappers under `.cursor/skills/` and `.claude/skills/` only point there.

Use the publishing panel only when the author explicitly asks to work through it. Creating, renaming, or deleting a named journey chapter always remains a blog-editor task.

Prebuilt standalone HTML belongs in `docs/public/html/<name>/index.html` and is embedded with `<StandaloneHtml src="/html/<name>" />`. Do not create a Markdown page for it, and do not open it with a normal in-site link. The publishing panel does not upload HTML. Existing Pi / Grok guides stay at `docs/public/journey-guides/`.

Before drafting investment weekly notes or research content under `docs/投资/`, follow the research protocol selected by the Skill. Private research remains the research authority; this repository owns public presentation.

Hermes diary is retired. Keep existing pages; create a new day only if the author explicitly reopens `docs/agents/hermes-diary.md`.

## Project operations

- GitHub Issues workflow: `docs/agents/issue-tracker.md`.
- Triage vocabulary: `docs/agents/triage-labels.md`.
- Current Agent-first modularization plan: `docs/agents/agent-first-modularization.md`.

## Safety guardrails

- Do not commit, push, publish, deploy, or upload without explicit author intent.
- Keep private absolute paths, credentials, workpapers, raw review files, cognition originals, and non-redistributable source copies out of public docs.
- `push main` updates Cloudflare Pages / `blog.cuowo.win`; the publishing panel is the normal `cuowo.cn` publication path. Preserve `闽ICP备2026032381号-1`; read `ops/腾讯云备案与博客接入-Cursor操作说明.md` before changing domestic deployment or filing behavior.
