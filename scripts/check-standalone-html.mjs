#!/usr/bin/env node
/**
 * 独立 HTML 面包屑与站内链接合同。公开路由来自 content-catalog，不抄路径表。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listContentKinds } from '../content-catalog/index.mjs'
import { projectManagedPostsFromFs, projectStructureFromFs } from '../content-catalog/project-fs.mjs'
import { standaloneHtmlFile } from '../docs/.vitepress/standalone-html.mjs'
import { listReportDirs, readReport } from '../docs/.vitepress/research-reports.mjs'
import { scanSetForPrivateTraces } from './land-report.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAGE_HASH = new Set(['', 'hub'])

export function normalizePath(href) {
  try {
    const url = new URL(String(href || ''), 'http://site.local/')
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/'
    return pathname
  } catch {
    return String(href || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  }
}

export function publicHrefOfFile(repoRoot, absFile) {
  const publicDir = path.join(repoRoot, 'docs', 'public')
  const rel = path.relative(publicDir, absFile).replace(/\\/g, '/')
  if (rel.startsWith('..')) return null
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}`
  if (rel.toLowerCase().endsWith('.html')) return `/${rel.slice(0, -'.html'.length)}`
  return null
}

function addTitle(titles, links, title, link) {
  if (!link) return
  const n = normalizePath(link)
  links.add(n)
  const key = String(title || '').trim()
  if (!key) return
  if (!titles.has(key)) titles.set(key, new Set())
  titles.get(key).add(n)
}

export function buildCatalogTitleLinks(repoRoot) {
  const titles = new Map()
  const links = new Set()
  for (const kind of listContentKinds()) {
    if (kind.seriesEntry) addTitle(titles, links, kind.seriesEntry.text, kind.seriesEntry.link)
    if (kind.label && kind.sidebarKey) addTitle(titles, links, kind.label, kind.sidebarKey)
    if (kind.namedChapterGroupText && kind.seriesEntry) {
      addTitle(titles, links, kind.namedChapterGroupText, kind.seriesEntry.link)
    }
  }
  for (const post of projectManagedPostsFromFs(repoRoot)) {
    addTitle(titles, links, post.title, post.link)
  }
  for (const node of projectStructureFromFs(repoRoot)) {
    addTitle(titles, links, node.title, node.link)
    addTitle(titles, links, node.sidebarText, node.link)
  }
  return { titles, links }
}

export function listStandaloneHtmlFiles(repoRoot) {
  const out = []
  for (const rel of ['docs/public/html', 'docs/public/journey-guides']) {
    const root = path.join(repoRoot, ...rel.split('/'))
    if (!fs.existsSync(root)) continue
    walkIndexHtml(root, out, true)
  }
  return out.sort()
}

// 研报集（docs/public/html/report-*）只走 checkReportSets，不进旧检查
function walkIndexHtml(dir, out, isRoot = false) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (isRoot && /^.?report-/.test(entry.name)) continue
      walkIndexHtml(abs, out)
    }
    else if (entry.isFile() && entry.name === 'index.html') out.push(abs)
  }
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// 属性名前必须是空白（或串首）：href/src/id/class 不会误中 data-href、data-id
function attr(attrs, name) {
  const match = String(attrs || '').match(new RegExp(`(?<=^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
  return match ? match[1] : ''
}

function hasAttr(attrs, name) {
  return new RegExp(`(?<=^|\\s)${name}\\s*=`, 'i').test(String(attrs || ''))
}

function stripComments(html) {
  return String(html || '').replace(/<!--[\s\S]*?-->/g, '')
}

function extractBaseHref(html) {
  const match = String(html || '').match(/<base\s+[^>]*href\s*=\s*["']([^"']+)["']/i)
  return match ? match[1] : ''
}

function extractIds(html) {
  const ids = new Set()
  for (const match of stripComments(html).matchAll(/(?<=\s)id\s*=\s*["']([^"']+)["']/gi)) {
    ids.add(match[1])
  }
  return ids
}

function hasFragmentTarget(html, hash) {
  if (!hash) return false
  const ids = extractIds(html)
  if (ids.has(hash)) return true
  if (ids.has(`page-${hash}`)) return true
  return false
}

export function resolveHref(href, baseHref, filePublicHref) {
  return parseHref(href, baseHref, filePublicHref).resolved
}

/**
 * Resolve against <base href> the same way the browser does.
 * `#pi` + base `/html/cli-hub/` is `{ pathname: /html/cli-hub, hash: pi }`,
 * not a page path `/html/cli-hub/pi`.
 */
