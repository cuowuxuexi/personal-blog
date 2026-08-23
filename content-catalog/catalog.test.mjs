import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRepoPaths } from '../panel/lib/repo-paths.mjs'
import {
  CONTENT_KIND_IDS,
  REQUIRED_KIND_FIELDS,
  REQUIRED_SCAN_FIELDS,
  REQUIRED_ASSET_FIELDS,
  REQUIRED_CREATION_FIELDS,
  REQUIRED_VALIDATION_FIELDS,
  listContentKinds,
  getContentKind,
  hasContentKind,
  isRecentVisible,
  recentVisibleKindIds,
  kindIdForPost,
  isRecentVisiblePost,
  freshnessDate,
  postsByCategory,
  selectRecentPosts,
  matchesKindPath,
  kindIdForPath,
  isManagedContentPath,
  matchesKindAssetPath,
  yearGroupTitle,
  contentFileName,
  contentSiteLink,
  assetRulesFor,
  isValidIsoDate,
  isSafePathFragment,
  normalizePosixPath,
} from './index.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LIVE = createRepoPaths('/tmp/repo-root')

function coreSourceFiles() {
  return fs.readdirSync(HERE)
    .filter((name) => (
      name.endsWith('.mjs')
      && !name.endsWith('.test.mjs')
      && name !== 'project-fs.mjs'
    ))
    .map((name) => path.join(HERE, name))
}

test('five kinds are unique, ordered, and field-complete', () => {
  const kinds = listContentKinds()
  assert.deepEqual(kinds.map((kind) => kind.id), [...CONTENT_KIND_IDS])
  assert.equal(new Set(kinds.map((kind) => kind.id)).size, 5)
  for (const kind of kinds) {
    assert.equal(getContentKind(kind.id), kind)
    for (const field of REQUIRED_KIND_FIELDS) {
      assert.notEqual(kind[field], undefined, `${kind.id} missing ${field}`)
      assert.notEqual(kind[field], null, `${kind.id} null ${field}`)
    }
    for (const field of REQUIRED_SCAN_FIELDS) assert.ok(field in kind.scan, `${kind.id}.scan.${field}`)
    for (const field of REQUIRED_ASSET_FIELDS) assert.ok(field in kind.assets, `${kind.id}.assets.${field}`)
    for (const field of REQUIRED_CREATION_FIELDS) assert.ok(field in kind.creation, `${kind.id}.creation.${field}`)
    for (const field of REQUIRED_VALIDATION_FIELDS) {
      assert.equal(typeof kind.validation[field], 'boolean', `${kind.id}.validation.${field}`)
    }
  }
})

test('research recent updates stay invisible; other current feed kinds stay visible', () => {
  assert.equal(getContentKind('research').recentVisible, false)
  assert.equal(isRecentVisible('research'), false)
  assert.ok(!recentVisibleKindIds().includes('research'))
  assert.deepEqual(recentVisibleKindIds(), [
    'weekly-life',
    'weekly-investment',
    'journey',
    'hermes',
  ])
})

test('unknown id throws; kinds are frozen', () => {
  assert.equal(hasContentKind('life'), false)
  assert.equal(hasContentKind('invest'), false)
  assert.throws(() => getContentKind('life'), /未知 ContentKind/)
  assert.throws(() => isRecentVisible('life'), /未知 ContentKind/)
  const kind = getContentKind('research')
  assert.ok(Object.isFrozen(kind))
  assert.ok(Object.isFrozen(kind.validation))
  assert.throws(() => {
    kind.recentVisible = true
  })
})

