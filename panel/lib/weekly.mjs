import fs from 'node:fs'
import path from 'node:path'
import { writeTargetsAtomic } from './atomic-write.mjs'
import { defaultPaths, issueTitle, padIssue } from './paths.mjs'
import { collectReferencedWeeklyImages } from './publish.mjs'

function resolvePaths(paths) {
  return paths || defaultPaths
}

const PROP_TO_FIELD = {
  tag: 'tag',
  tags: 'tags',
  title: 'title',
  image: 'image',
  'image-alt': 'imageAlt',
  'link-href': 'linkHref',
  'subtitle-href': 'subtitleHref',
  subtitle: 'subtitle',
  'badge-image': 'badgeImage',
  'badge-alt': 'badgeAlt',
  'image-fit': 'imageFit',
  date: 'date',
}

export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { fm: {}, body: raw }
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

function matchBracket(source, openIndex) {
  const open = source[openIndex]
  const close = open === '[' ? ']' : open === '{' ? '}' : null
  if (!close) throw new Error(`not a bracket: ${open}`)
  let depth = 0
  let quote = ''
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]
    if (quote) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return i
    }
  }
  throw new Error('unbalanced brackets')
}

function findOpenTagEnd(source, start) {
  let quote = ''
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]
    if (quote) {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '>') return i
  }
  throw new Error('WeeklyEntry opening tag is not closed')
}

function parseProps(propsStr) {
  const entry = {
    tags: [],
    title: '',
    subtitle: '',
    subtitleHref: '',
    image: '',
    imageAlt: '',
    imageFit: '',
    linkHref: '',
    badgeImage: '',
    badgeAlt: '',
    date: '',
  }
  const re = /([@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match
  while ((match = re.exec(propsStr))) {
    const field = PROP_TO_FIELD[match[1]]
    if (!field) continue
    const value = match[2] ?? match[3] ?? ''
    if (field === 'tags' || field === 'tag') {
      const tags = value.split(/[/|,，]/).map((item) => item.trim()).filter(Boolean)
      entry.tags = [...new Set([...entry.tags, ...tags])]
    } else {
      entry[field] = value
    }
  }
  return entry
}

/**
 * 只认紧贴在这条 `<WeeklyEntry>` 之前的那一块隐藏 `###`。
 * 区间里如果已经出现过另一条 WeeklyEntry，说明找过头了，放弃。
 */
function findOutlineStart(before) {
  const open = before.lastIndexOf('<div class="weekly-outline-only"')
  if (open < 0) return null
  const close = before.indexOf('</div>', open)
  if (close < 0) return null
  const between = before.slice(close + '</div>'.length)
  if (between.includes('<WeeklyEntry') || between.trim() !== '') return null
  return open
}

export function parseEntries(markdown) {
  const entries = []
  const re = /<WeeklyEntry\b/g
  let match
  while ((match = re.exec(markdown))) {
    const startTag = match.index
    const openEnd = findOpenTagEnd(markdown, startTag)
    const propsStr = markdown.slice(startTag + '<WeeklyEntry'.length, openEnd)
    const close = markdown.indexOf('</WeeklyEntry>', openEnd)
    if (close < 0) throw new Error('WeeklyEntry is missing a closing tag')
    const body = markdown.slice(openEnd + 1, close).replace(/^\r?\n/, '').replace(/\s*$/, '')
    const before = markdown.slice(0, startTag)
    let rawStart = findOutlineStart(before) ?? startTag
    const rawEnd = close + '</WeeklyEntry>'.length
    const slice = markdown.slice(rawStart, rawEnd)
    if ((slice.match(/<WeeklyEntry\b/g) || []).length !== 1) {
      rawStart = startTag
    }
    const parsed = parseProps(propsStr)
    entries.push({
      index: entries.length,
      rawStart,
      rawEnd,
      ...parsed,
      body,
    })
  }
  return entries
}

export function parseChrome(body) {
  const cover = body.match(/<p class="weekly-theme-cover">\s*<img src="([^"]+)"(?:\s+alt="([^"]*)")?/)
  const caption = body.match(/<p class="weekly-theme-caption">([\s\S]*?)<\/p>/)
  return {
    cover: cover?.[1] || '',
    coverAlt: cover?.[2] || '',
    caption: (caption?.[1] || '').trim(),
  }
}

export function xmlAttr(value) {
  return `"${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
}

export function serializeEntry(entry) {
  const tags = Array.isArray(entry.tags)
    ? entry.tags.map((item) => String(item).trim()).filter(Boolean)
    : String(entry.tags || '')
      .split(/[/|,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  const lines = ['<WeeklyEntry']
  if (tags.length) lines.push(`  tags=${xmlAttr(tags.join('/'))}`)
  lines.push(`  title=${xmlAttr(entry.title)}`)
  if (entry.subtitle) lines.push(`  subtitle=${xmlAttr(entry.subtitle)}`)
  if (entry.image) lines.push(`  image=${xmlAttr(entry.image)}`)
  if (entry.imageAlt) lines.push(`  image-alt=${xmlAttr(entry.imageAlt)}`)
  if (entry.imageFit && entry.imageFit !== 'contain') {
    lines.push(`  image-fit=${xmlAttr(entry.imageFit)}`)
  }
  if (entry.linkHref) lines.push(`  link-href=${xmlAttr(entry.linkHref)}`)
  if (entry.subtitleHref) lines.push(`  subtitle-href=${xmlAttr(entry.subtitleHref)}`)
  if (entry.badgeImage) lines.push(`  badge-image=${xmlAttr(entry.badgeImage)}`)
  if (entry.badgeAlt) lines.push(`  badge-alt=${xmlAttr(entry.badgeAlt)}`)
  if (entry.date) lines.push(`  date=${xmlAttr(entry.date)}`)
  lines.push('>')
  lines.push('')
  lines.push(String(entry.body || '').trim())
  lines.push('')
  lines.push('</WeeklyEntry>')
  return [
    '<div class="weekly-outline-only" aria-hidden="true">',
    '',
    `### ${entry.title}`,
    '',
    '</div>',
    '',
    lines.join('\n'),
  ].join('\n')
}

