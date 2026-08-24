import { createEntryEditor } from './entry-editor.mjs'
import { createIssueChrome } from './issue-chrome.mjs'
import { createPublication } from './publication.mjs'

const state = {
  bootstrap: null,
  kind: 'life',
  mode: 'append',
  issueLink: '',
  entryIndex: null,
  images: { image: '', cover: '' },
  suggestion: null,
  draftId: '',
  job: null,
  pollTimer: 0,
}

const form = document.getElementById('form')
const notice = document.getElementById('notice')

function field(name) {
  return form.elements[name]
}

function setNotice(text, type = '') {
  notice.textContent = text || ''
  notice.className = `notice ${type}`
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `请求失败 ${response.status}`)
  }
  return payload
}

function currentKind() {
  return state.bootstrap.kinds.find((item) => item.id === state.kind)
}

function selectedIssue() {
  const kind = currentKind()
  return kind.issues.find((item) => item.link === state.issueLink) || kind.current
}

const ports = { state, field, form, api, setNotice, currentKind, selectedIssue }

const issueChrome = createIssueChrome(ports)
const publication = createPublication({ ...ports, issueChrome })
const entryEditor = createEntryEditor({
  ...ports,
  issueChrome,
  publication,
  render,
})

function render() {
  issueChrome.render()
  entryEditor.render()
  publication.render()
  const ready = state.bootstrap.cliproReady
    ? `clipro 已就绪 · 默认 ${state.bootstrap.defaultModel}`
    : '未读到 clipro key，润色不可用，发周记不受影响'
  const stale = !state.bootstrap.polishTimeoutMs || state.bootstrap.polishTimeoutMs < 120000
    ? ' · 旧进程，请重启面板'
    : ''
  const originHost = String(state.bootstrap.productionOrigin || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const target = originHost ? `发布目标 ${originHost} · ` : ''
  document.getElementById('status').textContent = `${target}${ready}${stale}`
}

function bind() {
  entryEditor.bindDrops()
  issueChrome.bind({
    confirmDiscard: () => entryEditor.confirmDiscard(),
    onKindChange(kind) {
      entryEditor.clearFormDraft()
      state.kind = kind
      state.mode = 'append'
      state.issueLink = currentKind().current?.link || ''
      entryEditor.resetForm()
      publication.restoreForKind(kind)
      render()
    },
    onModeChange(mode) {
      state.mode = mode
      state.entryIndex = null
      entryEditor.resetForm()
      entryEditor.saveFormDraft()
      render()
    },
    onIssueChange(issueLink) {
      entryEditor.clearFormDraft()
      state.issueLink = issueLink
      state.mode = 'append'
      state.entryIndex = null
      entryEditor.resetForm()
      publication.restoreForKind(state.kind)
      render()
    },
  })
  entryEditor.bind()
  publication.bind()
}

async function main() {
  bind()
  state.bootstrap = await api('/api/bootstrap')
  state.kind = 'life'
  state.issueLink = currentKind().current?.link || ''
  entryEditor.renderModels()
  entryEditor.renderTags()
  entryEditor.resetForm()
  const draft = entryEditor.restoreOnBoot(state.bootstrap.autosave)
  if (draft) {
    setNotice(`已恢复上次没保存的草稿（${draft.savedAt?.slice(0, 16).replace('T', ' ')}）。不想要就点「清空草稿」。`, 'ok')
  }
  publication.restoreForKind(state.kind)
  render()
}

main().catch((error) => setNotice(error.message, 'err'))