test('live weekly/journey path and asset rules stay aligned with repo-paths', () => {
  const life = getContentKind('weekly-life')
  const invest = getContentKind('weekly-investment')
  const journey = getContentKind('journey')

  assert.equal(life.contentDir, LIVE.KINDS.life.relDir)
  assert.equal(life.sidebarKey, LIVE.KINDS.life.sidebarKey)
  assert.equal(life.category, LIVE.KINDS.life.category)
  assert.equal(life.label, LIVE.KINDS.life.label)
  assert.equal(life.pageClass, LIVE.KINDS.life.pageClass)
  assert.equal(life.assets.directory, LIVE.KINDS.life.capability.assetDirectory)
  assert.equal(life.assets.urlPrefix, LIVE.KINDS.life.capability.assetUrlPrefix)
  assert.equal(life.creation.allowCreate, LIVE.KINDS.life.capability.allowCreate)
  assert.equal(contentFileName('weekly-life', { date: '2026-08-17' }), LIVE.KINDS.life.fileName('2026-08-17'))
  assert.equal(contentSiteLink('weekly-life', { date: '2026-08-17' }), LIVE.KINDS.life.siteLink('2026-08-17'))
  assert.equal(yearGroupTitle('weekly-life', 2026), LIVE.KINDS.life.yearText(2026))

  assert.equal(invest.contentDir, LIVE.KINDS.invest.relDir)
  assert.equal(invest.sidebarKey, LIVE.KINDS.invest.sidebarKey)
  assert.equal(invest.pageClass, LIVE.KINDS.invest.pageClass)
  assert.equal(invest.assets.directory, LIVE.KINDS.invest.capability.assetDirectory)
  assert.equal(contentFileName('weekly-investment', { date: '2026-08-17', theme: '那是抓不住的月亮' }), LIVE.KINDS.invest.fileName('2026-08-17', '那是抓不住的月亮'))
  assert.equal(contentSiteLink('weekly-investment', { date: '2026-08-17', theme: '那是抓不住的月亮' }), LIVE.KINDS.invest.siteLink('2026-08-17', '那是抓不住的月亮'))
  assert.equal(yearGroupTitle('weekly-investment', 2026), LIVE.KINDS.invest.yearText(2026))
  assert.equal(invest.validation.issueOptionalForOpening, true)
  assert.equal(invest.openingWithoutIssueLink, '/投资/周记/2026-08-08-写在投资笔记开始之前')
  assert.deepEqual(invest.scan.excludeBasenames, ['index.md', 'README.md'])
  assert.deepEqual(getContentKind('weekly-life').scan.excludeBasenames, ['index.md', 'README.md'])

  assert.equal(journey.contentDir, LIVE.KINDS.journey.relDir)
  assert.equal(journey.sidebarKey, LIVE.KINDS.journey.sidebarKey)
  assert.equal(journey.pageClass, LIVE.KINDS.journey.pageClass)
  assert.equal(journey.assets.directory, LIVE.KINDS.journey.capability.assetDirectory)
  assert.equal(journey.assets.urlPrefix, LIVE.KINDS.journey.capability.assetUrlPrefix)
  assert.equal(journey.creation.allowCreate, LIVE.KINDS.journey.capability.allowCreate)
  assert.equal(contentFileName('journey', { date: '2026-08-20' }), LIVE.KINDS.journey.fileName('2026-08-20'))
  assert.equal(contentSiteLink('journey', { date: '2026-08-20' }), LIVE.KINDS.journey.siteLink('2026-08-20'))
  assert.equal(yearGroupTitle('journey', 2026), LIVE.KINDS.journey.yearText(2026))
  assert.equal(yearGroupTitle('journey', 2026), '历程 · 2026年')
  assert.equal(journey.creation.namedChapters, 'blog-editor-only')
  assert.deepEqual(journey.namedChapterOrder, ['基础设施篇.md', '工具篇.md', 'cli篇.md', 'AI开支记录与优化.md'])
  assert.deepEqual(journey.namedChapterNesting, { '工具篇.md': ['cli篇.md'] })
  assert.equal(journey.namedChapterGroupText, '我的AI历程')
  assert.deepEqual(journey.seriesEntry, {
    text: '我的AI历程',
    link: '/AI与生活/我的AI历程/',
  })
  assert.equal(journey.lifeSidebarEnumeratesNamedChapters, false)
  assert.equal(journey.indexing, 'projected-posts')
  assert.equal(getContentKind('weekly-life').indexing, 'projected-posts')
  assert.equal(getContentKind('weekly-investment').indexing, 'projected-posts')
})

