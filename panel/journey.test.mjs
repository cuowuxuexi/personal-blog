import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createRepoPaths } from './lib/paths.mjs'
import { allowsCreate, publicKindCapability } from './lib/repo-paths.mjs'
import {
  appendEntry,
  applyDraft,
  currentIssue,
  listIssues,
  nextIssueNumber,
  parseEntries,
  serializeEntry,
} from './lib/weekly.mjs'
import { getContentKind } from '../content-catalog/index.mjs'
import { projectManagedPostsFromFs } from '../content-catalog/project-fs.mjs'

const JOURNEY_WITH_ENTRY = `---
title: 基础设施篇
date: 2026-08-12
category: AI与生活
type: journey
description: 测试篇章
pageClass: weekly-post weekly-post--life
---

# 基础设施篇

<p class="weekly-theme-cover">
  <img src="/images/journey/infra-cover.png" alt="cover" />
</p>

<p class="weekly-theme-caption">caption</p>

<div class="weekly-fireworks-section">

<div class="weekly-outline-only" aria-hidden="true">

### 已有一条

</div>

<WeeklyEntry
  tags="测试"
  title="已有一条"
>
篇章正文
</WeeklyEntry>

</div>
`

const JOURNEY_EMPTY = `---
title: AI开支记录与优化
date: 2026-08-18
category: AI与生活
type: journey
description: 空篇章
pageClass: weekly-post weekly-post--life
---

# AI开支记录与优化

<div class="weekly-fireworks-section">

</div>
`

const JOURNEY_INDEX = `---
title: 我的AI历程
---

# 我的AI历程
`

function writeJourneyFixture(dir, extras = {}) {
  const journeyDir = path.join(dir, 'docs', 'AI与生活', '我的AI历程')
  fs.mkdirSync(journeyDir, { recursive: true })
  fs.mkdirSync(path.join(dir, 'docs', '.vitepress'), { recursive: true })
  fs.writeFileSync(path.join(journeyDir, '基础设施篇.md'), extras.infra || JOURNEY_WITH_ENTRY)
  fs.writeFileSync(path.join(journeyDir, '工具篇.md'), (extras.tools || JOURNEY_WITH_ENTRY).replaceAll('基础设施篇', '工具篇'))
  fs.writeFileSync(path.join(journeyDir, 'AI开支记录与优化.md'), extras.spend || JOURNEY_EMPTY)
  fs.writeFileSync(path.join(journeyDir, 'index.md'), JOURNEY_INDEX)
  fs.writeFileSync(path.join(journeyDir, 'README.md'), '# readme\n')
  if (extras.dated) {
    fs.writeFileSync(path.join(journeyDir, '2026-08-12.md'), extras.dated)
  }
  fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), `const manualPosts: PostItem[] = [
  {
    title: "基础设施篇",
    date: "2026-08-12",
    category: "AI与生活",
    type: 'journey',
    link: "/AI与生活/我的AI历程/基础设施篇",
    description: "测试篇章",
  },
]
`)
  fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), `export default {
  themeConfig: {
    sidebar: {
      '/AI与生活/': [
        {
          text: '我的AI历程',
          collapsed: false,
          items: [
            { text: '基础设施篇', link: '/AI与生活/我的AI历程/基础设施篇' },
          ],
        },
      ],
      '/AI与生活/我的AI历程/': [
        {
          text: 'AI与生活',
          items: [
            { text: '最新周记', link: '/AI与生活/' },
          ],
        },
        {
          text: '我的AI历程',
          collapsed: false,
          items: [
            { text: '系列入口', link: '/AI与生活/我的AI历程/' },
            { text: '基础设施篇', link: '/AI与生活/我的AI历程/基础设施篇' },
          ],
        },
      ],
    },
  },
}
`)
  return createRepoPaths(dir)
}

