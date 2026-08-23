import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC_DIR = path.resolve(fileURLToPath(new URL('../public', import.meta.url)))

export const STANDALONE_HTML_PREFIXES = Object.freeze(['/html/', '/journey-guides/'])

function pathnameOf(url) {
  return decodeURIComponent(String(url || '').split('?')[0]).replace(/\/+$/, '') || '/'
}

export function isStandaloneHtmlPathname(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/'
  const asDir = `${normalized}/`
  return STANDALONE_HTML_PREFIXES.some((prefix) => asDir.startsWith(prefix) && asDir !== prefix)
}

function resolvedUnderPublic(relPosix) {
  const abs = path.resolve(PUBLIC_DIR, ...relPosix.split('/'))
  const root = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep
  if (abs !== PUBLIC_DIR && !abs.startsWith(root)) return null
  return abs
}

/**
 * Map /html/foo or /journey-guides/foo to an on-disk HTML file.
 * Prefers <dir>/index.html, then <dir>.html.
 */
export function standaloneHtmlFile(url) {
  const pathname = pathnameOf(url)
  if (!isStandaloneHtmlPathname(pathname)) return null
  const rel = pathname.slice(1)
  if (!rel || rel.includes('..')) return null
  const indexFile = resolvedUnderPublic(`${rel}/index.html`)
  if (indexFile && fs.existsSync(indexFile)) {
    return { file: indexFile, basePath: `${pathname}/` }
  }
  const htmlFile = resolvedUnderPublic(`${rel}.html`)
  if (htmlFile && fs.existsSync(htmlFile)) {
    const dir = pathname.slice(0, pathname.lastIndexOf('/') + 1)
    return { file: htmlFile, basePath: dir || '/' }
  }
  return null
}

export function publicGuideIndexPath(url) {
  return standaloneHtmlFile(url)?.file ?? null
}

function injectBaseHref(html, basePath) {
  if (/<base\s/i.test(html)) return html
  const siteBase = process.env.VITEPRESS_BASE || '/'
  const prefix = siteBase.endsWith('/') ? siteBase.slice(0, -1) : siteBase
  const href = `${prefix}${basePath}`
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n  <base href="${href}" />`)
  }
  return `<base href="${href}" />\n${html}`
}

function sendStandaloneHtml(req, res, next) {
  const found = standaloneHtmlFile(req.url)
  if (!found) {
    next()
    return
  }
  const html = injectBaseHref(fs.readFileSync(found.file, 'utf8'), found.basePath)
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
}

function attachStandaloneHtml(server) {
  return () => {
    server.middlewares.stack.unshift({
      route: '',
      handle: sendStandaloneHtml,
    })
  }
}

function emitSiblingHtml(outDir) {
  for (const prefix of ['html', 'journey-guides']) {
    const root = path.join(outDir, prefix)
    if (!fs.existsSync(root)) continue
    for (const name of fs.readdirSync(root)) {
      const indexFile = path.join(root, name, 'index.html')
      if (!fs.statSync(path.join(root, name)).isDirectory() || !fs.existsSync(indexFile)) continue
      fs.copyFileSync(indexFile, path.join(root, `${name}.html`))
    }
  }
}

/**
 * Serve prebuilt public HTML under /html/ and /journey-guides/
 * before VitePress treats extensionless paths as missing Markdown pages.
 */
export function serveStandaloneHtmlPlugin() {
  return {
    name: 'serve-standalone-html',
    configureServer: attachStandaloneHtml,
    configurePreviewServer: attachStandaloneHtml,
    writeBundle(options) {
      if (options.dir) emitSiblingHtml(options.dir)
    },
  }
}

/** @deprecated use serveStandaloneHtmlPlugin */
export function servePublicGuidesPlugin() {
  return serveStandaloneHtmlPlugin()
}
