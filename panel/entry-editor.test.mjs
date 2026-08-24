import assert from 'node:assert/strict'
import test from 'node:test'
import { decideWorkspaceWrite } from './public/entry-editor.mjs'

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
