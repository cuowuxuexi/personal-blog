/**
 * 站点内容索引：首页、板块归档和周记列表共用。
 * 周记 / 历程：构建期投影（Vite raw glob → content-catalog）；
 * Hermes：目录 glob + hermes-diary-core（file-is-index）。
 * Markdown/frontmatter 是受管内容身份真源；不再维护 manualPosts 字面量副本。
 */

import { hermesPostsFromGlob } from './hermes-diary'
import {
  postsByCategoryFromCatalog,
  recentPostsFromCatalog,
  siteManagedPostsFromGlob,
} from './content-catalog-adapter.mjs'

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
  revisionDate?: string
  industry?: string
  subject?: string
  ticker?: string
  status?: string
}

const lifeModules = import.meta.glob<string>('../AI与生活/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const investModules = import.meta.glob<string>('../投资/周记/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const journeyModules = import.meta.glob<string>('../AI与生活/我的AI历程/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const managedPosts = siteManagedPostsFromGlob({
  'weekly-life': lifeModules,
  'weekly-investment': investModules,
  journey: journeyModules,
})

// 客户端 / 主题用 glob；config 侧栏用 hermes-diary 的 fs 扫描，避免 config 加载 glob 失败
const hermesModules = import.meta.glob<string>('../AI与生活/Hermes日记/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const hermesPosts = hermesPostsFromGlob(hermesModules)

export const posts: PostItem[] = [...managedPosts, ...hermesPosts]

export function postsByCategory(category: Category, type?: PostType): PostItem[] {
  return postsByCategoryFromCatalog(posts, category, type)
}

export function recentPosts(limit = 6): PostItem[] {
  return recentPostsFromCatalog(posts, limit)
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
