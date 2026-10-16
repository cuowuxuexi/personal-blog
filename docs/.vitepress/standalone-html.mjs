import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { projectStructureFromFs } from '../../content-catalog/project-fs.mjs'

const PUBLIC_DIR = path.resolve(fileURLToPath(new URL('../public', import.meta.url)))
const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))

export const STANDALONE_HTML_PREFIXES = Object.freeze(['/html/', '/journey-guides/'])

function pathnameOf(url) {
  return decodeURIComponent(String(url || '').split('?')[0]).replace(/\/+$/, '') || '/'
}

export function isStandaloneHtmlPathname(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/'
  const asDir = `${normalized}/`
  if (STANDALONE_HTML_PREFIXES.some((prefix) => asDir.startsWith(prefix) && asDir !== prefix)) {
    return true
  }
  return listStandaloneCoverPathnames().includes(normalized)
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
function resolvePublicStandalone(pathname) {
  if (!STANDALONE_HTML_PREFIXES.some((prefix) => `${pathname}/`.startsWith(prefix) && `${pathname}/` !== prefix)) {
    return null
  }
  const rel = pathname.slice(1)
  if (!rel || rel.includes('..')) return null
  const indexFile = resolvedUnderPublic(`${rel}/index.html`)
  if (indexFile && fs.existsSync(indexFile)) {
    return { file: indexFile, basePath: `${pathname}/`, cover: false }
  }
  const htmlFile = resolvedUnderPublic(`${rel}.html`)
  if (htmlFile && fs.existsSync(htmlFile)) {
    const dir = pathname.slice(0, pathname.lastIndexOf('/') + 1)
    return { file: htmlFile, basePath: dir || '/', cover: false }
  }
  return null
}

let cachedCovers

function coverAliases() {
  if (cachedCovers) return cachedCovers
  const map = new Map()
  for (const node of projectStructureFromFs(REPO_ROOT)) {
    if (node.role !== 'subject' || !node.coverHref || !node.link) continue
    const pagePath = pathnameOf(node.link)
    const html = resolvePublicStandalone(pathnameOf(node.coverHref))
    if (!html) continue
    map.set(pagePath, { file: html.file, basePath: `${pagePath}/`, cover: true })
  }
  cachedCovers = map
  return map
}

export function listStandaloneCoverPathnames() {
  return [...coverAliases().keys()]
}

export function standaloneHtmlFile(url) {
  const pathname = pathnameOf(url)
  return resolvePublicStandalone(pathname) || coverAliases().get(pathname) || null
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
  let html = fs.readFileSync(found.file, 'utf8')
  if (!found.cover) html = injectBaseHref(html, found.basePath)
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

export function emitStandaloneCoverPages(outDir) {
  if (!outDir) return
  for (const [pagePath, found] of coverAliases()) {
    const destDir = path.join(outDir, ...pagePath.slice(1).split('/'))
    fs.mkdirSync(destDir, { recursive: true })
    fs.copyFileSync(found.file, path.join(destDir, 'index.html'))
  }
}

/**
 * Serve prebuilt public HTML under /html/ and /journey-guides/,
 * and archive-root cover URLs, before VitePress treats them as Markdown pages.
 */
export function serveStandaloneHtmlPlugin() {
  return {
    name: 'serve-standalone-html',
    config() {
      return {
        define: {
          __STANDALONE_COVER_PATHS__: JSON.stringify(listStandaloneCoverPathnames()),
        },
      }
    },
    configureServer: attachStandaloneHtml,
    configurePreviewServer: attachStandaloneHtml,
    writeBundle(options) {
      if (options.dir) {
        emitSiblingHtml(options.dir)
        emitStandaloneCoverPages(options.dir)
      }
    },
  }
}

/** @deprecated use serveStandaloneHtmlPlugin */
export function servePublicGuidesPlugin() {
  return serveStandaloneHtmlPlugin()
}
