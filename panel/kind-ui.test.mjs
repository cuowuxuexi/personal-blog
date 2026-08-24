import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  allowsCreate,
  chipTone,
  chromeEditorView,
  chromeFormForMode,
  chromeThemeFromIssue,
  imageUploadRequestBody,
  isNamedJourneyChapter,
  issueBarView,
  normalizeEditorMode,
  themeFromIssueTitle,
  previewHeadingAnchor,
  releasePreviewHref,
  resolveCapability,
  selectableIssues,
  writeHint,
} from './public/kind-ui.mjs'

const weeklyCapability = {
  contentType: 'weekly',
  allowCreate: true,
  selectorLabel: '期数',
  emptyHint: '没有当期周记，请先开新一期。',
  appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
  headingAnchor: 'kan-yanhua',
  wechatTheme: 'life',
}

const journeyCapability = {
  contentType: 'journey',
  allowCreate: true,
  selectorLabel: '期数与篇章',
  emptyHint: '没有当期历程周记，请先开新一期。',
  appendHint: '这次会追加到所选期数或篇章末尾，已有条目不会动。',
  headingAnchor: '',
  wechatTheme: 'life',
}

const life = {
  id: 'life',
  nextIssue: 12,
  capability: weeklyCapability,
  issues: [{
    title: '第011期',
    date: '2026-08-17',
    issue: 11,
    link: '/AI与生活/2026-08-17',
    entryCount: 3,
  }],
  current: {
    title: '第011期',
    date: '2026-08-17',
    issue: 11,
    link: '/AI与生活/2026-08-17',
    entryCount: 3,
  },
}

const journey = {
  id: 'journey',
  nextIssue: 1,
  capability: journeyCapability,
  issues: [
    { title: '基础设施篇', date: '2026-08-12', issue: null, link: '/AI与生活/我的AI历程/基础设施篇', entryCount: 4 },
    { title: '工具篇', date: '2026-08-13', issue: null, link: '/AI与生活/我的AI历程/工具篇', entryCount: 2 },
    { title: 'AI开支记录与优化', date: '2026-08-18', issue: null, link: '/AI与生活/我的AI历程/AI开支记录与优化', entryCount: 0 },
  ],
  current: {
    title: '基础设施篇',
    date: '2026-08-12',
    issue: null,
    link: '/AI与生活/我的AI历程/基础设施篇',
    entryCount: 4,
  },
}

test('resolveCapability uses live bootstrap capability and has no web fallback table', () => {
  const resolved = resolveCapability(journey)
  assert.equal(resolved.contentType, 'journey')
  assert.equal(resolved.allowCreate, true)
  assert.equal(resolved.selectorLabel, '期数与篇章')
  assert.equal(resolved.headingAnchor, '')
  assert.equal(allowsCreate({ id: 'journey' }), false)
  assert.equal(allowsCreate(life), true)
  assert.equal(chipTone(journey), 'life')
  assert.equal(chipTone({ id: 'invest', capability: { ...weeklyCapability, wechatTheme: 'invest' } }), 'invest')
  assert.equal(resolveCapability({
    id: 'journey',
    capability: { contentType: 'journey', allowCreate: true, headingAnchor: 'kan-yanhua' },
  }).headingAnchor, 'kan-yanhua')
  assert.equal(allowsCreate({
    id: 'journey',
    capability: { contentType: 'journey', allowCreate: true, headingAnchor: 'kan-yanhua' },
  }), true)
  const source = fs.readFileSync(fileURLToPath(new URL('./public/kind-ui.mjs', import.meta.url)), 'utf8')
  assert.doesNotMatch(source, /WEEKLY_FALLBACK/)
  assert.doesNotMatch(source, /JOURNEY_FALLBACK/)
})

test('journey issue bar offers 开新一期 and still lists chapters', () => {
  const view = issueBarView({
    kind: journey,
    mode: 'newIssue',
    issue: journey.issues[0],
    theme: '底座',
    today: '2026-08-18',
  })
  assert.equal(view.showCreate, true)
  assert.equal(view.showIssueFields, true)
  assert.equal(view.showChromeFields, true)
  assert.equal(view.selectorLabel, '期数与篇章')
  assert.equal(view.showSelector, true)
  assert.deepEqual(view.selectorIssues.map((item) => item.title), [
    '基础设施篇',
    '工具篇',
    'AI开支记录与优化',
  ])
  assert.equal(view.heading, '第001期-底座')
  assert.equal(view.hint, '这次会开一篇新的历程周记，不会改已有篇章。')
  assert.equal(normalizeEditorMode('newIssue', journey), 'newIssue')
  assert.equal(normalizeEditorMode('delete', journey), 'delete')
  assert.equal(normalizeEditorMode('edit', journey), 'edit')
  assert.equal(issueBarView({
    kind: journey,
    mode: 'append',
    issue: journey.issues[0],
    today: '2026-08-18',
  }).entriesHeading, '篇章条目 · 点开可改')
})