export function parseHref(href, baseHref, filePublicHref) {
  const raw = String(href || '').trim()
  const empty = { raw, resolved: raw, pathname: '', hash: '', hashOnly: raw.startsWith('#') }
  if (!raw || /^(https?:|mailto:|javascript:)/i.test(raw)) return empty
  const fallback = filePublicHref
    ? filePublicHref.endsWith('/')
      ? filePublicHref
      : `${filePublicHref}/`
    : '/'
  const base = baseHref || fallback
  try {
    const url = new URL(raw, `http://site.local${base.startsWith('/') ? base : `/${base}`}`)
    return {
      raw,
      resolved: `${url.pathname}${url.search}${url.hash}`,
      pathname: decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/',
      hash: url.hash.replace(/^#/, ''),
      hashOnly: raw.startsWith('#'),
    }
  } catch {
    return empty
  }
}

function extractAnchors(fragment) {
  const out = []
  for (const match of String(fragment || '').matchAll(/<a\s+([^>]*)>([\s\S]*?)<\/a>/gi)) {
    out.push({
      href: attr(match[1], 'href'),
      text: stripTags(match[2]),
    })
  }
  return out
}

function extractBreadcrumbNavs(html) {
  return [...String(html || '').matchAll(/<nav\s+[^>]*class=["'][^"']*research-breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/nav>/gi)].map(
    (match) => match[1],
  )
}

export function currentTitlesForFile(catalog, publicHref) {
  const titles = new Set()
  if (!publicHref) return titles
  const n = normalizePath(publicHref)
  for (const [title, set] of catalog.titles) {
    if (set.has(n)) titles.add(title)
  }
  return titles
}

export function checkHtmlSource(html, options = {}) {
  const failures = []
  const catalog = options.catalog
  const label = options.label || 'html'
  const publicHref = options.publicHref || ''
  const currentTitles = options.currentTitles || currentTitlesForFile(catalog, publicHref)
  const baseHref = extractBaseHref(html)
  const filePublic = publicHref || '/'

  for (const nav of extractBreadcrumbNavs(html)) {
    for (const anchor of extractAnchors(nav)) {
      const parts = parseHref(anchor.href, baseHref, filePublic)
      const pathPart = parts.hashOnly ? '' : parts.pathname
      const allowed = catalog.titles.get(anchor.text)
      const isCurrent = currentTitles.has(anchor.text)
      if (allowed && !isCurrent) {
        const isPageHash = parts.hashOnly && PAGE_HASH.has(parts.hash)
        const hitsAllowed = pathPart && allowed.has(pathPart)
        if (isPageHash || !hitsAllowed) {
          failures.push(
            `${label}: breadcrumb「${anchor.text}」must link to ${[...allowed].join('|')}, got ${anchor.href}`,
          )
        }
      }
    }
  }

  const currentPath = normalizePath(filePublic)
  const targetHtmlCache = new Map()
  const htmlForHashTarget = (pathname) => {
    if (!pathname || pathname === currentPath) return html
    if (!targetHtmlCache.has(pathname)) {
      const found = standaloneHtmlFile(pathname)
      targetHtmlCache.set(pathname, found && fs.existsSync(found.file) ? fs.readFileSync(found.file, 'utf8') : null)
    }
    return targetHtmlCache.get(pathname)
  }

  for (const anchor of extractAnchors(html)) {
    const rawHref = String(anchor.href || '').trim()
    const parts = parseHref(rawHref, baseHref, filePublic)
    if (!parts.resolved || /^(https?:|mailto:|javascript:)/i.test(parts.raw)) continue
    if (parts.hash) {
      const targetHtml = parts.hashOnly ? html : htmlForHashTarget(parts.pathname)
      // 跨页 hash 对目标独立页的 id 校验；目标不是独立 HTML 时留给站内路径检查
      if (targetHtml != null && !hasFragmentTarget(targetHtml, parts.hash)) {
        failures.push(`${label}: hash #${parts.hash} has no matching id${parts.hashOnly ? '' : ` in ${parts.pathname}`}`)
      }
      if (parts.hashOnly) continue
    } else if (parts.hashOnly) {
      failures.push(`${label}: empty hash href`)
      continue
    }
    const pathname = parts.pathname
    if (!pathname || pathname === '/') continue
    if (pathname.startsWith('/html/') || pathname.startsWith('/journey-guides/')) {
      if (!standaloneHtmlFile(pathname)) {
        failures.push(`${label}: standalone path missing on disk: ${pathname}`)
      }
      continue
    }
    if (pathname.startsWith('/')) {
      if (!catalog.links.has(pathname) && !standaloneHtmlFile(pathname)) {
        failures.push(`${label}: unknown site path ${pathname}`)
      }
    }
  }

  return failures
}

function listHtmlFiles(root, rel = '') {
  const out = []
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...listHtmlFiles(root, r))
    else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) out.push(r)
  }
  return out.sort()
}

