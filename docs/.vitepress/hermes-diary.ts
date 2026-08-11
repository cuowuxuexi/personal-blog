/**
 * Hermes 日记：纯解析（可被客户端 posts 引用，无 node:fs）。
 */

/** 与 posts.PostItem 中 hermes 条目字段对齐 */
export interface HermesDiaryPost {
  title: string
  date: string
  category: 'AI与生活'
  type: 'hermes'
  link: string
  description?: string
}

const DIARY_LINK_PREFIX = '/AI与生活/Hermes日记/'

export function parseFrontmatter(raw: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
  if (!match) return {}
  const out: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = /^(\w+)\s*:\s*(.*)$/.exec(line.trim())
    if (!m) continue
    let v = m[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

export function postFromDayFile(
  stem: string,
  raw: string,
): HermesDiaryPost | null {
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
    link: `${DIARY_LINK_PREFIX}${stem}`,
    description,
  }
}

/** Vite import.meta.glob 结果 → 日记条目 */
export function hermesPostsFromGlob(
  modules: Record<string, string>,
): HermesDiaryPost[] {
  const items: HermesDiaryPost[] = []
  for (const [filePath, raw] of Object.entries(modules)) {
    const base = filePath.split('/').pop() ?? ''
    if (!base.endsWith('.md')) continue
    if (base === 'index.md' || base.toLowerCase() === 'readme.md') continue
    const stem = base.replace(/\.md$/i, '')
    const item = postFromDayFile(stem, raw)
    if (item) items.push(item)
  }
  return sortHermes(items)
}

export function sortHermes(items: HermesDiaryPost[]): HermesDiaryPost[] {
  return items
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function hermesSidebarItems(
  diaryPosts: HermesDiaryPost[],
): { text: string; link: string }[] {
  return sortHermes(diaryPosts).map((p) => ({
    text: `${p.date} · ${p.title}`,
    link: p.link,
  }))
}
