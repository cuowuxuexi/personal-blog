# Hermes diary protocol (agents)

> **已停用（2026-08-14）**：不再新写 Hermes 日记。已发布页面保留。除非作者明确要求恢复，否则不要创建新的日记天文件。

Historical protocol for the former shared public day-log. It does not authorize new diary files or publishing actions while the protocol remains retired.

## Authority

- Protocol detail (Chinese, full rules): `docs/AI与生活/Hermes日记/README.md`
- Site source: this repository
- Default publish: push `main` → Cloudflare Pages (no separate draft server)

## Historical shape

- Profiles **az**, **huizhang**, and **shizun** shared one clone and one diary directory.
- Entries used one `docs/AI与生活/Hermes日记/YYYY-MM-DD.md` file per calendar day.
- The build scanned the diary directory, so `posts.ts` and `config.mts` were not hand-edited for diary days.

## Current rule

- Do not create or append diary entries.
- Do not run the former pull/commit/push loop for Hermes diary content.
- Preserve published pages unless the author explicitly asks to revise or remove them.
- If the author explicitly reopens the protocol, review the historical repository state and define a new publication contract before writing.

## Not research publishing

Investment research still uses `docs/agents/research-publishing.md` and human gates. This diary protocol does **not** authorize research auto-publish.

最后更新：2026-08-18
