import { chooseRestoreDraft, draftHasText, draftRequestBody, issueFieldsForDraft, shouldPersistDraft } from './draft.mjs'
import { escapeHtml, escapeAttr } from './escape.mjs'
import { jobKindId, selectRestorableJob } from './job-restore.mjs'
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
  previewHeadingAnchor,
  releasePreviewHref,
  resolveCapability,
} from './kind-ui.mjs'
import { bodyImageUrls, removeImageMarkdown } from './media.mjs'
import { singleFlight } from './publish-flow.mjs'
import {
  imageFilesFromClipboard,
  namePasteFile,
  resolvePasteRole,
  shouldAcceptImagePaste,
} from './paste.mjs'

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

const DRAFT_KEY = 'panel-draft-v1'
const DRAFT_BACKUP_KEY = 'panel-draft-backup-v1'
const DRAFT_FIELDS = [
  'title', 'body', 'linkHref', 'tags', 'subtitle', 'subtitleHref',
  'date', 'imageFit', 'imageAlt', 'theme', 'issueDate', 'caption', 'description',
]

function field(name) {
  return form.elements[name]
}

function issueChromeSnapshot(issue) {
  const named = isNamedJourneyChapter(currentKind(), issue)
  return JSON.stringify({
    theme: named ? '' : chromeThemeFromIssue(issue),
    caption: String(issue?.caption || '').trim(),
    cover: issue?.cover || '',
  })
}

function formChromeSnapshot() {
  const named = isNamedJourneyChapter(currentKind(), selectedIssue())
  return JSON.stringify({
    theme: named ? '' : field('theme').value.trim(),
    caption: field('caption').value.trim(),
    cover: state.images.cover || '',
  })
}

function supportsIssueChrome(kind) {
  const type = resolveCapability(kind).contentType
  return type === 'weekly' || type === 'journey'
}

function chromeDirty() {
  const kind = currentKind()
  if (!kind || !supportsIssueChrome(kind)) return false
  if (state.mode === 'newIssue') return Boolean(field('theme').value.trim())
  const issue = selectedIssue()
  if (!issue) return false
  return formChromeSnapshot() !== issueChromeSnapshot(issue)
}

function hasContent() {
  return Boolean(
    field('title').value.trim()
    || field('body').value.trim()
    || (state.mode === 'newIssue' && field('theme').value.trim())
    || (state.mode !== 'newIssue' && chromeDirty()),
  )
}

function snapshotDraft() {
  const fields = {}
  for (const name of DRAFT_FIELDS) fields[name] = field(name).value
  return {
    kind: state.kind,
    kindId: state.kind,
    mode: state.mode,
    issueLink: state.issueLink,
    entryIndex: state.entryIndex,
    images: state.images,
    fields,
    savedAt: new Date().toISOString(),
  }
}

let autosaveTimer = 0

function saveLocalDraft() {
  const incoming = snapshotDraft()
  const existing = loadLocalDraft()
  if (!shouldPersistDraft(existing, incoming)) return
  if (draftHasText(incoming)) {
    localStorage.setItem(DRAFT_BACKUP_KEY, JSON.stringify(incoming))
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(incoming))
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    api('/api/autosave', { method: 'POST', body: JSON.stringify(incoming) }).catch(() => {})
  }, 400)
}

function clearLocalDraft() {
  localStorage.removeItem(DRAFT_KEY)
  localStorage.removeItem(DRAFT_BACKUP_KEY)
  api('/api/autosave', { method: 'POST', body: JSON.stringify({ clear: true }) }).catch(() => {})
}

function loadLocalDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
  } catch {
    return null
  }
}

function restoreLocalDraft(draft) {
  state.kind = draft.kindId || draft.kind || state.kind
  state.issueLink = draft.issueLink || state.issueLink
  // 已有条目仍按追加恢复，避免误覆盖；新期草稿则回到新期编辑界面。
  const restoredMode = draft.mode === 'newIssue' && draft.fields?.theme?.trim() ? 'newIssue' : 'append'
  state.mode = normalizeEditorMode(restoredMode, currentKind())
  state.entryIndex = null
  state.images = { image: '', cover: '', ...(draft.images || {}) }
  for (const name of DRAFT_FIELDS) {
    if (draft.fields?.[name] != null) field(name).value = draft.fields[name]
  }
  renderThumbs('drop-image', state.images.image)
  renderThumbs('drop-cover', state.images.cover)
  renderThumbs('drop-body', bodyImageUrls(field('body').value))
}

