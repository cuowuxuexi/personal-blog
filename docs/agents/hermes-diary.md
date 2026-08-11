# Hermes diary protocol (agents)

Shared day-log under the public blog for ideas, plans, and notes worth keeping after discussion with Hermes.

## Authority

- Protocol detail (Chinese, full rules): `docs/AI与生活/Hermes日记/README.md`
- Site source: this repository
- Default publish: push `main` → Cloudflare Pages (no separate draft server)

## Who may write

Profiles **az**, **huizhang**, and **shizun** share one clone and one diary directory.

## Write scope

- **Allowed:** `docs/AI与生活/Hermes日记/YYYY-MM-DD.md` (create day file from template if missing; append entries only)
- **Forbidden by default:** `docs/投资/**`, other site content, `docs/.vitepress/**`, CI, secrets

Do **not** edit `posts.ts` or `config.mts` for new diary days — the build scans the diary folder.

## Entry shape

- One file per calendar day
- Append `## #N · HH:mm · <类型>` with optional `**agent**: az|huizhang|shizun`
- Numbering restarts at `#1` each day

## Git loop

1. `git pull --rebase`
2. Append entry (or create day file)
3. Stage only diary paths → commit → `git push origin main`
4. On conflict: pull --rebase once more; if still failing, stop and report

## Not research publishing

Investment research still uses `docs/agents/research-publishing.md` and human gates. This diary protocol does **not** authorize research auto-publish.

最后更新：2026-08-11
