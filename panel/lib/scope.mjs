import {
  isKindAssetFile,
  isUnderKindContentDir,
  listContentKinds,
  matchesKindPath,
} from '../../content-catalog/index.mjs'

const BLOCKED_PREFIXES = [
  'docs/投资/投研/',
  'docs/投资哲学/',
  'docs/大问题/',
  'docs/AI与生活/Hermes日记/',
  'docs/AI与生活/大事件/',
  'docs/.vitepress/',
  'panel/',
]

/** @deprecated Wave D：面板不再发布 posts/config；保留空集兼容旧调用。 */
const JOURNEY_META_FILES = new Set()

function panelKinds(postType) {
  return listContentKinds().filter(
    (kind) => kind.creation.surfaces.includes('panel') && kind.postType === postType,
  )
}

function weeklyPublishKinds() {
  return panelKinds('weekly')
}

function nestedNonWeeklyPrefixes() {
  const weekly = weeklyPublishKinds()
  const weeklyIds = new Set(weekly.map((kind) => kind.id))
  const prefixes = []
  for (const parent of weekly) {
    for (const kind of listContentKinds()) {
      if (weeklyIds.has(kind.id)) continue
      if (kind.contentDir.startsWith(`${parent.contentDir}/`)) {
        prefixes.push(`${kind.contentDir}/`)
      }
    }
  }
  return prefixes
}

export const ALLOWED_PREFIXES = [...new Set(
  weeklyPublishKinds().flatMap((kind) => {
    const prefixes = [`${kind.contentDir}/`]
    if (kind.assets.directory) prefixes.push(`${kind.assets.directory}/`)
    return prefixes
  }),
)]

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

export function isJourneyChapterPath(file) {
  return matchesKindPath('journey', posixPath(file))
}

export function isJourneyImagePath(file) {
  return isKindAssetFile('journey', posixPath(file))
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

export function isPublicationSourcePath(rel, kindId, capability) {
  const file = posixPath(rel)
  if (!file.endsWith('.md')) return false
  if (publishScopeOf(kindId, capability) === 'journey') {
    return matchesKindPath('journey', file)
  }
  return weeklyPublishKinds().some((kind) => matchesKindPath(kind, file))
}

export function isAllowedPublishPath(file, options = {}) {
  const rel = posixPath(file)
  if (rel.includes('..')) return false
  if (matchesPrefix(rel, BLOCKED_PREFIXES)) return false
  const scope = resolveScope(options)
  if (scope === 'journey') {
    return isJourneyChapterPath(rel) || isJourneyImagePath(rel)
  }
  if (matchesPrefix(rel, nestedNonWeeklyPrefixes())) return false
  return weeklyPublishKinds().some((kind) => (
    isUnderKindContentDir(kind, rel) || isKindAssetFile(kind, rel)
  ))
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
