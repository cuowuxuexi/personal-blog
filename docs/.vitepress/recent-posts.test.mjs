import assert from 'node:assert/strict'
import test from 'node:test'
import { recentPostsFromCatalog } from './content-catalog-adapter.mjs'

/** 当前仓 posts 快照：投影周记/历程 + 两篇 Hermes。无 research。 */
const CURRENT_POSTS = [
  {
    title: '第002期-那是抓不住的月亮',
    date: '2026-08-17',
    category: '投资',
    type: 'weekly',
    issue: 2,
    link: '/投资/周记/2026-08-17-那是抓不住的月亮',
  },
  {
    title: '第002期-AI的消费主义与token焦虑',
    date: '2026-08-17',
    category: 'AI与生活',
    type: 'weekly',
    issue: 2,
    link: '/AI与生活/2026-08-17',
  },
  {
    title: '第001期-看烟花',
    date: '2026-08-13',
    category: '投资',
    type: 'weekly',
    issue: 1,
    link: '/投资/周记/2026-08-13-看烟花',
  },
  {
    title: '写在投资笔记开始之前',
    date: '2026-08-08',
    category: '投资',
    type: 'weekly',
    link: '/投资/周记/2026-08-08-写在投资笔记开始之前',
  },
  {
    title: '第001期-看烟花',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'weekly',
    issue: 1,
    link: '/AI与生活/2026-08-12',
  },
  {
    title: 'AI开支记录与优化',
    date: '2026-08-18',
    category: 'AI与生活',
    type: 'journey',
    link: '/AI与生活/我的AI历程/AI开支记录与优化',
  },
  {
    title: '基础设施篇',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'journey',
    link: '/AI与生活/我的AI历程/基础设施篇',
  },
  {
    title: '工具篇',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'journey',
    link: '/AI与生活/我的AI历程/工具篇',
  },
  {
    title: 'Cursor 开 Grok 后的套餐思考',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'hermes',
    link: '/AI与生活/Hermes日记/2026-08-12',
  },
  {
    title: '建档日',
    date: '2026-08-11',
    category: 'AI与生活',
    type: 'hermes',
    link: '/AI与生活/Hermes日记/2026-08-11',
  },
]

function legacyRecentPosts(posts, limit = 6) {
  return posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

test('recentPosts snapshot matches the pre-adapter sort for current content', () => {
  for (const limit of [1, 6, 8]) {
    assert.deepEqual(
      recentPostsFromCatalog(CURRENT_POSTS, limit).map((item) => item.link),
      legacyRecentPosts(CURRENT_POSTS, limit).map((item) => item.link),
    )
  }
  assert.equal(CURRENT_POSTS.some((item) => item.type === 'research'), false)
  assert.deepEqual(recentPostsFromCatalog(CURRENT_POSTS, 6).map((item) => item.link), [
    '/AI与生活/我的AI历程/AI开支记录与优化',
    '/投资/周记/2026-08-17-那是抓不住的月亮',
    '/AI与生活/2026-08-17',
    '/投资/周记/2026-08-13-看烟花',
    '/AI与生活/2026-08-12',
    '/AI与生活/我的AI历程/基础设施篇',
  ])
})

test('research items do not enter recent updates', () => {
  const withResearch = [
    {
      title: '药明康德',
      date: '2026-08-21',
      category: '投资',
      type: 'research',
      link: '/投资/投研/医药/药明康德/',
    },
    ...CURRENT_POSTS,
  ]
  const recent = recentPostsFromCatalog(withResearch, 8)
  assert.ok(recent.every((item) => item.type !== 'research'))
  assert.ok(!recent.some((item) => item.link.startsWith('/投资/投研/')))
  assert.deepEqual(
    recent.map((item) => item.link),
    legacyRecentPosts(CURRENT_POSTS, 8).map((item) => item.link),
  )
})

test('revisionDate raises freshness without changing date-only latest-issue order', () => {
  const withRevision = CURRENT_POSTS.map((item) =>
    item.link === '/投资/周记/2026-08-08-写在投资笔记开始之前'
      ? { ...item, revisionDate: '2026-08-20' }
      : item,
  )
  assert.deepEqual(recentPostsFromCatalog(withRevision, 3).map((item) => item.link), [
    '/投资/周记/2026-08-08-写在投资笔记开始之前',
    '/AI与生活/我的AI历程/AI开支记录与优化',
    '/投资/周记/2026-08-17-那是抓不住的月亮',
  ])
  // Hermes 带假 revisionDate 仍按 date，不抢 freshness
  const hermesBogus = CURRENT_POSTS.map((item) =>
    item.link === '/AI与生活/Hermes日记/2026-08-12'
      ? { ...item, revisionDate: '2099-01-01' }
      : item,
  )
  assert.deepEqual(
    recentPostsFromCatalog(hermesBogus, 6).map((item) => item.link),
    recentPostsFromCatalog(CURRENT_POSTS, 6).map((item) => item.link),
  )
})
