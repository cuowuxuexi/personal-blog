/**
 * VitePress 自定义 <a href="/板块/..."> 不会自动加 site.base。
 * 发布预览的 base 是 /release-preview/<jobId>/，不补前缀会跳出预览站。
 */
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
