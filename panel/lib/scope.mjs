export const ALLOWED_PREFIXES = [
  'docs/AI与生活/',
  'docs/投资/周记/',
  'docs/public/images/weekly/',
  'docs/.vitepress/posts.ts',
  'docs/.vitepress/config.mts',
]

const BLOCKED_PREFIXES = [
  'docs/投资/投研/',
  'docs/投资哲学/',
  'docs/大问题/',
  'docs/AI与生活/Hermes日记/',
  'docs/.vitepress/theme/',
  'panel/',
]

export function posixPath(file) {
  return String(file).replace(/\\/g, '/')
}

export function isAllowedPublishPath(file) {
  const rel = posixPath(file)
  if (rel.includes('..')) return false
  if (BLOCKED_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(prefix))) return false
  return ALLOWED_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(prefix))
}

export function assertPublishable(files) {
  const normalized = [...new Set(files.map(posixPath).filter(Boolean))]
  const blocked = normalized.filter((file) => !isAllowedPublishPath(file))
  if (blocked.length) {
    const err = new Error(`超出发布面板范围：${blocked.join('、')}`)
    err.status = 422
    throw err
  }
  const allowed = normalized.filter(isAllowedPublishPath)
  if (!allowed.length) throw new Error('没有可发布的周记文件')
  return allowed
}
