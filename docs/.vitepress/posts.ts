/**
 * 文章登记表 — 首页「最近更新」、板块列表共用。
 * 新增文章时：写 md → 更新本表 → 同步 config.mts sidebar。
 */

export type Category = '投资' | 'AI与生活'

export interface PostItem {
  title: string
  date: string
  category: Category
  link: string
  description?: string
}

/** 全站文章（按 date 倒序维护） */
export const posts: PostItem[] = [
  {
    title: '写在投资笔记开始之前',
    date: '2026-08-08',
    category: '投资',
    link: '/投资/2026-08-08-写在投资笔记开始之前',
    description: '投资板块开篇：分栏约定、写作框架与风险边界。',
  },
  {
    title: '用 AI 整理日常的一周',
    date: '2026-08-08',
    category: 'AI与生活',
    link: '/AI与生活/2026-08-08-用AI整理日常的一周',
    description: '用 AI 压缩收件箱与周回顾，判断仍留在自己手里。',
  },
]

export function postsByCategory(category: Category): PostItem[] {
  return posts
    .filter((p) => p.category === category)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function recentPosts(limit = 6): PostItem[] {
  return posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

/** 2026-08-08 → 2026年8月8日 */
export function formatDateZh(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return date
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`
}
