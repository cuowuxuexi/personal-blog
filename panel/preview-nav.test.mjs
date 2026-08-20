import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isPreviewArticlePath,
  isReleasePreviewRoot,
  kindIdFromArticleUrl,
  previewArticleLocation,
  withPreviewHash,
} from './lib/preview-nav.mjs'

test('preview root matches empty, slash, and index.html', () => {
  assert.equal(isReleasePreviewRoot(''), true)
  assert.equal(isReleasePreviewRoot('/'), true)
  assert.equal(isReleasePreviewRoot('index.html'), true)
  assert.equal(isReleasePreviewRoot('AI与生活/2026-08-12'), false)
})

test('preview root redirects to the article and fills missing hash', () => {
  const job = {
    id: 'j_test',
    releasePreviewUrl: '/release-preview/j_test/AI与生活/2026-08-12',
    headingAnchor: 'kan-yanhua',
  }
  assert.equal(
    previewArticleLocation(job),
    '/release-preview/j_test/AI与生活/2026-08-12#kan-yanhua',
  )
})

test('preview root does not redirect when the job already points at itself', () => {
  assert.equal(previewArticleLocation({
    id: 'j_test',
    releasePreviewUrl: '/release-preview/j_test/',
  }), '')
})

test('old preview URLs without hash pick up headingAnchor', () => {
  const job = { headingAnchor: 'kan-yanhua' }
  assert.equal(
    withPreviewHash('/release-preview/j_test/AI与生活/2026-08-12', job),
    '/release-preview/j_test/AI与生活/2026-08-12#kan-yanhua',
  )
  assert.equal(
    withPreviewHash('/release-preview/j_test/AI与生活/2026-08-12#kan-yanhua', job),
    '/release-preview/j_test/AI与生活/2026-08-12#kan-yanhua',
  )
})

test('article URL maps back to the panel kind', () => {
  assert.equal(kindIdFromArticleUrl('/AI与生活/2026-08-12'), 'life')
  assert.equal(kindIdFromArticleUrl('/投资/周记/2026-08-13-看烟花'), 'invest')
  assert.equal(kindIdFromArticleUrl('/release-preview/j_x/AI与生活/2026-08-12#kan-yanhua'), 'life')
  assert.equal(kindIdFromArticleUrl('/AI与生活/我的AI历程/基础设施篇'), 'journey')
  assert.equal(kindIdFromArticleUrl('/AI与生活/我的AI历程/AI开支记录与优化'), 'journey')
  assert.equal(kindIdFromArticleUrl('/release-preview/j_x/AI与生活/我的AI历程/工具篇'), 'journey')
})

test('journey preview does not invent a weekly heading hash', () => {
  const job = {
    id: 'j_journey',
    releasePreviewUrl: '/release-preview/j_journey/AI与生活/我的AI历程/基础设施篇',
    headingAnchor: '',
  }
  assert.equal(
    previewArticleLocation(job),
    '/release-preview/j_journey/AI与生活/我的AI历程/基础设施篇',
  )
  assert.equal(
    withPreviewHash('/release-preview/j_journey/AI与生活/我的AI历程/基础设施篇', job),
    '/release-preview/j_journey/AI与生活/我的AI历程/基础设施篇',
  )
})

test('article preview path matches the job articleUrl', () => {
  const job = { articleUrl: '/AI与生活/2026-08-12' }
  assert.equal(isPreviewArticlePath('AI与生活/2026-08-12', job), true)
  assert.equal(isPreviewArticlePath('AI与生活/2026-08-12.html', job), true)
  assert.equal(isPreviewArticlePath('index.html', job), false)
})
