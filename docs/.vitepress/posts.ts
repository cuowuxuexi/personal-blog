/**
 * 站点内容索引：首页、板块归档和周记列表共用。
 * 投资：weekly / research（手写登记）；
 * AI与生活：weekly 手写；hermes 日记从目录自动扫描。
 */

import { hermesPostsFromGlob } from './hermes-diary'

export type Category = '投资' | 'AI与生活'
export type PostType = 'weekly' | 'research' | 'hermes' | 'journey'

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

/** 手写登记：周记 / 投研等。Hermes 日记不要写在这里。 */
const manualPosts: PostItem[] = [
  {
    title: "第002期-待定",
    date: "2026-08-17",
    category: "投资",
    type: 'weekly',
    issue: 2,
    link: "/投资/周记/2026-08-17-待定",
    description: "周日就说了中央汇金退出前十大股东行列。",
  },
  {
    title: "第002期-AI的消费主义与token焦虑",
    date: "2026-08-17",
    category: "AI与生活",
    type: 'weekly',
    issue: 2,
    link: "/AI与生活/2026-08-17",
    description: "AI的消费主义与token焦虑",
  },
  {
    title: '第001期-看烟花',
    date: '2026-08-13',
    category: '投资',
    type: 'weekly',
    issue: 1,
    link: '/投资/周记/2026-08-13-看烟花',
    description: '腾讯Q2资本开支与负自由现金流、梁文锋算力观，以及京东Q2利润比收入好看与自由现金流拆解。',
  },
  {
    title: '写在投资笔记开始之前',
    date: '2026-08-08',
    category: '投资',
    type: 'weekly',
    link: '/投资/周记/2026-08-08-写在投资笔记开始之前',
    description: '投资板块开篇：分栏约定、写作框架与风险边界。',
  },
  {
    title: '第001期-看烟花',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'weekly',
    issue: 1,
    link: '/AI与生活/2026-08-12',
    description: 'Cursor Ultra、Grok 4.6 与 DeepSeek 4 Pro 上线、蛋白粉涨价、/ljg-classic 读古文，以及 Trae 产品随记。',
  },
  {
    title: 'AI开支记录与优化',
    date: '2026-08-18',
    category: 'AI与生活',
    type: 'journey',
    link: '/AI与生活/我的AI历程/AI开支记录与优化',
    description: '我的 AI 历程 · AI开支记录与优化：实际在付的服务、用途、状态与取舍。',
  },
  {
    title: '基础设施篇',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'journey',
    link: '/AI与生活/我的AI历程/基础设施篇',
    description: '我的 AI 历程 · 基础设施篇：协作通道、发布边界与底座。',
  },
  {
    title: '工具篇',
    date: '2026-08-12',
    category: 'AI与生活',
    type: 'journey',
    link: '/AI与生活/我的AI历程/工具篇',
    description: '我的 AI 历程 · 工具篇：日常真正在用的工具与取舍。',
  },
]

// 客户端 / 主题用 glob；config 侧栏用 hermes-diary 的 fs 扫描，避免 config 加载 glob 失败
const hermesModules = import.meta.glob<string>('../AI与生活/Hermes日记/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const hermesPosts = hermesPostsFromGlob(hermesModules)

export const posts: PostItem[] = [...manualPosts, ...hermesPosts]

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

/** 周记条目「收起」右侧日期：2026年08月12日 */
export function formatDateZhPad(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  return `${match[1]}年${match[2]}月${match[3]}日`
}

export function formatIssue(issue?: number): string {
  return issue ? `第${String(issue).padStart(3, '0')}期` : ''
}
