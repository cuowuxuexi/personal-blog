/**
 * 站点内容索引：首页、板块归档和周记列表共用。
 * 投资：weekly / research；AI与生活：weekly / hermes（Hermes 日记，按天）。
 */

export type Category = '投资' | 'AI与生活'
export type PostType = 'weekly' | 'research' | 'hermes'

export interface PostItem {
  title: string
  date: string
  category: Category
  type: PostType
  link: string
  description?: string
  issue?: number
  industry?: string
  subject?: string
  ticker?: string
  status?: string
}

export const posts: PostItem[] = [
  {
    title: '写在投资笔记开始之前',
    date: '2026-08-08',
    category: '投资',
    type: 'weekly',
    issue: 1,
    link: '/投资/周记/2026-08-08-写在投资笔记开始之前',
    description: '投资板块开篇：分栏约定、写作框架与风险边界。',
  },
  {
    title: '建档日',
    date: '2026-08-11',
    category: 'AI与生活',
    type: 'hermes',
    link: '/AI与生活/Hermes日记/2026-08-11',
    description: 'Hermes 日记开篇：按天记录的约定与本页结构。',
  },
  {
    title: '用 AI 整理日常的一周',
    date: '2026-08-08',
    category: 'AI与生活',
    type: 'weekly',
    issue: 1,
    link: '/AI与生活/2026-08-08-用AI整理日常的一周',
    description: '用 AI 压缩收件箱与周回顾，判断仍留在自己手里。',
  },
]

export function postsByCategory(category: Category, type?: PostType): PostItem[] {
  return posts
    .filter((post) => post.category === category && (!type || post.type === type))
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function recentPosts(limit = 6): PostItem[] {
  return posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

export function formatDateZh(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`
}

export function formatIssue(issue?: number): string {
  return issue ? `第${String(issue).padStart(3, '0')}期` : ''
}
