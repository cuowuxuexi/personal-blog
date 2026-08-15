import fs from 'node:fs'
import path from 'node:path'
import { parseEntries } from './weekly.mjs'

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

export function validateWeeklySnapshot(snapshotDir) {
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
    for (const match of markdown.matchAll(/\/images\/weekly\/([^"'\)\s]+)/g)) {
      const image = match[1]
      images.add(image)
      const absolute = path.join(snapshotDir, 'docs', 'public', 'images', 'weekly', image)
      if (!fs.existsSync(absolute)) throw new Error(`缺少周记图片：${image}`)
    }
  }
  return { files: files.length, entries: entryCount, images: images.size }
}