/** 切栏目 / 切模式 / 点开别的条目前，别把没保存的正文冲掉。 */
function confirmDiscard() {
  if (!hasContent()) return true
  return confirm('当前还没保存的内容会被清掉，确定继续？')
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

function editorView() {
  const issue = selectedIssue()
  return issueBarView({
    kind: currentKind(),
    mode: state.mode,
    issue,
    theme: field('theme').value.trim(),
    issueDate: field('issueDate').value,
    today: state.bootstrap.today,
    entryTitle: issue?.entries?.[state.entryIndex]?.title || '',
  })
}

function syncKindSurface() {
  const kind = currentKind()
  state.mode = normalizeEditorMode(state.mode, kind)
  const root = document.querySelector('.app')
  if (root) {
    root.dataset.kind = kind?.id || ''
    root.dataset.contentType = resolveCapability(kind).contentType
  }
}

function renderKinds() {
  document.getElementById('kinds').innerHTML = state.bootstrap.kinds.map((kind) => (
    `<button type="button" class="chip ${kind.id === state.kind ? 'active' : ''}" data-kind="${escapeAttr(kind.id)}" data-tone="${escapeAttr(chipTone(kind))}">${escapeHtml(kind.label)}</button>`
  )).join('')
}

function renderIssueBar() {
  syncKindSurface()
  const kind = currentKind()
  const issue = selectedIssue()
  const view = editorView()
  const options = view.selectorIssues
    .map((item) => `<option value="${escapeAttr(item.link)}" ${item.link === (issue?.link || '') ? 'selected' : ''}>${escapeHtml(item.title)}</option>`)
    .join('')
  const selector = view.showSelector
    ? `<label class="issue-select-field">
        <span>${escapeHtml(view.selectorLabel)}</span>
        <select id="issue-select" aria-label="${escapeAttr(view.selectorLabel)}">${options}</select>
      </label>`
    : ''
  const createChip = view.showCreate
    ? `<button type="button" class="chip ${state.mode === 'newIssue' ? 'active' : ''}" data-mode="newIssue">开新一期</button>`
    : ''
  document.getElementById('issue-bar').innerHTML = `
    <h2 id="issue-heading">${escapeHtml(view.heading)}</h2>
    <p class="issue-meta" id="issue-heading-meta">${escapeHtml(view.meta)}</p>
    <p class="write-hint">${escapeHtml(view.hint)}</p>
    <div class="modes">
      <button type="button" class="chip ${state.mode === 'append' ? 'active' : ''}" data-mode="append">追加一条</button>
      ${createChip}
      ${selector}
    </div>
  `
  document.getElementById('issue-fields').classList.toggle('hidden', !view.showIssueFields)
}

function renderIssueChrome(view) {
  if (!view.showChromeFields) return ''
  const chrome = chromeEditorView({
    kind: currentKind(),
    mode: state.mode,
    issue: selectedIssue(),
  })
  const theme = field('theme').value
  const caption = field('caption').value
  const themeField = chrome.showThemeField
    ? `<label class="issue-theme-field" for="issue-theme-input">
        <span>${escapeHtml(chrome.themeLabel)}</span>
        <input id="issue-theme-input" value="${escapeAttr(theme)}" placeholder="例如：待定" autocomplete="off" />
        <small>${escapeHtml(chrome.themeHint)}</small>
      </label>`
    : ''
  const captionHint = chrome.captionHint
    ? `<small>${escapeHtml(chrome.captionHint)}</small>`
    : ''
  return `
    <div class="issue-chrome">
      ${themeField}
      <label class="issue-theme-field" for="issue-caption-input">
        <span>主题说明</span>
        <input id="issue-caption-input" value="${escapeAttr(caption)}" placeholder="烟花朵朵开，想法自然来。" autocomplete="off" />
        ${captionHint}
      </label>
      <div class="drop issue-cover-drop" data-role="cover" id="drop-cover">
        <strong>封面</strong>
        <p>可粘贴 · <button type="button" class="drop-pick">选择文件</button></p>
        <input type="file" accept="image/*" hidden />
        <div class="thumbs"></div>
      </div>
    </div>
  `
}

function renderEntries() {
  const issue = selectedIssue()
  const entries = issue?.entries || []
  const view = editorView()
  if (view.showIssueFields) {
    document.getElementById('entries').innerHTML = `
      ${renderIssueChrome(view)}
      <h3>新期首条内容</h3>
      <p class="issue-meta">在右侧填写这一期的第一条内容。</p>
    `
    bindDropBox(document.getElementById('drop-cover'))
    renderThumbs('drop-cover', state.images.cover)
    return
  }
  const list = entries.map((entry) => `
    <div class="entry-row">
      <button type="button" class="entry-btn ${state.mode === 'edit' && state.entryIndex === entry.index ? 'active' : ''}" data-index="${entry.index}">
        ${escapeHtml(entry.title)}
        <small>${escapeHtml((entry.tags || []).join(' / '))}</small>
      </button>
      <button type="button" class="entry-delete" data-delete-index="${entry.index}" aria-label="删除「${escapeAttr(entry.title)}」">删除</button>
    </div>
  `).join('')
  document.getElementById('entries').innerHTML = `
    <h3>${escapeHtml(view.entriesHeading)}</h3>
    ${renderIssueChrome(view)}
    ${list || `<p class="issue-meta">${escapeHtml(view.emptyEntries)}</p>`}
    <button type="button" class="ghost" id="btn-new-entry">写新的一条</button>
  `
  bindDropBox(document.getElementById('drop-cover'))
  renderThumbs('drop-cover', state.images.cover)
}

function renderTags() {
  document.getElementById('tag-cloud').innerHTML = state.bootstrap.tags.slice(0, 16).map((item) => (
    `<button type="button" data-tag="${escapeAttr(item.tag)}">${escapeHtml(item.tag)}</button>`
  )).join('')
}

function renderModels() {
  const select = document.getElementById('model')
  const current = field('model').value || state.bootstrap.defaultModel
  select.innerHTML = state.bootstrap.models.map((id) => (
    `<option value="${id}" ${id === current ? 'selected' : ''}>${id}</option>`
  )).join('')
}

function fillEntry(entry) {
  field('title').value = entry?.title || ''
  field('body').value = entry?.body || ''
  field('linkHref').value = entry?.linkHref || ''
  field('tags').value = (entry?.tags || []).join('/')
  field('subtitle').value = entry?.subtitle || ''
  field('subtitleHref').value = entry?.subtitleHref || ''
  field('date').value = entry?.date || ''
  field('imageFit').value = entry?.imageFit || ''
  field('imageAlt').value = entry?.imageAlt || ''
  state.images.image = entry?.image || ''
  renderThumbs('drop-image', state.images.image)
  renderThumbs('drop-body', bodyImageUrls(entry?.body || ''))
  hideCompare()
}

function fillIssueChrome(issue) {
  const kind = currentKind()
  if (!issue || !kind || !supportsIssueChrome(kind)) {
    field('theme').value = ''
    field('caption').value = ''
    state.images.cover = ''
    return
  }
  field('theme').value = chromeThemeFromIssue(issue)
  field('caption').value = issue.caption || ''
  state.images.cover = issue.cover || ''
}

function resetForm() {
  state.mode = state.mode === 'newIssue' ? 'newIssue' : 'append'
  state.entryIndex = null
  fillEntry({ date: state.bootstrap.today })
  const chrome = chromeFormForMode(state.mode, { today: state.bootstrap.today })
  if (chrome) {
    field('theme').value = chrome.theme
    field('issueDate').value = chrome.issueDate
    field('caption').value = chrome.caption
    field('description').value = chrome.description
    state.images.cover = chrome.cover
  } else {
    fillIssueChrome(selectedIssue())
  }
  renderThumbs('drop-cover', state.images.cover)
}


function renderThumbs(id, urls) {
  const root = document.getElementById(id)
  if (!root) return
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean)
  root.querySelector('.thumbs').innerHTML = list.map((url) => `
    <figure class="thumb">
      <img src="${escapeAttr(url)}" alt="" />
      <button type="button" class="thumb-remove" data-url="${escapeAttr(url)}" aria-label="去掉这张图">×</button>
    </figure>
  `).join('')
}

