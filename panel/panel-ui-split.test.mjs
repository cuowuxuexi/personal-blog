import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = (name) => fs.readFileSync(fileURLToPath(new URL(`./public/${name}`, import.meta.url)), 'utf8')

const app = read('app.js')
const chrome = read('issue-chrome.mjs')
const entry = read('entry-editor.mjs')
const publication = read('publication.mjs')

test('app.js 只开机接线，不写三件工作细则', () => {
  assert.match(app, /createIssueChrome/)
  assert.match(app, /createEntryEditor/)
  assert.match(app, /createPublication/)
  assert.doesNotMatch(app, /kind-ui|draft\.mjs|publish-flow|job-restore|paste\.mjs/)
  assert.doesNotMatch(app, /continue-verify/)
  assert.doesNotMatch(app, /\/api\/publish\/confirm/)
  assert.doesNotMatch(app, /\/api\/draft/)
  assert.doesNotMatch(app, /singleFlight/)
  assert.doesNotMatch(app, /issue-theme-input/)
  assert.doesNotMatch(app, /DRAFT_BACKUP_KEY/)
  assert.doesNotMatch(app, /resolvePasteRole/)
})

test('改主题输入只进改期头', () => {
  const kindUi = read('kind-ui.mjs')
  assert.match(chrome, /issue-theme-input/)
  assert.match(kindUi, /themeLabel: isNew \? '新期主题' : '当期主题'/)
  assert.doesNotMatch(entry, /issue-theme-input/)
  assert.doesNotMatch(publication, /issue-theme-input/)
  assert.doesNotMatch(publication, /新期主题/)
})

test('贴图和表单草稿只进改条目', () => {
  assert.match(entry, /decideImagePaste/)
  assert.match(entry, /DRAFT_BACKUP_KEY/)
  assert.match(entry, /\/api\/draft/)
  assert.match(entry, /btn-discard-draft/)
  assert.doesNotMatch(chrome, /decideImagePaste/)
  assert.doesNotMatch(publication, /decideImagePaste/)
  assert.doesNotMatch(chrome, /DRAFT_BACKUP_KEY/)
  assert.doesNotMatch(publication, /DRAFT_BACKUP_KEY/)
})

test('确认旁提示和问进度只进走发布', () => {
  assert.match(publication, /下面清单对应发布前预览，不是工作区预览。/)
  assert.match(publication, /publicationJobQuery/)
  assert.match(publication, /continue-verify/)
  assert.doesNotMatch(app, /下面清单对应发布前预览/)
  assert.doesNotMatch(chrome, /下面清单对应发布前预览/)
  assert.doesNotMatch(entry, /下面清单对应发布前预览/)
  assert.doesNotMatch(chrome, /continue-verify/)
  assert.doesNotMatch(entry, /continue-verify/)
})

test('写入文章仍走 /api/draft，不改发布任务门口', () => {
  assert.match(entry, /api\('\/api\/draft'/)
  assert.doesNotMatch(app + chrome + entry + publication, /publish-job\.mjs/)
})
