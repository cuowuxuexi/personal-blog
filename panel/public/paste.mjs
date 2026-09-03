const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i
const DATA_URI = /^data:(image\/[\w+.-]+);base64,([a-z0-9+/]+=*)$/i
const SIDE_TEXT = /^(?:\[?图片\]?|微信截图|qq截图|截图|screenshot)$/i

function clipboardText(clipboardData, kind) {
  try {
    return String(clipboardData?.getData?.(kind) || '')
  } catch {
    return ''
  }
}

function clipboardPlainText(clipboardData) {
  return (clipboardText(clipboardData, 'text') || clipboardText(clipboardData, 'text/plain')).trim()
}

function clipboardHtml(clipboardData) {
  return clipboardText(clipboardData, 'text/html')
}

function isImageFile(file, itemType = '') {
  if (!file) return false
  const type = String(file.type || itemType || '')
  if (type.startsWith('image/')) return true
  return IMAGE_EXT.test(String(file.name || ''))
}

function fileFromDataUri(uri, now = Date.now()) {
  const match = DATA_URI.exec(String(uri || '').trim())
  if (!match) return null
  const type = match[1]
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg')
  return new File([bytes], `screenshot-${now}.${ext}`, { type })
}

function filesFromHtml(html, now = Date.now()) {
  const files = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = re.exec(String(html || '')))) {
    const file = fileFromDataUri(match[1], now)
    if (file) files.push(file)
  }
  return files
}

function eachEntry(list, visit) {
  if (!list) return
  if (typeof list[Symbol.iterator] === 'function') {
    for (const item of list) visit(item)
    return
  }
  const length = Number(list.length) || 0
  for (let i = 0; i < length; i += 1) visit(list[i])
}

function isDropTarget(target) {
  return Boolean(typeof target?.closest === 'function' && target.closest('.drop'))
}

function isImageSideText(text) {
  const value = String(text || '').trim()
  if (!value) return true
  if (/^(file:|[a-zA-Z]:[\\/]|\\\\)/.test(value)) return true
  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) return true
  if (IMAGE_EXT.test(value.split(/[\s\n]/, 1)[0])) return true
  return SIDE_TEXT.test(value)
}

export function imageFilesFromClipboard(clipboardData) {
  if (!clipboardData) return []
  const seen = new Set()
  const files = []

  const push = (file, itemType = '') => {
    if (!isImageFile(file, itemType)) return
    const key = `${file.name}:${file.size}:${file.lastModified || 0}:${file.type || itemType}`
    if (seen.has(key)) return
    seen.add(key)
    files.push(file)
  }

  eachEntry(clipboardData.files, (file) => push(file))
  eachEntry(clipboardData.items, (item) => {
    if (item?.kind !== 'file') return
    try {
      push(typeof item.getAsFile === 'function' ? item.getAsFile() : null, item.type)
    } catch {
      // 某些 WebView 在非可信事件上会抛，后面还有异步回退
    }
  })
  if (!files.length) {
    for (const file of filesFromHtml(clipboardHtml(clipboardData))) push(file)
  }
  return files
}

export function shouldAcceptImagePaste(
  clipboardData,
  files = imageFilesFromClipboard(clipboardData),
  { target } = {},
) {
  if (!files.length) return false
  if (isDropTarget(target)) return true
  return isImageSideText(clipboardPlainText(clipboardData))
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

export function shouldTryAsyncClipboard(clipboardData, { target } = {}) {
  if (isDropTarget(target)) return true
  const types = []
  eachEntry(clipboardData?.types, (type) => types.push(String(type)))
  if (types.some((type) => type.startsWith('image/') || type === 'Files' || type === 'text/html')) {
    return true
  }
  return !clipboardPlainText(clipboardData)
}

export async function imageFilesFromAsyncClipboard(clipboardReader) {
  if (typeof clipboardReader !== 'function') return []
  try {
    const items = await clipboardReader()
    const files = []
    for (const item of items || []) {
      for (const type of item?.types || []) {
        if (!String(type).startsWith('image/')) continue
        const blob = await item.getType(type)
        if (!blob || !blob.size) continue
        const ext = String(type).split('/')[1].replace('jpeg', 'jpg')
        files.push(new File([blob], `screenshot.${ext}`, { type }))
      }
    }
    return files
  } catch {
    return []
  }
}

export async function decideImagePaste({
  clipboardData,
  target,
  lastRole = 'image',
  clipboardReader,
} = {}) {
  let files = imageFilesFromClipboard(clipboardData).map((file) => namePasteFile(file))
  if (
    !files.length
    && shouldTryAsyncClipboard(clipboardData, { target })
    && clipboardReader
  ) {
    files = (await imageFilesFromAsyncClipboard(clipboardReader)).map((file) => namePasteFile(file))
  }
  const accept = shouldAcceptImagePaste(clipboardData, files, { target })
  return {
    accept,
    files,
    role: resolvePasteRole(target, lastRole),
    miss: !accept && isDropTarget(target)
      ? '剪贴板里没有能直接用的图片，请改用拖入或选择文件。'
      : null,
  }
}
