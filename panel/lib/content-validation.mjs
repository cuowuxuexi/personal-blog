import fs from 'node:fs'
import path from 'node:path'
import { getContentKind, listContentKinds } from '../../content-catalog/index.mjs'
import { isJourneyChapterPath, posixPath } from './scope.mjs'
import { parseEntries, parseFrontmatter } from './weekly.mjs'

function panelKinds(postType) {
  return listContentKinds().filter(
    (kind) => kind.creation.surfaces.includes('panel') && kind.postType === postType,
  )
}

function uniqueAssetRules(kinds) {
  const seen = new Set()
  const rules = []
  for (const kind of kinds) {
    const { directory, urlPrefix } = kind.assets
    if (!directory || !urlPrefix) continue
    const key = `${directory}\0${urlPrefix}`
    if (seen.has(key)) continue
    seen.add(key)
    rules.push({ directory, urlPrefix })
  }
  return rules
}

function weeklyFiles(snapshotDir) {
  return panelKinds('weekly').flatMap((kind) => {
    const root = path.join(snapshotDir, ...kind.contentDir.split('/'))
    if (!fs.existsSync(root)) return []
    const include = new RegExp(kind.scan.includePattern, 'i')
    const excluded = new Set(kind.scan.excludeBasenames.map((name) => name.toLowerCase()))
    return fs.readdirSync(root)
      .filter((name) => include.test(name) && !excluded.has(name.toLowerCase()))
      .map((name) => path.join(root, name))
  })
}

function normalizeContentFiles(files) {
  return [...new Set((files || []).map(posixPath).filter(Boolean))]
}

/**
 * Journey image checks are opt-in and task-scoped.
 * Default / weekly prepare must not scan every journey chapter in the checkout.
 */
function journeyFilesForValidation(snapshotDir, options = {}) {
  const contentFiles = normalizeContentFiles(options.contentFiles || options.files)
  if (!contentFiles.length) return []
  if (options.kindId && options.kindId !== 'journey') return []

  return contentFiles
    .filter(isJourneyChapterPath)
    .map((rel) => path.join(snapshotDir, rel))
    .filter((abs) => {
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return false
      const { fm } = parseFrontmatter(fs.readFileSync(abs, 'utf8'))
      return fm.type === 'journey'
    })
}

function assertReferencedImages(markdown, snapshotDir, urlPrefix, assetDir, label) {
  const pattern = new RegExp(`${urlPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"'\\)\\s]+)`, 'g')
  const found = new Set()
  for (const match of markdown.matchAll(pattern)) {
    const image = match[1]
    if (!image || image.includes('..')) continue
    found.add(image)
    const absolute = path.join(snapshotDir, assetDir, image)
    if (!fs.existsSync(absolute)) throw new Error(`${label}：${image}`)
  }
  return found
}

function collectKindImages(markdown, snapshotDir, kinds, label) {
  const images = new Set()
  for (const { urlPrefix, directory } of uniqueAssetRules(kinds)) {
    for (const image of assertReferencedImages(markdown, snapshotDir, urlPrefix, directory, label)) {
      images.add(image)
    }
  }
  return images
}

function entrySignature(entry) {
  return JSON.stringify({
    tags: entry.tags,
    title: entry.title,
    subtitle: entry.subtitle,
    subtitleHref: entry.subtitleHref,
    image: entry.image,
    imageAlt: entry.imageAlt,
    imageFit: entry.imageFit,
    linkHref: entry.linkHref,
    badgeImage: entry.badgeImage,
    badgeAlt: entry.badgeAlt,
    date: entry.date,
    body: entry.body.trim(),
  })
}

export function validateWeeklySnapshot(snapshotDir, options = {}) {
  const files = weeklyFiles(snapshotDir)
  let entryCount = 0
  const images = new Set()
  const weeklyKinds = panelKinds('weekly')
  for (const file of files) {
    const markdown = fs.readFileSync(file, 'utf8')
    const entries = parseEntries(markdown)
    entryCount += entries.length
    const seen = new Map()
    for (const entry of entries) {
      const signature = entrySignature(entry)
      if (seen.has(signature)) {
        throw new Error(`发现重复条目「${entry.title}」：${path.relative(snapshotDir, file)}`)
      }
      seen.set(signature, entry.index)
    }
    for (const image of collectKindImages(markdown, snapshotDir, weeklyKinds, '缺少周记图片')) {
      images.add(image)
    }
  }
  const journeyKind = getContentKind('journey')
  for (const file of journeyFilesForValidation(snapshotDir, options)) {
    const markdown = fs.readFileSync(file, 'utf8')
    for (const image of collectKindImages(markdown, snapshotDir, [journeyKind], '缺少图片')) {
      images.add(image)
    }
  }
  return { files: files.length, entries: entryCount, images: images.size }
}
