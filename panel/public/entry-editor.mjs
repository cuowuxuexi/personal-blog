import {
  chooseRestoreDraft,
  draftHasText,
  draftRequestBody,
  issueFieldsForDraft,
  shouldPersistDraft,
} from './draft.mjs'
import { escapeHtml, escapeAttr } from './escape.mjs'
import { bodyImageUrls, removeImageMarkdown } from './media.mjs'
import {
  imageFilesFromClipboard,
  namePasteFile,
  resolvePasteRole,
  shouldAcceptImagePaste,
} from './paste.mjs'
import { singleFlight } from './publish-flow.mjs'

const DRAFT_KEY = 'panel-draft-v1'
const DRAFT_BACKUP_KEY = 'panel-draft-backup-v1'
const DRAFT_FIELDS = [
  'title', 'body', 'linkHref', 'tags', 'subtitle', 'subtitleHref',
  'date', 'imageFit', 'imageAlt', 'theme', 'issueDate', 'caption', 'description',
]

export async function runAfterDraftWrite({ refreshBootstrap, prepare }) {
  const bootstrapRefresh = Promise.resolve()
    .then(refreshBootstrap)
    .then(() => null)
    .catch((error) => error?.message || String(error))
  const prepared = await prepare()
  return {
    prepared,
    bootstrapError: await bootstrapRefresh,
  }
}

export function noticeAfterDraftPrepare({ prepared, bootstrapError }) {
  if (!prepared || !bootstrapError) return null
  return {
    text: `已写入文章，但刷新条目列表失败：${bootstrapError}`,
    tone: 'err',
  }
}

export function decideWorkspaceWrite({
  contentType,
  mode,
  entry,
  namedChapter,
  theme,
  chromeDirty,
}) {
  const emptyEntry = !entry?.title && !entry?.body
  if ((contentType === 'weekly' || contentType === 'journey') && mode !== 'newIssue' && emptyEntry) {
    if (!namedChapter && !String(theme || '').trim()) {
      return { error: '当期主题不能为空。' }
    }
    if (namedChapter && !chromeDirty) {
      return { error: '封面或说明没有改动。' }
    }
    return { persist: { mode: 'editChrome', entry: null } }
  }
  if (mode === 'edit') {
    return { persist: {}, confirmEdit: true }
  }
  return { persist: {} }
}

