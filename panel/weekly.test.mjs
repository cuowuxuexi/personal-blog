import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createRepoPaths } from './lib/paths.mjs'
import {
  appendEntry,
  applyDraft,
  applyIssueChrome,
  parseEntries,
  parseFrontmatter,
  replaceEntry,
  removeEntry,
  serializeEntry,
  listIssues,
  insertManualPost,
  insertSidebarItem,
  themeFromTitle,
  updateManualPost,
  updateSidebarItem,
} from './lib/weekly.mjs'

const lifeFile = new URL('../docs/AI与生活/2026-08-12.md', import.meta.url)
const investFile = new URL('../docs/投资/周记/2026-08-13-看烟花.md', import.meta.url)
const postsFile = new URL('../docs/.vitepress/posts.ts', import.meta.url)
const configFile = new URL('../docs/.vitepress/config.mts', import.meta.url)

test('parses life weekly entries', () => {
  const raw = fs.readFileSync(lifeFile, 'utf8')
  const { fm, body } = parseFrontmatter(raw)
  const entries = parseEntries(body)
  assert.equal(fm.issue, 1)
  assert.ok(entries.length >= 3)
  assert.equal(entries[0].title, '天上掉下来的 400 刀')
  assert.ok(entries[0].tags.includes('惊喜'))
  assert.ok(entries[0].image.startsWith('/images/weekly/'))
  assert.ok(entries[0].body.includes('💡'))
})

test('round-trips an edited life entry', () => {
  const raw = fs.readFileSync(lifeFile, 'utf8').replace(/\r\n/g, '\n')
  const { body } = parseFrontmatter(raw)
  const [first] = parseEntries(body)
  const next = replaceEntry(raw, 0, serializeEntry({
    ...first,
    title: first.title,
    body: first.body,
  }))
  const again = parseEntries(parseFrontmatter(next).body)
  assert.equal(again[0].title, first.title)
  assert.equal(again[0].linkHref, first.linkHref)
  assert.equal(again[0].image, first.image)
  assert.ok(again[0].body.includes('Cursor Ultra'))
})

test('editing a later entry leaves earlier entries alone', () => {
  const raw = fs.readFileSync(lifeFile, 'utf8').replace(/\r\n/g, '\n')
  const entries = parseEntries(raw)
  assert.ok(entries.length >= 3, '需要多条条目才能验证')
  const last = entries.at(-1)
  const next = replaceEntry(raw, last.index, serializeEntry({
    ...last,
    title: '改了最后一条',
  }))
  const after = parseEntries(next)
  assert.equal(after.length, entries.length)
  assert.equal(after[0].title, entries[0].title)
  assert.equal(after.at(-1).title, '改了最后一条')
})

test('removing one entry deletes only its outline and WeeklyEntry block', () => {
  const raw = fs.readFileSync(lifeFile, 'utf8').replace(/\r\n/g, '\n')
  const before = parseEntries(raw)
  assert.ok(before.length >= 2)
  const next = removeEntry(raw, before.length - 1)
  const after = parseEntries(next)
  assert.equal(after.length, before.length - 1)
  assert.deepEqual(after.map((entry) => entry.title), before.slice(0, -1).map((entry) => entry.title))
})

test('each entry keeps its own outline heading', () => {
  const raw = fs.readFileSync(lifeFile, 'utf8').replace(/\r\n/g, '\n')
  const entries = parseEntries(raw)
  for (const entry of entries) {
    const slice = raw.slice(entry.rawStart, entry.rawEnd)
    assert.equal(
      (slice.match(/<WeeklyEntry\b/g) || []).length,
      1,
      `条目 #${entry.index} 的范围吞掉了别的条目`,
    )
    assert.ok(slice.includes(`### ${entry.title}`))
  }
})

test('appends after the last WeeklyEntry', () => {
  const raw = fs.readFileSync(investFile, 'utf8').replace(/\r\n/g, '\n')
  const before = parseEntries(raw).length
  const next = appendEntry(raw, serializeEntry({
    title: '测试追加',
    tags: ['测试'],
    body: '这是一条测试。',
  }))
  const entries = parseEntries(next)
  assert.equal(entries.length, before + 1)
  assert.equal(entries.at(-1).title, '测试追加')
  assert.match(next, /<\/WeeklyEntry>\s*\n\s*<\/div>\s*$/)
})

test('lists numbered issues', () => {
  const life = listIssues('life')
  const invest = listIssues('invest')
  assert.ok(life.some((item) => item.issue === 1))
  assert.ok(invest.some((item) => item.issue === 1))
  assert.ok(invest.some((item) => item.issue == null))
})

test('life listing stays on dated weekly files', () => {
  const life = listIssues('life')
  assert.equal(life.some((item) => item.title === '基础设施篇'), false)
  assert.ok(life.every((item) => item.link.startsWith('/AI与生活/') && !item.link.includes('我的AI历程')))
})

