/**
 * 投研 / 投资哲学 / 大问题树结构纯投影。
 * 无 node:fs / VitePress / Vue / panel；与周记投影共用 parseFrontmatter。
 */

import { parseFrontmatter } from './frontmatter.mjs'
import { getContentKind } from './kinds.mjs'
import { contentSiteLink, matchesKindPath, posixRel } from './paths.mjs'

export const STRUCTURE_KIND_IDS = Object.freeze(['research', 'philosophy', 'big-question'])

const MAPS_DIR = '研究地图'

export function structureKindIds() {
  return STRUCTURE_KIND_IDS.slice()
}

function basename(rel) {
  const parts = posixRel(rel).split('/')
  return parts[parts.length - 1] || ''
}

function stemOf(name) {
  return String(name || '').replace(/\.md$/i, '')
}

function restUnderKind(kind, rel) {
  const prefix = `${kind.contentDir}/`
  if (rel === `${kind.contentDir}/index.md`) return 'index.md'
  if (!rel.startsWith(prefix)) return null
  return rel.slice(prefix.length)
}

function fmString(fm, key) {
  const value = fm?.[key]
  if (value == null || value === '') return undefined
  return String(value)
}

function fmOrder(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return undefined
}

function fmCollapsed(value, fallback) {
  if (value === false || value === 'false' || value === 0) return false
  if (value === true || value === 'true' || value === 1) return true
  return fallback
}

function inferResearchRole(rest) {
  if (rest === 'index.md') return { role: 'hub', industry: null, slug: null }
  const parts = rest.split('/')
  if (parts.length === 2 && parts[1] === 'index.md') {
    return { role: 'industry', industry: parts[0], slug: parts[0] }
  }
  if (parts.length === 3 && parts[1] === MAPS_DIR && parts[2] === 'index.md') {
    return { role: 'maps-hub', industry: parts[0], slug: MAPS_DIR }
  }
  if (parts.length === 4 && parts[1] === MAPS_DIR && parts[3] === 'index.md') {
    return { role: 'map', industry: parts[0], slug: parts[2] }
  }
  if (parts.length === 3 && parts[1] !== MAPS_DIR && parts[2] === 'index.md') {
    return { role: 'subject', industry: parts[0], slug: parts[1] }
  }
  if (parts.length === 4 && parts[1] !== MAPS_DIR && parts[3] === 'index.md') {
    return {
      role: 'subject-chapter',
      industry: parts[0],
      slug: parts[2],
      parentSlug: parts[1],
    }
  }
  return null
}

function inferTopicRole(rest) {
  if (rest === 'index.md') return { role: 'hub', industry: null, slug: null }
  const parts = rest.split('/')
  if (parts.length === 2 && parts[1] === 'index.md') {
    return { role: 'topic', industry: null, slug: parts[0] }
  }
  return null
}

function roleFromPath(kind, rel) {
  const rest = restUnderKind(kind, rel)
  if (!rest) return null
  if (kind.id === 'research') return inferResearchRole(rest)
  if (kind.id === 'philosophy' || kind.id === 'big-question') return inferTopicRole(rest)
  return null
}

function pageClassOk(kind, role, pageClass) {
  const value = String(pageClass || '')
  if (kind.id === 'research') {
    if (role === 'hub') return value === 'research-index'
    if (role === 'industry') return value === 'industry-index'
    if (role === 'maps-hub' || role === 'map') return value === 'map-index'
    if (role === 'subject' || role === 'subject-chapter') return value === 'subject-index'
    return false
  }
  if (role === 'hub') return value === 'investment-hub'
  if (role === 'topic') return value === 'subject-index'
  return false
}

/**
 * 树页身份。kind/path 不适用或角色无法识别时返回 null。
 * pageClass 与路径角色不一致时仍返回节点，供对账失败。
 */
export function structureNodeFromMarkdown({ kindId, relativePath, raw }) {
  if (!STRUCTURE_KIND_IDS.includes(kindId)) return null
  const kind = getContentKind(kindId)
  const rel = posixRel(relativePath)
  if (!matchesKindPath(kind, rel)) return null
  const inferred = roleFromPath(kind, rel)
  if (!inferred) return null

  const { fm } = parseFrontmatter(raw)
  let link
  try {
    link = contentSiteLink(kind.id, { relativeFile: rel })
  } catch {
    link = null
  }

  const title = fmString(fm, 'title') || stemOf(basename(rel))
  const node = {
    kindId: kind.id,
    role: inferred.role,
    industry: inferred.industry,
    slug: inferred.slug,
    parentSlug: inferred.parentSlug || null,
    title,
    sidebarText: fmString(fm, 'sidebarText') || title,
    description: fmString(fm, 'description'),
    hubLead: fmString(fm, 'hubLead'),
    hubIndex: fmString(fm, 'hubIndex'),
    ticker: fmString(fm, 'ticker'),
    status: fmString(fm, 'status'),
    pageClass: fmString(fm, 'pageClass'),
    order: fmOrder(fm.order),
    collapsed: inferred.role === 'industry'
      ? fmCollapsed(fm.sidebarCollapsed, kind.defaultIndustryCollapsed !== false)
      : undefined,
    link,
    relativePath: rel,
    pageClassOk: pageClassOk(kind, inferred.role, fm.pageClass),
  }
  return node
}

