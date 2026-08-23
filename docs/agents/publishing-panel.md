# Publishing panel protocol (agents)

The **publishing panel** is the author's local, non-coding tool for two weekly kinds and 我的AI历程.

现行协议以本文为准。`.planning/` 里 journey `allowCreate: false`、不能开新一期、Decision C「只维护既有篇章」属于 2026-08-18 同日更早的迭代冻结，已被后续实现取代；不要按它回退 `panel/`。

## Scope

- In:
  - investment weekly notes (`docs/投资/周记/`)
  - AI/life weekly notes (`docs/AI与生活/*.md`, `type: weekly`)
  - 我的AI历程 dated issues (`docs/AI与生活/我的AI历程/YYYY-MM-DD.md`, `type: journey`): 开新一期 with theme / cover / caption, same chrome as weekly
  - 我的AI历程 named chapters (`docs/AI与生活/我的AI历程/*.md`, `type: journey`): append / edit / delete entries, and edit the page header (cover / caption only). The chapter title stays the chapter name; the panel must not write a theme into H1, frontmatter, sidebar, or `posts.ts`. Changing a chapter title does not rename the file or URL, and is not a panel job.
- Journey images stay under `docs/public/images/journey/`; weekly images stay under `docs/public/images/weekly/`.
- Journey issue numbers are independent of AI与生活 weekly. Dated journey filenames stay date-only (like life weekly).
- Journey publish jobs allow exactly one `type: journey` markdown body and the `/images/journey/` images that body actually references. Index registration is build-time projection — the panel does not rewrite `posts.ts` / `config.mts`. Named-chapter header edits still do not rewrite the chapter title. `index.md`, `README.md`, 大事件, Hermes diary, and other AI与生活 subdirectories stay out of a journey job.
- Journey WeChat preview reuses the life visual theme and the same production-image gate.
- Out: research pages, philosophy, big questions, 大事件, theme/code, Hermes diary (retired), panel code, standalone HTML under `docs/public/html/` or `docs/public/journey-guides/`
- Switching to 开新一期 resets theme / cover / caption and prefills today's date. Switching back to 追加 reloads the selected issue header. Do not keep a chapter title in the new-issue form.
- The panel does not create, rename, or delete named chapter files (`基础设施篇.md` / `工具篇.md` / `cli篇.md` / `AI开支记录与优化.md`). That lifecycle stays with blog-editor.

## Date fields

- `date` is the first-publication / issue date. Ordinary panel edits (typos, polish) must not change it.
- Optional `revisionDate` is only for important revisions the author explicitly wants reflected in homepage「最近更新」(`revisionDate ?? date`). Do not auto-set it from save time, Git, or mtime. Hermes is out of panel scope and does not use the field. Series「最新一期」still follows issue `date`, not `revisionDate`.

## Who does what

- The author drafts, polishes, previews, and publishes through the panel. “Save and generate release preview” writes the draft and prepares an isolated snapshot in one action; it is not publishing. The same snapshot provides both the blog release preview and a local WeChat Official Account preview. Release preview uses a job-scoped base and fails closed when the target HTML is missing, renders as `NotFound`, or lacks the requested editor anchor. Confirming that snapshot uploads the production build to `cuowo.cn`; seeing that site’s `build.json` SHA match satisfies the publication gates for that weekly note, dated journey issue, or journey chapter. `push main` still updates Cloudflare Pages / `blog.cuowo.win` as a backup.
- The WeChat preview is a job-scoped local artifact outside the Git manifest. It uses snapshot-local images for preview, and copies production-domain image URLs only after production SHA verification or a successful online-asset check. Markdown remains the only content source.
- Agents still use `.agents/skills/blog-editor/SKILL.md` when asked to edit weekly notes or journey entries in chat, and when adding, renaming, or deleting a named journey chapter. Do not start the panel, do not commit, and do not push unless the author explicitly asks. Dated journey issues are opened from the panel, not by inventing a chapter file.

## Do not

- Put clipro keys, private paths, or `.env` values into public docs
- Treat panel publish as a license to auto-publish research pages
- Hand-edit `posts.ts` / managed sidebar literals to register weekly or journey items (projection owns that)
- Create, rename, or delete named journey chapter files from the panel

最后更新：2026-08-24
