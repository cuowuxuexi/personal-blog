import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decideImagePaste,
  imageFilesFromClipboard,
  namePasteFile,
  resolvePasteRole,
  shouldAcceptImagePaste,
} from './public/paste.mjs'

function fakeFile(name, type = 'image/png', size = 12) {
  return { name, type, size, lastModified: 1 }
}

function clipboard({ files = [], items = [], text = '', html = '', types } = {}) {
  return {
    files,
    items,
    types: types || [
      ...(text ? ['text/plain'] : []),
      ...(html ? ['text/html'] : []),
      ...(files.length || items.some((item) => item.kind === 'file') ? ['Files'] : []),
    ],
    getData(kind) {
      if (kind === 'text' || kind === 'text/plain') return text
      if (kind === 'text/html') return html
      return ''
    },
  }
}

function dropTarget(role = 'image') {
  const drop = { dataset: { role }, closest(selector) { return selector === '.drop' ? this : null } }
  return { closest: (selector) => (selector === '.drop' ? drop : null) }
}

test('reads image files from clipboard items and files', () => {
  const png = fakeFile('clip.png')
  const note = fakeFile('note.txt', 'text/plain')
  const fromItem = fakeFile('item.webp', 'image/webp', 20)
  const data = clipboard({
    files: [png, note],
    items: [
      { kind: 'file', type: 'image/webp', getAsFile: () => fromItem },
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
    ],
  })
  assert.deepEqual(imageFilesFromClipboard(data).map((file) => file.name), ['clip.png', 'item.webp'])
})

test('does not steal a real text paste even if an image is also present', () => {
  const files = [fakeFile('shot.png')]
  assert.equal(shouldAcceptImagePaste(clipboard({ files, text: '' }), files), true)
  assert.equal(shouldAcceptImagePaste(clipboard({ files, text: '一段正文' }), files), false)
  assert.equal(shouldAcceptImagePaste(clipboard({ files, text: 'C:\\Temp\\shot.png' }), files), true)
})

test('keeps screenshot pastes when the clipboard also has a URL or app label', () => {
  const files = [fakeFile('image.png')]
  assert.equal(shouldAcceptImagePaste(clipboard({
    files,
    text: 'https://mmbiz.qpic.cn/sz_mmbiz_png/abc123/640?wx_fmt=png',
  }), files), true)
  assert.equal(shouldAcceptImagePaste(clipboard({ files, text: '[图片]' }), files), true)
  assert.equal(shouldAcceptImagePaste(clipboard({ files, text: '微信截图' }), files), true)
})

test('drop zone paste always keeps the image even if extra text is present', () => {
  const files = [fakeFile('shot.png')]
  const data = clipboard({ files, text: '一段正文' })
  assert.equal(shouldAcceptImagePaste(data, files, { target: dropTarget('image') }), true)
})

test('reads unnamed desktop images and HTML data URIs', () => {
  const unnamed = fakeFile('photo.png', '', 20)
  assert.deepEqual(
    imageFilesFromClipboard(clipboard({ files: [unnamed] })).map((file) => file.name),
    ['photo.png'],
  )
  const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const fromHtml = imageFilesFromClipboard(clipboard({
    html: `<html><body><img src="${dataUri}"></body></html>`,
  }))
  assert.equal(fromHtml.length, 1)
  assert.match(fromHtml[0].type, /^image\/png/)
})

test('paste target follows the drop zone, then the body field, then last role', () => {
  const drop = { dataset: { role: 'cover' }, closest() { return this } }
  const nested = { closest: () => drop }
  const body = { name: 'body', closest: () => null }
  assert.equal(resolvePasteRole(nested, 'image'), 'cover')
  assert.equal(resolvePasteRole(body, 'image'), 'body')
  assert.equal(resolvePasteRole({ closest: () => null }, 'body'), 'body')
  assert.equal(resolvePasteRole(null, ''), 'image')
})

test('generic clipboard names become screenshot-*.ext', () => {
  const named = namePasteFile(new File(['x'], 'deeptutor.png', { type: 'image/png' }), 1)
  assert.equal(named.name, 'deeptutor.png')
  const shot = namePasteFile(new File(['x'], 'image.png', { type: 'image/png' }), 99)
  assert.equal(shot.name, 'screenshot-99.png')
})

test('async clipboard fills in when the paste event has no files', async () => {
  const blob = new Blob(['png'], { type: 'image/png' })
  const decided = await decideImagePaste({
    clipboardData: clipboard({ text: '' }),
    target: dropTarget('image'),
    lastRole: 'body',
    clipboardReader: async () => [{ types: ['image/png'], getType: async () => blob }],
  })
  assert.equal(decided.accept, true)
  assert.equal(decided.role, 'image')
  assert.equal(decided.files.length, 1)
  assert.match(decided.files[0].name, /^screenshot-/)
})

test('drop zone with an unreadable clipboard explains the miss', async () => {
  const decided = await decideImagePaste({
    clipboardData: clipboard({ html: '<img src="file:///C:/Temp/shot.png">' }),
    target: dropTarget('image'),
  })
  assert.equal(decided.accept, false)
  assert.equal(decided.files.length, 0)
  assert.match(decided.miss, /没有能直接用的图片/)
})