test('weekly issue bar still offers 开新一期 and numbered issues only', () => {
  const view = issueBarView({
    kind: life,
    mode: 'newIssue',
    issue: life.current,
    theme: 'AI Token',
    issueDate: '2026-08-18',
    today: '2026-08-18',
  })
  assert.equal(view.showCreate, true)
  assert.equal(view.showIssueFields, true)
  assert.equal(view.showChromeFields, true)
  assert.equal(view.heading, '第012期-AI Token')
  assert.equal(view.meta, '2026-08-18 · 新一期')
  assert.equal(view.selectorLabel, '期数')
  assert.deepEqual(selectableIssues(life).map((item) => item.issue), [11])
  assert.equal(writeHint({ kind: life, mode: 'append' }), weeklyCapability.emptyHint)
})

test('emptyHint and appendHint come from capability', () => {
  assert.equal(writeHint({ kind: journey, mode: 'append' }), journeyCapability.emptyHint)
  assert.equal(writeHint({
    kind: journey,
    mode: 'append',
    issue: journey.issues[2],
  }), journeyCapability.appendHint)
  assert.equal(writeHint({
    kind: journey,
    mode: 'edit',
    entryTitle: 'Cursor Ultra',
  }), '这次会改已有条目「Cursor Ultra」，其它条目不动。')
  assert.equal(writeHint({ kind: life, mode: 'editChrome' }), '这次会改当期主题、封面和说明，下面的条目不动。')
  assert.equal(writeHint({
    kind: journey,
    mode: 'editChrome',
    issue: journey.issues[0],
  }), '这次会改封面和说明，篇章名和下面的条目不动。')
  assert.equal(issueBarView({
    kind: life,
    mode: 'append',
    issue: life.current,
    today: '2026-08-18',
  }).showChromeFields, true)
  assert.equal(issueBarView({
    kind: journey,
    mode: 'append',
    issue: journey.issues[0],
    today: '2026-08-18',
  }).showChromeFields, true)
  assert.equal(themeFromIssueTitle('第002期-待定', 2), '待定')
  assert.equal(chromeThemeFromIssue(life.current), '')
  assert.equal(chromeThemeFromIssue({ title: '第002期-待定', issue: 2 }), '待定')
  assert.equal(chromeThemeFromIssue(journey.issues[0]), '')
  assert.equal(isNamedJourneyChapter(journey, journey.issues[0]), true)
  assert.equal(isNamedJourneyChapter(life, life.current), false)
  assert.deepEqual(chromeEditorView({
    kind: journey,
    mode: 'append',
    issue: journey.issues[0],
  }), {
    showThemeField: false,
    themeLabel: '当期主题',
    themeHint: '改的是这一期标题、封面和说明，不是下面的条目',
    captionHint: '改的是封面和说明，篇章名和下面的条目不动',
  })
  assert.equal(chromeEditorView({
    kind: journey,
    mode: 'newIssue',
    issue: journey.issues[0],
  }).showThemeField, true)
  assert.equal(chromeEditorView({
    kind: life,
    mode: 'append',
    issue: life.current,
  }).showThemeField, true)
  assert.equal(normalizeEditorMode('editChrome', life), 'editChrome')
  assert.equal(normalizeEditorMode('editChrome', journey), 'editChrome')
})

test('switching to 开新一期 starts with an empty dated chrome form', () => {
  assert.deepEqual(chromeFormForMode('newIssue', { today: '2026-08-18' }), {
    theme: '',
    issueDate: '2026-08-18',
    caption: '烟花朵朵开，想法自然来。',
    description: '',
    cover: '',
  })
  assert.equal(chromeFormForMode('append', { today: '2026-08-18' }), null)
  assert.equal(chromeFormForMode('editChrome', { today: '2026-08-18' }), null)
})

test('journey preview href does not append #kan-yanhua', () => {
  assert.equal(previewHeadingAnchor(journey), '')
  assert.equal(
    releasePreviewHref('/release-preview/j_x/AI与生活/我的AI历程/基础设施篇', journey, {
      headingAnchor: 'kan-yanhua',
    }),
    '/release-preview/j_x/AI与生活/我的AI历程/基础设施篇',
  )
  assert.equal(
    releasePreviewHref('/AI与生活/2026-08-17', life),
    '/AI与生活/2026-08-17#kan-yanhua',
  )
})

test('image upload body carries explicit kindId and does not send a directory', () => {
  const journeyBody = imageUploadRequestBody({
    kindId: 'journey',
    date: '2026-08-18',
    files: [{ name: 'spend.png', role: 'image' }],
  })
  assert.equal(journeyBody.kindId, 'journey')
  assert.equal(journeyBody.date, '2026-08-18')
  assert.equal(journeyBody.directory, undefined)
  assert.equal(journeyBody.assetDirectory, undefined)
  assert.equal(imageUploadRequestBody({
    kindId: 'life',
    date: '2026-08-17',
    files: [],
  }).kindId, 'life')
  assert.throws(() => imageUploadRequestBody({ date: '2026-08-18', files: [] }), /kindId/)
})
