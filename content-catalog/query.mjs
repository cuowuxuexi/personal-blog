import { getContentKind, hasContentKind, listContentKinds } from './kinds.mjs'

export function isRecentVisible(kindOrId) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  if (!kind || typeof kind.recentVisible !== 'boolean') {
    throw new Error(`无法判断最近更新可见性：${kindOrId?.id || kindOrId || '?'}`)
  }
  return kind.recentVisible === true
}

export function recentVisibleKindIds() {
  return listContentKinds().filter((kind) => kind.recentVisible).map((kind) => kind.id)
}

export function kindIdForPost(post) {
  if (!post || typeof post !== 'object') return null
  if (hasContentKind(post.kindId)) return post.kindId
  const type = post.type
  const category = post.category
  if (type === 'journey') return 'journey'
  if (type === 'hermes') return 'hermes'
  if (type === 'research') return 'research'
  if (type === 'weekly' && category === 'AI与生活') return 'weekly-life'
  if (type === 'weekly' && category === '投资') return 'weekly-investment'
  return null
}

export function isRecentVisiblePost(post) {
  const id = kindIdForPost(post)
  return id ? isRecentVisible(id) : false
}

function byDateDesc(a, b) {
  if (a.date < b.date) return 1
  if (a.date > b.date) return -1
  const issueA = a.issue ?? -1
  const issueB = b.issue ?? -1
  if (issueA < issueB) return 1
  if (issueA > issueB) return -1
  const linkA = String(a.link || '')
  const linkB = String(b.link || '')
  if (linkA < linkB) return -1
  if (linkA > linkB) return 1
  return 0
}

/**
 * Recent 排序用的新鲜度日期：revisionDate ?? date。
 * Hermes / research 忽略 revisionDate（Hermes 不启用；research 本就不进 recent）。
 * @param {{ type?: string, date: string, revisionDate?: string | null, link?: string }} post
 */
export function freshnessDate(post) {
  const kindId = kindIdForPost(post)
  if (kindId === 'hermes' || kindId === 'research') return post.date
  const revision = typeof post.revisionDate === 'string' ? post.revisionDate.trim() : ''
  return revision || post.date
}

function byFreshnessDesc(a, b) {
  const fa = freshnessDate(a)
  const fb = freshnessDate(b)
  if (fa < fb) return 1
  if (fa > fb) return -1
  return 0
}

/**
 * 按 category + optional type 过滤后，按 date（首次公开/期次）降序，
 * 同日以 issue / link 为稳定次键。绝不使用 revisionDate（系列「最新一期」口径）。
 */
export function postsByCategory(posts, category, type) {
  return (posts || [])
    .filter((post) => post.category === category && (!type || post.type === type))
    .slice()
    .sort(byDateDesc)
}

/**
 * 最近更新列表：仅 recentVisible 种类；按 revisionDate ?? date 降序。
 * research 永不进入；Hermes 不消费 revisionDate。
 */
export function selectRecentPosts(posts, limit = 6) {
  return (posts || [])
    .filter(isRecentVisiblePost)
    .slice()
    .sort(byFreshnessDesc)
    .slice(0, limit)
}

export function filterRecentVisible(posts) {
  return (posts || []).filter(isRecentVisiblePost)
}
