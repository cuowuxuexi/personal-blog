import { getContentKind } from './kinds.mjs'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const WINDOWS_ILLEGAL = /[<>:"|?*\u0000]/
const TREE_KIND_PREFIXES = Object.freeze({
  research: Object.freeze({ docs: 'docs/投资/投研', site: '投资/投研' }),
  philosophy: Object.freeze({ docs: 'docs/投资哲学', site: '投资哲学' }),
  'big-question': Object.freeze({ docs: 'docs/大问题', site: '大问题' }),
})

export function posixRel(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '')
}

export function isValidIsoDate(value) {
  return ISO_DATE.test(String(value || ''))
}

export function normalizePosixPath(value) {
  const parts = []
  for (const part of posixRel(value).split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (parts.length === 0) {
        parts.push('..')
        continue
      }
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.join('/')
}

export function isSafePathFragment(value) {
  const fragment = String(value ?? '')
  if (!fragment || fragment === '.' || fragment === '..') return false
  if (fragment.includes('/') || fragment.includes('\\') || fragment.includes('\0')) return false
  if (WINDOWS_ILLEGAL.test(fragment)) return false
  return true
}

function requireDate(parts, kindId) {
  const date = requirePart(parts, 'date', kindId)
  if (!isValidIsoDate(date)) throw new Error(`${kindId} date 必须是 YYYY-MM-DD`)
  return date
}

function requireFragment(parts, key, kindId) {
  const value = requirePart(parts, key, kindId)
  if (!isSafePathFragment(value)) throw new Error(`${kindId} ${key} 含非法路径片段`)
  return value
}

function optionalFragment(value, kindId, key) {
  if (value == null || value === '') return ''
  if (!isSafePathFragment(value)) throw new Error(`${kindId} ${key} 含非法路径片段`)
  return String(value)
}

function treePrefixes(kindId) {
  const prefixes = TREE_KIND_PREFIXES[kindId]
  if (!prefixes) throw new Error(`${kindId} 未声明树路径前缀`)
  return prefixes
}

function assertTreeRel(relativeFile, kindId) {
  const { docs, site } = treePrefixes(kindId)
  const normalized = normalizePosixPath(relativeFile)
  const underDocs = normalized === docs || normalized.startsWith(`${docs}/`)
  const underSite = normalized === site || normalized.startsWith(`${site}/`)
  if ((!underDocs && !underSite) || normalized.split('/').includes('..')) {
    throw new Error(`${kindId} 路径规范化后必须位于 ${docs}/`)
  }
  return normalized
}

function treeSiteLink(kind, parts = {}) {
  const { docs, site } = treePrefixes(kind.id)
  if (parts.relativeFile) {
    let rel = assertTreeRel(parts.relativeFile, kind.id)
    if (rel.startsWith('docs/')) rel = rel.slice('docs/'.length)
    rel = rel.replace(/\/index\.md$/i, '/').replace(/\.md$/i, '')
    if (!rel.startsWith(site)) {
      throw new Error(`${kind.id} 链接必须位于 /${site}`)
    }
    return `/${rel.replace(/\/?$/, '/')}`
  }
  const segments = Array.isArray(parts.segments) ? parts.segments.filter(Boolean) : []
  for (const segment of segments) {
    if (!isSafePathFragment(segment)) throw new Error(`${kind.id} segments 含非法路径片段`)
  }
  return segments.length ? `/${site}/${segments.join('/')}/` : `/${site}/`
}

function basename(rel) {
  const normalized = posixRel(rel)
  const parts = normalized.split('/')
  return parts[parts.length - 1] || ''
}

function stemOf(name) {
  return String(name || '').replace(/\.md$/i, '')
}

function isExcludedBasename(kind, name) {
  const lower = String(name || '').toLowerCase()
  return kind.scan.excludeBasenames.some((item) => item.toLowerCase() === lower)
}

function matchesInclude(kind, name) {
  return new RegExp(kind.scan.includePattern, 'i').test(name)
}

function isDirectChild(kind, rel) {
  const prefix = `${kind.contentDir}/`
  if (!rel.startsWith(prefix)) return false
  const rest = rel.slice(prefix.length)
  return rest.length > 0 && !rest.includes('/')
}

function isUnderTree(kind, rel) {
  return rel === kind.contentDir || rel.startsWith(`${kind.contentDir}/`)
}

export function matchesKindPath(kindOrId, relativePath) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  const rel = posixRel(relativePath)
  if (!rel.toLowerCase().endsWith('.md')) return false
  const name = basename(rel)
  if (isExcludedBasename(kind, name)) return false
  if (kind.scan.mode === 'direct-children') {
    if (!isDirectChild(kind, rel)) return false
  } else if (!isUnderTree(kind, rel)) {
    return false
  }
  return matchesInclude(kind, name)
}

