/**
 * 周记长文按普通文章写标题即可。
 * WeeklyEntry 体内的标题会降到条目 `###` 之下，避免和栏目/条目标题平级。
 * 条目里的 `---` 默认当分割线，避免上一行被当成 setext 二级标题。
 */

const ENTRY_BLOCK = /<WeeklyEntry\b[\s\S]*?<\/WeeklyEntry>/gi
const SETEXT = /^([^\n]+)\r?\n([=-])\2{2,}[ \t]*$/gm

function neutralizeSetext(body) {
  return body.replace(SETEXT, (all, text, mark) => {
    const title = text.trim()
    const looksLikeTitle =
      title.length > 0 &&
      title.length <= 40 &&
      !/[。！？.!?：:]$/.test(title)
    if (looksLikeTitle) {
      return `${mark === '=' ? '#' : '##'} ${title}\n`
    }
    return `${text}\n\n${mark.repeat(3)}\n`
  })
}

function demoteAtxHeadings(body) {
  const lines = body.split(/\r?\n/)
  let inFence = false
  const headings = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(#{1,6})[ \t]+/.exec(line)
    if (match) headings.push({ index: i, level: match[1].length })
  }

  if (!headings.length) return body

  const min = Math.min(...headings.map((item) => item.level))
  const delta = Math.max(0, 4 - min)
  if (!delta) return lines.join('\n')

  for (const heading of headings) {
    const next = Math.min(6, heading.level + delta)
    lines[heading.index] = lines[heading.index].replace(/^#{1,6}/, '#'.repeat(next))
  }
  return lines.join('\n')
}

function rewriteEntryBody(body) {
  return demoteAtxHeadings(neutralizeSetext(body))
}

export function normalizeWeeklyEntryHeadings(src) {
  return src.replace(ENTRY_BLOCK, (block) => {
    const openEnd = block.indexOf('>')
    const closeStart = block.toLowerCase().lastIndexOf('</weeklyentry>')
    if (openEnd === -1 || closeStart === -1 || openEnd >= closeStart) return block
    const open = block.slice(0, openEnd + 1)
    const close = block.slice(closeStart)
    const body = block.slice(openEnd + 1, closeStart)
    return `${open}${rewriteEntryBody(body)}${close}`
  })
}

export function normalizeWeeklyMarkdown(src) {
  return normalizeWeeklyEntryHeadings(src)
}