function removeAttachedImage(role, url) {
  if (role === 'body') {
    field('body').value = removeImageMarkdown(field('body').value, url)
    renderThumbs('drop-body', bodyImageUrls(field('body').value))
  } else {
    if (state.images[role] === url) state.images[role] = ''
    renderThumbs(role === 'cover' ? 'drop-cover' : 'drop-image', state.images[role])
  }
  saveLocalDraft()
  setNotice('已去掉这张图。')
}

function collectEntry() {
  return {
    title: field('title').value.trim(),
    body: field('body').value.trim(),
    tags: field('tags').value,
    linkHref: field('linkHref').value.trim(),
    subtitle: field('subtitle').value.trim(),
    subtitleHref: field('subtitleHref').value.trim(),
    date: field('date').value,
    imageFit: field('imageFit').value,
    imageAlt: field('imageAlt').value.trim(),
    image: state.images.image,
  }
}

function hideCompare() {
  document.getElementById('compare').classList.add('hidden')
  state.suggestion = null
}

function editedSuggestion() {
  return {
    title: document.getElementById('sug-title').value.trim(),
    body: document.getElementById('sug-body').value,
    suggestedTags: document.getElementById('sug-tags').value
      .split(/[/|,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

function showCompare(original, suggestion) {
  state.suggestion = suggestion
  document.getElementById('orig-title').textContent = original.title
  document.getElementById('orig-body').textContent = original.body
  document.getElementById('sug-title').value = suggestion.title || ''
  document.getElementById('sug-body').value = suggestion.body || ''
  document.getElementById('sug-tags').value = (suggestion.suggestedTags || []).join('/')
  document.getElementById('compare').classList.remove('hidden')
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('读图片失败'))
    reader.readAsDataURL(file)
  })
}

async function uploadFiles(files, role) {
  if (!files.length) return []
  setNotice('正在处理图片…')
  const payload = await api('/api/images', {
    method: 'POST',
    body: JSON.stringify(imageUploadRequestBody({
      kindId: state.kind,
      date: field('issueDate').value || field('date').value || state.bootstrap.today,
      files: await Promise.all([...files].map(async (file) => ({
        name: file.name,
        role,
        hint: field('title').value || file.name,
        data: await fileToBase64(file),
      }))),
    })),
  })
  setNotice(`已保存 ${payload.images.length} 张图`, 'ok')
  return payload.images
}

let lastDropRole = 'image'

function bindDropBox(box) {
  if (!box || box.dataset.bound === '1') return
  const input = box.querySelector('input[type=file]')
  if (!input) return
  box.dataset.bound = '1'
  box.tabIndex = 0
  const markTarget = () => { lastDropRole = box.dataset.role }
  box.addEventListener('pointerenter', markTarget)
  box.addEventListener('focus', markTarget)
  box.addEventListener('click', () => box.focus())
  box.querySelector('.drop-pick')?.addEventListener('click', (event) => {
    event.stopPropagation()
    input.click()
  })
  box.querySelector('.thumbs')?.addEventListener('click', (event) => {
    const button = event.target.closest('.thumb-remove')
    if (!button) return
    event.preventDefault()
    event.stopPropagation()
    removeAttachedImage(box.dataset.role, button.dataset.url)
  })
  box.addEventListener('dragover', (event) => {
    event.preventDefault()
    box.classList.add('over')
  })
  box.addEventListener('dragleave', () => box.classList.remove('over'))
  box.addEventListener('drop', async (event) => {
    event.preventDefault()
    box.classList.remove('over')
    await handleFiles(box.dataset.role, event.dataTransfer.files)
  })
  input.addEventListener('change', async () => {
    await handleFiles(box.dataset.role, input.files)
    input.value = ''
  })
}

function bindDrops() {
  for (const box of document.querySelectorAll('.drop')) bindDropBox(box)

  document.addEventListener('paste', async (event) => {
    const files = imageFilesFromClipboard(event.clipboardData).map((file) => namePasteFile(file))
    if (!shouldAcceptImagePaste(event.clipboardData, files)) return
    event.preventDefault()
    const role = resolvePasteRole(event.target, lastDropRole)
    const box = document.querySelector(`.drop[data-role="${role}"]`)
    box?.classList.add('over')
    try {
      await handleFiles(role, files)
    } finally {
      box?.classList.remove('over')
    }
  })
}

async function handleFiles(role, fileList) {
  const images = await uploadFiles(fileList, role)
  if (!images.length) return
  if (role === 'body') {
    const snippets = images.map((image) => `![${image.alt || field('title').value || '图片'}](${image.url})`).join('\n\n')
    field('body').value = [field('body').value.trim(), snippets].filter(Boolean).join('\n\n')
    renderThumbs('drop-body', bodyImageUrls(field('body').value))
    saveLocalDraft()
    return
  }
  state.images[role] = images[0].url
  renderThumbs(role === 'image' ? 'drop-image' : 'drop-cover', images[0].url)
  saveLocalDraft()
}

function bindEvents() {
  form.addEventListener('input', (event) => {
    saveLocalDraft()
    if (event.target?.name === 'body') renderThumbs('drop-body', bodyImageUrls(field('body').value))
    if (state.mode === 'newIssue' && event.target?.name === 'issueDate') {
      document.getElementById('issue-heading-meta').textContent = `${event.target.value || state.bootstrap.today} · 新一期`
    }
  })

  window.addEventListener('beforeunload', (event) => {
    if (!hasContent()) return
    event.preventDefault()
    event.returnValue = ''
  })

  document.getElementById('kinds').addEventListener('click', (event) => {
    const kind = event.target.dataset.kind
    if (!kind) return
    if (kind === state.kind || !confirmDiscard()) return
    clearLocalDraft()
    state.kind = kind
    state.mode = 'append'
    state.issueLink = currentKind().current?.link || ''
    resetForm()
    restoreJobForKind(kind)
    render()
  })

  document.getElementById('issue-bar').addEventListener('click', (event) => {
    const mode = event.target.dataset.mode
    if (!mode || mode === state.mode) return
    if (mode === 'newIssue' && !allowsCreate(currentKind())) return
    if (!confirmDiscard()) return
    state.mode = mode
    state.entryIndex = null
    resetForm()
    saveLocalDraft()
    render()
  })

  document.getElementById('issue-bar').addEventListener('change', (event) => {
    if (event.target.id !== 'issue-select') return
    if (!confirmDiscard()) {
      event.target.value = state.issueLink
      return
    }
    clearLocalDraft()
    state.issueLink = event.target.value
    state.mode = 'append'
    state.entryIndex = null
    resetForm()
    restoreJobForKind(state.kind)
    render()
  })

  document.getElementById('entries').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-index]')
    const button = event.target.closest('[data-index]')
    if (event.target.id === 'btn-new-entry') {
      if (!confirmDiscard()) return
      clearLocalDraft()
      state.mode = 'append'
      state.entryIndex = null
      resetForm()
      render()
      return
    }
    if (deleteButton) {
      const entry = selectedIssue()?.entries?.[Number(deleteButton.dataset.deleteIndex)]
      if (!entry || !confirmDiscard()) return
      if (!confirm(`确定删除「${entry.title}」？删除后会直接生成发布前预览，确认发布前仍可核对。`)) return
      void deleteAndPrepare(entry.index)
      return
    }
    if (!button || !confirmDiscard()) return
    const issue = selectedIssue()
    const entry = issue.entries[Number(button.dataset.index)]
    state.mode = 'edit'
    state.entryIndex = entry.index
    fillEntry(entry)
    saveLocalDraft()
    render()
  })

  document.getElementById('entries').addEventListener('input', (event) => {
    if (event.target.id === 'issue-caption-input') {
      field('caption').value = event.target.value
      saveLocalDraft()
      return
    }
    if (event.target.id !== 'issue-theme-input') return
    field('theme').value = event.target.value
    const theme = event.target.value.trim()
    const issue = selectedIssue()
    const number = state.mode === 'newIssue' ? currentKind().nextIssue : issue?.issue
    const heading = document.getElementById('issue-heading')
    if (number != null) {
      heading.textContent = `第${String(number).padStart(3, '0')}期${theme ? `-${theme}` : ''}`
    }
    saveLocalDraft()
  })

  document.getElementById('btn-discard-draft').addEventListener('click', () => {
    if (!confirmDiscard()) return
    clearLocalDraft()
    state.mode = state.mode === 'newIssue' ? 'newIssue' : 'append'
    state.entryIndex = null
    resetForm()
    render()
    setNotice('已清空当前草稿。')
  })

  document.getElementById('tag-cloud').addEventListener('click', (event) => {
    const tag = event.target.dataset.tag
    if (!tag) return
    const current = field('tags').value.split(/[/|,，]/).map((item) => item.trim()).filter(Boolean)
    if (!current.includes(tag)) current.push(tag)
    field('tags').value = current.join('/')
    saveLocalDraft()
  })

  document.getElementById('btn-polish').addEventListener('click', async () => {
    const button = document.getElementById('btn-polish')
    if (button.disabled) return
    const original = collectEntry()
    if (!original.title && !original.body) {
      setNotice('先写一点标题或正文再润色。', 'err')
      return
    }
    try {
      button.disabled = true
      setNotice('正在润色，长文或慢模型可能要等一两分钟…')
      const suggestion = await api('/api/polish', {
        method: 'POST',
        body: JSON.stringify({
          ...original,
          tags: original.tags.split(/[/|,，]/).filter(Boolean),
          model: field('model').value,
        }),
      })
      showCompare(original, suggestion)
      setNotice('对照看一下，决定采用哪些。', 'ok')
    } catch (error) {
      setNotice(error.message, 'err')
    } finally {
      button.disabled = false
    }
  })

  document.getElementById('btn-apply-all').addEventListener('click', () => {
    const suggestion = editedSuggestion()
    field('title').value = suggestion.title
    field('body').value = suggestion.body
    if (suggestion.suggestedTags.length) field('tags').value = suggestion.suggestedTags.join('/')
    hideCompare()
    saveLocalDraft()
  })
  document.getElementById('btn-apply-title').addEventListener('click', () => {
    field('title').value = editedSuggestion().title
    saveLocalDraft()
  })
  document.getElementById('btn-apply-body').addEventListener('click', () => {
    field('body').value = editedSuggestion().body
    saveLocalDraft()
  })
  document.getElementById('btn-apply-tags').addEventListener('click', () => {
    const tags = editedSuggestion().suggestedTags
    if (tags.length) field('tags').value = tags.join('/')
    saveLocalDraft()
  })
  document.getElementById('btn-discard').addEventListener('click', hideCompare)

  document.getElementById('btn-preview').addEventListener('click', saveAndPrepare)
  document.getElementById('btn-prepare').addEventListener('click', preparePublish)
  document.getElementById('btn-publish').addEventListener('click', confirmPublish)
  document.getElementById('btn-retry-verify').addEventListener('click', retryVerify)
  document.getElementById('btn-retry-push').addEventListener('click', retryPushJob)
  document.getElementById('btn-check-wechat-assets').addEventListener('click', checkWechatAssets)
}

