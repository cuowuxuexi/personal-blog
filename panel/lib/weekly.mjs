import fs from 'node:fs'
import path from 'node:path'
import { parseFrontmatter } from '../../content-catalog/frontmatter.mjs'
import { getContentKind } from '../../content-catalog/index.mjs'
import { writeTargetsAtomic } from './atomic-write.mjs'
import { defaultPaths, issueTitle, padIssue } from './paths.mjs'
import { allowsCreate, kindCapability } from './repo-paths.mjs'
import { collectReferencedImages, collectReferencedWeeklyImages } from './publish.mjs'

export { parseFrontmatter }

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

function entryFingerprint(entry) {
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

const SECTION_OPEN = /<div\b[^>]*\bclass=(["'])([^"']*\bweekly-fireworks-section\b[^"']*)\1[^>]*>/g

function findMatchingCloseDiv(source, openIndex) {
  const tag = /<\/?div\b[^>]*>/gi
  tag.lastIndex = openIndex
  let depth = 0
  let match
  while ((match = tag.exec(source))) {
    if (match[0].startsWith('</')) {
      depth -= 1
      if (depth === 0) {
        return { start: match.index, end: match.index + match[0].length }
      }
    } else {
      depth += 1
    }
  }
  throw new Error('unbalanced div')
}

function locateFireworksSection(markdown) {
  const opens = [...markdown.matchAll(SECTION_OPEN)]
  if (opens.length === 0) {
    throw new Error('缺少条目容器 .weekly-fireworks-section，无法写入')
  }
  if (opens.length > 1) {
    throw new Error('条目容器 .weekly-fireworks-section 重复，无法写入')
  }
  const openMatch = opens[0]
  const openStart = openMatch.index
  let close
  try {
    close = findMatchingCloseDiv(markdown, openStart)
  } catch {
    throw new Error('条目容器结构异常，无法写入')
  }
  return {
    openStart,
    openEnd: openStart + openMatch[0].length,
    closeStart: close.start,
    closeEnd: close.end,
  }
}

export function appendEntry(fileContent, entryMarkdown) {
  const section = locateFireworksSection(fileContent)
  const entries = parseEntries(fileContent)
  const inside = entries.filter((entry) => (
    entry.rawStart >= section.openEnd && entry.rawEnd <= section.closeStart
  ))
  if (inside.length !== entries.length) {
    throw new Error('条目容器结构异常，无法写入')
  }
  if (inside.length) {
    const insertAt = inside[inside.length - 1].rawEnd
    return `${fileContent.slice(0, insertAt)}\n\n${entryMarkdown}\n\n${fileContent.slice(insertAt).replace(/^\s*/, '')}`
  }
  return `${fileContent.slice(0, section.closeStart).replace(/\s*$/, '')}\n\n${entryMarkdown}\n\n${fileContent.slice(section.closeStart)}`
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

export function removeEntry(fileContent, entryIndex) {
  if (typeof entryIndex !== 'number' || entryIndex < 0) {
    throw new Error('删除条目需要明确的序号')
  }
  const entries = parseEntries(fileContent)
  const current = entries[entryIndex]
  if (!current) throw new Error(`条目 #${entryIndex} 不存在`)
  const before = fileContent.slice(0, current.rawStart).replace(/\s*$/, '\n\n')
  const after = fileContent.slice(current.rawEnd).replace(/^\s*/, '')
  const next = before + after
  if (parseEntries(next).length !== entries.length - 1) {
    throw new Error('拒绝写入：删除范围异常，已中止以免覆盖其它内容')
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

function documentFromFile(kind, abs, name, link) {
  const raw = readUtf8(abs)
  const { fm, body } = parseFrontmatter(raw)
  const entries = parseEntries(body)
  const chrome = parseChrome(body)
  const rel = path.posix.join(kind.relDir, name)
  return {
    kind: kind.id,
    file: abs,
    rel,
    name,
    title: fm.title || name.replace(/\.md$/, ''),
    date: String(fm.date || ''),
    issue: typeof fm.issue === 'number' ? fm.issue : null,
    description: fm.description || '',
    category: fm.category || kind.category,
    link,
    cover: chrome.cover || kind.defaultCover,
    coverAlt: chrome.coverAlt || kind.defaultCoverAlt,
    caption: chrome.caption || kind.defaultCaption,
    entryCount: entries.length,
    entries,
  }
}

function listWeeklyIssues(kind) {
  if (!fs.existsSync(kind.dir)) return []
  const names = fs.readdirSync(kind.dir).filter(isWeeklyMarkdown)
  const issues = []
  for (const name of names) {
    const abs = path.join(kind.dir, name)
    const { fm } = parseFrontmatter(readUtf8(abs))
    if (fm.type && fm.type !== 'weekly') continue
    const rel = path.posix.join(kind.relDir, name)
    const link = kind.id === 'life'
      ? kind.siteLink(String(fm.date || name.slice(0, 10)))
      : `/${rel.replace(/^docs\//, '').replace(/\.md$/, '')}`
    issues.push(documentFromFile(kind, abs, name, link))
  }
  issues.sort((a, b) => {
    if (a.issue != null && b.issue != null && a.issue !== b.issue) return b.issue - a.issue
    if (a.issue != null && b.issue == null) return -1
    if (a.issue == null && b.issue != null) return 1
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  })
  return issues
}

/**
 * 我的AI历程：有期号的日期周记在前，其后是长期篇章。
 * 长期篇章顺序由 content-catalog typed IA 统一拥有。
 * index.md / README.md 因没有 type: journey 被自然排除。
 */
const journeyChapterOrder = getContentKind('journey').namedChapterOrder || []

function listJourneyDocuments(kind) {
  if (!fs.existsSync(kind.dir)) return []
  const names = fs.readdirSync(kind.dir).filter((name) => name.endsWith('.md'))
  const issues = []
  for (const name of names) {
    const abs = path.join(kind.dir, name)
    const { fm } = parseFrontmatter(readUtf8(abs))
    if (fm.type !== 'journey') continue
    const rel = path.posix.join(kind.relDir, name)
    const link = isWeeklyMarkdown(name)
      ? kind.siteLink(String(fm.date || name.slice(0, 10)))
      : `/${rel.replace(/^docs\//, '').replace(/\.md$/, '')}`
    issues.push(documentFromFile(kind, abs, name, link))
  }
  issues.sort((a, b) => {
    if (a.issue != null && b.issue != null && a.issue !== b.issue) return b.issue - a.issue
    if (a.issue != null && b.issue == null) return -1
    if (a.issue == null && b.issue != null) return 1
    const ai = journeyChapterOrder.indexOf(a.name)
    const bi = journeyChapterOrder.indexOf(b.name)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
  return issues
}

export function listIssues(kindId, paths) {
  const resolved = resolvePaths(paths)
  const kind = resolved.KINDS[kindId]
  if (!kind) throw new Error(`未知栏目：${kindId}`)
  return kindCapability(kind).contentType === 'journey'
    ? listJourneyDocuments(kind)
    : listWeeklyIssues(kind)
}

export function currentIssue(kindId, paths) {
  const resolved = resolvePaths(paths)
  const kind = resolved.KINDS[kindId]
  if (!kind) throw new Error(`未知栏目：${kindId}`)
  const issues = listIssues(kindId, resolved)
  return issues.find((item) => item.issue != null) || issues[0] || null
}

export function nextIssueNumber(kindId, paths) {
  const resolved = resolvePaths(paths)
  const kind = resolved.KINDS[kindId]
  if (!kind) throw new Error(`未知栏目：${kindId}`)
  if (!allowsCreate(kind)) return null
  const numbers = listIssues(kindId, resolved)
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

export function themeFromTitle(title = '') {
  const match = String(title || '').match(/^第\d+期-(.+)$/)
  return match ? match[1].trim() : ''
}

function assertSafeTheme(theme) {
  const text = String(theme || '').trim()
  if (!text) throw new Error('当期主题不能为空')
  if (/[/\\:*?"<>|#]/.test(text)) throw new Error('主题不能包含 / \\ : * ? " < > | #')
  return text
}

export function applyIssueChrome(raw, { title, caption, cover, coverAlt } = {}) {
  let next = String(raw)
  if (title) {
    next = next.replace(/^title:\s*.*$/m, `title: ${yamlString(title)}`)
    next = next.replace(/^# .+$/m, `# ${title}`)
  }
  if (cover) {
    if (!/<p class="weekly-theme-cover">/.test(next)) {
      throw new Error('正文里找不到封面，无法改期头')
    }
    next = next.replace(
      /(<p class="weekly-theme-cover">\s*<img src=")[^"]+(")/,
      `$1${cover}$2`,
    )
    if (coverAlt) {
      next = next.replace(
        /(<p class="weekly-theme-cover">\s*<img src="[^"]+"\s+alt=")[^"]*(")/,
        `$1${coverAlt}$2`,
      )
    }
  }
  if (caption != null) {
    if (!/<p class="weekly-theme-caption">/.test(next)) {
      throw new Error('正文里找不到主题说明，无法改期头')
    }
    const captionText = String(caption)
    next = next.replace(
      /<p class="weekly-theme-caption">[\s\S]*?<\/p>/,
      () => `<p class="weekly-theme-caption">${captionText}</p>`,
    )
  }
  return next
}

function applyWeeklyChrome(markdown, kind, target, issue = {}) {
  const contentType = kindCapability(kind).contentType
  if (contentType !== 'weekly' && contentType !== 'journey') {
    return {
      markdown,
      title: target.title,
      link: target.link,
      newAbs: target.file,
      newRel: target.rel,
      renamed: false,
      changedMeta: false,
    }
  }
  const themeInput = String(issue?.theme || '').trim()
  const captionInput = issue?.caption
  const coverInput = String(issue?.cover || '').trim()
  if (!themeInput && captionInput == null && !coverInput) {
    return {
      markdown,
      title: target.title,
      link: target.link,
      newAbs: target.file,
      newRel: target.rel,
      renamed: false,
      changedMeta: false,
    }
  }

  const namedJourneyChapter = contentType === 'journey' && target.issue == null
  let title = target.title
  if (themeInput && !namedJourneyChapter) {
    const theme = assertSafeTheme(themeInput)
    if (target.issue != null) title = issueTitle(target.issue, theme)
    else throw new Error('没有期号的周记不能改主题')
  }
  const caption = captionInput == null
    ? undefined
    : (String(captionInput).trim() || kind.defaultCaption)
  const next = applyIssueChrome(markdown, {
    title: title !== target.title ? title : undefined,
    caption,
    cover: coverInput,
    coverAlt: issue?.coverAlt,
  })

  let newAbs = target.file
  let newRel = target.rel
  let link = target.link
  if (themeInput && kind.id === 'invest') {
    if (!target.date) throw new Error('投资周记改主题需要日期')
    const fileName = kind.fileName(target.date, assertSafeTheme(themeInput))
    newAbs = path.join(kind.dir, fileName)
    newRel = path.posix.join(kind.relDir, fileName)
    link = kind.siteLink(target.date, assertSafeTheme(themeInput))
    if (path.normalize(newAbs) !== path.normalize(target.file) && fs.existsSync(newAbs)) {
      throw new Error(`文件已存在：${fileName}`)
    }
  }
  return {
    markdown: next,
    title,
    link,
    newAbs,
    newRel,
    renamed: path.normalize(newAbs) !== path.normalize(target.file),
    changedMeta: title !== target.title || link !== target.link,
  }
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''))
}

function textSummary(body, fallback) {
  for (const line of String(body || '').split(/\r?\n/)) {
    const text = line
      .replace(/!\[[^\]]*]\([^)\n]*\)/g, '')
      .replace(/\[([^\]]+)]\([^)\n]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/^\s*(?:#{1,6}|[-*>]|\d+[.)])\s*/, '')
      .trim()
    if (text) return text.slice(0, 80)
  }
  return String(fallback || '').trim().slice(0, 80)
}

function renderNewIssue(kind, { issue, theme, date, description, caption, cover, coverAlt, entry }) {
  const title = issueTitle(issue, theme)
  const coverSrc = cover || kind.defaultCover
  const coverText = coverAlt || kind.defaultCoverAlt
  const captionText = caption || kind.defaultCaption
  const docType = kindCapability(kind).contentType === 'journey' ? 'journey' : 'weekly'
  return [
    '---',
    `title: ${yamlString(title)}`,
    `date: ${yamlString(date)}`,
    `category: ${yamlString(kind.category)}`,
    `type: ${docType}`,
    `issue: ${issue}`,
    `description: ${yamlString(description)}`,
    `pageClass: ${yamlString(kind.pageClass)}`,
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

function draftCommitHint(capability, mode, pageTitle, entryTitle) {
  const prefix = capability.contentType === 'journey' ? 'journey' : 'weekly'
  if (mode === 'editChrome') return `${prefix}: ${pageTitle} 修订期头`
  if (mode === 'edit') return `${prefix}: ${pageTitle} 修订「${entryTitle}」`
  if (mode === 'delete') {
    return prefix === 'journey'
      ? `${prefix}: ${pageTitle} 删除「${entryTitle}」`
      : `${prefix}: ${pageTitle} 删除重复条目「${entryTitle}」`
  }
  return `${prefix}: ${pageTitle} 追加「${entryTitle}」`
}

/** 写入文章：立刻改仓库 Markdown。不是表单草稿，也不是发布。 */
export function applyDraft({ kindId, mode, issueLink, entryIndex, entry, issue }, paths) {
  const resolved = resolvePaths(paths)
  const kind = resolved.KINDS[kindId]
  if (!kind) throw new Error(`未知栏目：${kindId}`)
  const capability = kindCapability(kind)
  if (mode === 'newIssue' && !allowsCreate(kind)) {
    throw new Error('当前栏目不能开新一期')
  }
  if (mode === 'editChrome' && capability.contentType !== 'weekly' && capability.contentType !== 'journey') {
    throw new Error('当前栏目不能改期头')
  }
  if (mode !== 'delete' && mode !== 'editChrome' && !entry?.title?.trim()) throw new Error('标题不能为空')
  if (mode !== 'delete' && mode !== 'editChrome' && !entry?.body?.trim()) throw new Error('正文不能为空')

  const files = []
  let previewLink = ''
  let title = entry?.title?.trim() || ''
  let commitHint = ''
  let targets = []
  let staleAbs = ''

  if (mode === 'newIssue') {
    const date = issue?.date
    const theme = (issue?.theme || '').trim()
    if (!date) throw new Error('开新期需要日期')
    if (!theme) throw new Error('开新期需要主题')
    const number = nextIssueNumber(kindId, resolved)
    const fileName = kind.id === 'invest' ? kind.fileName(date, theme) : kind.fileName(date)
    const abs = path.join(kind.dir, fileName)
    if (fs.existsSync(abs)) throw new Error(`文件已存在：${fileName}`)
    const link = kind.id === 'invest' ? kind.siteLink(date, theme) : kind.siteLink(date)
    const description = String(issue?.description || '').trim().slice(0, 80)
      || textSummary(entry.body, theme)
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
    // 写入文章：只写目标 Markdown；posts / 侧栏由构建期投影派生。
    targets = [{ abs, content: markdown }]
    files.push(path.posix.join(kind.relDir, fileName))
    previewLink = link
    title = issueTitle(number, theme)
    commitHint = `${capability.contentType === 'journey' ? 'journey' : 'weekly'}: 第${padIssue(number)}期-${theme}`
  } else {
    if (capability.contentType === 'journey' && !issueLink) {
      throw new Error('维护篇章需要明确选择篇章')
    }
    const issues = listIssues(kindId, resolved)
    const target = issueLink
      ? issues.find((item) => item.link === issueLink)
      : currentIssue(kindId, resolved)
    if (!target) {
      throw new Error(
        capability.contentType === 'journey'
          ? '没有可写入的篇章，请明确选择篇章'
          : '没有可写入的当期周记，请先开新一期',
      )
    }
    if (mode === 'editChrome') {
      const namedJourneyChapter = capability.contentType === 'journey' && target.issue == null
      if (!namedJourneyChapter && !String(issue?.theme || '').trim()) {
        throw new Error('当期主题不能为空')
      }
    }
    const currentText = readUtf8(target.file)
    const currentEntries = parseEntries(currentText)
    const beforeCount = currentEntries.length
    let next = currentText
    if (mode !== 'editChrome') {
      const block = mode === 'delete' ? '' : serializeEntry(entry)
      if (mode !== 'edit' && mode !== 'delete') {
        const candidate = parseEntries(block)[0]
        if (currentEntries.some((current) => entryFingerprint(current) === entryFingerprint(candidate))) {
          throw new Error(`条目「${candidate.title}」已经存在，已拒绝重复追加`)
        }
      }
      next = mode === 'delete'
        ? removeEntry(currentText, Number(entryIndex))
        : mode === 'edit'
          ? replaceEntry(currentText, Number(entryIndex), block)
          : appendEntry(currentText, block)
      const afterCount = parseEntries(next).length
      if (mode === 'edit' && afterCount !== beforeCount) {
        throw new Error('拒绝写入：修改不应改变条目数量')
      }
      if (mode === 'delete' && afterCount !== beforeCount - 1) {
        throw new Error('拒绝写入：删除后条目数量不对，已中止以免覆盖历史内容')
      }
      if (mode !== 'edit' && mode !== 'delete' && afterCount !== beforeCount + 1) {
        throw new Error('拒绝写入：追加后条目数量不对，已中止以免覆盖历史内容')
      }
    }
    const chrome = applyWeeklyChrome(next, kind, target, issue)
    next = chrome.markdown
    backupWeeklyFile(target.file, resolved)
    targets = [{ abs: chrome.newAbs, content: next }]
    files.push(chrome.newRel)
    if (chrome.renamed) {
      files.push(target.rel)
      staleAbs = target.file
    }
    // 写入文章：改期头 / 重命名只写 Markdown，不改 posts / config。
    previewLink = chrome.link
    title = chrome.title
    const changedTitle = mode === 'delete' ? currentEntries[Number(entryIndex)]?.title : entry?.title
    commitHint = draftCommitHint(capability, mode, chrome.title, changedTitle)
  }

  writeTargetsAtomic(targets)
  if (staleAbs && fs.existsSync(staleAbs) && path.normalize(staleAbs) !== path.normalize(targets[0]?.abs || '')) {
    fs.unlinkSync(staleAbs)
  }
  return {
    files: [...new Set([
      ...files,
      ...collectReferencedImages(
        files,
        resolved.REPO_ROOT,
        capability.assetDirectory || 'docs/public/images/weekly',
      ),
    ])],
    previewLink,
    title,
    commitHint,
    mode: ['edit', 'delete', 'newIssue', 'editChrome'].includes(mode) ? mode : 'append',
    repoRoot: resolved.REPO_ROOT,
  }
}

export function previewUrl(previewLink, vitepressUrl) {
  const base = vitepressUrl.replace(/\/$/, '')
  return `${base}${previewLink}`
}
