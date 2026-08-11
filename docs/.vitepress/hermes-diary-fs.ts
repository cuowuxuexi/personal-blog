/**
 * Node-only：读盘扫描 Hermes 日记（仅 config.mts 引用，勿进主题客户端）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  postFromDayFile,
  sortHermes,
  type HermesDiaryPost,
} from './hermes-diary'

export function loadHermesDiaryPostsFromFs(): HermesDiaryPost[] {
  const dir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../AI与生活/Hermes日记',
  )
  if (!fs.existsSync(dir)) return []
  const items: HermesDiaryPost[] = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue
    if (name === 'index.md' || name.toLowerCase() === 'readme.md') continue
    const stem = name.replace(/\.md$/i, '')
    const raw = fs.readFileSync(path.join(dir, name), 'utf8')
    const item = postFromDayFile(stem, raw)
    if (item) items.push(item)
  }
  return sortHermes(items)
}
