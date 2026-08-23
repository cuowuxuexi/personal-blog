import path from 'node:path'
import { buildPanelKinds } from './content-kind-adapter.mjs'
import { getContentKind } from '../../content-catalog/index.mjs'

const CAPABILITY_KEYS = [
  'contentType',
  'allowCreate',
  'selectorLabel',
  'emptyHint',
  'appendHint',
  'headingAnchor',
  'assetDirectory',
  'assetUrlPrefix',
  'wechatTheme',
  'publishScope',
]

export function kindCapability(kind) {
  if (!kind?.capability) {
    throw new Error(`栏目缺少 capability：${kind?.id || '?'}`)
  }
  return kind.capability
}

export function allowsCreate(kind) {
  return kindCapability(kind).allowCreate === true
}

export function publicKindCapability(kind) {
  const capability = kindCapability(kind)
  return Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, capability[key]]))
}

export function createRepoPaths(repoRoot) {
  const weeklyAssets = getContentKind('weekly-life').assets
  return {
    REPO_ROOT: repoRoot,
    POSTS_TS: path.join(repoRoot, 'docs', '.vitepress', 'posts.ts'),
    CONFIG_MTS: path.join(repoRoot, 'docs', '.vitepress', 'config.mts'),
    WEEKLY_IMAGES: path.join(repoRoot, weeklyAssets.directory),
    KINDS: buildPanelKinds(repoRoot),
  }
}