test('hermes and research path rules match live scan / hub conventions', () => {
  const hermes = getContentKind('hermes')
  const research = getContentKind('research')

  assert.equal(hermes.contentDir, 'docs/AI与生活/Hermes日记')
  assert.equal(hermes.sidebarKey, '/AI与生活/Hermes日记/')
  assert.equal(hermes.lifecycle, 'retired')
  assert.equal(hermes.indexing, 'file-is-index')
  assert.equal(hermes.creation.allowCreate, false)
  assert.equal(hermes.validation.forbidManualPosts, true)
  assert.equal(hermes.assets.directory, null)
  assert.equal(contentFileName('hermes', { date: '2026-08-12' }), '2026-08-12.md')
  assert.equal(contentFileName('hermes', { date: '2026-08-12', slug: '摘要' }), '2026-08-12-摘要.md')
  assert.equal(contentSiteLink('hermes', { stem: '2026-08-12' }), '/AI与生活/Hermes日记/2026-08-12')
  assert.equal(yearGroupTitle('hermes', 2026), null)

  assert.equal(research.contentDir, 'docs/投资/投研')
  assert.equal(research.sidebarKey, '/投资/投研/')
  assert.equal(research.indexing, 'not-in-posts')
  assert.equal(research.validation.forbidManualPosts, true)
  assert.equal(research.creation.allowCreate, false)
  assert.ok(research.creation.surfaces.includes('blog-editor'))
  assert.deepEqual(research.pageClass, [
    'research-index',
    'industry-index',
    'map-index',
    'subject-index',
  ])
  assert.equal(contentFileName('research'), 'index.md')
  assert.equal(contentSiteLink('research', { segments: ['医药', '药明康德'] }), '/投资/投研/医药/药明康德/')
  assert.equal(
    contentSiteLink('research', { relativeFile: 'docs/投资/投研/医药/药明康德/index.md' }),
    '/投资/投研/医药/药明康德/',
  )
})

test('path classification keeps nested life-family dirs distinct', () => {
  assert.equal(kindIdForPath('docs/AI与生活/2026-08-17.md'), 'weekly-life')
  assert.equal(kindIdForPath('docs/投资/周记/2026-08-17-那是抓不住的月亮.md'), 'weekly-investment')
  assert.equal(kindIdForPath('docs/AI与生活/我的AI历程/2026-08-20.md'), 'journey')
  assert.equal(kindIdForPath('docs/AI与生活/我的AI历程/基础设施篇.md'), 'journey')
  assert.equal(kindIdForPath('docs/AI与生活/Hermes日记/2026-08-12.md'), 'hermes')
  assert.equal(kindIdForPath('docs/投资/投研/医药/药明康德/index.md'), 'research')

  assert.equal(kindIdForPath('docs/AI与生活/index.md'), null)
  assert.equal(kindIdForPath('docs/AI与生活/README.md'), null)
  assert.equal(kindIdForPath('docs/投资/周记/index.md'), null)
  assert.equal(kindIdForPath('docs/投资/周记/README.md'), null)
  assert.equal(kindIdForPath('docs/AI与生活/我的AI历程/index.md'), null)
  assert.equal(kindIdForPath('docs/AI与生活/我的AI历程/README.md'), null)
  assert.equal(kindIdForPath('docs/AI与生活/Hermes日记/index.md'), null)
  assert.equal(kindIdForPath('docs/AI与生活/Hermes日记/README.md'), null)
  assert.equal(kindIdForPath('docs/投资/投研/互联网/腾讯/README.md'), null)
  assert.equal(kindIdForPath('docs/AI与生活/大事件/2026.md'), null)
  assert.equal(isManagedContentPath('docs/AI与生活/大事件/2026.md'), false)

  assert.equal(matchesKindPath('weekly-life', 'docs/AI与生活/我的AI历程/工具篇.md'), false)
  assert.equal(matchesKindPath('weekly-life', 'docs/AI与生活/Hermes日记/2026-08-12.md'), false)
  assert.equal(matchesKindAssetPath('weekly-life', 'docs/public/images/weekly/2026-08-17-01.webp'), true)
  assert.equal(matchesKindAssetPath('journey', 'docs/public/images/journey/infra-cover.png'), true)
  assert.equal(matchesKindAssetPath('research', 'docs/public/images/weekly/x.webp'), false)
  assert.equal(assetRulesFor('weekly-investment').directory, 'docs/public/images/weekly')
})