async function persistDraft({ mode = state.mode, entryIndex = state.entryIndex, entry = collectEntry() } = {}) {
  const kind = currentKind()
  const resolvedMode = normalizeEditorMode(mode, kind)
  if (mode === 'newIssue' && !allowsCreate(kind)) {
    throw new Error('当前栏目不能开新一期。')
  }
  return api('/api/draft', {
      method: 'POST',
      body: JSON.stringify(draftRequestBody({
        kindId: state.kind,
        mode: resolvedMode,
        issueLink: state.issueLink,
        entryIndex,
        entry,
        issue: issueFieldsForDraft({
          mode: resolvedMode,
          chromeDirty: chromeDirty(),
          theme: isNamedJourneyChapter(kind, selectedIssue()) && resolvedMode !== 'newIssue'
            ? ''
            : field('theme').value.trim(),
          date: field('issueDate').value,
          caption: field('caption').value.trim(),
          description: field('description').value.trim(),
          cover: state.images.cover,
        }),
      })),
    })
}

async function acceptSavedDraft(payload) {
    state.draftId = payload.draftId
    state.job = null
    clearLocalDraft()
    const action = payload.mode === 'edit' ? '修改'
      : payload.mode === 'delete' ? '删除'
        : payload.mode === 'newIssue' ? '开新期'
          : payload.mode === 'editChrome' ? '改期头' : '追加'
    setNotice(`已${action} ${payload.files.join('、')}，正在生成发布前预览…`, 'ok')
    if (payload.previewLink) state.issueLink = payload.previewLink
    if (state.mode === 'newIssue') state.mode = 'append'
    state.entryIndex = null
    resetForm()
    render()
    try {
      const bootstrap = await api('/api/bootstrap')
      state.bootstrap = bootstrap
      render()
    } catch (error) {
      setNotice(`草稿已写入，但刷新条目列表失败：${error.message}`, 'err')
    }
}

