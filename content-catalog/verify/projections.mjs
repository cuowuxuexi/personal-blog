import fs from 'node:fs'
import path from 'node:path'
import { getContentKind, listContentKinds, yearGroupTitle } from '../index.mjs'
import { matchBracket, readNumber, readQuoted } from './brackets.mjs'

const MANUAL_MARK = 'const manualPosts: PostItem[] = ['

/** @deprecated Wave F：生产路径已删除 shadow；仅用于检测残留字面量。 */
export function parseManualPosts(source) {
  const idx = source.indexOf(MANUAL_MARK)
  if (idx < 0) throw new Error('posts.ts 里找不到 manualPosts')
  const open = idx + MANUAL_MARK.length - 1
  const close = matchBracket(source, open)
  const body = source.slice(open, close + 1)
  const posts = []
  for (let i = 1; i < body.length; i += 1) {
    if (body[i] !== '{') continue
    const end = matchBracket(body, i)
    const block = body.slice(i, end + 1)
    const title = readQuoted(block, 'title')
    const date = readQuoted(block, 'date')
    const category = readQuoted(block, 'category')
    const type = readQuoted(block, 'type')
    const link = readQuoted(block, 'link')
    if (!title || !date || !category || !type || !link) {
      throw new Error('manualPosts 记录字段不完整')
    }
    posts.push({
      title,
      date,
      category,
      type,
      link,
      issue: readNumber(block, 'issue'),
      description: readQuoted(block, 'description'),
    })
    i = end
  }
  return posts
}

/** 无 manualPosts marker 时返回 []；有非空残留则交给 parity 报 deprecated-shadow。 */
export function tryParseShadowManualPosts(source) {
  if (!source || !source.includes(MANUAL_MARK)) return []
  return parseManualPosts(source)
}

function extractSidebarSection(source, sidebarKey) {
  const needle = `'${sidebarKey}': [`
  const start = source.indexOf(needle)
  if (start < 0) return null
  const open = start + needle.length - 1
  return source.slice(open, matchBracket(source, open) + 1)
}

function parseItemObjects(itemsBlock, sidebarKey, groupText) {
  const items = []
  const errors = []
  if (!itemsBlock) return { items, errors }
  for (let i = 1; i < itemsBlock.length; i += 1) {
    if (itemsBlock[i] !== '{') continue
    const end = matchBracket(itemsBlock, i)
    const block = itemsBlock.slice(i, end + 1)
    const text = readQuoted(block, 'text')
    const link = readQuoted(block, 'link')
    const nestedItems = block.indexOf('items:')
    if (text != null && link != null) {
      items.push({ text, link })
      if (nestedItems >= 0) {
        const after = block.slice(nestedItems + 'items:'.length).trimStart()
        if (after.startsWith('[')) {
          const nested = parseItemObjects(after.slice(0, matchBracket(after, 0) + 1), sidebarKey, text)
          items.push(...nested.items)
          errors.push(...nested.errors)
        }
      }
    } else if (nestedItems >= 0) {
      const after = block.slice(nestedItems + 'items:'.length).trimStart()
      if (after.startsWith('[')) {
        const nested = parseItemObjects(after.slice(0, matchBracket(after, 0) + 1), sidebarKey, text)
        errors.push(...nested.errors)
      }
    } else {
      errors.push({
        code: 'sidebar-unparsed',
        sidebarKey,
        groupText,
        message: `sidebar ${sidebarKey} 存在未识别对象`,
        raw: block,
      })
    }
    i = end
  }
  return { items, errors }
}

function extractGroups(section, sidebarKey) {
  const groups = []
  const errors = []
  if (!section) return { groups, errors }
  for (let i = 1; i < section.length; i += 1) {
    if (section[i] !== '{') continue
    const end = matchBracket(section, i)
    const block = section.slice(i, end + 1)
    const itemsIdx = block.indexOf('items:')
    const text = readQuoted(block, 'text')
    let items = []
    if (itemsIdx >= 0) {
      const after = block.slice(itemsIdx + 'items:'.length).trimStart()
      if (after.startsWith('[')) {
        const itemsBlock = after.slice(0, matchBracket(after, 0) + 1)
        const parsed = parseItemObjects(itemsBlock, sidebarKey, text)
        items = parsed.items
        errors.push(...parsed.errors)
      }
    }
    groups.push({ text, items, raw: block })
    i = end
  }
  return { groups, errors }
}

export function parseSidebar(source, sidebarKey) {
  const section = extractSidebarSection(source, sidebarKey)
  if (!section) return { groups: [], errors: [] }
  return extractGroups(section, sidebarKey)
}

export function collectSidebarParseErrors(source) {
  const keys = new Set(
    listContentKinds()
      .filter((kind) => kind.validation.pairWithYearSidebar || kind.validation.pairNamedChapters)
      .map((kind) => kind.sidebarKey),
  )
  keys.add('/AI与生活/')
  const errors = []
  for (const sidebarKey of keys) {
    errors.push(...parseSidebar(source, sidebarKey).errors)
  }
  return errors
}

export function yearSidebarItems(source, kindId) {
  const kind = getContentKind(kindId)
  const { groups } = parseSidebar(source, kind.sidebarKey)
  const items = []
  for (const group of groups) {
    if (!group.text) continue
    const year = String(group.text).match(/(\d{4})/)?.[1]
    if (!year) continue
    if (yearGroupTitle(kindId, year) !== group.text) continue
    items.push(...group.items)
  }
  return items
}

export function namedChapterSidebarItems(source, sidebarKey) {
  const { groups } = parseSidebar(source, sidebarKey)
  const items = []
  for (const group of groups) {
    if (group.text !== '我的AI历程') continue
    for (const item of group.items) {
      if (!item.link || item.link === '/AI与生活/我的AI历程/') continue
      if (/\/\d{4}-\d{2}-\d{2}$/.test(item.link)) continue
      items.push(item)
    }
  }
  return items
}

export function seriesIndexLinks(markdown) {
  const links = []
  const re = /\[([^\]]+)\]\((\/AI与生活\/我的AI历程\/[^)\s]+)\)/g
  let match
  while ((match = re.exec(markdown || ''))) {
    if (match[2] === '/AI与生活/我的AI历程/') continue
    if (/\/\d{4}-\d{2}-\d{2}$/.test(match[2])) continue
    links.push({ text: match[1], link: match[2] })
  }
  return links
}

export function readProjectionSources(repoRoot) {
  return {
    postsSource: fs.readFileSync(path.join(repoRoot, 'docs', '.vitepress', 'posts.ts'), 'utf8'),
    configSource: fs.readFileSync(path.join(repoRoot, 'docs', '.vitepress', 'config.mts'), 'utf8'),
  }
}
