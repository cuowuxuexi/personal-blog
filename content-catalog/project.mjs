/**
 * 周记 / 历程构建期投影纯 core。
 * 无 node:fs / VitePress / Vue / panel；fs 与 Vite glob 只提供 {kindId, relativePath, raw}。
 */

import { parseFrontmatter } from './frontmatter.mjs'
import { getContentKind, listContentKinds } from './kinds.mjs'
import {
  contentSiteLink,
  isValidIsoDate,
  matchesKindPath,
  posixRel,
  standalonePublicHref,
  yearGroupTitle,
} from './paths.mjs'

const MANAGED_KIND_IDS = Object.freeze(['weekly-life', 'weekly-investment', 'journey'])

export function isDatedJourneyName(name) {
  return /^\d{4}-\d{2}-\d{2}\.md$/i.test(String(name || ''))
}

export function managedKindIds() {
  return MANAGED_KIND_IDS.slice()
}

function basename(rel) {
  const normalized = posixRel(rel)
  const parts = normalized.split('/')
  return parts[parts.length - 1] || ''
}

function stemOf(name) {
  return String(name || '').replace(/\.md$/i, '')
}

function datedParts(filename) {
  const stem = stemOf(filename)
  const match = /^(\d{4}-\d{2}-\d{2})(?:-(.*))?$/.exec(stem)
  if (!match) return null
  return { date: match[1], theme: match[2] || '', stem }
}

function resolveSiteLink(kind, name, fm) {
  const parts = datedParts(name) || {}
  if (kind.id === 'weekly-life') {
    return contentSiteLink(kind.id, { date: fm.date || parts.date })
  }
  if (kind.id === 'weekly-investment') {
    return contentSiteLink(kind.id, { date: fm.date || parts.date, theme: parts.theme })
  }
  if (kind.id === 'journey') {
    if (isDatedJourneyName(name)) {
      return contentSiteLink(kind.id, { date: fm.date || parts.date })
    }
    const override = standalonePublicHref(fm)
    if (override !== undefined) return override
    return contentSiteLink(kind.id, { name: stemOf(name) })
  }
  return null
}

function allowsMissingIssue(kind, link) {
  return Boolean(
    kind.validation.issueOptionalForOpening
    && kind.openingWithoutIssueLink
    && link === kind.openingWithoutIssueLink,
  )
}

function normalizeIssue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return undefined
}

function normalizeOptionalDate(value) {
  if (value == null || value === '') return undefined
  const text = String(value)
  return isValidIsoDate(text) ? text : null
}

/**
 * 受管文件身份字段（与 postFromManagedMarkdown 同源）。
 * 仅在 kind/path 不适用时返回 null；校验失败仍返回字段供 verifier 诊断。
 * @returns {object | null}
 */
export function managedIdentityFromMarkdown({ kindId, relativePath, raw }) {
  if (!MANAGED_KIND_IDS.includes(kindId)) return null
  const kind = getContentKind(kindId)
  const rel = posixRel(relativePath)
  if (!matchesKindPath(kind, rel)) return null

  const name = basename(rel)
  const { fm } = parseFrontmatter(raw)
  let link
  try {
    link = resolveSiteLink(kind, name, fm)
  } catch {
    link = null
  }

  const dateFromName = datedParts(name)?.date
  const date = String(fm.date || dateFromName || '')
  const revisionDate = normalizeOptionalDate(fm.revisionDate)
  const issue = normalizeIssue(fm.issue)
  const dated = kind.id === 'journey' ? isDatedJourneyName(name) : Boolean(datedParts(name))

  // Identity mirrors frontmatter; do not silently overwrite with kind.category / kind.postType.
  const identity = {
    title: String(fm.title || stemOf(name)),
    date,
    category: fm.category != null && String(fm.category).length > 0 ? String(fm.category) : undefined,
    type: fm.type != null && String(fm.type).length > 0 ? String(fm.type) : undefined,
    link,
    dated,
  }
  if (issue != null) identity.issue = issue
  if (fm.description != null && String(fm.description).length > 0) {
    identity.description = String(fm.description)
  }
  if (revisionDate !== undefined) identity.revisionDate = revisionDate
  identity.kindId = kind.id
  return identity
}

/**
 * 单一 frontmatter → PostItem 映射。fs / glob adapter 必须共用。
 * @returns {object | null}
 */
export function postFromManagedMarkdown({ kindId, relativePath, raw }) {
  const identity = managedIdentityFromMarkdown({ kindId, relativePath, raw })
  if (!identity || !identity.link) return null
  if (!isValidIsoDate(identity.date)) return null
  if (identity.revisionDate === null) return null
  if (identity.revisionDate && identity.revisionDate < identity.date) return null

  const kind = getContentKind(kindId)
  // Fail closed: missing or contract-mismatched category/type are not auto-corrected.
  if (identity.category !== kind.category || identity.type !== kind.postType) {
    return null
  }
  if (identity.dated && identity.issue == null && !allowsMissingIssue(kind, identity.link)) {
    return null
  }

  const post = {
    title: identity.title,
    date: identity.date,
    category: identity.category,
    type: identity.type,
    link: identity.link,
    kindId: identity.kindId,
  }
  if (identity.issue != null) post.issue = identity.issue
  if (identity.description) post.description = identity.description
  if (identity.revisionDate) post.revisionDate = identity.revisionDate
  return post
}