const prepareSavedChange = singleFlight(async (createDraft) => {
  const button = document.getElementById('btn-preview')
  try {
    button.disabled = true
    document.getElementById('btn-prepare').classList.add('hidden')
    setNotice('正在保存并生成发布前预览…')
    const payload = await createDraft()
    if (!payload) return
    await acceptSavedDraft(payload)
    await preparePublish()
  } catch (error) {
    setNotice(error.message, 'err')
    if (state.draftId) document.getElementById('btn-prepare').classList.remove('hidden')
  } finally {
    button.disabled = false
  }
})

function saveAndPrepare() {
  return prepareSavedChange(async () => {
    const entry = collectEntry()
    const contentType = resolveCapability(currentKind()).contentType
    if ((contentType === 'weekly' || contentType === 'journey') && state.mode !== 'newIssue' && !entry.title && !entry.body) {
      const namedChapter = isNamedJourneyChapter(currentKind(), selectedIssue())
      if (!namedChapter && !field('theme').value.trim()) {
        setNotice('当期主题不能为空。', 'err')
        return null
      }
      if (namedChapter && !chromeDirty()) {
        setNotice('封面或说明没有改动。', 'err')
        return null
      }
      return persistDraft({ mode: 'editChrome', entry: null })
    }
    if (state.mode === 'edit') {
      const title = selectedIssue()?.entries?.[state.entryIndex]?.title || '该条'
      if (!confirm(`确定只改「${title}」？其它历史条目不会动。\n若要发新内容，请先点「追加一条」。`)) return null
    }
    return persistDraft()
  })
}

