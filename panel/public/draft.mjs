export function draftHasText(draft) {
  return Boolean(draft?.fields?.title?.trim() || draft?.fields?.body?.trim())
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
