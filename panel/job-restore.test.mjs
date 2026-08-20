import assert from 'node:assert/strict'
import test from 'node:test'
import { jobKindId, selectRestorableJob } from './public/job-restore.mjs'

test('restores the newest job for the selected issue instead of an older issue', () => {
  const jobs = [
    {
      jobId: 'old-preview',
      kindId: 'life',
      state: 'PreviewReady',
      articleUrl: '/AI与生活/2026-08-12',
      updatedAt: '2026-08-17T01:00:00.000Z',
    },
    {
      jobId: 'current-failure-old',
      kindId: 'life',
      state: 'Failed',
      articleUrl: '/AI与生活/2026-08-17',
      retryActions: ['prepare'],
      updatedAt: '2026-08-17T02:00:00.000Z',
    },
    {
      jobId: 'current-failure-new',
      kindId: 'life',
      state: 'Failed',
      articleUrl: '/AI与生活/2026-08-17',
      retryActions: ['prepare'],
      updatedAt: '2026-08-17T03:00:00.000Z',
    },
  ]

  assert.equal(
    selectRestorableJob(jobs, {
      kindId: 'life',
      issueLink: '/AI与生活/2026-08-17',
    })?.jobId,
    'current-failure-new',
  )
})

test('does not restore a job from another issue when the selected issue has none', () => {
  const jobs = [{
    jobId: 'old-preview',
    kindId: 'life',
    state: 'PreviewReady',
    articleUrl: '/AI与生活/2026-08-12',
    updatedAt: '2026-08-17T01:00:00.000Z',
  }]

  assert.equal(selectRestorableJob(jobs, {
    kindId: 'life',
    issueLink: '/AI与生活/2026-08-17',
  }), null)
})

test('jobKindId prefers explicit kindId over URL fallback', () => {
  assert.equal(jobKindId({
    kindId: 'journey',
    articleUrl: '/AI与生活/2026-08-17',
  }), 'journey')
  assert.equal(jobKindId({
    kindId: 'life',
    articleUrl: '/AI与生活/我的AI历程/基础设施篇',
  }), 'life')
})

test('URL fallback matches journey before generic AI与生活', () => {
  assert.equal(jobKindId({
    articleUrl: '/AI与生活/我的AI历程/基础设施篇',
  }), 'journey')
  assert.equal(jobKindId({
    releasePreviewUrl: '/release-preview/j_x/AI与生活/我的AI历程/工具篇',
  }), 'journey')
  assert.equal(jobKindId({
    articleUrl: '/AI与生活/2026-08-17',
  }), 'life')
  assert.equal(jobKindId({
    articleUrl: '/投资/周记/2026-08-13-看烟花',
  }), 'invest')
})

test('does not restore a life weekly job onto a journey chapter', () => {
  const jobs = [{
    jobId: 'life-preview',
    kindId: 'life',
    state: 'PreviewReady',
    articleUrl: '/AI与生活/2026-08-17',
    updatedAt: '2026-08-18T01:00:00.000Z',
  }]

  assert.equal(selectRestorableJob(jobs, {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/基础设施篇',
  }), null)
})

test('does not restore a journey job onto life weekly or another chapter', () => {
  const jobs = [{
    jobId: 'journey-preview',
    kindId: 'journey',
    state: 'PreviewReady',
    articleUrl: '/AI与生活/我的AI历程/基础设施篇',
    updatedAt: '2026-08-18T02:00:00.000Z',
  }]

  assert.equal(selectRestorableJob(jobs, {
    kindId: 'life',
    issueLink: '/AI与生活/2026-08-17',
  }), null)
  assert.equal(selectRestorableJob(jobs, {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/工具篇',
  }), null)
  assert.equal(selectRestorableJob(jobs, {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/基础设施篇',
  })?.jobId, 'journey-preview')
})

test('URL-inferred journey jobs still isolate from life restore', () => {
  const jobs = [{
    jobId: 'url-journey',
    state: 'PreviewReady',
    articleUrl: '/AI与生活/我的AI历程/AI开支记录与优化',
    updatedAt: '2026-08-18T03:00:00.000Z',
  }]

  assert.equal(selectRestorableJob(jobs, {
    kindId: 'life',
    issueLink: '/AI与生活/我的AI历程/AI开支记录与优化',
  }), null)
  assert.equal(selectRestorableJob(jobs, {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/AI开支记录与优化',
  })?.jobId, 'url-journey')
})