export function kindIdForPath(relativePath) {
  const rel = posixRel(relativePath)
  const ordered = [
    'journey',
    'hermes',
    'weekly-life',
    'weekly-investment',
    'research',
    'philosophy',
    'big-question',
  ]
  for (const id of ordered) {
    if (matchesKindPath(id, rel)) return id
  }
  return null
}

export function isManagedContentPath(relativePath) {
  return kindIdForPath(relativePath) != null
}

export function matchesKindAssetPath(kindOrId, relativePath) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  const directory = kind.assets.directory
  if (!directory) return false
  const rel = posixRel(relativePath)
  return rel === directory || rel.startsWith(`${directory}/`)
}

export function kindContentPrefix(kindOrId) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  return `${kind.contentDir}/`
}

export function kindAssetPrefix(kindOrId) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  return kind.assets.directory ? `${kind.assets.directory}/` : ''
}

export function isUnderKindContentDir(kindOrId, relativePath) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  const rel = posixRel(relativePath)
  return rel === kind.contentDir || rel.startsWith(`${kind.contentDir}/`)
}

export function isKindAssetFile(kindOrId, relativePath) {
  const prefix = kindAssetPrefix(kindOrId)
  if (!prefix) return false
  const rel = posixRel(relativePath)
  return rel.startsWith(prefix) && rel !== prefix.slice(0, -1)
}

export function yearGroupTitle(kindOrId, year) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  if (!kind.yearGroupTemplate) return null
  return kind.yearGroupTemplate.replace('{year}', String(year))
}

function requirePart(parts, key, kindId) {
  const value = parts?.[key]
  if (!value) throw new Error(`${kindId} 需要 ${key}`)
  return String(value)
}

export function contentFileName(kindOrId, parts = {}) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  switch (kind.createFileName) {
    case 'date':
      if (kind.id === 'journey' && parts.name && !parts.date) {
        return `${requireFragment(parts, 'name', kind.id)}.md`
      }
      return `${requireDate(parts, kind.id)}.md`
    case 'date-theme':
      return `${requireDate(parts, kind.id)}-${requireFragment(parts, 'theme', kind.id)}.md`
    case 'date-optional-slug': {
      const date = requireDate(parts, kind.id)
      const slug = optionalFragment(parts.slug, kind.id, 'slug')
      return slug ? `${date}-${slug}.md` : `${date}.md`
    }
    case 'index-in-tree':
      return 'index.md'
    default:
      throw new Error(`${kind.id} 未声明 createFileName`)
  }
}

export function contentSiteLink(kindOrId, parts = {}) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  switch (kind.id) {
    case 'weekly-life':
      return `/AI与生活/${requireDate(parts, kind.id)}`
    case 'weekly-investment':
      return `/投资/周记/${requireDate(parts, kind.id)}-${requireFragment(parts, 'theme', kind.id)}`
    case 'journey':
      if (parts.date) return `/AI与生活/我的AI历程/${requireDate(parts, kind.id)}`
      if (parts.name) return `/AI与生活/我的AI历程/${requireFragment(parts, 'name', kind.id)}`
      throw new Error('journey 需要 date 或 name')
    case 'hermes': {
      const stem = parts.stem || stemOf(contentFileName(kind, parts))
      const dateMatch = /^(\d{4}-\d{2}-\d{2})(?:-(.+))?$/.exec(stem)
      if (!dateMatch || !isValidIsoDate(dateMatch[1])) {
        throw new Error('hermes stem 必须由 YYYY-MM-DD 开头')
      }
      if (dateMatch[2] && !isSafePathFragment(dateMatch[2])) {
        throw new Error('hermes stem 含非法路径片段')
      }
      if (!isSafePathFragment(stem) && dateMatch[2]) {
        throw new Error('hermes stem 含非法路径片段')
      }
      if (stem.includes('/') || stem.includes('\\') || stem.includes('\0') || WINDOWS_ILLEGAL.test(stem)) {
        throw new Error('hermes stem 含非法路径片段')
      }
      return `/AI与生活/Hermes日记/${stem}`
    }
    case 'research':
    case 'philosophy':
    case 'big-question':
      return treeSiteLink(kind, parts)
    default:
      throw new Error(`${kind.id} 未声明 siteLink`)
  }
}

export function assetRulesFor(kindOrId) {
  const kind = typeof kindOrId === 'string' ? getContentKind(kindOrId) : kindOrId
  return kind.assets
}
