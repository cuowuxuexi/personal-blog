import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { getContentKind } from '../content-catalog/index.mjs'
import {
  assertPublishable,
  isAllowedPublishPath,
  isJourneyChapterPath,
  isJourneyImagePath,
  isPublicationSourcePath,
} from './lib/scope.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const weeklyOpts = { kindId: 'life', capability: { publishScope: 'weekly' } }
const investOpts = { kindId: 'invest', capability: { publishScope: 'weekly' } }
const journeyOpts = { kindId: 'journey', capability: { publishScope: 'journey' } }

function datedName(kindId, stem = '2026-08-12') {
  return kindId === 'weekly-investment' ? `${stem}-看烟花.md` : `${stem}.md`
}

function bodyPath(kindId, stem) {
  return `${getContentKind(kindId).contentDir}/${datedName(kindId, stem)}`
}

function assetPath(kindId, name) {
  return `${getContentKind(kindId).assets.directory}/${name}`
}

test('weekly and journey allow-lists follow ContentKind dirs and assets', () => {
  const lifeBody = bodyPath('weekly-life')
  const investBody = bodyPath('weekly-investment')
  const journeyBody = `${getContentKind('journey').contentDir}/基础设施篇.md`
  const weeklyImage = assetPath('weekly-life', 'shot.webp')
  const journeyImage = assetPath('journey', 'cover.webp')

  assert.equal(isAllowedPublishPath(lifeBody, weeklyOpts), true)
  assert.equal(isAllowedPublishPath(investBody, investOpts), true)
  assert.equal(isAllowedPublishPath(weeklyImage, weeklyOpts), true)
  assert.equal(isAllowedPublishPath(journeyBody, weeklyOpts), false)
  assert.equal(isAllowedPublishPath(journeyImage, weeklyOpts), false)

  assert.equal(isAllowedPublishPath(journeyBody, journeyOpts), true)
  assert.equal(isAllowedPublishPath(journeyImage, journeyOpts), true)
  assert.equal(isAllowedPublishPath(lifeBody, journeyOpts), false)
  assert.equal(isAllowedPublishPath(weeklyImage, journeyOpts), false)

  assert.deepEqual(assertPublishable([lifeBody, weeklyImage], weeklyOpts), [lifeBody, weeklyImage])
  assert.deepEqual(assertPublishable([investBody, weeklyImage], investOpts), [investBody, weeklyImage])
  assert.deepEqual(assertPublishable([journeyBody, journeyImage], journeyOpts), [journeyBody, journeyImage])
})

test('publication source asks kind scan, not a third path tree', () => {
  const lifeBody = bodyPath('weekly-life')
  const investBody = bodyPath('weekly-investment')
  const journeyBody = `${getContentKind('journey').contentDir}/基础设施篇.md`
  const journeyIndex = `${getContentKind('journey').contentDir}/index.md`

  assert.equal(isPublicationSourcePath(lifeBody, 'life'), true)
  assert.equal(isPublicationSourcePath(investBody, 'invest'), true)
  assert.equal(isPublicationSourcePath(journeyBody, 'journey'), true)
  assert.equal(isPublicationSourcePath(journeyBody, 'life'), false)
  assert.equal(isPublicationSourcePath(lifeBody, 'journey'), false)
  assert.equal(isPublicationSourcePath(journeyIndex, 'journey'), false)
  assert.equal(isJourneyChapterPath(journeyBody), true)
  assert.equal(isJourneyChapterPath(journeyIndex), false)
  assert.equal(isJourneyImagePath(assetPath('journey', 'cover.webp')), true)
})

test('hard-blocked research, philosophy, big questions and Hermes stay out', () => {
  const blocked = [
    'docs/投资/投研/secret.md',
    'docs/投资哲学/foo.md',
    'docs/大问题/bar.md',
    'docs/AI与生活/Hermes日记/2026-08-12.md',
  ]
  for (const file of blocked) {
    assert.equal(isAllowedPublishPath(file, weeklyOpts), false, file)
    assert.throws(
      () => assertPublishable([file], weeklyOpts),
      (error) => error.status === 422 && /超出发布面板范围/.test(error.message) && error.message.includes(file),
    )
    assert.throws(
      () => assertPublishable([`${getContentKind('journey').contentDir}/基础设施篇.md`, file], journeyOpts),
      (error) => error.status === 422 && /超出发布面板范围/.test(error.message),
    )
  }
})

test('journey publish requires exactly one body', () => {
  const journeyDir = getContentKind('journey').contentDir
  assert.throws(
    () => assertPublishable(
      [`${journeyDir}/基础设施篇.md`, `${journeyDir}/工具篇.md`],
      journeyOpts,
    ),
    (error) => error.status === 422 && /恰好一篇正文/.test(error.message),
  )
})

test('scope, validation and publish-job ask kinds or paths instead of copying trees', () => {
  const files = [
    'scope.mjs',
    'content-validation.mjs',
    'publish-job.mjs',
    'prepare-publication.mjs',
    'execute-publication.mjs',
    'production-check.mjs',
    'publish-job-record.mjs',
  ]
  const askKinds = new Set(['scope.mjs', 'content-validation.mjs', 'prepare-publication.mjs'])

  for (const name of files) {
    const src = fs.readFileSync(path.join(HERE, 'lib', name), 'utf8')
    if (askKinds.has(name)) {
      assert.match(src, /content-catalog|matchesKindPath|getContentKind|listContentKinds|assetRulesFor|isPublicationSourcePath/, name)
    }
    assert.doesNotMatch(src, /docs\/投资\/周记\//, name)
    assert.doesNotMatch(src, /docs\/public\/images\/weekly/, name)
    assert.doesNotMatch(src, /docs\/public\/images\/journey/, name)
    assert.doesNotMatch(src, /\/images\/weekly\//, name)
    assert.doesNotMatch(src, /\/images\/journey\//, name)
    assert.doesNotMatch(src, /docs\/AI与生活\/我的AI历程\//, name)
  }
})