export function structureNodesFromSources(sources) {
  const nodes = []
  for (const source of sources || []) {
    const node = structureNodeFromMarkdown(source)
    if (node) nodes.push(node)
  }
  return nodes
}

function compareNodes(a, b) {
  const ao = a.order ?? 1000
  const bo = b.order ?? 1000
  if (ao !== bo) return ao - bo
  if (a.sidebarText < b.sidebarText) return -1
  if (a.sidebarText > b.sidebarText) return 1
  if (a.link < b.link) return -1
  if (a.link > b.link) return 1
  return 0
}

function nodesOf(nodes, kindId, role, industry) {
  return (nodes || [])
    .filter((node) => (
      node.kindId === kindId
      && node.role === role
      && node.link
      && node.pageClassOk
      && (industry == null || node.industry === industry)
    ))
    .slice()
    .sort(compareNodes)
}

export function researchIndustries(nodes) {
  return nodesOf(nodes, 'research', 'industry')
}

export function researchMaps(nodes, industry) {
  return nodesOf(nodes, 'research', 'map', industry)
}

export function researchSubjects(nodes, industry) {
  return nodesOf(nodes, 'research', 'subject', industry)
}

export function researchSubjectChapters(nodes, industry, subjectSlug) {
  return (nodes || [])
    .filter((node) => (
      node.kindId === 'research'
      && node.role === 'subject-chapter'
      && node.link
      && node.pageClassOk
      && (industry == null || node.industry === industry)
      && (subjectSlug == null || node.parentSlug === subjectSlug)
    ))
    .slice()
    .sort(compareNodes)
}

export function researchMapsHub(nodes, industry) {
  return nodesOf(nodes, 'research', 'maps-hub', industry)[0] || null
}

export function topicNodes(nodes, kindId) {
  return nodesOf(nodes, kindId, 'topic')
}

export function hubNode(nodes, kindId) {
  return nodesOf(nodes, kindId, 'hub')[0] || null
}

export function industrySubjectsLine(nodes, industry) {
  const maps = researchMaps(nodes, industry)
  const subjects = researchSubjects(nodes, industry)
  if (subjects.length && maps.length) {
    return `研究地图 · ${subjects.map((item) => item.sidebarText).join(' · ')}`
  }
  if (subjects.length) {
    return `${subjects.map((item) => item.sidebarText).join(' · ')} · 地图待建`
  }
  return '壳已建 · 待补地图与标的'
}

export function researchHubSummary(nodes) {
  const industries = researchIndustries(nodes)
  const subjects = nodesOf(nodes, 'research', 'subject')
  return {
    industryCount: industries.length,
    subjectCount: subjects.length,
    text: `${industries.length} 个行业 · ${subjects.length} 个标的`,
  }
}

export function industryShortName(industry) {
  return String(industry?.sidebarText || industry?.title || industry?.slug || '').replace(/行业$/, '')
}

export function topicCards(nodes, kindId) {
  return topicNodes(nodes, kindId).map((topic) => ({
    title: topic.title,
    link: topic.link,
    hubIndex: topic.hubIndex || '',
    hubLead: topic.hubLead || topic.description || '',
  }))
}

export function industryMapDirectory(nodes, industrySlug) {
  const maps = researchMaps(nodes, industrySlug)
  const mapsHub = researchMapsHub(nodes, industrySlug)
  return {
    count: maps.length,
    countText: maps.length ? `${maps.length} 张节点详图` : '待建立',
    hub: mapsHub
      ? {
        title: '研究地图总览',
        link: mapsHub.link,
        lead: mapsHub.hubLead
          || mapsHub.description
          || '可复用的产业与商业知识入口。当前尚未建立具体地图。',
        status: maps.length ? (mapsHub.status || '学习中') : '待建立',
        ticker: maps.length ? 'GRAPH' : 'MAPS',
      }
      : null,
  }
}

