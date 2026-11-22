# Agent routing

## Choose one route

- Public content, page design, navigation, VitePress theme, or public assets: open `.agents/skills/blog-editor/SKILL.md` first, then open the selected row's source before any optional background docs.
- Publishing-panel UI/code: open `panel/README.md`; read `docs/agents/publishing-panel.md` only when the task concerns author workflow or publish semantics.
- Deployment behavior: open the deployment section of `PROJECT.md`, then the named implementation or `ops/` runbook.
- If none of those routes match, use `PROJECT.md` as the capability/source map. Do not read `PROJECT.md`, `CONTEXT.md`, ADRs, and protocols all by default.
- Shared project memory: `.agents/memory/MEMORY.md`; keep project facts there rather than host-private memory.

## Public blog content or design

When adding or revising public content, homepage copy, navigation, sidebars, public assets, VitePress components, CSS, or responsive layout, follow `.agents/skills/blog-editor/SKILL.md` (`/blog-editor`). Its selected row owns further disclosure; platform wrappers under `.cursor/skills/` and `.claude/skills/` only point there.

Use the publishing panel only when the author explicitly asks to work through it. After the journey is reopened, creating, renaming, or deleting a named journey chapter always remains a blog-editor task.

Prebuilt standalone HTML belongs in `docs/public/html/<name>/index.html`. Weekly/journey may embed it with `<StandaloneHtml>`. Research HTML chapters and journey `publicHref` titles open that URL full-page; do not iframe them into an archive shell. The publishing panel does not upload HTML. Existing Pi / Grok guides stay at `docs/public/journey-guides/`.

Before drafting investment weekly notes or research content under `docs/投资/`, follow the research protocol selected by the Skill. Private research remains the research authority; this repository owns public presentation. For 投研标的：作者说「写入博客」按交来的稿落页（旧版投研已归档，不在旧标的下新开章节；交来研报目录走下文研报约定），不回源；交来 HTML 则标题直达该页，不嵌进档案壳；说「上传」才提交这次投研文件、`push main` 并跑 `pnpm publish:guonei`；说「按投资系统改认识」才回源。交来**研报目录**（多页 HTML 研报集）时，按 `docs/agents/research-publishing.md` 的研报约定，用 `scripts/land-report.mjs` 落页；该标的旧页原样保留，从 `/归档` 进入，与研报并存，旧页删除由作者另行下达。

Frozen and archived: legacy research (`/投资/投研/`), AI下的生活 (我的AI历程, 大事件, Hermes diary, AI与生活 weekly notes), investment weekly notes, and 大问题. Keep existing pages and URLs; enter them only from `/归档`, never from the top nav or homepage. Create new content only if the author explicitly reopens one (Hermes: `docs/agents/hermes-diary.md`).

## Project operations

- GitHub Issues workflow: `docs/agents/issue-tracker.md`.
- Triage vocabulary: `docs/agents/triage-labels.md`.
- Current Agent-first modularization plan: `docs/agents/agent-first-modularization.md`.

## Safety guardrails

- Do not commit, push, publish, deploy, or upload without explicit author intent.
- Keep private absolute paths, credentials, workpapers, raw review files, cognition originals, and non-redistributable source copies out of public docs.
- `push main` updates Cloudflare Pages / `blog.cuowo.win`. Weekly/journey go to `cuowo.cn` via the publishing panel; research says 「上传」 then `pnpm publish:guonei`. Preserve `闽ICP备2026032381号-1`; read `ops/腾讯云备案与博客接入-Cursor操作说明.md` before changing domestic deployment or filing behavior.
