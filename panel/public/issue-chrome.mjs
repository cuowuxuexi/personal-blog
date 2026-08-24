import { escapeHtml, escapeAttr } from './escape.mjs'
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

function supportsIssueChrome(kind) {
  const type = resolveCapability(kind).contentType
  return type === 'weekly' || type === 'journey'
}

function issueChromeSnapshot(kind, issue) {
  const named = isNamedJourneyChapter(kind, issue)
  return JSON.stringify({
    theme: named ? '' : chromeThemeFromIssue(issue),
    caption: String(issue?.caption || '').trim(),
    cover: issue?.cover || '',
  })
}

function formChromeSnapshot(kind, issue, field, cover) {
  const named = isNamedJourneyChapter(kind, issue)
  return JSON.stringify({
    theme: named ? '' : field('theme').value.trim(),
    caption: field('caption').value.trim(),
    cover: cover || '',
  })
}

export function chromeDirty({ kind, mode, issue, field, cover }) {
  if (!kind || !supportsIssueChrome(kind)) return false
  if (mode === 'newIssue') return Boolean(field('theme').value.trim())
  if (!issue) return false
  return formChromeSnapshot(kind, issue, field, cover) !== issueChromeSnapshot(kind, issue)
}

export function themeForPersist({ kind, issue, mode, theme }) {
  const resolved = normalizeEditorMode(mode, kind)
  return isNamedJourneyChapter(kind, issue) && resolved !== 'newIssue'
    ? ''
    : String(theme || '').trim()
}

export function createIssueChrome({
  state,
  field,
  currentKind,
  selectedIssue,
}) {
  function view() {
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

  function isDirty() {
    return chromeDirty({
      kind: currentKind(),
      mode: state.mode,
      issue: selectedIssue(),
      field,
      cover: state.images.cover,
    })
  }

  function persistInput(mode = state.mode) {
    const kind = currentKind()
    const resolved = normalizeEditorMode(mode, kind)
    return {
      mode: resolved,
      chromeDirty: isDirty(),
      theme: themeForPersist({
        kind,
        issue: selectedIssue(),
        mode: resolved,
        theme: field('theme').value,
      }),
      date: field('issueDate').value,
      caption: field('caption').value.trim(),
      description: field('description').value.trim(),
      cover: state.images.cover,
    }
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
    const issue = selectedIssue()
    const bar = view()
    const options = bar.selectorIssues
      .map((item) => `<option value="${escapeAttr(item.link)}" ${item.link === (issue?.link || '') ? 'selected' : ''}>${escapeHtml(item.title)}</option>`)
      .join('')
    const selector = bar.showSelector
      ? `<label class="issue-select-field">
        <span>${escapeHtml(bar.selectorLabel)}</span>
        <select id="issue-select" aria-label="${escapeAttr(bar.selectorLabel)}">${options}</select>
      </label>`
      : ''
    const createChip = bar.showCreate
      ? `<button type="button" class="chip ${state.mode === 'newIssue' ? 'active' : ''}" data-mode="newIssue">开新一期</button>`
      : ''
    document.getElementById('issue-bar').innerHTML = `
    <h2 id="issue-heading">${escapeHtml(bar.heading)}</h2>
    <p class="issue-meta" id="issue-heading-meta">${escapeHtml(bar.meta)}</p>
    <p class="write-hint">${escapeHtml(bar.hint)}</p>
    <div class="modes">
      <button type="button" class="chip ${state.mode === 'append' ? 'active' : ''}" data-mode="append">追加一条</button>
      ${createChip}
      ${selector}
    </div>
  `
    document.getElementById('issue-fields').classList.toggle('hidden', !bar.showIssueFields)
  }

  function renderFieldsHtml(bar = view()) {
    if (!bar.showChromeFields) return ''
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

  function fillFromIssue(issue) {
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

  function resetFieldsForMode() {
    const next = chromeFormForMode(state.mode, { today: state.bootstrap.today })
    if (next) {
      field('theme').value = next.theme
      field('issueDate').value = next.issueDate
      field('caption').value = next.caption
      field('description').value = next.description
      state.images.cover = next.cover
      return
    }
    fillFromIssue(selectedIssue())
  }

  function applyThemeToHeading(theme) {
    const issue = selectedIssue()
    const number = state.mode === 'newIssue' ? currentKind().nextIssue : issue?.issue
    const heading = document.getElementById('issue-heading')
    if (number != null && heading) {
      heading.textContent = `第${String(number).padStart(3, '0')}期${theme ? `-${theme}` : ''}`
    }
  }

  function syncNewIssueMeta(date) {
    const meta = document.getElementById('issue-heading-meta')
    if (meta) meta.textContent = `${date || state.bootstrap.today} · 新一期`
  }

  function handleChromeInput(event) {
    if (event.target.id === 'issue-caption-input') {
      field('caption').value = event.target.value
      return true
    }
    if (event.target.id !== 'issue-theme-input') return false
    field('theme').value = event.target.value
    applyThemeToHeading(event.target.value.trim())
    return true
  }

  function handleFormInput(event) {
    if (state.mode === 'newIssue' && event.target?.name === 'issueDate') {
      syncNewIssueMeta(event.target.value)
      return true
    }
    return false
  }

  function bind({ confirmDiscard, onKindChange, onIssueChange, onModeChange }) {
    document.getElementById('kinds').addEventListener('click', (event) => {
      const kind = event.target.dataset.kind
      if (!kind) return
      if (kind === state.kind || !confirmDiscard()) return
      onKindChange(kind)
    })

    document.getElementById('issue-bar').addEventListener('click', (event) => {
      const mode = event.target.dataset.mode
      if (!mode || mode === state.mode) return
      if (mode === 'newIssue' && !allowsCreate(currentKind())) return
      if (!confirmDiscard()) return
      onModeChange(mode)
    })

    document.getElementById('issue-bar').addEventListener('change', (event) => {
      if (event.target.id !== 'issue-select') return
      if (!confirmDiscard()) {
        event.target.value = state.issueLink
        return
      }
      onIssueChange(event.target.value)
    })
  }

  function render() {
    renderKinds()
    renderIssueBar()
  }

  return {
    view,
    render,
    renderFieldsHtml,
    fillFromIssue,
    resetFieldsForMode,
    isDirty,
    persistInput,
    handleChromeInput,
    handleFormInput,
    bind,
    headingAnchor: () => previewHeadingAnchor(currentKind()),
    releasePreviewHref: (url, job) => releasePreviewHref(url, currentKind(), job),
    uploadRequestBody: imageUploadRequestBody,
    allowsCreate: () => allowsCreate(currentKind()),
    isNamedChapter: (issue = selectedIssue()) => isNamedJourneyChapter(currentKind(), issue),
    normalizeMode: (mode) => normalizeEditorMode(mode, currentKind()),
    capability: () => resolveCapability(currentKind()),
    supportsChrome: () => supportsIssueChrome(currentKind()),
  }
}