test('empty weekly fireworks heading still accepts the first entry', () => {
  const raw = `---
title: 空周记
type: weekly
---

# 空周记

<div class="weekly-fireworks-section">

## <img class="weekly-section-icon" src="/images/hero-fireworks.png" alt="" /> 看烟花！！！ {#kan-yanhua}

</div>
`
  const next = appendEntry(raw, serializeEntry({
    title: '第一条',
    tags: ['测试'],
    body: '空容器追加。',
  }))
  const entries = parseEntries(next)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].title, '第一条')
  assert.match(next, /\{#kan-yanhua\}/)
  assert.match(next, /<\/WeeklyEntry>\s*\n\s*<\/div>\s*$/)
})

test('inserts posts.ts and sidebar items (legacy surgery helpers, unused by applyDraft)', () => {
  const posts = insertManualPost(`const manualPosts: PostItem[] = [
  {
    title: "第001期-看烟花",
    date: "2026-08-12",
    category: "AI与生活",
    type: 'weekly',
    issue: 1,
    link: "/AI与生活/2026-08-12",
  },
]
`, {
    title: '第002期-测试',
    date: '2026-08-14',
    category: 'AI与生活',
    issue: 2,
    link: '/AI与生活/2026-08-14',
    description: '测试',
  })
  assert.match(posts, /title: "第002期-测试"/)
  assert.ok(posts.indexOf('第002期-测试') < posts.indexOf('第001期-看烟花'))

  const config = insertSidebarItem(`export default {
  themeConfig: {
    sidebar: {
      '/AI与生活/': [
        { text: 'AI与生活', items: [] },
        {
          text: '周记 · 2026年',
          collapsed: false,
          items: [
            { text: '第001期-看烟花', link: '/AI与生活/2026-08-12' },
          ],
        },
      ],
    },
  },
}
`, {
    sidebarKey: '/AI与生活/',
    yearText: '周记 · 2026年',
    title: '第002期-测试',
    link: '/AI与生活/2026-08-14',
  })
  assert.match(config, /text: '第002期-测试'/)
  const yearAt = config.indexOf("text: '周记 · 2026年'")
  const newAt = config.indexOf("text: '第002期-测试'")
  const oldAt = config.indexOf("text: '第001期-看烟花'", yearAt)
  assert.ok(newAt > yearAt && newAt < oldAt)
})

test('themeFromTitle reads the part after 第N期-', () => {
  assert.equal(themeFromTitle('第002期-待定'), '待定')
  assert.equal(themeFromTitle('基础设施篇'), '')
})

test('applyIssueChrome updates title, caption and cover without touching entries', () => {
  const raw = fs.readFileSync(lifeFile, 'utf8').replace(/\r\n/g, '\n')
  const before = parseEntries(raw)
  const next = applyIssueChrome(raw, {
    title: '第001期-改过的主题',
    caption: '新的一句说明',
    cover: '/images/weekly/new-cover.webp',
  })
  const { fm } = parseFrontmatter(next)
  assert.equal(fm.title, '第001期-改过的主题')
  assert.match(next, /^# 第001期-改过的主题$/m)
  assert.match(next, /<p class="weekly-theme-caption">新的一句说明<\/p>/)
  assert.match(next, /src="\/images\/weekly\/new-cover\.webp"/)
  assert.deepEqual(parseEntries(next).map((entry) => entry.title), before.map((entry) => entry.title))
})

const WEEKLY_CHROME = `---
title: "第001期-看烟花"
date: "2026-08-12"
category: "AI与生活"
type: weekly
issue: 1
description: "测试"
pageClass: "weekly-post weekly-post--life"
---

# 第001期-看烟花

<p class="weekly-theme-cover">
  <img src="/images/hero-fireworks.png" alt="cover" />
</p>

<p class="weekly-theme-caption">旧说明</p>

<div class="weekly-fireworks-section">

<div class="weekly-outline-only" aria-hidden="true">

### 已有一条

</div>

<WeeklyEntry
  tags="测试"
  title="已有一条"
>
正文
</WeeklyEntry>

</div>
`

function writeWeeklyChromeFixture(dir) {
  const life = path.join(dir, 'docs', 'AI与生活', '2026-08-12.md')
  const invest = path.join(dir, 'docs', '投资', '周记', '2026-08-13-待定.md')
  fs.mkdirSync(path.dirname(life), { recursive: true })
  fs.mkdirSync(path.dirname(invest), { recursive: true })
  fs.mkdirSync(path.join(dir, 'docs', '.vitepress'), { recursive: true })
  fs.writeFileSync(life, WEEKLY_CHROME)
  fs.writeFileSync(invest, WEEKLY_CHROME
    .replaceAll('AI与生活', '投资')
    .replaceAll('weekly-post--life', 'weekly-post--invest')
    .replaceAll('2026-08-12', '2026-08-13')
    .replaceAll('看烟花', '待定'))
  fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), `const manualPosts: PostItem[] = [
  {
    title: "第001期-待定",
    date: "2026-08-13",
    category: "投资",
    type: 'weekly',
    issue: 1,
    link: "/投资/周记/2026-08-13-待定",
    description: "测试",
  },
  {
    title: "第001期-看烟花",
    date: "2026-08-12",
    category: "AI与生活",
    type: 'weekly',
    issue: 1,
    link: "/AI与生活/2026-08-12",
    description: "测试",
  },
]
`)
  fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), `export default {
  themeConfig: {
    sidebar: {
      '/AI与生活/': [
        {
          text: '周记 · 2026年',
          collapsed: false,
          items: [
            { text: '第001期-看烟花', link: '/AI与生活/2026-08-12' },
          ],
        },
      ],
      '/投资/周记/': [
        {
          text: '2026年',
          collapsed: false,
          items: [
            { text: '第001期-待定', link: '/投资/周记/2026-08-13-待定' },
          ],
        },
      ],
    },
  },
}
`)
  return createRepoPaths(dir)
}

