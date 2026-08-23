import assert from 'node:assert/strict'
import test from 'node:test'
import { createRepoPaths } from './lib/paths.mjs'
import { allowsCreate, publicKindCapability } from './lib/repo-paths.mjs'
import { PANEL_TO_CATALOG, catalogIdForPanelKind } from './lib/content-kind-adapter.mjs'
import { getContentKind, yearGroupTitle } from '../content-catalog/index.mjs'

const paths = createRepoPaths('/tmp/repo-root')

test('panel KINDS keep life/invest/journey ids and public capability shape', () => {
  assert.deepEqual(Object.keys(paths.KINDS), ['life', 'invest', 'journey'])
  assert.deepEqual(PANEL_TO_CATALOG, {
    life: 'weekly-life',
    invest: 'weekly-investment',
    journey: 'journey',
  })
  assert.equal(catalogIdForPanelKind('life'), 'weekly-life')
  assert.throws(() => catalogIdForPanelKind('weekly-life'), /未知面板栏目/)

  const life = publicKindCapability(paths.KINDS.life)
  const invest = publicKindCapability(paths.KINDS.invest)
  const journey = publicKindCapability(paths.KINDS.journey)

  assert.deepEqual(Object.keys(life), [
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
  ])
  assert.equal(life.contentType, 'weekly')
  assert.equal(life.allowCreate, true)
  assert.equal(life.selectorLabel, '期数')
  assert.equal(life.headingAnchor, 'kan-yanhua')
  assert.equal(life.wechatTheme, 'life')
  assert.equal(life.publishScope, 'weekly')
  assert.equal(life.assetDirectory, 'docs/public/images/weekly')
  assert.equal(life.assetUrlPrefix, '/images/weekly/')

  assert.equal(invest.contentType, 'weekly')
  assert.equal(invest.wechatTheme, 'invest')
  assert.equal(invest.assetDirectory, 'docs/public/images/weekly')

  assert.equal(journey.contentType, 'journey')
  assert.equal(journey.allowCreate, true)
  assert.equal(journey.selectorLabel, '期数与篇章')
  assert.equal(journey.headingAnchor, '')
  assert.equal(journey.wechatTheme, 'life')
  assert.equal(journey.publishScope, 'journey')
  assert.equal(journey.assetDirectory, 'docs/public/images/journey')
  assert.equal(allowsCreate(paths.KINDS.life), true)
  assert.equal(allowsCreate(paths.KINDS.journey), true)
})

test('panel KINDS consume catalog path, label, and naming rules', () => {
  const life = paths.KINDS.life
  const invest = paths.KINDS.invest
  const journey = paths.KINDS.journey
  const catalogLife = getContentKind('weekly-life')
  const catalogInvest = getContentKind('weekly-investment')
  const catalogJourney = getContentKind('journey')

  assert.equal(life.label, catalogLife.label)
  assert.equal(life.category, catalogLife.category)
  assert.equal(life.pageClass, catalogLife.pageClass)
  assert.equal(life.relDir, catalogLife.contentDir)
  assert.equal(life.sidebarKey, catalogLife.sidebarKey)
  assert.equal(life.yearText(2026), yearGroupTitle('weekly-life', 2026))
  assert.equal(life.fileName('2026-08-17'), '2026-08-17.md')
  assert.equal(life.siteLink('2026-08-17'), '/AI与生活/2026-08-17')

  assert.equal(invest.label, catalogInvest.label)
  assert.equal(invest.relDir, catalogInvest.contentDir)
  assert.equal(invest.fileName('2026-08-17', '那是抓不住的月亮'), '2026-08-17-那是抓不住的月亮.md')
  assert.equal(invest.siteLink('2026-08-17', '那是抓不住的月亮'), '/投资/周记/2026-08-17-那是抓不住的月亮')
  assert.equal(invest.yearText(2026), yearGroupTitle('weekly-investment', 2026))

  assert.equal(journey.label, catalogJourney.label)
  assert.equal(journey.relDir, catalogJourney.contentDir)
  assert.equal(journey.fileName('2026-08-20'), '2026-08-20.md')
  assert.equal(journey.siteLink('2026-08-20'), '/AI与生活/我的AI历程/2026-08-20')
  assert.equal(journey.yearText(2026), yearGroupTitle('journey', 2026))
})
