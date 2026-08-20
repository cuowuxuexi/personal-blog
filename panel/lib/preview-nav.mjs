export function kindIdFromArticleUrl(url = '') {
  const path = String(url).split('#')[0]
  if (path.includes('/AI与生活/我的AI历程/')) return 'journey'
  if (path.includes('/投资/')) return 'invest'
  if (path.includes('/AI与生活')) return 'life'
  return ''
}

export function isReleasePreviewRoot(rel = '') {
  return !rel || rel === '/' || rel === 'index.html'
}

export function previewHeading(job) {
  return String(job?.headingAnchor || '').replace(/^#/, '')
}

export function withPreviewHash(url, job) {
  if (!url) return ''
  if (url.includes('#')) return url
  const heading = previewHeading(job)
  return heading ? `${url}#${heading}` : url
}

export function previewArticleLocation(job) {
  if (!job?.id || !job.releasePreviewUrl) return ''
  const root = `/release-preview/${job.id}/`
  const target = withPreviewHash(job.releasePreviewUrl, job)
  const pathOnly = target.split('#')[0]
  if (pathOnly === root || pathOnly === root.slice(0, -1) || pathOnly === `${root}index.html`) {
    return ''
  }
  return target
}

export function isPreviewArticlePath(rel = '', job) {
  const article = String(job?.articleUrl || '').replace(/^\/+|\/+$/g, '')
  if (!article) return false
  const path = String(rel).replace(/\.html$/, '').replace(/\/+$/g, '')
  return path === article || path === `${article}/index`
}
