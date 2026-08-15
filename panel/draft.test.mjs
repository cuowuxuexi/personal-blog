import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseRestoreDraft, draftHasText, shouldPersistDraft } from './public/draft.mjs'

const filled = { fields: { title: 'DeepTutor', body: '还在尝试' }, savedAt: '2026-08-15T06:00:00.000Z' }
const empty = { fields: { title: '', body: '' }, savedAt: '2026-08-15T07:00:00.000Z' }
const newer = { fields: { title: '新稿', body: '后写的' }, savedAt: '2026-08-15T08:00:00.000Z' }

test('empty form must not overwrite a draft that still has text', () => {
  assert.equal(shouldPersistDraft(filled, empty), false)
  assert.equal(shouldPersistDraft(empty, filled), true)
  assert.equal(shouldPersistDraft(empty, empty), true)
})

test('restore prefers the newest draft that still has text', () => {
  assert.equal(draftHasText(empty), false)
  assert.equal(chooseRestoreDraft(empty, filled), filled)
  assert.equal(chooseRestoreDraft(filled, newer), newer)
  assert.equal(chooseRestoreDraft(empty, null), null)
})
