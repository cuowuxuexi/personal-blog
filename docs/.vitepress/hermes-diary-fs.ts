/**
 * Node-only：读盘扫描 Hermes 日记（仅 config.mts 引用，勿进主题客户端）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  hermesPostsFromFsNames,
} from './hermes-diary-core.mjs'
import type { HermesDiaryPost } from './hermes-diary'

export function loadHermesDiaryPostsFromFsDir(dir: string): HermesDiaryPost[] {
  if (!fs.existsSync(dir)) return []
  return hermesPostsFromFsNames(
    fs.readdirSync(dir),
    (name) => fs.readFileSync(path.join(dir, name), 'utf8'),
  )
}

export function loadHermesDiaryPostsFromFs(): HermesDiaryPost[] {
  const dir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../AI与生活/Hermes日记',
  )
  return loadHermesDiaryPostsFromFsDir(dir)
}