test('post query helpers classify kinds and hide research from recent', () => {
  const items = [
    { title: 'research', date: '2026-08-21', category: '投资', type: 'research', link: '/投资/投研/医药/药明康德/' },
    { title: 'life', date: '2026-08-17', category: 'AI与生活', type: 'weekly', link: '/AI与生活/2026-08-17' },
    { title: 'invest', date: '2026-08-17', category: '投资', type: 'weekly', link: '/投资/周记/2026-08-17-x' },
    { title: 'journey', date: '2026-08-18', category: 'AI与生活', type: 'journey', link: '/AI与生活/我的AI历程/AI开支记录与优化' },
    { title: 'hermes', date: '2026-08-12', category: 'AI与生活', type: 'hermes', link: '/AI与生活/Hermes日记/2026-08-12' },
  ]

  assert.equal(kindIdForPost(items[0]), 'research')
  assert.equal(kindIdForPost(items[1]), 'weekly-life')
  assert.equal(kindIdForPost(items[2]), 'weekly-investment')
  assert.equal(kindIdForPost(items[3]), 'journey')
  assert.equal(kindIdForPost(items[4]), 'hermes')
  assert.equal(isRecentVisiblePost(items[0]), false)
  assert.equal(isRecentVisiblePost(items[1]), true)

  const recent = selectRecentPosts(items, 8)
  assert.deepEqual(recent.map((item) => item.title), ['journey', 'life', 'invest', 'hermes'])
  assert.ok(recent.every((item) => item.type !== 'research'))

  const investArchive = postsByCategory(items, '投资', 'weekly')
  assert.deepEqual(investArchive.map((item) => item.title), ['invest'])
})

test('recent sorts by revisionDate ?? date; latest issue stays on date only', () => {
  const items = [
    {
      title: 'old-weekly-revised',
      date: '2026-08-10',
      revisionDate: '2026-08-22',
      category: '投资',
      type: 'weekly',
      issue: 1,
      link: '/投资/周记/2026-08-10-old',
    },
    {
      title: 'newer-weekly',
      date: '2026-08-17',
      category: '投资',
      type: 'weekly',
      issue: 2,
      link: '/投资/周记/2026-08-17-new',
    },
    {
      title: 'journey-plain',
      date: '2026-08-18',
      category: 'AI与生活',
      type: 'journey',
      link: '/AI与生活/我的AI历程/AI开支记录与优化',
    },
    {
      title: 'hermes-with-bogus-revision',
      date: '2026-08-12',
      revisionDate: '2026-08-25',
      category: 'AI与生活',
      type: 'hermes',
      link: '/AI与生活/Hermes日记/2026-08-12',
    },
  ]

  assert.equal(freshnessDate(items[0]), '2026-08-22')
  assert.equal(freshnessDate(items[1]), '2026-08-17')
  assert.equal(freshnessDate(items[3]), '2026-08-12')

  const recent = selectRecentPosts(items, 8)
  assert.deepEqual(recent.map((item) => item.title), [
    'old-weekly-revised',
    'journey-plain',
    'newer-weekly',
    'hermes-with-bogus-revision',
  ])

  const latestInvest = postsByCategory(items, '投资', 'weekly')[0]
  assert.equal(latestInvest.title, 'newer-weekly')
  assert.equal(latestInvest.date, '2026-08-17')
})