function deleteAndPrepare(entryIndex) {
  return prepareSavedChange(() => persistDraft({ mode: 'delete', entryIndex, entry: null }))
}

function headingAnchor() {
  return previewHeadingAnchor(currentKind())
}

function restoreJobForKind(kind) {
  const active = selectRestorableJob(state.bootstrap.activeJobs, {
    kindId: kind,
    issueLink: selectedIssue()?.link || state.issueLink,
  })
  if (active) {
    state.draftId = active.draftId
    applyJob(active)
    const canPrepare = (active.retryActions || []).includes('prepare')
    document.getElementById('btn-prepare').classList.toggle('hidden', !canPrepare)
    setNotice(
      active.failureReason || `已恢复发布任务 ${active.jobId}（${active.state}）。`,
      active.state === 'Failed' ? 'err' : 'ok',
    )
    return
  }
  state.draftId = ''
  state.job = null
  document.getElementById('btn-prepare').classList.add('hidden')
  renderJob()
}

function applyJob(job) {
  state.job = job
  renderJob()
  const verifying = ['Pushed', 'Deploying', 'VerifyingProduction'].includes(job.state)
  if (verifying) startJobPoll()
  else stopJobPoll()
}

function startJobPoll() {
  stopJobPoll()
  state.pollTimer = setInterval(async () => {
    if (!state.job?.jobId) return
    try {
      const job = await api(`/api/publish/jobs/${state.job.jobId}`)
      applyJob(job)
      if (job.state === 'Published') setNotice(`发布完成。${job.verifiedUrl || ''}`, 'ok')
      if (job.state === 'Failed' || job.state === 'Superseded') setNotice(job.failureReason || job.state, 'err')
    } catch (error) {
      setNotice(error.message, 'err')
    }
  }, 2000)
}

