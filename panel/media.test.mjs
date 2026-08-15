import assert from 'node:assert/strict'
import test from 'node:test'
import { bodyImageUrls, removeImageMarkdown } from './public/media.mjs'

const shot = '/images/weekly/2026-08-15-01-deeptutor.webp'
const extra = '/images/weekly/2026-08-15-02-img.webp'

test('lists unique markdown images in body order', () => {
  const body = `先看这张\n\n![DeepTutor](${shot})\n\n再看\n\n![](${extra})\n\n![又一张](${shot})`
  assert.deepEqual(bodyImageUrls(body), [shot, extra])
  assert.deepEqual(bodyImageUrls('没有图'), [])
})

test('removing a pasted image drops its markdown and extra blank lines', () => {
  const body = `开头\n\n![DeepTutor](${shot})\n\n中间\n\n![](${extra})`
  assert.equal(removeImageMarkdown(body, shot), `开头\n\n中间\n\n![](${extra})`)
  assert.equal(removeImageMarkdown(`![](${shot})`, shot), '')
  assert.equal(removeImageMarkdown(body, '/not-used.webp'), body)
})
