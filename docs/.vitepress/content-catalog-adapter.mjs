/**
 * 站点侧窄 adapter：最近更新可见性 + 周记/历程构建期投影（无 node:fs）。
 * config.mts 的 Node fs 投影见 managed-sidebar-fs.mjs。
 */
import {
  managedPostsFromGlob,
  postsByCategory as catalogPostsByCategory,
  selectRecentPosts,
} from '../../content-catalog/index.mjs'

export function recentPostsFromCatalog(posts, limit = 6) {
  return selectRecentPosts(posts, limit)
}

/** posts.ts postsByCategory → 共享 query（date 主序 + issue/link 次键；不用 revisionDate）。 */
export function postsByCategoryFromCatalog(posts, category, type) {
  return catalogPostsByCategory(posts, category, type)
}

/** 投影 PostItem → 站点 posts.ts 对外形状（去掉 kindId 等内部字段）。 */
export function toSitePostItem(post) {
  if (!post || typeof post !== 'object') return null
  const item = {
    title: post.title,
    date: post.date,
    category: post.category,
    type: post.type,
    link: post.link,
  }
  if (post.description != null && String(post.description).length > 0) {
    item.description = String(post.description)
  }
  if (post.issue != null) item.issue = post.issue
  if (post.revisionDate) item.revisionDate = post.revisionDate
  return item
}

/**
 * Vite raw glob → 受管 posts（weekly-life / weekly-investment / journey）。
 * modulesByKind 的 value 为 import.meta.glob(..., { eager, query:'?raw' }) 结果。
 */
export function siteManagedPostsFromGlob(modulesByKind) {
  return managedPostsFromGlob(modulesByKind).map(toSitePostItem).filter(Boolean)
}
