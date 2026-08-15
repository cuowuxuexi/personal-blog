import assert from 'node:assert/strict'
import test from 'node:test'
import {
  imageFilesFromClipboard,
  namePasteFile,
  resolvePasteRole,
  shouldAcceptImagePaste,
} from './public/paste.mjs'

function fakeFile(name, type = 'image/png', size = 12) {
  return { name, type, size, lastModified: 1 }
}

function clipboard({ files = [], items = [], text = '' } = {}) {
  return {
    files,
    items,
    getData(kind) {
      return kind === 'text' || kind === 'text/plain' ? text : ''
    },
  }
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