function stopJobPoll() {
  if (state.pollTimer) clearInterval(state.pollTimer)
  state.pollTimer = 0
}

function renderJob() {
  const issueLink = selectedIssue()?.link || state.issueLink
  const job = state.job
    && jobKindId(state.job) === state.kind
    && (
      state.job.articleUrl === issueLink
      || (!state.job.articleUrl && String(state.job.releasePreviewUrl || '').includes(issueLink))
    )
    ? state.job
    : null
  const box = document.getElementById('publish-job')
  const publishBtn = document.getElementById('btn-publish')
  if (!job) {
    box.classList.add('hidden')
    publishBtn.disabled = true
    return
  }
  box.classList.remove('hidden')
  document.getElementById('job-state').textContent = `状态 ${job.state}${job.commitSha ? ` · ${job.commitSha.slice(0, 8)}` : ''}`
  document.getElementById('job-preview-label').textContent = job.state === 'PreviewReady'
    ? '下面清单对应发布前预览，不是工作区预览。'
    : (job.failureReason || '')
  document.getElementById('job-manifest').innerHTML = (job.manifest || []).map((item) => (
    `<li>${escapeHtml(item.action)} ${escapeHtml(item.path)}</li>`
  )).join('')
  const excluded = (job.excluded || []).map((item) => item.path).join('、')
  document.getElementById('job-excluded').textContent = excluded
    ? `未纳入本次发布：${excluded}`
    : '工作树里没有额外未纳入的改动。'
  const preview = document.getElementById('btn-release-preview')
  preview.classList.toggle('hidden', !job.releasePreviewUrl)
  preview.href = releasePreviewHref(job.releasePreviewUrl || '', currentKind(), job) || '#'
  const wechat = job.wechatPreview || {}
  const wechatPreview = document.getElementById('btn-wechat-preview')
  wechatPreview.classList.toggle('hidden', !wechat.url)
  wechatPreview.href = wechat.url || '#'
  const wechatStatus = document.getElementById('wechat-status')
  const missing = wechat.missingAssets || []
  const wechatMessages = {
    NotGenerated: '公众号预览尚未生成。',
    CheckingAssets: '正在检查公众号图片是否已经上线…',
    WaitingForOnlineAssets: `公众号预览已生成；${missing.length ? `还有 ${missing.length} 张图片未上线，` : ''}暂不能复制。`,
    AssetsOnline: '公众号预览已生成，所有图片已在线，可以复制。',
    ProductionVerified: '博客生产版本已校验，公众号全文可以复制。',
  }
  wechatStatus.textContent = wechatMessages[wechat.status] || ''
  wechatStatus.className = `wechat-status ${wechat.copyAllowed ? 'is-ready' : (wechat.url ? 'is-waiting' : '')}`
  const checkWechat = document.getElementById('btn-check-wechat-assets')
  checkWechat.classList.toggle('hidden', !wechat.url || wechat.status === 'CheckingAssets')
  const online = document.getElementById('btn-verified-online')
  online.classList.toggle('hidden', job.state !== 'Published' || !job.verifiedUrl)
  online.href = job.verifiedUrl || '#'
  document.getElementById('btn-retry-verify').classList.toggle('hidden', !(job.retryActions || []).includes('retry-verify'))
  document.getElementById('btn-retry-push').classList.toggle('hidden', !(job.retryActions || []).includes('retry-push'))
  publishBtn.disabled = job.state !== 'PreviewReady' && !(job.retryActions || []).includes('retry-push')
  document.getElementById('job-summary').textContent = job.summary
    ? [
      `文件：${(job.summary.files || []).join('、')}`,
      `SHA：${job.summary.commitSha || ''}`,
      `部署时间：${job.summary.deployedAt || ''}`,
      `已校验 URL：${job.summary.verifiedUrl || ''}`,
    ].join('\n')
    : ''
}