export function appendEntry(fileContent, entryMarkdown) {
  const afterEntry = fileContent.match(/<\/WeeklyEntry>\s*<\/div>\s*$/)
  if (afterEntry) {
    const insertAt = fileContent.length - afterEntry[0].length
    return `${fileContent.slice(0, insertAt)}</WeeklyEntry>\n\n${entryMarkdown}\n\n</div>\n`
  }
  const emptySection = fileContent.match(/\{#kan-yanhua\}\s*<\/div>\s*$/)
  if (emptySection) {
    const insertAt = fileContent.length - emptySection[0].length
    const heading = fileContent.slice(insertAt).replace(/\s*<\/div>\s*$/, '')
    return `${fileContent.slice(0, insertAt)}${heading}\n\n${entryMarkdown}\n\n</div>\n`
  }
  throw new Error('找不到「看烟花」栏目的结尾，无法追加条目')
}

export function replaceEntry(fileContent, entryIndex, entryMarkdown) {
  if (typeof entryIndex !== 'number' || entryIndex < 0) {
    throw new Error('修改条目需要明确的序号，否则请用追加')
  }
  const entries = parseEntries(fileContent)
  const current = entries[entryIndex]
  if (!current) throw new Error(`条目 #${entryIndex} 不存在`)
  const slice = fileContent.slice(current.rawStart, current.rawEnd)
  if ((slice.match(/<WeeklyEntry\b/g) || []).length !== 1) {
    throw new Error('拒绝写入：这条的替换范围会碰到其它条目')
  }
  const next = fileContent.slice(0, current.rawStart) + entryMarkdown + fileContent.slice(current.rawEnd)
  if (parseEntries(next).length !== entries.length) {
    throw new Error('拒绝写入：修改后条目数量变了，已中止以免覆盖历史内容')
  }
  return next
}

function readUtf8(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

function backupWeeklyFile(file, paths) {
  if (!fs.existsSync(file)) return
  const dir = path.join(paths.REPO_ROOT, 'panel', '.local-backups')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `${path.basename(file, '.md')}-${stamp}.md`
  fs.copyFileSync(file, path.join(dir, name))
}

function isWeeklyMarkdown(name) {
  return /^\d{4}-\d{2}-\d{2}.*\.md$/.test(name)
}

export function listIssues(kindId, paths) {
  const resolved = resolvePaths(paths)
  const kind = resolved.KINDS[kindId]
  if (!kind) throw new Error(`未知栏目：${kindId}`)
  const names = fs.readdirSync(kind.dir).filter(isWeeklyMarkdown)
  const issues = []
  for (const name of names) {
    const abs = path.join(kind.dir, name)
    const raw = readUtf8(abs)
    const { fm, body } = parseFrontmatter(raw)
    if (fm.type && fm.type !== 'weekly') continue
    const entries = parseEntries(body)
    const chrome = parseChrome(body)
    const rel = path.posix.join(kind.relDir, name)
    issues.push({
      kind: kind.id,
      file: abs,
      rel,
      name,
      title: fm.title || name,
      date: String(fm.date || ''),
      issue: typeof fm.issue === 'number' ? fm.issue : null,
      description: fm.description || '',
      category: fm.category || kind.category,
      link: kind.id === 'life'
        ? kind.siteLink(String(fm.date || name.slice(0, 10)))
        : `/${rel.replace(/^docs\//, '').replace(/\.md$/, '')}`,
      cover: chrome.cover || kind.defaultCover,
      coverAlt: chrome.coverAlt || kind.defaultCoverAlt,
      caption: chrome.caption || kind.defaultCaption,
      entryCount: entries.length,
      entries,
    })
  }
  issues.sort((a, b) => {
    if (a.issue != null && b.issue != null && a.issue !== b.issue) return b.issue - a.issue
    if (a.issue != null && b.issue == null) return -1
    if (a.issue == null && b.issue != null) return 1
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  })
  return issues
}

export function currentIssue(kindId, paths) {
  return listIssues(kindId, paths).find((item) => item.issue != null) || null
}

export function nextIssueNumber(kindId, paths) {
  const numbers = listIssues(kindId, paths)
    .map((item) => item.issue)
    .filter((item) => typeof item === 'number')
  return (numbers[0] || 0) + 1
}

export function collectTags(paths) {
  const resolved = resolvePaths(paths)
  const counts = new Map()
  for (const kindId of Object.keys(resolved.KINDS)) {
    for (const issue of listIssues(kindId, resolved)) {
      for (const entry of issue.entries) {
        for (const tag of entry.tags) {
          counts.set(tag, (counts.get(tag) || 0) + 1)
        }
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([tag, count]) => ({ tag, count }))
}

function jsString(value) {
  return JSON.stringify(String(value))
}

export function insertManualPost(source, post) {
  const marker = 'const manualPosts: PostItem[] = ['
  const idx = source.indexOf(marker)
  if (idx < 0) throw new Error('posts.ts 里找不到 manualPosts')
  const insertAt = idx + marker.length
  const block = [
    '',
    '  {',
    `    title: ${jsString(post.title)},`,
    `    date: ${jsString(post.date)},`,
    `    category: ${jsString(post.category)},`,
    `    type: 'weekly',`,
    `    issue: ${post.issue},`,
    `    link: ${jsString(post.link)},`,
    `    description: ${jsString(post.description)},`,
    '  },',
  ].join('\n')
  return source.slice(0, insertAt) + block + source.slice(insertAt)
}

function escapeTs(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function insertSidebarItem(source, { sidebarKey, yearText, title, link }) {
  const startNeedle = `'${sidebarKey}': [`
  const start = source.indexOf(startNeedle)
  if (start < 0) throw new Error(`config.mts 里找不到侧栏 ${sidebarKey}`)
  const bracketStart = start + startNeedle.length - 1
  const bracketEnd = matchBracket(source, bracketStart)
  const section = source.slice(bracketStart, bracketEnd + 1)
  const yearNeedle = `text: '${escapeTs(yearText)}'`
  const yearIdx = section.indexOf(yearNeedle)
  if (yearIdx >= 0) {
    const itemsIdx = section.indexOf('items: [', yearIdx)
    if (itemsIdx < 0) throw new Error(`侧栏年份 ${yearText} 没有 items`)
    const itemsOpen = itemsIdx + 'items: ['.length - 1
    const absItemsOpen = bracketStart + itemsIdx + 'items: ['.length - 1
    const item = `\n            { text: '${escapeTs(title)}', link: '${escapeTs(link)}' },`
    return source.slice(0, absItemsOpen + 1) + item + source.slice(absItemsOpen + 1)
  }

  const firstGroupEnd = matchBracket(source, source.indexOf('{', bracketStart + 1))
  const group = [
    '',
    '        {',
    `          text: '${escapeTs(yearText)}',`,
    '          collapsed: false,',
    '          items: [',
    `            { text: '${escapeTs(title)}', link: '${escapeTs(link)}' },`,
    '          ],',
    '        },',
  ].join('\n')
  return source.slice(0, firstGroupEnd + 1) + ',' + group + source.slice(firstGroupEnd + 1)
}

function renderNewIssue(kind, { issue, theme, date, description, caption, cover, coverAlt, entry }) {
  const title = issueTitle(issue, theme)
  const coverSrc = cover || kind.defaultCover
  const coverText = coverAlt || kind.defaultCoverAlt
  const captionText = caption || kind.defaultCaption
  return [
    '---',
    `title: ${title}`,
    `date: ${date}`,
    `category: ${kind.category}`,
    'type: weekly',
    `issue: ${issue}`,
    `description: ${description}`,
    `pageClass: ${kind.pageClass}`,
    '---',
    '',
    `# ${title}`,
    '',
    '<p class="weekly-theme-cover">',
    `  <img src="${coverSrc}" alt="${coverText}" />`,
    '</p>',
    '',
    `<p class="weekly-theme-caption">${captionText}</p>`,
    '',
    '<div class="weekly-fireworks-section">',
    '',
    '## <img class="weekly-section-icon" src="/images/hero-fireworks.png" alt="" /> 看烟花！！！ {#kan-yanhua}',
    '',
    serializeEntry(entry),
    '',
    '</div>',
    '',
  ].join('\n')
}

export function applyDraft({ kindId, mode, issueLink, entryIndex, entry, issue }, paths) {
  const resolved = resolvePaths(paths)
  const kind = resolved.KINDS[kindId]
  if (!kind) throw new Error(`未知栏目：${kindId}`)
  if (!entry?.title?.trim()) throw new Error('标题不能为空')
  if (!entry?.body?.trim()) throw new Error('正文不能为空')

  const files = []
  let previewLink = ''
  let title = entry.title.trim()
  let commitHint = ''
  let targets = []

  if (mode === 'newIssue') {
    const date = issue?.date
    const theme = (issue?.theme || '').trim()
    if (!date) throw new Error('开新期需要日期')
    if (!theme) throw new Error('开新期需要主题')
    const number = nextIssueNumber(kindId, resolved)
    const fileName = kind.id === 'life' ? kind.fileName(date) : kind.fileName(date, theme)
    const abs = path.join(kind.dir, fileName)
    if (fs.existsSync(abs)) throw new Error(`文件已存在：${fileName}`)
    const link = kind.id === 'life' ? kind.siteLink(date) : kind.siteLink(date, theme)
    const description = (issue?.description || entry.body.trim().split(/\n/)[0] || theme).slice(0, 80)
    const markdown = renderNewIssue(kind, {
      issue: number,
      theme,
      date,
      description,
      caption: issue?.caption,
      cover: issue?.cover,
      coverAlt: issue?.coverAlt,
      entry,
    })
    const posts = insertManualPost(readUtf8(resolved.POSTS_TS), {
      title: issueTitle(number, theme),
      date,
      category: kind.category,
      issue: number,
      link,
      description,
    })
    const year = date.slice(0, 4)
    const config = insertSidebarItem(readUtf8(resolved.CONFIG_MTS), {
      sidebarKey: kind.sidebarKey,
      yearText: kind.yearText(year),
      title: issueTitle(number, theme),
      link,
    })
    targets = [
      { abs, content: markdown },
      { abs: resolved.POSTS_TS, content: posts },
      { abs: resolved.CONFIG_MTS, content: config },
    ]
    files.push(path.posix.join(kind.relDir, fileName), 'docs/.vitepress/posts.ts', 'docs/.vitepress/config.mts')
    previewLink = link
    title = issueTitle(number, theme)
    commitHint = `weekly: 第${padIssue(number)}期-${theme}`
  } else {
    const issues = listIssues(kindId, resolved)
    const target = issueLink
      ? issues.find((item) => item.link === issueLink)
      : currentIssue(kindId, resolved)
    if (!target) throw new Error('没有可写入的当期周记，请先开新一期')
    const block = serializeEntry(entry)
    const currentText = readUtf8(target.file)
    const beforeCount = parseEntries(currentText).length
    const next = mode === 'edit'
      ? replaceEntry(currentText, Number(entryIndex), block)
      : appendEntry(currentText, block)
    const afterCount = parseEntries(next).length
    if (mode === 'edit' && afterCount !== beforeCount) {
      throw new Error('拒绝写入：修改不应改变条目数量')
    }
    if (mode !== 'edit' && afterCount !== beforeCount + 1) {
      throw new Error('拒绝写入：追加后条目数量不对，已中止以免覆盖历史内容')
    }
    backupWeeklyFile(target.file, resolved)
    targets = [{ abs: target.file, content: next }]
    files.push(target.rel)
    previewLink = target.link
    title = target.title
    commitHint = mode === 'edit'
      ? `weekly: ${target.title} 修订「${entry.title}」`
      : `weekly: ${target.title} 追加「${entry.title}」`
  }

  writeTargetsAtomic(targets)
  return {
    files: [...new Set([...files, ...collectReferencedWeeklyImages(files, resolved.REPO_ROOT)])],
    previewLink,
    title,
    commitHint,
    mode: mode === 'edit' ? 'edit' : mode === 'newIssue' ? 'newIssue' : 'append',
    repoRoot: resolved.REPO_ROOT,
  }
}

export function previewUrl(previewLink, vitepressUrl) {
  const base = vitepressUrl.replace(/\/$/, '')
  return `${base}${previewLink}`
}
