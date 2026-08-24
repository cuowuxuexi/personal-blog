import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  managedIdentityFromMarkdown,
  managedPostsFromGlob,
  managedPostsFromSources,
  normalizePostIdentity,
  postFromManagedMarkdown,
  projectInvestSidebarManagedParts,
  projectJourneySidebar,
  projectLifeSidebarManagedParts,
  projectYearSidebarGroups,
  yearGroupTitle,
} from './index.mjs'
import { projectManagedPostsFromFs } from './project-fs.mjs'
import { writeGoodFixture, mutateDeleteNamedChapterEverywhere } from './verify/fixture-repo.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..')

test('fixture: shared core maps frontmatter to PostItem for life/invest/journey', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-fixture-'))
  try {
    writeGoodFixture(dir)
    const fromFs = projectManagedPostsFromFs(dir)
    assert.equal(fromFs.length, 7)

    const life = fromFs.find((p) => p.link === '/AI与生活/2026-01-03')
    assert.equal(life.title, '第001期-生活')
    assert.equal(life.issue, 1)
    assert.equal(life.type, 'weekly')
    assert.equal(life.category, 'AI与生活')

    const opening = fromFs.find((p) => p.link === '/投资/周记/2026-08-08-写在投资笔记开始之前')
    assert.ok(opening)
    assert.equal(opening.issue, undefined)

    const chapter = fromFs.find((p) => p.link === '/AI与生活/我的AI历程/基础设施篇')
    assert.equal(chapter.type, 'journey')
    assert.equal(chapter.title, '基础设施篇')

    const modulesByKind = {
      'weekly-life': {
        '../AI与生活/2026-01-03.md': fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '2026-01-03.md'), 'utf8'),
      },
      'weekly-investment': {
        '../投资/周记/2026-01-02-主题.md': fs.readFileSync(path.join(dir, 'docs', '投资', '周记', '2026-01-02-主题.md'), 'utf8'),
        '../投资/周记/2026-08-08-写在投资笔记开始之前.md': fs.readFileSync(
          path.join(dir, 'docs', '投资', '周记', '2026-08-08-写在投资笔记开始之前.md'),
          'utf8',
        ),
      },
      journey: {
        '../AI与生活/我的AI历程/基础设施篇.md': fs.readFileSync(
          path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'),
          'utf8',
        ),
        '../AI与生活/我的AI历程/工具篇.md': fs.readFileSync(
          path.join(dir, 'docs', 'AI与生活', '我的AI历程', '工具篇.md'),
          'utf8',
        ),
        '../AI与生活/我的AI历程/cli篇.md': fs.readFileSync(
          path.join(dir, 'docs', 'AI与生活', '我的AI历程', 'cli篇.md'),
          'utf8',
        ),
        '../AI与生活/我的AI历程/AI开支记录与优化.md': fs.readFileSync(
          path.join(dir, 'docs', 'AI与生活', '我的AI历程', 'AI开支记录与优化.md'),
          'utf8',
        ),
      },
    }
    const fromGlob = managedPostsFromGlob(modulesByKind)
    assert.deepEqual(fromGlob.map(normalizePostIdentity), fromFs.map(normalizePostIdentity))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('fixture red: missing issue on dated weekly (non-opening) yields null; opening exception kept', () => {
  const goodOpening = postFromManagedMarkdown({
    kindId: 'weekly-investment',
    relativePath: 'docs/投资/周记/2026-08-08-写在投资笔记开始之前.md',
    raw: `---
title: 写在投资笔记开始之前
date: 2026-08-08
category: 投资
type: weekly
---
`,
  })
  assert.ok(goodOpening)
  assert.equal(goodOpening.issue, undefined)

  const bad = postFromManagedMarkdown({
    kindId: 'weekly-life',
    relativePath: 'docs/AI与生活/2026-01-03.md',
    raw: `---
title: 缺期号
date: 2026-01-03
category: AI与生活
type: weekly
---
`,
  })
  assert.equal(bad, null)

  const badRevision = postFromManagedMarkdown({
    kindId: 'weekly-life',
    relativePath: 'docs/AI与生活/2026-01-03.md',
    raw: `---
title: 修订早于公开
date: 2026-01-03
revisionDate: 2026-01-01
category: AI与生活
type: weekly
issue: 1
---
`,
  })
  assert.equal(badRevision, null)
})

