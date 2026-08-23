/**
 * 扁平 frontmatter 解析。纯函数，无 fs / VitePress / 面板依赖。
 * verifier 与投影 core 共用；不要在调用方再写一套。
 */

export function parseFrontmatter(raw) {
  const match = String(raw || '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { fm: {}, body: String(raw || '') }
  const fm = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    fm[key] = /^\d+$/.test(value) ? Number(value) : value
  }
  return { fm, body: match[2] }
}
