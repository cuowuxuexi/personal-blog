export function bodyImageUrls(body) {
  const urls = []
  const seen = new Set()
  const re = /!\[[^\]]*\]\(([^)\s]+)\)/g
  let match
  while ((match = re.exec(String(body || '')))) {
    const url = match[1]
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }
  return urls
}

export function removeImageMarkdown(body, url) {
  if (!url) return String(body || '')
  const escaped = String(url).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(body || '')
    .replace(new RegExp(`!?\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}