test('postsByCategory same-day order is deterministic via issue then link; never revisionDate', () => {
  const items = [
    {
      title: 'b-link',
      date: '2026-08-17',
      revisionDate: '2026-08-30',
      category: '投资',
      type: 'weekly',
      issue: 1,
      link: '/投资/周记/2026-08-17-b',
    },
    {
      title: 'a-link',
      date: '2026-08-17',
      category: '投资',
      type: 'weekly',
      issue: 1,
      link: '/投资/周记/2026-08-17-a',
    },
    {
      title: 'issue-2',
      date: '2026-08-17',
      category: '投资',
      type: 'weekly',
      issue: 2,
      link: '/投资/周记/2026-08-17-z',
    },
  ]
  const ranked = postsByCategory(items, '投资', 'weekly')
  assert.deepEqual(ranked.map((item) => item.title), ['issue-2', 'a-link', 'b-link'])
  assert.equal(ranked[0].title, 'issue-2')
})

test('date and path fragments reject traversal and illegal characters', () => {
  assert.equal(isValidIsoDate('2026-08-17'), true)
  assert.equal(isValidIsoDate('20260817'), false)
  assert.equal(isSafePathFragment('那是抓不住的月亮'), true)
  assert.equal(isSafePathFragment('..'), false)
  assert.equal(isSafePathFragment('.'), false)
  assert.equal(isSafePathFragment('a/b'), false)
  assert.equal(isSafePathFragment('a\\b'), false)
  assert.equal(isSafePathFragment('a:b'), false)
  assert.equal(normalizePosixPath('docs/投资/投研/../周记/x.md'), 'docs/投资/周记/x.md')

  assert.equal(contentFileName('weekly-investment', { date: '2026-08-17', theme: '那是抓不住的月亮' }), '2026-08-17-那是抓不住的月亮.md')
  assert.equal(contentSiteLink('weekly-investment', { date: '2026-08-17', theme: '那是抓不住的月亮' }), '/投资/周记/2026-08-17-那是抓不住的月亮')
  assert.equal(contentFileName('journey', { name: '基础设施篇' }), '基础设施篇.md')
  assert.equal(
    contentSiteLink('research', { relativeFile: 'docs/投资/投研/医药/药明康德/index.md' }),
    '/投资/投研/医药/药明康德/',
  )

  assert.throws(() => contentFileName('weekly-life', { date: '20260817' }), /YYYY-MM-DD/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026/08/17', theme: '主题' }), /YYYY-MM-DD/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: '../x' }), /非法路径片段/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: 'a/b' }), /非法路径片段/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: 'a\\b' }), /非法路径片段/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: 'a:b' }), /非法路径片段/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: 'a<b>' }), /非法路径片段/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: 'a\0b' }), /非法路径片段/)
  assert.throws(() => contentFileName('weekly-investment', { date: '2026-08-17', theme: 'a*b' }), /非法路径片段/)
  assert.throws(() => contentFileName('journey', { name: '..' }), /非法路径片段/)
  assert.throws(() => contentSiteLink('research', { relativeFile: 'docs/投资/投研/../周记/x.md' }), /必须位于/)
  assert.throws(() => contentSiteLink('research', { relativeFile: 'docs/投资/周记/x.md' }), /必须位于/)
  assert.throws(() => contentSiteLink('research', { relativeFile: 'docs/投资/投研/../../AI与生活/x.md' }), /必须位于/)
  assert.throws(() => contentSiteLink('research', { segments: ['..', '周记'] }), /非法路径片段/)
  assert.throws(() => contentSiteLink('hermes', { stem: '../2026-08-12' }), /非法|YYYY-MM-DD/)
})

test('core module source has no fs, VitePress, Vue, or panel imports', () => {
  const forbidden = [
    /from\s+['"]node:fs['"]/,
    /from\s+['"]fs['"]/,
    /from\s+['"]vitepress['"]/,
    /from\s+['"]vue['"]/,
    /from\s+['"][^'"]*panel\//,
    /from\s+['"][^'"]*docs\/\.vitepress/,
  ]
  for (const file of coreSourceFiles()) {
    const source = fs.readFileSync(file, 'utf8')
    for (const pattern of forbidden) {
      assert.equal(pattern.test(source), false, `${path.basename(file)} matches ${pattern}`)
    }
  }
})