function withFixture(extras, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-journey-'))
  try {
    return fn({ dir, paths: writeJourneyFixture(dir, extras) })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('journey capability is explicit and allows create', () => {
  const paths = createRepoPaths(process.cwd())
  const kind = paths.KINDS.journey
  const capability = publicKindCapability(kind)
  assert.equal(kind.id, 'journey')
  assert.equal(kind.label, '我的AI历程')
  assert.equal(kind.category, 'AI与生活')
  assert.equal(kind.pageClass, 'weekly-post weekly-post--life')
  assert.equal(capability.contentType, 'journey')
  assert.equal(capability.allowCreate, true)
  assert.equal(capability.selectorLabel, '期数与篇章')
  assert.equal(capability.headingAnchor, '')
  assert.equal(capability.assetDirectory, 'docs/public/images/journey')
  assert.equal(capability.assetUrlPrefix, '/images/journey/')
  assert.equal(capability.wechatTheme, 'life')
  assert.equal(capability.publishScope, 'journey')
  assert.equal(allowsCreate(kind), true)
  assert.equal(allowsCreate(paths.KINDS.life), true)
})

test('lists journey chapters in content-catalog typed IA order and starts issue numbers at 1', () => {
  const chapters = listIssues('journey')
  const expectedNames = getContentKind('journey').namedChapterOrder
  assert.deepEqual(chapters.map((item) => item.name), expectedNames)
  assert.deepEqual(chapters.map((item) => item.link), expectedNames.map(
    (name) => `/AI与生活/我的AI历程/${name.replace(/\.md$/i, '')}`,
  ))
  assert.ok(chapters.every((item) => item.issue == null))
  assert.ok(chapters.every((item) => item.kind === 'journey'))
  assert.ok(chapters.every((item) => item.rel.startsWith('docs/AI与生活/我的AI历程/')))
  assert.equal(chapters.some((item) => item.name === 'index.md' || item.name === 'README.md'), false)
  assert.equal(currentIssue('journey')?.title, '基础设施篇')
  assert.equal(currentIssue('journey')?.issue, null)
  assert.equal(nextIssueNumber('journey'), 1)
})

test('journey listing ignores index and readme but keeps dated issues', () => {
  withFixture({
    dated: `---
title: 第001期-出现
date: 2026-08-12
type: journey
issue: 1
---

# 第001期-出现
`,
  }, ({ paths }) => {
    const chapters = listIssues('journey', paths)
    assert.deepEqual(chapters.map((item) => item.name), [
      '2026-08-12.md',
      '基础设施篇.md',
      '工具篇.md',
      'AI开支记录与优化.md',
    ])
    assert.equal(currentIssue('journey', paths)?.title, '第001期-出现')
    assert.equal(nextIssueNumber('journey', paths), 2)
  })
})

test('journey applyDraft appends, edits and deletes only the target chapter', () => {
  withFixture({}, ({ dir, paths }) => {
    const infra = path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md')
    const tools = path.join(dir, 'docs', 'AI与生活', '我的AI历程', '工具篇.md')
    const toolsBefore = fs.readFileSync(tools, 'utf8')

    const appended = applyDraft({
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: { title: '新服务', body: '用途与判断', tags: ['开支'] },
    }, paths)
    assert.equal(appended.mode, 'append')
    assert.equal(appended.commitHint, 'journey: 基础设施篇 追加「新服务」')
    assert.equal(appended.previewLink, '/AI与生活/我的AI历程/基础设施篇')
    assert.deepEqual(appended.files.filter((file) => file.endsWith('.md')), [
      'docs/AI与生活/我的AI历程/基础设施篇.md',
    ])
    const afterAppend = fs.readFileSync(infra, 'utf8')
    const appendedEntries = parseEntries(afterAppend)
    assert.equal(appendedEntries.length, 2)
    assert.equal(appendedEntries.at(-1).title, '新服务')
    assert.equal(fs.readFileSync(tools, 'utf8'), toolsBefore)

    const edited = applyDraft({
      kindId: 'journey',
      mode: 'edit',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entryIndex: 1,
      entry: { title: '新服务', body: '修订后的判断', tags: ['开支'] },
    }, paths)
    assert.equal(edited.commitHint, 'journey: 基础设施篇 修订「新服务」')
    assert.match(fs.readFileSync(infra, 'utf8'), /修订后的判断/)
    assert.equal(parseEntries(fs.readFileSync(infra, 'utf8')).length, 2)

    const deleted = applyDraft({
      kindId: 'journey',
      mode: 'delete',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entryIndex: 1,
    }, paths)
    assert.equal(deleted.commitHint, 'journey: 基础设施篇 删除「新服务」')
    assert.equal(parseEntries(fs.readFileSync(infra, 'utf8')).length, 1)
    assert.doesNotMatch(fs.readFileSync(infra, 'utf8'), /修订后的判断/)
    assert.equal(fs.readFileSync(tools, 'utf8'), toolsBefore)
    assert.ok(!deleted.files.some((f) => f.endsWith('posts.ts') || f.endsWith('config.mts')))
  })
})

test('empty journey chapter accepts the first entry and remains appendable after deleting the last', () => {
  withFixture({}, ({ dir, paths }) => {
    const spend = path.join(dir, 'docs', 'AI与生活', '我的AI历程', 'AI开支记录与优化.md')
    const first = applyDraft({
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/AI开支记录与优化',
      entry: { title: '第一条', body: '空容器追加。' },
    }, paths)
    assert.equal(first.commitHint, 'journey: AI开支记录与优化 追加「第一条」')
    assert.equal(parseEntries(fs.readFileSync(spend, 'utf8')).length, 1)
    assert.match(fs.readFileSync(spend, 'utf8'), /class="weekly-fireworks-section"/)

    applyDraft({
      kindId: 'journey',
      mode: 'delete',
      issueLink: '/AI与生活/我的AI历程/AI开支记录与优化',
      entryIndex: 0,
    }, paths)
    const emptied = fs.readFileSync(spend, 'utf8')
    assert.equal(parseEntries(emptied).length, 0)
    assert.match(emptied, /<div class="weekly-fireworks-section">/)
    assert.match(emptied, /<\/div>\s*$/)

    applyDraft({
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/AI开支记录与优化',
      entry: { title: '再来一条', body: '删除后再追加。' },
    }, paths)
    const again = parseEntries(fs.readFileSync(spend, 'utf8'))
    assert.equal(again.length, 1)
    assert.equal(again[0].title, '再来一条')
  })
})

test('missing or duplicate fireworks sections are rejected before write', () => {
  const entry = serializeEntry({ title: '不该写入', body: '拒绝' })
  assert.throws(
    () => appendEntry('# 无容器\n\n正文\n', entry),
    /缺少条目容器/,
  )
  assert.throws(
    () => appendEntry([
      '<div class="weekly-fireworks-section">',
      '',
      '</div>',
      '',
      '<div class="weekly-fireworks-section">',
      '',
      '</div>',
      '',
    ].join('\n'), entry),
    /重复/,
  )
  assert.throws(
    () => appendEntry('<div class="weekly-fireworks-section">\n\n未闭合\n', entry),
    /结构异常/,
  )
})

test('journey newIssue writes a dated issue; missing issueLink still rejected', () => {
  withFixture({}, ({ dir, paths }) => {
    const infra = path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md')
    const infraBefore = fs.readFileSync(infra, 'utf8')
    const created = applyDraft({
      kindId: 'journey',
      mode: 'newIssue',
      entry: { title: '开篇', body: '历程第一期' },
      issue: { theme: '底座', date: '2026-08-18', caption: '一句说明' },
    }, paths)
    assert.equal(created.mode, 'newIssue')
    assert.equal(created.previewLink, '/AI与生活/我的AI历程/2026-08-18')
    assert.match(created.commitHint, /^journey: 第001期-底座$/)
    const file = path.join(dir, 'docs', 'AI与生活', '我的AI历程', '2026-08-18.md')
    assert.equal(fs.existsSync(file), true)
    const raw = fs.readFileSync(file, 'utf8')
    assert.match(raw, /type: journey/)
    assert.match(raw, /# 第001期-底座/)
    assert.match(raw, /一句说明/)
    assert.match(raw, /开篇/)
    assert.match(raw, /weekly-theme-cover/)
    assert.deepEqual(
      created.files.filter((f) => f.endsWith('.ts') || f.endsWith('.mts')),
      [],
    )
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), /第001期-底座/)
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8'), /第001期-底座/)
    const projected = projectManagedPostsFromFs(dir)
    assert.ok(projected.some((p) => p.link === '/AI与生活/我的AI历程/2026-08-18' && p.title === '第001期-底座'))
    assert.equal(fs.readFileSync(infra, 'utf8'), infraBefore)
    assert.throws(
      () => applyDraft({
        kindId: 'journey',
        mode: 'append',
        entry: { title: '无篇章', body: '缺少链接' },
      }, paths),
      /明确选择篇章/,
    )
  })
})

test('journey editChrome updates a named chapter header without renaming the file', () => {
  withFixture({}, ({ dir, paths }) => {
    const file = path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md')
    const result = applyDraft({
      kindId: 'journey',
      mode: 'editChrome',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      issue: {
        theme: '底座修订',
        caption: '改过的历程说明',
        cover: '/images/journey/new-cover.webp',
      },
    }, paths)
    assert.equal(result.mode, 'editChrome')
    assert.equal(result.previewLink, '/AI与生活/我的AI历程/基础设施篇')
    assert.equal(fs.existsSync(file), true)
    const raw = fs.readFileSync(file, 'utf8')
    assert.match(raw, /^title: 基础设施篇$/m)
    assert.match(raw, /^# 基础设施篇$/m)
    assert.doesNotMatch(raw, /底座修订/)
    assert.match(raw, /改过的历程说明/)
    assert.match(raw, /new-cover\.webp/)
    assert.equal(parseEntries(raw).length, 1)
    assert.deepEqual(
      result.files.filter((f) => f.endsWith('.ts') || f.endsWith('.mts')),
      [],
    )
    const postsBefore = `基础设施篇`
    assert.match(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), new RegExp(postsBefore))
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), /底座修订/)
    const config = fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8')
    assert.doesNotMatch(config, /底座修订/)
  })
})

