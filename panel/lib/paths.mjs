import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRepoPaths } from './repo-paths.mjs'

export const PANEL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const REPO_ROOT = path.resolve(PANEL_DIR, '..')
export const defaultPaths = createRepoPaths(REPO_ROOT)
export { createRepoPaths }

export const PINNED_MODELS = ['grok-4.5', 'gpt-5.6-terra', 'gemini-3.7-flash-high']
export const DEFAULT_MODEL = 'grok-4.5'

export const KINDS = defaultPaths.KINDS
export const POSTS_TS = defaultPaths.POSTS_TS
export const CONFIG_MTS = defaultPaths.CONFIG_MTS
export const WEEKLY_IMAGES = defaultPaths.WEEKLY_IMAGES

export function isPathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate))
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

export function loadEnv() {
  const file = path.join(REPO_ROOT, '.env')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null) process.env[key] = value
  }
}

export function todayISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function padIssue(issue) {
  return String(issue).padStart(3, '0')
}

export function issueTitle(issue, theme) {
  return `第${padIssue(issue)}期-${theme}`
}
