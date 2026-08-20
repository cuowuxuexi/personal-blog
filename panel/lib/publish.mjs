import fs from 'node:fs'
import path from 'node:path'
import { REPO_ROOT } from './paths.mjs'

export { assertPublishable } from './scope.mjs'

const DEFAULT_ASSET_DIRECTORY = 'docs/public/images/weekly'

function posix(value) {
  return String(value || '').replace(/\\/g, '/')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function assetUrlPrefixFromDirectory(assetDirectory = DEFAULT_ASSET_DIRECTORY) {
  const dir = posix(assetDirectory).replace(/\/+$/, '')
  if (!dir.startsWith('docs/public/images/') || dir.includes('..') || dir === 'docs/public/images') {
    throw new Error('不支持的图片目录')
  }
  return `${dir.slice('docs/public'.length)}/`
}

export function collectReferencedImages(
  files,
  repoRoot = REPO_ROOT,
  assetDirectory = DEFAULT_ASSET_DIRECTORY,
) {
  const dir = posix(assetDirectory).replace(/\/+$/, '')
  const urlPrefix = assetUrlPrefixFromDirectory(dir)
  const pattern = new RegExp(`${escapeRegExp(urlPrefix)}([^"'\\)\\s]+)`, 'g')
  const extra = []
  const seen = new Set()
  for (const file of files) {
    if (!String(file).endsWith('.md')) continue
    const abs = path.join(repoRoot, file)
    if (!fs.existsSync(abs)) continue
    const text = fs.readFileSync(abs, 'utf8')
    for (const match of text.matchAll(pattern)) {
      const name = match[1]
      if (!name || name.includes('..')) continue
      const rel = `${dir}/${name}`
      if (seen.has(rel) || rel.includes('..')) continue
      if (!fs.existsSync(path.join(repoRoot, rel))) continue
      seen.add(rel)
      extra.push(rel)
    }
  }
  return extra
}

export function collectReferencedWeeklyImages(files, repoRoot = REPO_ROOT) {
  return collectReferencedImages(files, repoRoot, DEFAULT_ASSET_DIRECTORY)
}