function isFile(abs) {
  return fs.existsSync(abs) && fs.statSync(abs).isFile()
}

// 站内已知路径：catalog links，加上 docs/<路径>/index.md、docs/<路径>.md 或 public 下的文件
function isKnownSitePath(repoRoot, catalog, pathname) {
  if (catalog.links.has(pathname)) return true
  const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean)
  if (!parts.length || parts.includes('..')) return false
  const docs = path.join(repoRoot, 'docs')
  return (
    isFile(path.join(docs, ...parts, 'index.md'))
    || isFile(`${path.join(docs, ...parts)}.md`)
    || isFile(path.join(docs, 'public', ...parts))
  )
}

function extractReportRefs(html) {
  const refs = []
  for (const m of String(html).matchAll(/<(a|link|script|img)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase()
    const key = tag === 'script' || tag === 'img' ? 'src' : 'href'
    if (hasAttr(m[2], key)) refs.push({ tag, value: attr(m[2], key) })
  }
  return refs
}

function extractBackLinks(html) {
  const out = []
  for (const m of String(html).matchAll(/<a\b([^>]*)>/gi)) {
    if (/\bback-link\b/.test(attr(m[1], 'class'))) out.push(attr(m[1], 'href'))
  }
  return out
}

/** 研报集检查：对象是 docs/public/html/report-<slug>/ 下的一整套页面。 */
export function checkReportSet(repoRoot, setDir, catalog) {
  const slug = path.basename(setDir)
  const failures = []
  const fail = (file, msg) => failures.push(`${slug}${file ? `/${file}` : ''}: ${msg}`)
  const htmlFiles = listHtmlFiles(setDir)
  const idCache = new Map()
  const idsOf = (rel) => {
    if (!idCache.has(rel)) idCache.set(rel, extractIds(fs.readFileSync(path.join(setDir, rel), 'utf8')))
    return idCache.get(rel)
  }
  if (!htmlFiles.includes('index.html')) fail('', '缺少 index.html')

  for (const rel of htmlFiles) {
    const html = stripComments(fs.readFileSync(path.join(setDir, rel), 'utf8'))
    for (const { tag, value } of extractReportRefs(html)) {
      const raw = value.trim()
      if (!raw) {
        fail(rel, `<${tag}> 的链接为空`)
        continue
      }
      if (/^(https?:|mailto:|data:)/i.test(raw)) continue
      // 以该 HTML 的实际公开 URL 为基准解析，再按落点判
      let pathname
      let hash
      try {
        const url = new URL(raw, `http://site.local/html/${slug}/${rel}`)
        hash = decodeURIComponent(url.hash.replace(/^#/, ''))
        pathname = decodeURIComponent(url.pathname)
      } catch {
        fail(rel, `无法解析链接 ${raw}`)
        continue
      }
      const setPrefix = `/html/${slug}/`
      if (pathname.startsWith(setPrefix)) {
        let targetRel = pathname.slice(setPrefix.length)
        if (!targetRel || targetRel.endsWith('/')) targetRel += 'index.html'
        const target = path.resolve(setDir, ...targetRel.split('/'))
        const within = path.relative(setDir, target)
        if (within.startsWith('..') || path.isAbsolute(within) || !isFile(target)) {
          fail(rel, `集内不存在的文件 ${raw}`)
          continue
        }
        const withinPosix = within.split(path.sep).join('/')
        if (hash && target.toLowerCase().endsWith('.html') && !idsOf(withinPosix).has(hash)) {
          fail(rel, `hash #${hash} 在 ${withinPosix} 中没有对应 id`)
        }
        continue
      }
      const normalized = pathname.replace(/\/+$/, '') || '/'
      if (!isKnownSitePath(repoRoot, catalog, normalized)) fail(rel, `未知站内路径 ${raw}`)
    }
    const backs = extractBackLinks(html)
    if (!backs.length) fail(rel, '缺少 .back-link')
    for (const href of backs) if (href !== '/投资/') fail(rel, `.back-link 必须是 /投资/，实际 ${href}`)
  }

  for (const hit of scanSetForPrivateTraces(setDir)) fail(hit, '私有痕迹')

  let industryOk = false
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(setDir, 'blog-meta.json'), 'utf8'))
    industryOk = typeof meta.industry === 'string' && meta.industry.trim() !== ''
  } catch {
    industryOk = false
  }
  if (!industryOk) fail('blog-meta.json', '缺少，或 industry 不是非空字符串')

  if (htmlFiles.includes('index.html')) {
    try {
      readReport(setDir)
    } catch (err) {
      // readReport 缺 blog-meta.json 的行业时已由上面报过，这里只补元数据提取失败
      if (industryOk || !String(err.message).includes('「行业」')) failures.push(err.message)
    }
  }
  return failures
}

