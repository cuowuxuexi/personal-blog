import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decideWorkspaceWrite,
  noticeAfterDraftPrepare,
  runAfterDraftWrite,
} from './public/entry-editor.mjs'

test('空条目且期头有改动时写入文章走改期头', () => {
  assert.deepEqual(decideWorkspaceWrite({
    contentType: 'weekly',
    mode: 'append',
    entry: { title: '', body: '' },
    namedChapter: false,
    theme: '待定',
    chromeDirty: true,
  }), { persist: { mode: 'editChrome', entry: null } })
})

test('具名篇章封面说明没改则不写入', () => {
  assert.deepEqual(decideWorkspaceWrite({
    contentType: 'journey',
    mode: 'append',
    entry: { title: '', body: '' },
    namedChapter: true,
    theme: '',
    chromeDirty: false,
  }), { error: '封面或说明没有改动。' })
})

test('编号期主题为空则拦住', () => {
  assert.deepEqual(decideWorkspaceWrite({
    contentType: 'weekly',
    mode: 'append',
    entry: { title: '', body: '' },
    namedChapter: false,
    theme: '',
    chromeDirty: false,
  }), { error: '当期主题不能为空。' })
})

test('改已有条目要确认，开新期直接写入', () => {
  assert.deepEqual(decideWorkspaceWrite({
    contentType: 'weekly',
    mode: 'edit',
    entry: { title: '一条', body: '正文' },
    namedChapter: false,
    theme: '待定',
    chromeDirty: false,
  }), { persist: {}, confirmEdit: true })
  assert.deepEqual(decideWorkspaceWrite({
    contentType: 'journey',
    mode: 'newIssue',
    entry: { title: '首条', body: '' },
    namedChapter: false,
    theme: '底座',
    chromeDirty: false,
  }), { persist: {} })
})

test('draft 后 bootstrap 不阻塞 prepare', async () => {
  let prepareStarted = false
  let releaseBootstrap
  const bootstrap = new Promise((resolve) => {
    releaseBootstrap = resolve
  })
  const run = runAfterDraftWrite({
    refreshBootstrap: () => bootstrap,
    prepare: async () => {
      prepareStarted = true
      return true
    },
  })
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(prepareStarted, true)
  releaseBootstrap()
  const result = await run
  assert.equal(result.prepared, true)
  assert.equal(result.bootstrapError, null)
})

test('bootstrap 失败不阻止 prepare，错误仍可见', async () => {
  const result = await runAfterDraftWrite({
    refreshBootstrap: async () => {
      throw new Error('刷新失败')
    },
    prepare: async () => true,
  })
  assert.equal(result.prepared, true)
  assert.equal(result.bootstrapError, '刷新失败')
  assert.deepEqual(noticeAfterDraftPrepare(result), {
    text: '已写入文章，但刷新条目列表失败：刷新失败',
    tone: 'err',
  })
  assert.equal(noticeAfterDraftPrepare({ prepared: false, bootstrapError: '刷新失败' }), null)
})