export function createEntryEditor({
  state,
  field,
  form,
  api,
  setNotice,
  currentKind,
  selectedIssue,
  issueChrome,
  publication,
  render,
}) {
  let lastDropRole = 'image'
  let autosaveTimer = 0

  function collect() {
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

  function hasContent() {
    return Boolean(
      field('title').value.trim()
      || field('body').value.trim()
      || (state.mode === 'newIssue' && field('theme').value.trim())
      || (state.mode !== 'newIssue' && issueChrome.isDirty()),
    )
  }

  function confirmDiscard() {
    if (!hasContent()) return true
    return confirm('当前还没保存的内容会被清掉，确定继续？')
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

  function loadFormDraft() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    } catch {
      return null
    }
  }

  function loadFormDraftBackup() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_BACKUP_KEY) || 'null')
    } catch {
      return null
    }
  }

  function saveFormDraft() {
    const incoming = snapshotDraft()
    const existing = loadFormDraft()
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

  function clearFormDraft() {
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(DRAFT_BACKUP_KEY)
    api('/api/autosave', { method: 'POST', body: JSON.stringify({ clear: true }) }).catch(() => {})
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

  function restoreFormDraft(draft) {
    state.kind = draft.kindId || draft.kind || state.kind
    state.issueLink = draft.issueLink || state.issueLink
    // 已有条目仍按追加恢复，避免误覆盖；新期草稿则回到新期编辑界面。
    const restoredMode = draft.mode === 'newIssue' && draft.fields?.theme?.trim() ? 'newIssue' : 'append'
    state.mode = issueChrome.normalizeMode(restoredMode)
    state.entryIndex = null
    state.images = { image: '', cover: '', ...(draft.images || {}) }
    for (const name of DRAFT_FIELDS) {
      if (draft.fields?.[name] != null) field(name).value = draft.fields[name]
    }
    renderThumbs('drop-image', state.images.image)
    renderThumbs('drop-cover', state.images.cover)
    renderThumbs('drop-body', bodyImageUrls(field('body').value))
  }

  function fill(entry) {
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

  function resetForm() {
    state.mode = state.mode === 'newIssue' ? 'newIssue' : 'append'
    state.entryIndex = null
    fill({ date: state.bootstrap.today })
    issueChrome.resetFieldsForMode()
    renderThumbs('drop-cover', state.images.cover)
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

  function removeAttachedImage(role, url) {
    if (role === 'body') {
      field('body').value = removeImageMarkdown(field('body').value, url)
      renderThumbs('drop-body', bodyImageUrls(field('body').value))
    } else {
      if (state.images[role] === url) state.images[role] = ''
      renderThumbs(role === 'cover' ? 'drop-cover' : 'drop-image', state.images[role])
    }
    saveFormDraft()
    setNotice('已去掉这张图。')
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
      body: JSON.stringify(issueChrome.uploadRequestBody({
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

  async function handleFiles(role, fileList) {
    const images = await uploadFiles(fileList, role)
    if (!images.length) return
    if (role === 'body') {
      const snippets = images.map((image) => `![${image.alt || field('title').value || '图片'}](${image.url})`).join('\n\n')
      field('body').value = [field('body').value.trim(), snippets].filter(Boolean).join('\n\n')
      renderThumbs('drop-body', bodyImageUrls(field('body').value))
      saveFormDraft()
      return
    }
    state.images[role] = images[0].url
    renderThumbs(role === 'image' ? 'drop-image' : 'drop-cover', images[0].url)
    saveFormDraft()
  }

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

  function renderEntries() {
    const issue = selectedIssue()
    const entries = issue?.entries || []
    const view = issueChrome.view()
    if (view.showIssueFields) {
      document.getElementById('entries').innerHTML = `
      ${issueChrome.renderFieldsHtml(view)}
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
    ${issueChrome.renderFieldsHtml(view)}
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

  async function persistDraft({ mode = state.mode, entryIndex = state.entryIndex, entry = collect() } = {}) {
    const kind = currentKind()
    const resolvedMode = issueChrome.normalizeMode(mode)
    if (mode === 'newIssue' && !issueChrome.allowsCreate()) {
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
        issue: issueFieldsForDraft(issueChrome.persistInput(resolvedMode)),
      })),
    })
  }

  function acceptSavedDraft(payload) {
    state.draftId = payload.draftId
    publication.clearJob()
    clearFormDraft()
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
  }

  async function refreshBootstrapAfterSave() {
    const bootstrap = await api('/api/bootstrap')
    state.bootstrap = bootstrap
    render()
  }

  const writeAndPreparePreview = singleFlight(async (createDraft) => {
    const button = document.getElementById('btn-preview')
    try {
      button.disabled = true
      publication.setPrepareRetryVisible(false)
      setNotice('正在保存到文章并生成发布前预览…')
      const payload = await createDraft()
      if (!payload) return
      acceptSavedDraft(payload)
      const { prepared, bootstrapError } = await runAfterDraftWrite({
        refreshBootstrap: refreshBootstrapAfterSave,
        prepare: () => publication.prepare(),
      })
      const followUp = noticeAfterDraftPrepare({ prepared, bootstrapError })
      if (followUp) setNotice(followUp.text, followUp.tone)
    } catch (error) {
      setNotice(error.message, 'err')
      if (state.draftId) publication.setPrepareRetryVisible(true)
    } finally {
      button.disabled = false
    }
  })

  function saveAndPrepare() {
    return writeAndPreparePreview(async () => {
      const entry = collect()
      const decision = decideWorkspaceWrite({
        contentType: issueChrome.capability().contentType,
        mode: state.mode,
        entry,
        namedChapter: issueChrome.isNamedChapter(),
        theme: field('theme').value,
        chromeDirty: issueChrome.isDirty(),
      })
      if (decision.error) {
        setNotice(decision.error, 'err')
        return null
      }
      if (decision.confirmEdit) {
        const title = selectedIssue()?.entries?.[state.entryIndex]?.title || '该条'
        if (!confirm(`确定只改「${title}」？其它历史条目不会动。\n若要发新内容，请先点「追加一条」。`)) return null
      }
      return persistDraft(decision.persist)
    })
  }

  function deleteAndPrepare(entryIndex) {
    return writeAndPreparePreview(() => persistDraft({ mode: 'delete', entryIndex, entry: null }))
  }

  function handleEntriesClick(event) {
    const deleteButton = event.target.closest('[data-delete-index]')
    const button = event.target.closest('[data-index]')
    if (event.target.id === 'btn-new-entry') {
      if (!confirmDiscard()) return
      clearFormDraft()
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
    fill(entry)
    saveFormDraft()
    render()
  }

  function bind() {
    form.addEventListener('input', (event) => {
      saveFormDraft()
      if (event.target?.name === 'body') renderThumbs('drop-body', bodyImageUrls(field('body').value))
      issueChrome.handleFormInput(event)
    })

    window.addEventListener('beforeunload', (event) => {
      if (!hasContent()) return
      event.preventDefault()
      event.returnValue = ''
    })

    document.getElementById('entries').addEventListener('click', handleEntriesClick)

    document.getElementById('entries').addEventListener('input', (event) => {
      if (!issueChrome.handleChromeInput(event)) return
      saveFormDraft()
    })

    document.getElementById('btn-discard-draft').addEventListener('click', () => {
      if (!confirmDiscard()) return
      clearFormDraft()
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
      saveFormDraft()
    })

    document.getElementById('btn-polish').addEventListener('click', async () => {
      const button = document.getElementById('btn-polish')
      if (button.disabled) return
      const original = collect()
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
      saveFormDraft()
    })
    document.getElementById('btn-apply-title').addEventListener('click', () => {
      field('title').value = editedSuggestion().title
      saveFormDraft()
    })
    document.getElementById('btn-apply-body').addEventListener('click', () => {
      field('body').value = editedSuggestion().body
      saveFormDraft()
    })
    document.getElementById('btn-apply-tags').addEventListener('click', () => {
      const tags = editedSuggestion().suggestedTags
      if (tags.length) field('tags').value = tags.join('/')
      saveFormDraft()
    })
    document.getElementById('btn-discard').addEventListener('click', hideCompare)
    document.getElementById('btn-preview').addEventListener('click', () => { void saveAndPrepare() })
  }

  function restoreOnBoot(autosave) {
    const draft = chooseRestoreDraft(loadFormDraft(), loadFormDraftBackup(), autosave)
    if (!draftHasText(draft)) return null
    restoreFormDraft(draft)
    saveFormDraft()
    return draft
  }

  return {
    bind,
    bindDrops,
    render: renderEntries,
    renderTags,
    renderModels,
    resetForm,
    confirmDiscard,
    clearFormDraft,
    saveFormDraft,
    restoreOnBoot,
    draftHasText,
  }
}
