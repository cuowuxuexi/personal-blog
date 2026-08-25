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
    walkIndexHtml(root, out)
  }
  return out.sort()
}

function walkIndexHtml(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walkIndexHtml(abs, out)
    else if (entry.isFile() && entry.name === 'index.html') out.push(abs)
  }
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function attr(attrs, name) {
  const match = String(attrs || '').match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
  return match ? match[1] : ''
}

function extractBaseHref(html) {
  const match = String(html || '').match(/<base\s+[^>]*href\s*=\s*["']([^"']+)["']/i)
  return match ? match[1] : ''
}

function extractIds(html) {
  const ids = new Set()
  for (const match of String(html || '').matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
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
  const raw = String(href || '').trim()
  if (!raw || /^(https?:|mailto:|javascript:)/i.test(raw)) return raw
  const fallback = filePublicHref
    ? filePublicHref.endsWith('/')
      ? filePublicHref
      : `${filePublicHref}/`
    : '/'
  const base = baseHref || fallback
  try {
    const url = new URL(raw, `http://site.local${base.startsWith('/') ? base : `/${base}`}`)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return raw
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
      const resolved = resolveHref(anchor.href, baseHref, filePublic)
      const hashOnly = resolved.startsWith('#') || /^#/.test(anchor.href)
      const pathPart = hashOnly ? '' : normalizePath(resolved)
      const allowed = catalog.titles.get(anchor.text)
      const isCurrent = currentTitles.has(anchor.text)
      if (allowed && !isCurrent) {
        const isPageHash = hashOnly && PAGE_HASH.has(resolved.replace(/^#/, ''))
        const hitsAllowed = pathPart && allowed.has(pathPart)
        if (isPageHash || !hitsAllowed) {
          failures.push(
            `${label}: breadcrumb「${anchor.text}」must link to ${[...allowed].join('|')}, got ${anchor.href}`,
          )
        }
      }
    }
  }

  for (const anchor of extractAnchors(html)) {
    const rawHref = String(anchor.href || '').trim()
    const resolved = resolveHref(rawHref, baseHref, filePublic)
    if (!resolved || /^(https?:|mailto:|javascript:)/i.test(resolved)) continue
    if (rawHref.startsWith('#') || resolved.startsWith('#')) {
      const hash = (rawHref.startsWith('#') ? rawHref : resolved).replace(/^#/, '')
      if (!hash) {
        failures.push(`${label}: empty hash href`)
        continue
      }
      if (!hasFragmentTarget(html, hash)) {
        failures.push(`${label}: hash #${hash} has no matching id`)
      }
      continue
    }
    const pathname = normalizePath(resolved)
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