test('R2-1: identity mirrors fm.category/type; wrong or missing fail-closed (no kind overwrite)', () => {
  const wrongCategoryRaw = `---
title: 第001期-生活
date: 2026-01-03
category: 投资
type: weekly
issue: 1
---
`
  const wrongTypeRaw = `---
title: 第001期-生活
date: 2026-01-03
category: AI与生活
type: journey
issue: 1
---
`
  const missingCategoryRaw = `---
title: 第001期-生活
date: 2026-01-03
type: weekly
issue: 1
---
`
  const goodRaw = `---
title: 第001期-生活
date: 2026-01-03
category: AI与生活
type: weekly
issue: 1
---
`
  const rel = 'docs/AI与生活/2026-01-03.md'

  const wrongCatId = managedIdentityFromMarkdown({
    kindId: 'weekly-life',
    relativePath: rel,
    raw: wrongCategoryRaw,
  })
  assert.equal(wrongCatId.category, '投资')
  assert.equal(wrongCatId.type, 'weekly')
  assert.equal(postFromManagedMarkdown({ kindId: 'weekly-life', relativePath: rel, raw: wrongCategoryRaw }), null)

  const wrongTypeId = managedIdentityFromMarkdown({
    kindId: 'weekly-life',
    relativePath: rel,
    raw: wrongTypeRaw,
  })
  assert.equal(wrongTypeId.type, 'journey')
  assert.equal(postFromManagedMarkdown({ kindId: 'weekly-life', relativePath: rel, raw: wrongTypeRaw }), null)

  const missingId = managedIdentityFromMarkdown({
    kindId: 'weekly-life',
    relativePath: rel,
    raw: missingCategoryRaw,
  })
  assert.equal(missingId.category, undefined)
  assert.equal(postFromManagedMarkdown({ kindId: 'weekly-life', relativePath: rel, raw: missingCategoryRaw }), null)

  const good = postFromManagedMarkdown({ kindId: 'weekly-life', relativePath: rel, raw: goodRaw })
  assert.ok(good)
  assert.equal(good.category, 'AI与生活')
  assert.equal(good.type, 'weekly')
})

test('fixture: year sidebar templates decouple journey from life weekly', () => {
  const posts = managedPostsFromSources([
    {
      kindId: 'weekly-life',
      relativePath: 'docs/AI与生活/2026-01-03.md',
      raw: `---
title: 第001期-生活
date: 2026-01-03
category: AI与生活
type: weekly
issue: 1
---
`,
    },
    {
      kindId: 'journey',
      relativePath: 'docs/AI与生活/我的AI历程/2026-02-01.md',
      raw: `---
title: 历程第001期
date: 2026-02-01
category: AI与生活
type: journey
issue: 1
---
`,
    },
    {
      kindId: 'journey',
      relativePath: 'docs/AI与生活/我的AI历程/基础设施篇.md',
      raw: `---
title: 基础设施篇
date: 2026-01-04
category: AI与生活
type: journey
---
`,
    },
  ])

  assert.equal(yearGroupTitle('journey', 2026), '历程 · 2026年')
  assert.equal(yearGroupTitle('weekly-life', 2026), '周记 · 2026年')

  const lifeGroups = projectLifeSidebarManagedParts(posts)
  assert.deepEqual(lifeGroups.map((g) => g.text), ['周记 · 2026年'])
  assert.deepEqual(lifeGroups[0].items.map((i) => i.link), ['/AI与生活/2026-01-03'])

  const journeyGroups = projectJourneySidebar(posts)
  assert.equal(journeyGroups[0].text, '我的AI历程')
  assert.deepEqual(journeyGroups[0].items.map((i) => i.link), [
    '/AI与生活/我的AI历程/基础设施篇',
  ])
  assert.equal(journeyGroups[1].text, '历程 · 2026年')
  assert.deepEqual(journeyGroups[1].items.map((i) => i.link), [
    '/AI与生活/我的AI历程/2026-02-01',
  ])
})

