export const ALLOWED_PREFIXES = [
  'docs/AI与生活/',
  'docs/投资/周记/',
  'docs/public/images/weekly/',
]

const JOURNEY_ALLOWED_PREFIXES = [
  'docs/AI与生活/我的AI历程/',
  'docs/public/images/journey/',
]

const BLOCKED_PREFIXES = [
  'docs/投资/投研/',
  'docs/投资哲学/',
  'docs/大问题/',
  'docs/AI与生活/Hermes日记/',
  'docs/AI与生活/大事件/',
  'docs/.vitepress/',
  'panel/',
]

const JOURNEY_BLOCKED_NAMES = new Set(['index.md', 'readme.md'])
/** @deprecated Wave D：面板不再发布 posts/config；保留空集兼容旧调用。 */
const JOURNEY_META_FILES = new Set()
const WEEKLY_EXCLUDED_PREFIXES = [
  'docs/AI与生活/我的AI历程/',
]

export function posixPath(file) {
  return String(file).replace(/\\/g, '/')
}

function matchesPrefix(rel, prefixes) {
  return prefixes.some((prefix) => rel === prefix || rel.startsWith(prefix))
}

export function publishScopeOf(kindId, capability) {
  if (capability?.publishScope) return capability.publishScope
  return String(kindId) === 'journey' ? 'journey' : 'weekly'
}

function journeyChapterName(rel) {
  const prefix = 'docs/AI与生活/我的AI历程/'
  if (!rel.startsWith(prefix) || !rel.endsWith('.md')) return ''
  const name = rel.slice(prefix.length)
  if (!name || name.includes('/')) return ''
  return name
}

export function isJourneyChapterPath(file) {
  const name = journeyChapterName(posixPath(file))
  if (!name) return false
  return !JOURNEY_BLOCKED_NAMES.has(name.toLowerCase())
}

export function isJourneyImagePath(file) {
  const rel = posixPath(file)
  return rel.startsWith('docs/public/images/journey/') && rel !== 'docs/public/images/journey/'
}

export function isJourneyMetaPath(file) {
  return JOURNEY_META_FILES.has(posixPath(file))
}

/** Wave D：不再把 posts.ts / config.mts 并入 journey 发布清单。 */
export function dirtyJourneyMetaPaths(statusRows = []) {
  void statusRows
  return []
}

function resolveScope(options = {}) {
  if (options.scope) return options.scope
  return publishScopeOf(options.kindId, options.capability)
}

export function isAllowedPublishPath(file, options = {}) {
  const rel = posixPath(file)
  if (rel.includes('..')) return false
  if (matchesPrefix(rel, BLOCKED_PREFIXES)) return false
  const scope = resolveScope(options)
  if (scope === 'journey') {
    if (isJourneyChapterPath(rel)) return true
    if (isJourneyImagePath(rel) && matchesPrefix(rel, JOURNEY_ALLOWED_PREFIXES)) return true
    return false
  }
  if (matchesPrefix(rel, WEEKLY_EXCLUDED_PREFIXES)) return false
  return matchesPrefix(rel, ALLOWED_PREFIXES)
}

export function assertPublishable(files, options = {}) {
  const normalized = [...new Set(files.map(posixPath).filter(Boolean))]
  const scope = resolveScope(options)
  const check = { ...options, scope }
  const blocked = normalized.filter((file) => !isAllowedPublishPath(file, check))
  if (blocked.length) {
    const err = new Error(`超出发布面板范围：${blocked.join('、')}`)
    err.status = 422
    throw err
  }
  const allowed = normalized.filter((file) => isAllowedPublishPath(file, check))
  if (!allowed.length) {
    const err = new Error('没有可发布的文件')
    err.status = 422
    throw err
  }
  if (scope === 'journey') {
    const chapters = allowed.filter(isJourneyChapterPath)
    if (chapters.length !== 1) {
      const err = new Error('journey 发布任务需要恰好一篇正文')
      err.status = 422
      throw err
    }
  }
  return allowed
}
