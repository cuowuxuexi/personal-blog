import { chooseRestoreDraft, draftHasText, shouldPersistDraft } from './draft.mjs'

const state = {
  bootstrap: null,
  kind: 'life',
  mode: 'append',
  issueLink: '',
  entryIndex: null,
  images: { image: '', cover: '' },
  suggestion: null,
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

function hasContent() {
  return Boolean(field('title').value.trim() || field('body').value.trim())
}

function snapshotDraft() {
  const fields = {}
  for (const name of DRAFT_FIELDS) fields[name] = field(name).value
  return {
    kind: state.kind,
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
  state.kind = draft.kind || state.kind
  state.issueLink = draft.issueLink || state.issueLink
  // 恢复草稿只带回文字，一律当作追加，避免误改已有条目把整期覆盖掉
  state.mode = 'append'
  state.entryIndex = null
  state.images = { image: '', cover: '', ...(draft.images || {}) }
  for (const name of DRAFT_FIELDS) {
    if (draft.fields?.[name] != null) field(name).value = draft.fields[name]
  }
  renderThumb('drop-image', state.images.image)
  renderThumb('drop-cover', state.images.cover)
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

function writeHint() {
  const issue = selectedIssue()
  if (state.mode === 'newIssue') return '这次会开一篇新的周记，不会改已有期数。'
  if (state.mode === 'edit') {
    const title = issue?.entries?.[state.entryIndex]?.title || '该条'
    return `这次会改已有条目「${title}」，其它条目不动。`
  }
  return issue
    ? `这次会追加到「${issue.title}」末尾，已有 ${issue.entryCount} 条不会动。`
    : '没有当期周记，请先开新一期。'
}

function renderKinds() {
  document.getElementById('kinds').innerHTML = state.bootstrap.kinds.map((kind) => (
    `<button type="button" class="chip ${kind.id === state.kind ? 'active' : ''}" data-kind="${kind.id}">${kind.label}</button>`
  )).join('')
}

function renderIssueBar() {
  const kind = currentKind()
  const issue = selectedIssue()
  const options = kind.issues
    .filter((item) => item.issue != null)
    .map((item) => `<option value="${item.link}" ${item.link === (issue?.link || '') ? 'selected' : ''}>${item.title}</option>`)
    .join('')
  document.getElementById('issue-bar').innerHTML = `
    <h2>${issue ? issue.title : '还没有编号周记'}</h2>
    <p class="issue-meta">${issue ? `${issue.date} · ${issue.entryCount} 条` : '先开新一期'}</p>
    <p class="write-hint">${writeHint()}</p>
    <div class="modes">
      <button type="button" class="chip ${state.mode === 'append' ? 'active' : ''}" data-mode="append">追加一条</button>
      <button type="button" class="chip ${state.mode === 'newIssue' ? 'active' : ''}" data-mode="newIssue">开新一期</button>
      ${kind.issues.some((item) => item.issue != null) ? `<select id="issue-select">${options}</select>` : ''}
    </div>
  `
  document.getElementById('issue-fields').classList.toggle('hidden', state.mode !== 'newIssue')
}

function renderEntries() {
  const issue = selectedIssue()
  const entries = issue?.entries || []
  const list = entries.map((entry) => `
    <button type="button" class="entry-btn ${state.mode === 'edit' && state.entryIndex === entry.index ? 'active' : ''}" data-index="${entry.index}">
      ${entry.title}
      <small>${(entry.tags || []).join(' / ')}</small>
    </button>
  `).join('')
  document.getElementById('entries').innerHTML = `
    <h3>当期条目 · 点开可改</h3>
    ${list || '<p class="issue-meta">还没有条目</p>'}
    <button type="button" class="ghost" id="btn-new-entry">写新的一条</button>
  `
}

function renderTags() {
  document.getElementById('tag-cloud').innerHTML = state.bootstrap.tags.slice(0, 16).map((item) => (
    `<button type="button" data-tag="${item.tag}">${item.tag}</button>`
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
  renderThumb('drop-image', state.images.image)
  renderThumb('drop-body', '')
  hideCompare()
}

function resetForm() {
  state.mode = state.mode === 'newIssue' ? 'newIssue' : 'append'
  state.entryIndex = null
  fillEntry({ date: state.bootstrap.today })
  field('theme').value = ''
  field('issueDate').value = state.bootstrap.today
  field('caption').value = '烟花朵朵开，想法自然来。'
  field('description').value = ''
  state.images.cover = ''
  renderThumb('drop-cover', '')
}

function renderThumb(id, url) {
  const box = document.getElementById(id)
  box.querySelector('.thumbs').innerHTML = url ? `<img src="${url}" alt="" />` : ''
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
    body: JSON.stringify({
      date: field('issueDate').value || field('date').value || state.bootstrap.today,
      files: await Promise.all([...files].map(async (file) => ({
        name: file.name,
        role,
        hint: field('title').value || file.name,
        data: await fileToBase64(file),
      }))),
    }),
  })
  setNotice(`已保存 ${payload.images.length} 张图`, 'ok')
  return payload.images
}

function bindDrops() {
  for (const box of document.querySelectorAll('.drop')) {
    const input = box.querySelector('input[type=file]')
    box.addEventListener('click', () => input.click())
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
}

async function handleFiles(role, fileList) {
  const images = await uploadFiles(fileList, role)
  if (role === 'body') {
    const snippets = images.map((image) => `![${image.alt || field('title').value || '图片'}](${image.url})`).join('\n\n')
    field('body').value = [field('body').value.trim(), snippets].filter(Boolean).join('\n\n')
    const thumbs = document.querySelector('#drop-body .thumbs')
    thumbs.insertAdjacentHTML('beforeend', images.map((image) => `<img src="${image.url}" alt="" />`).join(''))
    saveLocalDraft()
    return
  }
  state.images[role] = images[0].url
  renderThumb(role === 'image' ? 'drop-image' : 'drop-cover', images[0].url)
  saveLocalDraft()
}

function bindEvents() {
  form.addEventListener('input', saveLocalDraft)

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
    render()
  })

  document.getElementById('issue-bar').addEventListener('click', (event) => {
    const mode = event.target.dataset.mode
    if (!mode || mode === state.mode) return
    state.mode = mode
    state.entryIndex = null
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
    render()
  })

  document.getElementById('entries').addEventListener('click', (event) => {
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
    if (!button || !confirmDiscard()) return
    const issue = selectedIssue()
    const entry = issue.entries[Number(button.dataset.index)]
    state.mode = 'edit'
    state.entryIndex = entry.index
    fillEntry(entry)
    saveLocalDraft()
    render()
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

  document.getElementById('btn-preview').addEventListener('click', () => saveDraft(true))
  document.getElementById('btn-publish').addEventListener('click', publish)
}

async function saveDraft(openPreview) {
  try {
    if (state.mode === 'edit') {
      const title = selectedIssue()?.entries?.[state.entryIndex]?.title || '该条'
      if (!confirm(`确定只改「${title}」？其它历史条目不会动。\n若要发新内容，请先点「追加一条」。`)) return
    }
    setNotice('正在写入草稿…')
    const payload = await api('/api/draft', {
      method: 'POST',
      body: JSON.stringify({
        kindId: state.kind,
        mode: state.mode,
        issueLink: state.issueLink,
        entryIndex: state.entryIndex,
        entry: collectEntry(),
        issue: {
          theme: field('theme').value.trim(),
          date: field('issueDate').value,
          caption: field('caption').value.trim(),
          description: field('description').value.trim(),
          cover: state.images.cover,
        },
      }),
    })
    state.lastDraft = payload
    clearLocalDraft()
    if (openPreview) window.open(payload.previewUrl, '_blank')
    setNotice(`已${payload.mode === 'edit' ? '修改' : payload.mode === 'newIssue' ? '开新期' : '追加'} ${payload.files.join('、')}\n预览：${payload.previewUrl}`, 'ok')
    state.bootstrap = await api('/api/bootstrap')
    if (payload.previewLink) state.issueLink = payload.previewLink
    if (state.mode === 'newIssue') state.mode = 'append'
    state.entryIndex = null
    resetForm()
    render()
  } catch (error) {
    setNotice(error.message, 'err')
  }
}

async function publish() {
  if (!state.lastDraft && !confirm('还没有保存草稿。确定直接按上次写入的文件发布？')) return
  if (!confirm('确认发布到线上？会先构建，通过后才 push main。')) return
  try {
    setNotice('正在构建并推送…')
    const payload = await api('/api/publish', {
      method: 'POST',
      body: JSON.stringify({
        files: state.lastDraft?.files,
        message: state.lastDraft?.commitHint,
      }),
    })
    setNotice(`${payload.notice}\n${payload.message}`, 'ok')
  } catch (error) {
    setNotice(error.message, 'err')
  }
}

function render() {
  renderKinds()
  renderIssueBar()
  renderEntries()
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
  render()
}

main().catch((error) => setNotice(error.message, 'err'))
