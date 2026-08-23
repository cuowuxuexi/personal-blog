/**
 * Hermes 日记纯适配：无 node:fs，可供 posts glob、Node fs 扫描与 verifier 共用。
 */

export const HERMES_LINK_PREFIX = '/AI与生活/Hermes日记/'

export function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(String(raw || ''))
  if (!match) return {}
  const out = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = /^(\w+)\s*:\s*(.*)$/.exec(line.trim())
    if (!m) continue
    let v = m[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"'))
      || (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

export function isHermesIndexOrReadme(name) {
  return name === 'index.md' || String(name).toLowerCase() === 'readme.md'
}

export function postFromDayFile(stem, raw) {
  const dateMatch = /^(\d{4}-\d{2}-\d{2})(?:-.*)?$/.exec(stem)
  if (!dateMatch) return null
  const fm = parseFrontmatter(raw)
  const date = fm.date || dateMatch[1]
  const title = fm.title || stem
  const description = fm.description || undefined
  return {
    title,
    date,
    category: 'AI与生活',
    type: 'hermes',
    link: `${HERMES_LINK_PREFIX}${stem}`,
    description,
  }
}

export function sortHermes(items) {
  return items
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function hermesPostFromFileName(name, raw) {
  if (!String(name).endsWith('.md')) return null
  if (isHermesIndexOrReadme(name)) return null
  return postFromDayFile(String(name).replace(/\.md$/i, ''), raw)
}

export function hermesPostsFromGlob(modules) {
  const items = []
  for (const [filePath, raw] of Object.entries(modules || {})) {
    const base = filePath.split('/').pop() ?? ''
    const item = hermesPostFromFileName(base, raw)
    if (item) items.push(item)
  }
  return sortHermes(items)
}

export function hermesPostsFromFsNames(names, readRaw) {
  const items = []
  for (const name of names || []) {
    if (!String(name).endsWith('.md')) continue
    if (isHermesIndexOrReadme(name)) continue
    const item = postFromDayFile(String(name).replace(/\.md$/i, ''), readRaw(name))
    if (item) items.push(item)
  }
  return sortHermes(items)
}

export function hermesSidebarItems(diaryPosts) {
  return sortHermes(diaryPosts).map((p) => ({
    text: `${p.date} · ${p.title}`,
    link: p.link,
  }))
}