test('editChrome updates a life issue header and leaves the entry', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-chrome-'))
  try {
    const paths = writeWeeklyChromeFixture(dir)
    const result = applyDraft({
      kindId: 'life',
      mode: 'editChrome',
      issueLink: '/AI与生活/2026-08-12',
      issue: {
        theme: '改过的主题',
        caption: '新的一句说明',
        cover: '/images/weekly/new-cover.webp',
      },
    }, paths)
    assert.equal(result.mode, 'editChrome')
    assert.equal(result.previewLink, '/AI与生活/2026-08-12')
    assert.match(result.commitHint, /修订期头/)
    const raw = fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '2026-08-12.md'), 'utf8')
    assert.match(raw, /# 第001期-改过的主题/)
    assert.match(raw, /新的一句说明/)
    assert.match(raw, /new-cover\.webp/)
    assert.equal(parseEntries(raw).length, 1)
    assert.match(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), /第001期-改过的主题/)
    assert.match(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8'), /第001期-改过的主题/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('editChrome renames an invest issue file and URL with the new theme', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-chrome-invest-'))
  try {
    const paths = writeWeeklyChromeFixture(dir)
    const result = applyDraft({
      kindId: 'invest',
      mode: 'editChrome',
      issueLink: '/投资/周记/2026-08-13-待定',
      issue: {
        theme: '看清楚',
        caption: '改过的投资说明',
        cover: '/images/hero-fireworks.png',
      },
    }, paths)
    assert.equal(result.previewLink, '/投资/周记/2026-08-13-看清楚')
    assert.equal(fs.existsSync(path.join(dir, 'docs', '投资', '周记', '2026-08-13-待定.md')), false)
    const next = fs.readFileSync(path.join(dir, 'docs', '投资', '周记', '2026-08-13-看清楚.md'), 'utf8')
    assert.match(next, /# 第001期-看清楚/)
    assert.match(next, /改过的投资说明/)
    const posts = fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8')
    assert.match(posts, /\/投资\/周记\/2026-08-13-看清楚/)
    assert.doesNotMatch(posts, /2026-08-13-待定/)
    const config = fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8')
    assert.match(config, /\/投资\/周记\/2026-08-13-看清楚/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('updateManualPost and updateSidebarItem rewrite title and link', () => {
  const posts = updateManualPost(`const manualPosts: PostItem[] = [
  {
    title: "第002期-待定",
    link: "/投资/周记/2026-08-17-待定",
  },
]
`, {
    oldLink: '/投资/周记/2026-08-17-待定',
    title: '第002期-看清楚',
    link: '/投资/周记/2026-08-17-看清楚',
  })
  assert.match(posts, /title: "第002期-看清楚"/)
  assert.match(posts, /link: "\/投资\/周记\/2026-08-17-看清楚"/)
  const config = updateSidebarItem(`export default {
  themeConfig: {
    sidebar: {
      '/投资/周记/': [
        {
          text: '2026年',
          items: [
            { text: '第002期-待定', link: '/投资/周记/2026-08-17-待定' },
          ],
        },
      ],
    },
  },
}
`, {
    sidebarKey: '/投资/周记/',
    oldLink: '/投资/周记/2026-08-17-待定',
    title: '第002期-看清楚',
    link: '/投资/周记/2026-08-17-看清楚',
  })
  assert.match(config, /text: '第002期-看清楚'/)
  assert.match(config, /link: '\/投资\/周记\/2026-08-17-看清楚'/)
})
