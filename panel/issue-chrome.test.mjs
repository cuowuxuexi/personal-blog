import assert from 'node:assert/strict'
import test from 'node:test'
import { chromeDirty, themeForPersist } from './public/issue-chrome.mjs'

const weekly = { capability: { contentType: 'weekly', allowCreate: true } }
const journey = { capability: { contentType: 'journey', allowCreate: true } }
const named = { title: '基础设施篇', issue: null, caption: '旧说明', cover: '/c.webp' }
const numbered = { title: '第002期-待定', issue: 2, caption: '旧说明', cover: '/c.webp' }

function fieldOf(values) {
  return (name) => ({ value: values[name] ?? '' })
}

test('具名篇章不把标题当可改期头', () => {
  assert.equal(themeForPersist({
    kind: journey,
    issue: named,
    mode: 'append',
    theme: '基础设施篇',
  }), '')
  assert.equal(themeForPersist({
    kind: journey,
    issue: named,
    mode: 'newIssue',
    theme: '底座',
  }), '底座')
  assert.equal(themeForPersist({
    kind: weekly,
    issue: numbered,
    mode: 'append',
    theme: '待定修订',
  }), '待定修订')
})

test('期头脏检查只看病号期的主题封面说明', () => {
  assert.equal(chromeDirty({
    kind: weekly,
    mode: 'append',
    issue: numbered,
    field: fieldOf({ theme: '待定', caption: '旧说明' }),
    cover: '/c.webp',
  }), false)
  assert.equal(chromeDirty({
    kind: weekly,
    mode: 'append',
    issue: numbered,
    field: fieldOf({ theme: '新主题', caption: '旧说明' }),
    cover: '/c.webp',
  }), true)
  assert.equal(chromeDirty({
    kind: journey,
    mode: 'append',
    issue: named,
    field: fieldOf({ theme: '基础设施篇', caption: '新说明' }),
    cover: '/c.webp',
  }), true)
  assert.equal(chromeDirty({
    kind: journey,
    mode: 'newIssue',
    issue: named,
    field: fieldOf({ theme: '底座' }),
    cover: '',
  }), true)
})
