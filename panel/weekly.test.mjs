import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  appendEntry,
  parseEntries,
  parseFrontmatter,
  replaceEntry,
  removeEntry,
  serializeEntry,
  listIssues,
  insertManualPost,
  insertSidebarItem,
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

test('inserts posts.ts and sidebar items', () => {
  const posts = insertManualPost(fs.readFileSync(postsFile, 'utf8'), {
    title: '第002期-测试',
    date: '2026-08-14',
    category: 'AI与生活',
    issue: 2,
    link: '/AI与生活/2026-08-14',
    description: '测试',
  })
  assert.match(posts, /title: "第002期-测试"/)
  assert.ok(posts.indexOf('第002期-测试') < posts.indexOf('第001期-看烟花'))

  const config = insertSidebarItem(fs.readFileSync(configFile, 'utf8'), {
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