function comparePosts(a, b) {
  if (a.date < b.date) return 1
  if (a.date > b.date) return -1
  if ((a.issue ?? -1) < (b.issue ?? -1)) return 1
  if ((a.issue ?? -1) > (b.issue ?? -1)) return -1
  if (a.link < b.link) return -1
  if (a.link > b.link) return 1
  return 0
}

export function sortManagedPosts(posts) {
  return (posts || []).slice().sort(comparePosts)
}

/**
 * 纯集合入口。sources: [{ kindId, relativePath, raw }]
 */
export function managedPostsFromSources(sources) {
  const posts = []
  for (const source of sources || []) {
    const post = postFromManagedMarkdown(source)
    if (post) posts.push(post)
  }
  return sortManagedPosts(posts)
}

/**
 * Vite glob adapter：modulesByKind = { 'weekly-life': Record<path, raw>, ... }
 * path 可为相对站点路径或 docs/… 绝对相对仓路径。
 */
export function managedPostsFromGlob(modulesByKind) {
  const sources = []
  for (const kindId of MANAGED_KIND_IDS) {
    const modules = modulesByKind?.[kindId] || {}
    const kind = getContentKind(kindId)
    for (const [filePath, raw] of Object.entries(modules)) {
      const base = posixRel(filePath).split('/').pop() || ''
      const relativePath = `${kind.contentDir}/${base}`
      sources.push({ kindId, relativePath, raw })
    }
  }
  return managedPostsFromSources(sources)
}

export function projectYearSidebarGroups(kindId, posts) {
  const kind = getContentKind(kindId)
  if (!kind.yearGroupTemplate) return []

  const byYear = new Map()
  for (const post of posts || []) {
    if (post.type !== kind.postType) continue
    if (kindId === 'weekly-life' && post.category !== 'AI与生活') continue
    if (kindId === 'weekly-investment' && post.category !== '投资') continue
    if (kindId === 'journey') {
      if (post.type !== 'journey') continue
      if (!/\/\d{4}-\d{2}-\d{2}$/.test(post.link)) continue
    } else if (post.type !== 'weekly') {
      continue
    }
    const year = String(post.date).slice(0, 4)
    if (!/^\d{4}$/.test(year)) continue
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year).push(post)
  }

  const years = [...byYear.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  return years.map((year) => {
    const items = sortManagedPosts(byYear.get(year)).map((post) => ({
      text: post.title,
      link: post.link,
    }))
    return {
      text: yearGroupTitle(kindId, year),
      collapsed: false,
      items,
    }
  })
}

function isDatedJourneyLink(link) {
  return /\/\d{4}-\d{2}-\d{2}$/.test(String(link || ''))
}

function namedPostForFile(posts, name) {
  const stem = stemOf(name)
  const derived = contentSiteLink('journey', { name: stem })
  const undated = (posts || []).filter((post) => post.type === 'journey' && !isDatedJourneyLink(post.link))
  return undated.find((post) => post.link === derived)
    || undated.find((post) => post.title === stem)
    || null
}

function namedChapterPosts(posts) {
  const kind = getContentKind('journey')
  const order = kind.namedChapterOrder || []
  const nest = kind.namedChapterNesting || {}
  const childNames = new Set(Object.values(nest).flat())
  const items = []
  for (const name of order) {
    if (childNames.has(name)) continue
    const post = namedPostForFile(posts, name)
    if (!post) continue
    const item = { text: post.title, link: post.link }
    const nested = []
    for (const childName of nest[name] || []) {
      const child = namedPostForFile(posts, childName)
      if (!child) continue
      nested.push({ text: child.title, link: child.link })
    }
    if (nested.length) {
      item.collapsed = false
      item.items = nested
    }
    items.push(item)
  }
  return items
}

/**
 * 历程侧栏受管片段：具名篇章组 + 日期期数年份组。
 */
export function projectJourneySidebar(posts) {
  const kind = getContentKind('journey')
  const groups = []
  const namedItems = namedChapterPosts(posts)
  if (namedItems.length) {
    groups.push({
      text: kind.namedChapterGroupText || kind.seriesEntry?.text || kind.label,
      collapsed: false,
      items: namedItems,
    })
  }
  groups.push(...projectYearSidebarGroups('journey', posts))
  return groups
}

/**
 * 生活侧栏受管片段：仅周记年份组（不含具名历程叶子；系列入口属静态壳）。
 */
export function projectLifeSidebarManagedParts(posts) {
  return projectYearSidebarGroups('weekly-life', posts)
}

export function projectInvestSidebarManagedParts(posts) {
  return projectYearSidebarGroups('weekly-investment', posts)
}

/** 供测试 / 对账：标准化可比对字段。 */
export function normalizePostIdentity(post) {
  return {
    title: post.title,
    date: post.date,
    category: post.category,
    type: post.type,
    issue: post.issue ?? undefined,
    link: post.link,
  }
}

export function listProjectedManagedKinds() {
  return listContentKinds().filter((kind) => MANAGED_KIND_IDS.includes(kind.id))
}
