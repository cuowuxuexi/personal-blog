import fs from 'node:fs'
import path from 'node:path'
import {
  contentSiteLink,
  getContentKind,
  kindIdForPath,
  listContentKinds,
  managedIdentityFromMarkdown,
  managedKindIds,
  matchesKindPath,
  posixRel,
} from '../index.mjs'
import {
  hermesPostsFromFsNames,
  hermesPostsFromGlob,
} from '../../docs/.vitepress/hermes-diary-core.mjs'
import { parseFrontmatter } from './frontmatter.mjs'

function walkMarkdown(absDir, relDir) {
  if (!fs.existsSync(absDir)) return []
  const out = []
  for (const name of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = posixRel(`${relDir}/${name.name}`)
    const abs = path.join(absDir, name.name)
    if (name.isDirectory()) {
      out.push(...walkMarkdown(abs, rel))
      continue
    }
    if (name.isFile() && name.name.toLowerCase().endsWith('.md')) out.push(rel)
  }
  return out
}

function discoverKindCandidates(repoRoot, kind) {
  const abs = path.join(repoRoot, ...kind.contentDir.split('/'))
  if (!fs.existsSync(abs)) return []
  if (kind.scan.mode === 'direct-children') {
    return fs.readdirSync(abs, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => posixRel(`${kind.contentDir}/${entry.name}`))
  }
  return walkMarkdown(abs, kind.contentDir)
}

function classifyCandidate(kind, rel) {
  const name = rel.slice(rel.lastIndexOf('/') + 1)
  const excluded = kind.scan.excludeBasenames.some((item) => item.toLowerCase() === name.toLowerCase())
  if (excluded) return 'excluded'
  if (matchesKindPath(kind.id, rel)) return 'managed'
  return 'unregistered'
}

function datedParts(filename) {
  const stem = filename.replace(/\.md$/i, '')
  const match = /^(\d{4}-\d{2}-\d{2})(?:-(.*))?$/.exec(stem)
  if (!match) return null
  return { date: match[1], theme: match[2] || '', stem }
}

function siteLinkForFile(kind, name, fm) {
  const parts = datedParts(name) || {}
  if (kind.id === 'weekly-life') return contentSiteLink(kind.id, { date: fm.date || parts.date })
  if (kind.id === 'weekly-investment') {
    return contentSiteLink(kind.id, { date: fm.date || parts.date, theme: parts.theme })
  }
  if (kind.id === 'journey') {
    if (parts.date && /^\d{4}-\d{2}-\d{2}\.md$/i.test(name)) {
      return contentSiteLink(kind.id, { date: fm.date || parts.date })
    }
    return contentSiteLink(kind.id, { name: name.replace(/\.md$/i, '') })
  }
  if (kind.id === 'hermes') return contentSiteLink(kind.id, { stem: name.replace(/\.md$/i, '') })
  if (kind.id === 'research') {
    return contentSiteLink(kind.id, { relativeFile: `${kind.contentDir}/${name}` })
  }
  return null
}

export function isDatedJourneyName(name) {
  return /^\d{4}-\d{2}-\d{2}\.md$/i.test(name)
}

const MANAGED_SCAN_KINDS = new Set(managedKindIds())

export function scanContentTree(repoRoot) {
  const files = []
  const unregistered = []
  const excluded = []
  for (const kind of listContentKinds()) {
    for (const rel of discoverKindCandidates(repoRoot, kind)) {
      const name = rel.slice(kind.contentDir.length + 1)
      const classification = classifyCandidate(kind, rel)
      if (classification === 'excluded') {
        excluded.push({ kindId: kind.id, rel, name })
        continue
      }
      if (classification === 'unregistered') {
        unregistered.push({ kindId: kind.id, rel, name })
        continue
      }
      const raw = fs.readFileSync(path.join(repoRoot, ...rel.split('/')), 'utf8')
      const { fm, body } = parseFrontmatter(raw)

      if (MANAGED_SCAN_KINDS.has(kind.id)) {
        const identity = managedIdentityFromMarkdown({
          kindId: kind.id,
          relativePath: rel,
          raw,
        })
        files.push({
          kindId: kind.id,
          rel,
          name,
          title: identity?.title || fm.title || name.replace(/\.md$/i, ''),
          date: String(identity?.date || fm.date || datedParts(name)?.date || ''),
          issue: identity?.issue,
          // Share identity category/type even when missing (do not fall back to kind overwrite).
          type: identity ? identity.type : fm.type,
          category: identity ? identity.category : fm.category,
          link: identity?.link || siteLinkForFile(kind, name, fm),
          body,
          dated: identity ? identity.dated : Boolean(
            kind.id === 'journey' ? isDatedJourneyName(name) : datedParts(name),
          ),
          revisionDate: identity?.revisionDate || undefined,
        })
        continue
      }

      files.push({
        kindId: kind.id,
        rel,
        name,
        title: fm.title || name.replace(/\.md$/i, ''),
        date: String(fm.date || datedParts(name)?.date || ''),
        issue: typeof fm.issue === 'number' ? fm.issue : undefined,
        type: fm.type,
        category: fm.category,
        link: siteLinkForFile(kind, name, fm),
        body,
        dated: Boolean(kind.id === 'journey' ? isDatedJourneyName(name) : datedParts(name)),
      })
    }
  }
  return { files, unregistered, excluded }
}

export function scanManagedFiles(repoRoot) {
  return scanContentTree(repoRoot).files
}

function hermesDir(repoRoot) {
  const kind = getContentKind('hermes')
  return {
    kind,
    abs: path.join(repoRoot, ...kind.contentDir.split('/')),
  }
}

export function scanHermesGlobStyle(repoRoot) {
  const { abs } = hermesDir(repoRoot)
  if (!fs.existsSync(abs)) return []
  const modules = {}
  for (const name of fs.readdirSync(abs)) {
    if (!/\.md$/i.test(name)) continue
    modules[`../AI与生活/Hermes日记/${name}`] = fs.readFileSync(path.join(abs, name), 'utf8')
  }
  return hermesPostsFromGlob(modules)
}

export function scanHermesFsStyle(repoRoot) {
  const { abs } = hermesDir(repoRoot)
  if (!fs.existsSync(abs)) return []
  return hermesPostsFromFsNames(
    fs.readdirSync(abs),
    (name) => fs.readFileSync(path.join(abs, name), 'utf8'),
  )
}

export function referencedAssetRels(markdown, kind) {
  const prefix = kind.assets?.urlPrefix
  if (!prefix) return []
  const dir = kind.assets.directory
  const pattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"'\\)\\s]+)`, 'g')
  const found = []
  for (const match of String(markdown || '').matchAll(pattern)) {
    if (!match[1] || match[1].includes('..')) continue
    found.push(`${dir}/${match[1]}`)
  }
  return found
}

export function kindIdForScannedFile(rel) {
  return kindIdForPath(rel)
}