export function industrySubjectDirectory(nodes, industrySlug) {
  const subjects = researchSubjects(nodes, industrySlug)
  let countText = '暂无'
  if (subjects.length === 1 && subjects[0].status) {
    countText = `${subjects[0].status} · 1 个`
  } else if (subjects.length === 1) {
    countText = '1 个标的档案'
  } else if (subjects.length > 1) {
    countText = `${subjects.length} 个标的档案`
  }
  if (industrySlug === '医药' && subjects.length === 1) {
    countText = '1 个标的档案'
  }
  return {
    count: subjects.length,
    countText,
    items: subjects.map((item) => ({
      title: item.title,
      link: item.link,
      ticker: item.ticker || '',
      status: item.status || '学习中',
      lead: item.hubLead || item.description || '',
    })),
  }
}

export function trackedSubjects(nodes) {
  const industries = researchIndustries(nodes)
  const bySlug = new Map(industries.map((item) => [item.slug, item]))
  return nodesOf(nodes, 'research', 'subject').map((item) => ({
    title: item.title,
    link: item.link,
    ticker: item.ticker || '',
    industry: industryShortName(bySlug.get(item.industry) || { slug: item.industry }),
  }))
}

export function researchHubRows(nodes) {
  return researchIndustries(nodes).map((industry, index) => ({
    index: String(index + 1).padStart(2, '0'),
    title: industry.title,
    link: industry.link,
    description: industry.description || '',
    subjects: industrySubjectsLine(nodes, industry.slug),
  }))
}

export function projectResearchSidebar(nodes) {
  const kind = getContentKind('research')
  const groups = []
  for (const industry of researchIndustries(nodes)) {
    const mapsHub = researchMapsHub(nodes, industry.slug)
    const maps = researchMaps(nodes, industry.slug)
    const subjects = researchSubjects(nodes, industry.slug)
    const mapItems = []
    if (mapsHub) {
      mapItems.push({ text: kind.mapsIndexText || '地图总览', link: mapsHub.link })
    }
    for (const map of maps) {
      mapItems.push({ text: map.sidebarText, link: map.link })
    }
    groups.push({
      text: industry.sidebarText,
      collapsed: industry.collapsed !== false,
      items: [
        { text: kind.industryIndexText || '行业总览', link: industry.link },
        {
          text: kind.mapsGroupText || '研究地图',
          collapsed: true,
          items: mapItems,
        },
        {
          text: kind.subjectsGroupText || '标的档案',
          collapsed: true,
          items: subjects.map((item) => {
            const chapters = researchSubjectChapters(nodes, industry.slug, item.slug)
            if (!chapters.length) return { text: item.sidebarText, link: item.link }
            return {
              text: item.sidebarText,
              link: item.link,
              collapsed: true,
              items: chapters.map((chapter) => ({
                text: chapter.sidebarText,
                link: chapter.link,
              })),
            }
          }),
        },
      ],
    })
  }
  return groups
}

export function projectTopicSidebar(kindId, nodes) {
  const kind = getContentKind(kindId)
  const hub = hubNode(nodes, kindId)
  const items = []
  if (hub) {
    items.push({ text: kind.hubSidebarText || '总览', link: hub.link })
  }
  for (const topic of topicNodes(nodes, kindId)) {
    items.push({ text: topic.sidebarText, link: topic.link })
  }
  return [{
    text: kind.label,
    items,
  }]
}

export function projectPhilosophySidebar(nodes) {
  return projectTopicSidebar('philosophy', nodes)
}

export function projectBigQuestionSidebar(nodes) {
  return projectTopicSidebar('big-question', nodes)
}

export function projectTopicNavItems(kindId, nodes) {
  const [group] = projectTopicSidebar(kindId, nodes)
  return group?.items || []
}

export function flattenStructureLinks(nodes, kindId) {
  return (nodes || [])
    .filter((node) => node.kindId === kindId && node.link && node.pageClassOk)
    .slice()
    .sort(compareNodes)
    .map((node) => ({ text: node.sidebarText, link: node.link, role: node.role }))
}

export function globPathToRepoRel(filePath, kindId) {
  const kind = getContentKind(kindId)
  const posix = posixRel(filePath)
  if (posix.startsWith('docs/')) return posix
  const marker = kind.contentDir.replace(/^docs\//, '')
  const idx = posix.indexOf(marker)
  if (idx >= 0) return posixRel(`docs/${posix.slice(idx)}`)
  const base = posix.split('/').filter((part) => part && part !== '..').join('/')
  if (base.endsWith('.md')) return posixRel(`${kind.contentDir}/${base.split('/').pop()}`)
  return posixRel(`${kind.contentDir}/${base}`)
}

export function structureFromGlob(modulesByKind) {
  const sources = []
  for (const kindId of STRUCTURE_KIND_IDS) {
    const modules = modulesByKind?.[kindId] || {}
    for (const [filePath, raw] of Object.entries(modules)) {
      sources.push({
        kindId,
        relativePath: globPathToRepoRel(filePath, kindId),
        raw,
      })
    }
  }
  return structureNodesFromSources(sources)
}
