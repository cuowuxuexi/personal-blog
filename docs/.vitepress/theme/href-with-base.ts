/**
 * VitePress 自定义 <a href="/板块/..."> 不会自动加 site.base。
 * 发布预览的 base 是 /release-preview/<jobId>/，不补前缀会跳出预览站。
 */

const STANDALONE_HTML_PREFIXES = ['/html/', '/journey-guides/']

function sitePathname(href: string, base: string): string | null {
  try {
    const url = new URL(href, 'http://vitepress.local')
    let pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/'
    const prefix = base === '/' ? '' : base.replace(/\/+$/, '')
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      pathname = pathname.slice(prefix.length) || '/'
    }
    return pathname
  } catch {
    return null
  }
}

/** public 独立 HTML；站内点击必须整页跳转，否则 VitePress 会当成缺失文章。 */
export function isStandaloneHtmlPath(href: string, base = '/'): boolean {
  const pathname = sitePathname(href, base)
  if (!pathname) return false
  const asDir = `${pathname}/`
  return STANDALONE_HTML_PREFIXES.some((prefix) => asDir.startsWith(prefix) && asDir !== prefix)
}

/** @deprecated use isStandaloneHtmlPath */
export function isPublicJourneyGuidePath(href: string, base = '/'): boolean {
  return isStandaloneHtmlPath(href, base)
}

export function hrefWithSiteBase(href: string, base: string): string {
  if (!href || !base || base === '/') return href
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  try {
    const url = new URL(href, 'http://vitepress.local')
    if (
      url.pathname === normalizedBase.slice(0, -1) ||
      url.pathname.startsWith(normalizedBase)
    ) {
      return href
    }
    if (!url.pathname.startsWith('/')) return href
    return `${normalizedBase}${url.pathname.slice(1)}${url.search}${url.hash}`
  } catch {
    return href
  }
}
