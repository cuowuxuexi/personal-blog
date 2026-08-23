import path from 'node:path'
import {
  contentFileName,
  contentSiteLink,
  getContentKind,
  yearGroupTitle,
} from '../../content-catalog/index.mjs'

export const PANEL_TO_CATALOG = Object.freeze({
  life: 'weekly-life',
  invest: 'weekly-investment',
  journey: 'journey',
})

const DEFAULT_COVER = '/images/hero-fireworks.png'
const DEFAULT_COVER_ALT = '机械之手指向夜空烟花'
const DEFAULT_CAPTION = '烟花朵朵开，想法自然来。'

const PANEL_UI = Object.freeze({
  life: Object.freeze({
    contentType: 'weekly',
    selectorLabel: '期数',
    emptyHint: '没有当期周记，请先开新一期。',
    appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
    headingAnchor: 'kan-yanhua',
    wechatTheme: 'life',
    publishScope: 'weekly',
  }),
  invest: Object.freeze({
    contentType: 'weekly',
    selectorLabel: '期数',
    emptyHint: '没有当期周记，请先开新一期。',
    appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
    headingAnchor: 'kan-yanhua',
    wechatTheme: 'invest',
    publishScope: 'weekly',
  }),
  journey: Object.freeze({
    contentType: 'journey',
    selectorLabel: '期数与篇章',
    emptyHint: '没有当期历程周记，请先开新一期。',
    appendHint: '这次会追加到所选期数或篇章末尾，已有条目不会动。',
    headingAnchor: '',
    wechatTheme: 'life',
    publishScope: 'journey',
  }),
})

export function catalogIdForPanelKind(panelId) {
  const catalogId = PANEL_TO_CATALOG[panelId]
  if (!catalogId) throw new Error(`未知面板栏目：${panelId || '?'}`)
  return catalogId
}

function joinRepo(repoRoot, posixDir) {
  return path.join(repoRoot, ...String(posixDir).split('/'))
}

function buildCapability(panelId, catalog) {
  const ui = PANEL_UI[panelId]
  return {
    contentType: ui.contentType,
    allowCreate: catalog.creation.allowCreate === true,
    selectorLabel: ui.selectorLabel,
    emptyHint: ui.emptyHint,
    appendHint: ui.appendHint,
    headingAnchor: ui.headingAnchor,
    assetDirectory: catalog.assets.directory,
    assetUrlPrefix: catalog.assets.urlPrefix,
    wechatTheme: ui.wechatTheme,
    publishScope: ui.publishScope,
  }
}

function buildPanelKind(panelId, repoRoot) {
  const catalogId = catalogIdForPanelKind(panelId)
  const catalog = getContentKind(catalogId)
  const pageClass = Array.isArray(catalog.pageClass) ? catalog.pageClass[0] : catalog.pageClass
  return {
    id: panelId,
    label: catalog.label,
    category: catalog.category,
    pageClass,
    dir: joinRepo(repoRoot, catalog.contentDir),
    relDir: catalog.contentDir,
    sidebarKey: catalog.sidebarKey,
    yearText: (year) => yearGroupTitle(catalogId, year),
    defaultCover: DEFAULT_COVER,
    defaultCoverAlt: DEFAULT_COVER_ALT,
    defaultCaption: DEFAULT_CAPTION,
    capability: buildCapability(panelId, catalog),
    fileName(date, theme) {
      return panelId === 'invest'
        ? contentFileName(catalogId, { date, theme })
        : contentFileName(catalogId, { date })
    },
    siteLink(date, theme) {
      return panelId === 'invest'
        ? contentSiteLink(catalogId, { date, theme })
        : contentSiteLink(catalogId, { date })
    },
  }
}

export function buildPanelKinds(repoRoot) {
  return {
    life: buildPanelKind('life', repoRoot),
    invest: buildPanelKind('invest', repoRoot),
    journey: buildPanelKind('journey', repoRoot),
  }
}