export function checkReportSets(repoRoot, catalog = buildCatalogTitleLinks(repoRoot)) {
  const failures = []
  for (const dir of listReportDirs(path.join(repoRoot, 'docs', 'public', 'html'))) {
    failures.push(...checkReportSet(repoRoot, dir, catalog))
  }
  return failures
}

export function checkStandaloneHtml(repoRoot = REPO_ROOT) {
  const catalog = buildCatalogTitleLinks(repoRoot)
  const failures = []
  for (const file of listStandaloneHtmlFiles(repoRoot)) {
    const html = fs.readFileSync(file, 'utf8')
    const publicHref = publicHrefOfFile(repoRoot, file)
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/')
    failures.push(
      ...checkHtmlSource(html, {
        catalog,
        publicHref,
        label: rel,
        currentTitles: currentTitlesForFile(catalog, publicHref),
      }),
    )
  }
  failures.push(...checkReportSets(repoRoot, catalog))
  return { ok: failures.length === 0, failures }
}

function main() {
  const result = checkStandaloneHtml(REPO_ROOT)
  if (result.ok) {
    process.stdout.write('ok\n')
    process.exitCode = 0
    return
  }
  for (const line of result.failures) process.stderr.write(`${line}\n`)
  process.exitCode = 1
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) main()
