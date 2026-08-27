# Research publishing protocol

How agents create or update investment research content for this blog.

Related: root `CONTEXT.md`, `docs/adr/0001-research-authority-and-publication-boundary.md`, parent spec #1.

## Core rules

1. The blog is a **research frontend**, not a private research-command mirror.
2. Private research is the authority for evidence, company facts, campaign conclusions, and formal research views.
3. Public architecture, narrative order, and diagrams follow the blog's own design.
4. Publication is deny-by-default. Drafting is not publishing.
5. Never put private absolute paths, handoff prompts, raw review files, workpapers, cognition originals, or non-redistributable source files into public docs.

## Agent triggers

The author finishes research in the investment system, then hands a draft to this repo.

| The author says | Do this | Do not |
| --- | --- | --- |
| 「写入博客」 / 「把这份草稿写进去」 | Rewrite the handed draft as a full subject-archive Markdown page. New company → `docs/投资/投研/<行业>/<公司>/index.md`. Existing company → `docs/投资/投研/<行业>/<公司>/<标题>/index.md` with the same `subject-index` chrome. Preview, then wait. | Do not re-run Gate 1 discussion. Do not reread the private system unless asked. Do not land 投研标的 as standalone HTML or `<StandaloneHtml>`. |
| 「上传」 | Commit only this research change, `push main`, then `pnpm publish:guonei`. | Do not rewrite the argument. Do not include weekly/panel WIP. |
| 「按投资系统改认识」 | Resolve `research-sources.local.yaml` and rewrite the named page. | Do not treat this as the default handoff. |
| 「新开一个行业」 | Stop and ask how to lay the industry shell. | Do not open a new industry from 「写入博客」. |

Publication is still deny-by-default. 「写入博客」 is not 「上传」.

## Required reading before research content work

1. Root `CONTEXT.md`
2. This protocol
3. `docs/adr/0001-research-authority-and-publication-boundary.md`
4. The relevant GitHub issue / phase ticket
5. Local source index if present: `research-sources.local.yaml` at repo root

If domain docs are missing, stop and restore them rather than inventing a new boundary model.

## Local source index

### Location and privacy

- Path: `research-sources.local.yaml` at repository root
- Must be gitignored
- May contain the private research root and relative material paths
- Must never be copied into `docs/` or rendered by the site

### Path basis

The local index uses one path basis, matching the private research registry:

- `source_root` points at the investment-system root
- `registry_file`, command `relative_path`, campaign paths, and `consulted_materials.path` are relative to `source_root`
- Resolve a material as `source_root + '/' + relative_path` with no extra prefix rewriting

Do not set `source_root` to the command-center folder while also storing paths that already begin with `指挥部/`.

### Resolution order

When creating or materially updating **any** investment weekly note or research content under `docs/投资/` (including `周记/` and `投研/`):

1. Read `research-sources.local.yaml` if it exists.
2. If the author said 「写入博客」 and handed a finished draft, skip private-source reread and Gate 1. Still apply the public-body contract and Gate 2 before any push/upload. Stop here for source resolution.
3. Apply the two human publication gates for that content instance before drafting or publishing.
4. If the content depends on private research, resolve the target page's `command_id` and consulted materials from the index.
5. Read the private research registry from `source_root` + `registry_file`.
6. Follow only the registered objects needed for the current task:
   - command charter / current research view when relevant
   - campaign state and adjudicated brief when relevant
   - consulted materials listed for the page
7. Do not invent IDs, status, dates, or authority from directory names alone.

### If the local index is missing

1. Do not invent research conclusions.
2. If the private research workspace is available, rebuild only the shallow command list and the page mappings needed for the current task.
3. Write or restore `research-sources.local.yaml` locally.
4. If private research is unavailable, limit work to non-research site shell changes and report the blocker.

### Index depth

- Shallow: all known command IDs, names, types, status, and relative command paths
- Deep: only for pages that are entering or already on the blog

Do not rebuild a second full research database inside this repository.

## Two publication gates

### Gate 1 — discuss before drafting

Before writing or substantially rewriting research/weekly content, confirm with the human:

- page goal
- scope boundary
- proposed structure
- whether this is experimental or durable
- which private materials will be consulted
- what the reader should learn about the research object, distinct from how the page will be drafted or assembled

Do not start body drafting until Gate 1 is clear for that content instance.

Skip Gate 1 when the author says 「写入博客」 and hands a finished draft. Gate 1 still applies to 「按投资系统改认识」, a new industry, a new research map, or a formal-conclusion rewrite.

### Gate 2 — approve before publish

After local draft and preview:

- human reviews content and presentation
- confirm the public body contains no drafting, Prompt, Agent, migration, deduplication, page-assembly, or internal research-system narration
- confirm revision sections record changed understanding rather than layout or editing history
- human explicitly approves push/deploy
- one approval applies only to that content instance

Agents must not push, deploy, or treat issue readiness as publish approval unless the human explicitly asks for that action.

When the human says 「上传」 for research pages: commit only those files, push `main`, then run `pnpm publish:guonei`. Do not invent a second upload path.

## What may become public

After human selection and curation, normal candidates include:

- distilled research-map knowledge
- subject-archive current understanding and learning path
- stage reports and investment thinking notes the human chooses to publish
- public primary-source citations and metadata
- important revision history that helps readers track changed understanding

## What remains non-public

- private absolute paths
- source manifests and freeze packages
- handoff prompts
- task registries
- workpapers and unfinished agent returns
- independent-review originals and full adjudication chains
- cognition revision originals
- non-redistributable PDFs/HTML/data copies
- migration/audit internals
- drafting, polishing, Prompt, Agent coordination, deduplication, page-assembly, and other editorial-process narration
- private research-system states, task tickets, or workflow transitions restated as public copy

Holdings, costs, orders, account size, and trade logs may be published at the author's discretion; agents do not screen them out by default. Credentials, private keys, personal secrets, and the materials listed above remain non-public.

Important originals are frozen privately first. Public upload of source copies requires human approval and redistributability. Otherwise public pages keep title/publisher/date/URL/citation only.

## Page model expectations

Public research pages should make these easy to find:

- question
- current stage using public maturity language
- as-of date
- confirmed basics
- current understanding
- open questions
- next research directions
- related research maps / subject archives
- important revisions

These fields describe the research object and the author's evidence or judgment boundary. They must not become a public task board for how the page will be edited next. “Next research directions” means facts, mechanisms, or hypotheses that still need investigation; it does not mean adding cards, moving sections, preserving an old layout, or linking one page into another.

Public maturity language:

- `学习中`
- `持续补充`
- `阶段性完成`
- `已修订`
- `停止维护`

Do not expose private campaign status codes as the public page state model.

## Origin and promotion

- `origin: command` — mainly distilled from private research
- `origin: blog` — mainly formed while writing/thinking on the blog
- `origin: mixed` — both

If blog writing creates a new research judgment that should become formal research:

1. record it as current understanding / hypothesis on the blog only if the human wants that
2. return it to private research for evidence and promotion
3. update the public archive after that promotion is curated again

## Experimental architecture note

The first pharmaceutical experiment uses research maps plus a WuXi AppTec subject archive. That three-page split is experimental until Phase 3 review. Do not freeze it as the permanent template for every future subject during ordinary content work.

## Done means

A research content task is complete only when:

1. source resolution followed this protocol
2. public files contain no private absolute paths
3. local index was updated if new page-to-source mappings were created
4. site build still works if files under `docs/` changed
5. no push/deploy happened unless the human explicitly requested it
6. remaining open questions and next human decisions are stated clearly
