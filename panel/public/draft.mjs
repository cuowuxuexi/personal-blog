/** 表单草稿：还没写入文章的输入备份。清空它不删仓库文章。 */
export function draftHasText(draft) {
  return Boolean(
    draft?.fields?.title?.trim()
    || draft?.fields?.body?.trim()
    || (draft?.mode === 'newIssue' && draft?.fields?.theme?.trim()),
  )
}

export function draftKindId(draft) {
  return draft?.kindId || draft?.kind || ''
}

export function draftMatchesContext(draft, { kindId, issueLink } = {}) {
  if (!draft) return false
  if (kindId && draftKindId(draft) !== kindId) return false
  if (issueLink && draft.issueLink && draft.issueLink !== issueLink) return false
  return true
}

export function shouldPersistDraft(existing, incoming) {
  if (draftHasText(incoming)) return true
  return !draftHasText(existing)
}

export function chooseRestoreDraft(...candidates) {
  const withText = candidates.filter(draftHasText)
  if (!withText.length) return null
  return withText.sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))[0]
}

export function chooseRestoreDraftForContext(candidates, context) {
  return chooseRestoreDraft(...(candidates || []).filter((draft) => draftMatchesContext(draft, context)))
}

/** 追加/修订时若期头没改，不要把表单里残留的主题、封面带去后端。 */
export function issueFieldsForDraft({
  mode,
  chromeDirty = false,
  theme = '',
  date = '',
  caption = '',
  description = '',
  cover = '',
} = {}) {
  if (mode !== 'newIssue' && mode !== 'editChrome' && !chromeDirty) {
    return {
      theme: '',
      date: '',
      description: '',
    }
  }
  return {
    theme: String(theme || '').trim(),
    date: String(date || '').trim(),
    caption: String(caption || '').trim(),
    description: String(description || '').trim(),
    cover: cover || '',
  }
}

/** 写入文章请求体。网址仍是 POST /api/draft。 */
export function draftRequestBody({ kindId, mode, issueLink, entryIndex, entry, issue }) {
  if (!kindId) throw new Error('persistDraft 需要显式 kindId')
  return {
    kindId,
    mode,
    issueLink: issueLink || '',
    entryIndex,
    entry,
    issue,
  }
}