test('fixture red: mutating good repo by deleting named chapter shrinks journey projection', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-red-'))
  try {
    writeGoodFixture(dir)
    const before = projectManagedPostsFromFs(dir).filter((p) => p.type === 'journey')
    assert.equal(before.length, 4)
    mutateDeleteNamedChapterEverywhere(dir)
    const after = projectManagedPostsFromFs(dir).filter((p) => p.type === 'journey')
    assert.equal(after.length, 3)
    assert.ok(!after.some((p) => p.link.includes('工具篇')))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('live: fs and reconstructed glob adapters agree; year/journey sidebar projection matches IA', () => {
  const fromFs = projectManagedPostsFromFs(REPO_ROOT)
  const modulesByKind = { 'weekly-life': {}, 'weekly-investment': {}, journey: {} }
  for (const kindId of Object.keys(modulesByKind)) {
    const kindDir = {
      'weekly-life': path.join(REPO_ROOT, 'docs', 'AI与生活'),
      'weekly-investment': path.join(REPO_ROOT, 'docs', '投资', '周记'),
      journey: path.join(REPO_ROOT, 'docs', 'AI与生活', '我的AI历程'),
    }[kindId]
    for (const name of fs.readdirSync(kindDir)) {
      if (!name.toLowerCase().endsWith('.md')) continue
      if (name === 'index.md' || name.toLowerCase() === 'readme.md') continue
      if (kindId === 'weekly-life' && fs.statSync(path.join(kindDir, name)).isDirectory()) continue
      const abs = path.join(kindDir, name)
      if (!fs.statSync(abs).isFile()) continue
      if (kindId === 'weekly-life' && !/^\d{4}-\d{2}-\d{2}/.test(name)) continue
      modulesByKind[kindId][`../${name}`] = fs.readFileSync(abs, 'utf8')
    }
  }
  const fromGlob = managedPostsFromGlob(modulesByKind)
  assert.deepEqual(fromGlob.map(normalizePostIdentity), fromFs.map(normalizePostIdentity))

  const lifeYear = projectYearSidebarGroups('weekly-life', fromFs)
  const investYear = projectInvestSidebarManagedParts(fromFs)
  assert.deepEqual(lifeYear.map((g) => g.text), ['周记 · 2026年'])
  assert.deepEqual(lifeYear[0].items.map((i) => i.link), [
    '/AI与生活/2026-08-17',
    '/AI与生活/2026-08-12',
  ])
  assert.deepEqual(investYear.map((g) => g.text), ['2026年'])
  assert.deepEqual(investYear[0].items.map((i) => i.link), [
    '/投资/周记/2026-08-17-那是抓不住的月亮',
    '/投资/周记/2026-08-13-看烟花',
    '/投资/周记/2026-08-08-写在投资笔记开始之前',
  ])

  const journeyYear = projectYearSidebarGroups('journey', fromFs)
  assert.deepEqual(journeyYear, [])

  const journeySidebar = projectJourneySidebar(fromFs)
  assert.equal(journeySidebar[0]?.text, '我的AI历程')
  assert.deepEqual(journeySidebar[0].items.map((i) => i.link), [
    '/AI与生活/我的AI历程/基础设施篇',
    '/AI与生活/我的AI历程/工具篇',
    '/AI与生活/我的AI历程/AI开支记录与优化',
  ])
  assert.deepEqual(journeySidebar[0].items[1].items.map((i) => i.link), [
    '/html/cli-hub',
  ])
})

test('named journey publicHref becomes post.link; invalid fails closed', () => {
  const raw = (publicHref) => `---
title: cli篇
date: 2026-08-23
category: AI与生活
type: journey
publicHref: ${publicHref}
---
`

  const good = postFromManagedMarkdown({
    kindId: 'journey',
    relativePath: 'docs/AI与生活/我的AI历程/cli篇.md',
    raw: raw('/html/cli-hub'),
  })
  assert.ok(good)
  assert.equal(good.link, '/html/cli-hub')

  const trailing = postFromManagedMarkdown({
    kindId: 'journey',
    relativePath: 'docs/AI与生活/我的AI历程/cli篇.md',
    raw: raw('/html/cli-hub/'),
  })
  assert.equal(trailing?.link, '/html/cli-hub')

  const journeyGuide = postFromManagedMarkdown({
    kindId: 'journey',
    relativePath: 'docs/AI与生活/我的AI历程/cli篇.md',
    raw: raw('/journey-guides/pi-shortcuts'),
  })
  assert.equal(journeyGuide?.link, '/journey-guides/pi-shortcuts')

  assert.equal(postFromManagedMarkdown({
    kindId: 'journey',
    relativePath: 'docs/AI与生活/我的AI历程/cli篇.md',
    raw: raw('/AI与生活/我的AI历程/cli篇'),
  }), null)

  assert.equal(postFromManagedMarkdown({
    kindId: 'journey',
    relativePath: 'docs/AI与生活/我的AI历程/cli篇.md',
    raw: raw('/html/../cli-hub'),
  }), null)
})

test('journey sidebar uses publicHref for nested named chapter', () => {
  const chapter = (title, extra = '') => `---
title: ${title}
date: 2026-01-04
category: AI与生活
type: journey
${extra}---
`
  const posts = managedPostsFromSources([
    {
      kindId: 'journey',
      relativePath: 'docs/AI与生活/我的AI历程/基础设施篇.md',
      raw: chapter('基础设施篇'),
    },
    {
      kindId: 'journey',
      relativePath: 'docs/AI与生活/我的AI历程/工具篇.md',
      raw: chapter('工具篇'),
    },
    {
      kindId: 'journey',
      relativePath: 'docs/AI与生活/我的AI历程/cli篇.md',
      raw: chapter('cli篇', 'publicHref: /html/cli-hub\n'),
    },
    {
      kindId: 'journey',
      relativePath: 'docs/AI与生活/我的AI历程/AI开支记录与优化.md',
      raw: chapter('AI开支记录与优化'),
    },
  ])
  const sidebar = projectJourneySidebar(posts)
  assert.deepEqual(sidebar[0].items.map((item) => item.link), [
    '/AI与生活/我的AI历程/基础设施篇',
    '/AI与生活/我的AI历程/工具篇',
    '/AI与生活/我的AI历程/AI开支记录与优化',
  ])
  assert.deepEqual(sidebar[0].items[1].items.map((item) => item.link), [
    '/html/cli-hub',
  ])
})

test('pure project core source has no node:fs import', () => {
  const source = fs.readFileSync(path.join(HERE, 'project.mjs'), 'utf8')
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/)
  assert.doesNotMatch(source, /from\s+['"]fs['"]/)
  assert.doesNotMatch(source, /vitepress|from\s+['"]vue['"]|panel\//)
})
