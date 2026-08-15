import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PANEL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const REPO_ROOT = path.resolve(PANEL_DIR, '..')

export const PINNED_MODELS = ['grok-4.5', 'gpt-5.6-terra', 'gemini-3.7-flash-high']
export const DEFAULT_MODEL = 'grok-4.5'

export const KINDS = {
  life: {
    id: 'life',
    label: 'AI与生活周记',
    category: 'AI与生活',
    pageClass: 'weekly-post weekly-post--life',
    dir: path.join(REPO_ROOT, 'docs', 'AI与生活'),
    relDir: 'docs/AI与生活',
    sidebarKey: '/AI与生活/',
    yearText: (year) => `周记 · ${year}年`,
    defaultCover: '/images/hero-fireworks.png',
    defaultCoverAlt: '机械之手指向夜空烟花',
    defaultCaption: '烟花朵朵开，想法自然来。',
    fileName(date) {
      return `${date}.md`
    },
    siteLink(date) {
      return `/AI与生活/${date}`
    },
  },
  invest: {
    id: 'invest',
    label: '投资周记',
    category: '投资',
    pageClass: 'weekly-post weekly-post--invest',
    dir: path.join(REPO_ROOT, 'docs', '投资', '周记'),
    relDir: 'docs/投资/周记',
    sidebarKey: '/投资/周记/',
    yearText: (year) => `${year}年`,
    defaultCover: '/images/hero-fireworks.png',
    defaultCoverAlt: '机械之手指向夜空烟花',
    defaultCaption: '烟花朵朵开，想法自然来。',
    fileName(date, theme) {
      return `${date}-${theme}.md`
    },
    siteLink(date, theme) {
      return `/投资/周记/${date}-${theme}`
    },
  },
}

export const POSTS_TS = path.join(REPO_ROOT, 'docs', '.vitepress', 'posts.ts')
export const CONFIG_MTS = path.join(REPO_ROOT, 'docs', '.vitepress', 'config.mts')
export const WEEKLY_IMAGES = path.join(REPO_ROOT, 'docs', 'public', 'images', 'weekly')

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
