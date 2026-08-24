import assert from 'node:assert/strict'
import test from 'node:test'
import {
  pollTickRequest,
  publicationContinueVerify,
  publicationJobQuery,
  publicationPreviewLabel,
  shouldAutoContinueVerify,
  wechatStatusCopy,
} from './public/publication.mjs'

test('问进度只读，继续核对才推进', () => {
  const query = publicationJobQuery('job-1')
  const cont = publicationContinueVerify('job-1')
  assert.equal(query.method, 'GET')
  assert.equal(query.path, '/api/publish/jobs/job-1')
  assert.equal(query.body, undefined)
  assert.equal(cont.method, 'POST')
  assert.equal(cont.path, '/api/publish/jobs/job-1/continue-verify')
  assert.equal(cont.body, '{}')
})

test('核对未结束才自动发继续核对，不问进度', () => {
  assert.equal(shouldAutoContinueVerify({ state: 'Pushed' }), true)
  assert.equal(shouldAutoContinueVerify({ state: 'Deploying' }), true)
  assert.equal(shouldAutoContinueVerify({ state: 'VerifyingProduction' }), true)
  assert.equal(shouldAutoContinueVerify({ state: 'PreviewReady' }), false)
  assert.equal(shouldAutoContinueVerify({ state: 'Failed' }), false)
  assert.equal(shouldAutoContinueVerify({ state: 'Published' }), false)
  assert.deepEqual(pollTickRequest({ jobId: 'j1', state: 'Pushed' }), publicationContinueVerify('j1'))
  assert.equal(pollTickRequest({ jobId: 'j1', state: 'PreviewReady' }), null)
  assert.equal(pollTickRequest({ jobId: 'j1', state: 'Failed' }), null)
  assert.equal(pollTickRequest({ state: 'Pushed' }), null)
})

test('确认按钮旁边的预览提示住在走发布', () => {
  assert.equal(
    publicationPreviewLabel({ state: 'PreviewReady' }),
    '下面清单对应发布前预览，不是工作区预览。',
  )
  assert.equal(publicationPreviewLabel({ state: 'Failed', failureReason: '推送失败' }), '推送失败')
  assert.match(wechatStatusCopy({ status: 'AssetsOnline' }), /可以复制/)
})
