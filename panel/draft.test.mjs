import assert from 'node:assert/strict'
import test from 'node:test'
import {
  chooseRestoreDraft,
  chooseRestoreDraftForContext,
  draftHasText,
  draftKindId,
  draftMatchesContext,
  draftRequestBody,
  issueFieldsForDraft,
  shouldPersistDraft,
} from './public/draft.mjs'

const filled = { fields: { title: 'DeepTutor', body: '还在尝试' }, savedAt: '2026-08-15T06:00:00.000Z' }
const empty = { fields: { title: '', body: '' }, savedAt: '2026-08-15T07:00:00.000Z' }
const newer = { fields: { title: '新稿', body: '后写的' }, savedAt: '2026-08-15T08:00:00.000Z' }
const themeOnly = { mode: 'newIssue', fields: { title: '', body: '', theme: 'AI Token' }, savedAt: '2026-08-15T09:00:00.000Z' }

test('empty form must not overwrite a draft that still has text', () => {
  assert.equal(shouldPersistDraft(filled, empty), false)
  assert.equal(shouldPersistDraft(empty, filled), true)
  assert.equal(shouldPersistDraft(empty, empty), true)
})

test('restore prefers the newest draft that still has text', () => {
  assert.equal(draftHasText(empty), false)
  assert.equal(draftHasText(themeOnly), true)
  assert.equal(chooseRestoreDraft(empty, filled), filled)
  assert.equal(chooseRestoreDraft(filled, newer), newer)
  assert.equal(chooseRestoreDraft(newer, themeOnly), themeOnly)
  assert.equal(chooseRestoreDraft(empty, null), null)
})

const lifeDraft = {
  kind: 'life',
  kindId: 'life',
  issueLink: '/AI与生活/2026-08-17',
  fields: { title: '周记', body: 'life' },
  savedAt: '2026-08-18T01:00:00.000Z',
}
const journeyDraft = {
  kind: 'journey',
  kindId: 'journey',
  issueLink: '/AI与生活/我的AI历程/基础设施篇',
  fields: { title: '服务', body: 'journey' },
  savedAt: '2026-08-18T02:00:00.000Z',
}

test('draft isolation is kindId + issueLink, not newest-wins across kinds', () => {
  assert.equal(draftKindId(lifeDraft), 'life')
  assert.equal(draftKindId({ kind: 'journey' }), 'journey')
  assert.equal(draftMatchesContext(lifeDraft, {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/基础设施篇',
  }), false)
  assert.equal(draftMatchesContext(journeyDraft, {
    kindId: 'life',
    issueLink: '/AI与生活/2026-08-17',
  }), false)
  assert.equal(chooseRestoreDraftForContext([lifeDraft, journeyDraft], {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/基础设施篇',
  }), journeyDraft)
  assert.equal(chooseRestoreDraftForContext([lifeDraft, journeyDraft], {
    kindId: 'life',
    issueLink: '/AI与生活/2026-08-17',
  }), lifeDraft)
  assert.equal(chooseRestoreDraftForContext([lifeDraft], {
    kindId: 'journey',
    issueLink: '/AI与生活/我的AI历程/基础设施篇',
  }), null)
})

test('append without chrome edits does not send leftover theme or cover', () => {
  assert.deepEqual(issueFieldsForDraft({
    mode: 'append',
    chromeDirty: false,
    theme: '基础设施篇',
    date: '2026-08-18',
    caption: '旧说明',
    cover: '/images/journey/infra-cover.png',
  }), {
    theme: '',
    date: '',
    description: '',
  })
  assert.deepEqual(issueFieldsForDraft({
    mode: 'newIssue',
    chromeDirty: false,
    theme: '底座',
    date: '2026-08-18',
    caption: '一句说明',
    cover: '/images/journey/cover.webp',
  }), {
    theme: '底座',
    date: '2026-08-18',
    caption: '一句说明',
    description: '',
    cover: '/images/journey/cover.webp',
  })
  assert.equal(issueFieldsForDraft({
    mode: 'append',
    chromeDirty: true,
    theme: '底座修订',
    caption: '新说明',
  }).theme, '底座修订')
})

test('persistDraft payload keeps explicit kindId and issueLink', () => {
  const body = draftRequestBody({
    kindId: 'journey',
    mode: 'append',
    issueLink: '/AI与生活/我的AI历程/工具篇',
    entryIndex: null,
    entry: { title: 'Cursor' },
    issue: { theme: '' },
  })
  assert.equal(body.kindId, 'journey')
  assert.equal(body.issueLink, '/AI与生活/我的AI历程/工具篇')
  assert.equal(body.mode, 'append')
  assert.throws(() => draftRequestBody({ mode: 'append' }), /kindId/)
})