async function preparePublish() {
  if (!state.draftId) {
    setNotice('请先保存草稿，再准备发布。', 'err')
    return
  }
  try {
    setNotice('正在准备隔离快照与发布前预览…')
    const job = await api('/api/publish/prepare', {
      method: 'POST',
      body: JSON.stringify({ draftId: state.draftId, headingAnchor: headingAnchor() }),
    })
    applyJob(job)
    document.getElementById('btn-prepare').classList.add('hidden')
    setNotice('发布前预览已就绪。请核对清单后再确认发布。准备不是发布。', 'ok')
    return true
  } catch (error) {
    setNotice(error.message, 'err')
    if (state.draftId) document.getElementById('btn-prepare').classList.remove('hidden')
    return false
  }
}

async function confirmPublish() {
  if (!state.job?.confirmationToken) {
    setNotice('请先准备发布并查看发布前预览。', 'err')
    return
  }
  if (!confirm('确认发布这一份快照？只有生产域名切到该提交后才会显示发布完成。')) return
  try {
    setNotice('正在提交并推送精确快照…')
    const job = await api('/api/publish/confirm', {
      method: 'POST',
      body: JSON.stringify({
        jobId: state.job.jobId,
        confirmationToken: state.job.confirmationToken,
      }),
    })
    applyJob(job)
    if (job.state === 'Published') setNotice(`发布完成。${job.verifiedUrl || ''}`, 'ok')
    else if (job.commitSha) setNotice(`已推送 ${job.commitSha}，正在校验生产域名…`, 'ok')
    else setNotice(job.failureReason || job.state, 'err')
  } catch (error) {
    setNotice(error.message, 'err')
  }
}

async function retryPushJob() {
  if (!state.job?.jobId) return
  try {
    setNotice('正在重试推送…')
    const job = await api(`/api/publish/jobs/${state.job.jobId}/retry-push`, { method: 'POST', body: '{}' })
    applyJob(job)
    if (job.state === 'Published') setNotice(`发布完成。${job.verifiedUrl || ''}`, 'ok')
    else if (job.commitSha && (job.retryActions || []).includes('retry-verify')) setNotice(job.failureReason || '已推送，生产校验未完成。', 'err')
    else setNotice(job.failureReason || job.state, job.state === 'Published' ? 'ok' : 'err')
  } catch (error) {
    setNotice(error.message, 'err')
  }
}

async function retryVerify() {
  if (!state.job?.jobId) return
  try {
    setNotice('正在重新校验生产域名…')
    const job = await api(`/api/publish/jobs/${state.job.jobId}/retry-verify`, { method: 'POST', body: '{}' })
    applyJob(job)
    setNotice(job.state === 'Published' ? `发布完成。${job.verifiedUrl || ''}` : (job.failureReason || job.state), job.state === 'Published' ? 'ok' : 'err')
  } catch (error) {
    setNotice(error.message, 'err')
  }
}

async function checkWechatAssets() {
  if (!state.job?.jobId) return
  try {
    setNotice('正在重新检查公众号图片…')
    const job = await api(`/api/publish/jobs/${state.job.jobId}/check-wechat-assets`, { method: 'POST', body: '{}' })
    applyJob(job)
    const ready = job.wechatPreview?.copyAllowed
    setNotice(ready ? '公众号图片均已上线，可以复制全文。' : '仍有公众号图片尚未上线。', ready ? 'ok' : 'err')
  } catch (error) {
    setNotice(error.message, 'err')
  }
}

function render() {
  renderKinds()
  renderIssueBar()
  renderEntries()
  renderJob()
  const ready = state.bootstrap.cliproReady
    ? `clipro 已就绪 · 默认 ${state.bootstrap.defaultModel}`
    : '未读到 clipro key，润色不可用，发周记不受影响'
  const stale = !state.bootstrap.polishTimeoutMs || state.bootstrap.polishTimeoutMs < 120000
    ? ' · 旧进程，请重启面板'
    : ''
  document.getElementById('status').textContent = `${ready}${stale}`
}

async function main() {
  bindDrops()
  bindEvents()
  state.bootstrap = await api('/api/bootstrap')
  state.kind = 'life'
  state.issueLink = currentKind().current?.link || ''
  renderModels()
  renderTags()
  let localDraft = null
  try {
    localDraft = JSON.parse(localStorage.getItem(DRAFT_BACKUP_KEY) || 'null')
  } catch {
    localDraft = null
  }
  const draft = chooseRestoreDraft(loadLocalDraft(), localDraft, state.bootstrap.autosave)
  resetForm()

  if (draftHasText(draft)) {
    restoreLocalDraft(draft)
    saveLocalDraft()
    setNotice(`已恢复上次没保存的草稿（${draft.savedAt?.slice(0, 16).replace('T', ' ')}）。不想要就点「清空草稿」。`, 'ok')
  }
  restoreJobForKind(state.kind)
  render()
}

main().catch((error) => setNotice(error.message, 'err'))