test('journey named chapter can edit cover and caption without a theme', () => {
  withFixture({}, ({ dir, paths }) => {
    const result = applyDraft({
      kindId: 'journey',
      mode: 'editChrome',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      issue: {
        caption: '只改说明',
        cover: '/images/journey/only-cover.webp',
      },
    }, paths)
    assert.equal(result.mode, 'editChrome')
    const raw = fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), 'utf8')
    assert.match(raw, /^# 基础设施篇$/m)
    assert.match(raw, /只改说明/)
    assert.match(raw, /only-cover\.webp/)
  })
})

test('journey editChrome on a dated issue keeps the date-only path', () => {
  withFixture({}, ({ dir, paths }) => {
    applyDraft({
      kindId: 'journey',
      mode: 'newIssue',
      entry: { title: '开篇', body: '历程第一期' },
      issue: { theme: '底座', date: '2026-08-18' },
    }, paths)
    const result = applyDraft({
      kindId: 'journey',
      mode: 'editChrome',
      issueLink: '/AI与生活/我的AI历程/2026-08-18',
      issue: { theme: '看清楚', caption: '新说明' },
    }, paths)
    assert.equal(result.previewLink, '/AI与生活/我的AI历程/2026-08-18')
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '2026-08-18.md')), true)
    const raw = fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '2026-08-18.md'), 'utf8')
    assert.match(raw, /# 第001期-看清楚/)
    assert.match(raw, /新说明/)
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), /第001期-看清楚/)
    assert.ok(!result.files.some((f) => f.endsWith('posts.ts') || f.endsWith('config.mts')))
  })
})

test('journey duplicate entry fingerprint is rejected', () => {
  withFixture({}, ({ dir, paths }) => {
    const entry = { title: '重复一条', body: '同一指纹', tags: ['测试'] }
    applyDraft({
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry,
    }, paths)
    const count = parseEntries(fs.readFileSync(
      path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'),
      'utf8',
    )).length
    assert.throws(
      () => applyDraft({
        kindId: 'journey',
        mode: 'append',
        issueLink: '/AI与生活/我的AI历程/基础设施篇',
        entry,
      }, paths),
      /重复|已经存在/,
    )
    assert.equal(parseEntries(fs.readFileSync(
      path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'),
      'utf8',
    )).length, count)
  })
})
