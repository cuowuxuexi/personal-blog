import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRepoPaths, allowsCreate, publicKindCapability } from './lib/repo-paths.mjs'

const ROOT = '/tmp/legacy-kinds-root'
const paths = createRepoPaths(ROOT)

const LEGACY_KINDS = Object.freeze({
  life: Object.freeze({
    id: 'life',
    label: 'AI与生活周记',
    category: 'AI与生活',
    pageClass: 'weekly-post weekly-post--life',
    dir: path.join(ROOT, 'docs', 'AI与生活'),
    relDir: 'docs/AI与生活',
    sidebarKey: '/AI与生活/',
    defaultCover: '/images/hero-fireworks.png',
    defaultCoverAlt: '机械之手指向夜空烟花',
    defaultCaption: '烟花朵朵开，想法自然来。',
    yearText: '周记 · 2026年',
    fileName: '2026-08-17.md',
    siteLink: '/AI与生活/2026-08-17',
    capability: Object.freeze({
      contentType: 'weekly',
      allowCreate: true,
      selectorLabel: '期数',
      emptyHint: '没有当期周记，请先开新一期。',
      appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
      headingAnchor: 'kan-yanhua',
      assetDirectory: 'docs/public/images/weekly',
      assetUrlPrefix: '/images/weekly/',
      wechatTheme: 'life',
      publishScope: 'weekly',
    }),
  }),
  invest: Object.freeze({
    id: 'invest',
    label: '投资周记',
    category: '投资',
    pageClass: 'weekly-post weekly-post--invest',
    dir: path.join(ROOT, 'docs', '投资', '周记'),
    relDir: 'docs/投资/周记',
    sidebarKey: '/投资/周记/',
    defaultCover: '/images/hero-fireworks.png',
    defaultCoverAlt: '机械之手指向夜空烟花',
    defaultCaption: '烟花朵朵开，想法自然来。',
    yearText: '2026年',
    fileName: '2026-08-17-那是抓不住的月亮.md',
    siteLink: '/投资/周记/2026-08-17-那是抓不住的月亮',
    capability: Object.freeze({
      contentType: 'weekly',
      allowCreate: true,
      selectorLabel: '期数',
      emptyHint: '没有当期周记，请先开新一期。',
      appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
      headingAnchor: 'kan-yanhua',
      assetDirectory: 'docs/public/images/weekly',
      assetUrlPrefix: '/images/weekly/',
      wechatTheme: 'invest',
      publishScope: 'weekly',
    }),
  }),
  journey: Object.freeze({
    id: 'journey',
    label: '我的AI历程',
    category: 'AI与生活',
    pageClass: 'weekly-post weekly-post--life',
    dir: path.join(ROOT, 'docs', 'AI与生活', '我的AI历程'),
    relDir: 'docs/AI与生活/我的AI历程',
    sidebarKey: '/AI与生活/我的AI历程/',
    defaultCover: '/images/hero-fireworks.png',
    defaultCoverAlt: '机械之手指向夜空烟花',
    defaultCaption: '烟花朵朵开，想法自然来。',
    yearText: '历程 · 2026年',
    fileName: '2026-08-20.md',
    siteLink: '/AI与生活/我的AI历程/2026-08-20',
    capability: Object.freeze({
      contentType: 'journey',
      allowCreate: true,
      selectorLabel: '期数与篇章',
      emptyHint: '没有当期历程周记，请先开新一期。',
      appendHint: '这次会追加到所选期数或篇章末尾，已有条目不会动。',
      headingAnchor: '',
      assetDirectory: 'docs/public/images/journey',
      assetUrlPrefix: '/images/journey/',
      wechatTheme: 'life',
      publishScope: 'journey',
    }),
  }),
})

function observableKind(kind, sample) {
  return {
    id: kind.id,
    label: kind.label,
    category: kind.category,
    pageClass: kind.pageClass,
    dir: kind.dir,
    relDir: kind.relDir,
    sidebarKey: kind.sidebarKey,
    defaultCover: kind.defaultCover,
    defaultCoverAlt: kind.defaultCoverAlt,
    defaultCaption: kind.defaultCaption,
    yearText: kind.yearText(2026),
    fileName: kind.id === 'invest'
      ? kind.fileName('2026-08-17', '那是抓不住的月亮')
      : kind.fileName(sample),
    siteLink: kind.id === 'invest'
      ? kind.siteLink('2026-08-17', '那是抓不住的月亮')
      : kind.siteLink(sample),
    capability: publicKindCapability(kind),
  }
}

test('frozen legacy fixture locks life/invest/journey observable KINDS without reading the new catalog', () => {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
  assert.doesNotMatch(source, /from ['"][^'"]*content-catalog/)
  assert.deepEqual(Object.keys(paths.KINDS), ['life', 'invest', 'journey'])

  assert.deepEqual(observableKind(paths.KINDS.life, '2026-08-17'), { ...LEGACY_KINDS.life })
  assert.deepEqual(observableKind(paths.KINDS.invest, '2026-08-17'), { ...LEGACY_KINDS.invest })
  assert.deepEqual(observableKind(paths.KINDS.journey, '2026-08-20'), { ...LEGACY_KINDS.journey })

  assert.equal(allowsCreate(paths.KINDS.life), true)
  assert.equal(allowsCreate(paths.KINDS.invest), true)
  assert.equal(allowsCreate(paths.KINDS.journey), true)
})
