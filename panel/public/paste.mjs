export function imageFilesFromClipboard(clipboardData) {
  if (!clipboardData) return []
  const seen = new Set()
  const files = []

  const push = (file) => {
    if (!file || !String(file.type || '').startsWith('image/')) return
    const key = `${file.name}:${file.size}:${file.lastModified || 0}`
    if (seen.has(key)) return
    seen.add(key)
    files.push(file)
  }

  if (clipboardData.files) {
    for (const file of clipboardData.files) push(file)
  }
  if (clipboardData.items) {
    for (const item of clipboardData.items) {
      if (item.kind !== 'file' || !String(item.type || '').startsWith('image/')) continue
      push(typeof item.getAsFile === 'function' ? item.getAsFile() : null)
    }
  }
  return files
}

export function shouldAcceptImagePaste(clipboardData, files = imageFilesFromClipboard(clipboardData)) {
  if (!files.length) return false
  const text = String(
    clipboardData?.getData?.('text') || clipboardData?.getData?.('text/plain') || '',
  ).trim()
  if (!text) return true
  // 截图工具有时会顺带放一个本地路径
  if (/^(file:|[a-zA-Z]:[\\/]|\\\\)/.test(text)) return true
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(text.split(/[\s\n]/, 1)[0])
}

export function resolvePasteRole(target, lastRole = 'image') {
  const drop = typeof target?.closest === 'function' ? target.closest('.drop') : null
  if (drop?.dataset?.role) return drop.dataset.role
  if (target?.name === 'body' || target?.id === 'sug-body') return 'body'
  return lastRole || 'image'
}

export function namePasteFile(file, now = Date.now()) {
  if (!file) return file
  const name = String(file.name || '')
  const generic = !name || /^(image|blob|screenshot|untitled)(\.\w+)?$/i.test(name)
  if (!generic) return file
  const ext = (String(file.type || 'image/png').split('/')[1] || 'png').replace('jpeg', 'jpg')
  return new File([file], `screenshot-${now}.${ext}`, { type: file.type || 'image/png' })
}
