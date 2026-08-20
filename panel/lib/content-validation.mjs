import fs from 'node:fs'
import path from 'node:path'
import { isJourneyChapterPath, posixPath } from './scope.mjs'
import { parseEntries, parseFrontmatter } from './weekly.mjs'

function weeklyFiles(snapshotDir) {
  const roots = [
    path.join(snapshotDir, 'docs', 'AI与生活'),
    path.join(snapshotDir, 'docs', '投资', '周记'),
  ]
  return roots.flatMap((root) => {
    if (!fs.existsSync(root)) return []
    return fs.readdirSync(root)
      .filter((name) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(name))
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
    for (const image of assertReferencedImages(
      markdown,
      snapshotDir,
      '/images/weekly/',
      path.join('docs', 'public', 'images', 'weekly'),
      '缺少周记图片',
    )) {
      images.add(image)
    }
  }
  for (const file of journeyFilesForValidation(snapshotDir, options)) {
    const markdown = fs.readFileSync(file, 'utf8')
    for (const image of assertReferencedImages(
      markdown,
      snapshotDir,
      '/images/journey/',
      path.join('docs', 'public', 'images', 'journey'),
      '缺少图片',
    )) {
      images.add(image)
    }
  }
  return { files: files.length, entries: entryCount, images: images.size }
}
