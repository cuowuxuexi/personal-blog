import assert from 'node:assert/strict'
import test from 'node:test'
import { escapeHtml } from './public/escape.mjs'

test('article-derived labels are escaped as text', () => {
  const raw = '<img src=x onerror="alert(1)"> <script>alert(1)</script>'
  const escaped = escapeHtml(raw)
  assert.equal(escaped.includes('<script>'), false)
  assert.equal(escaped.includes('<img'), false)
  assert.match(escaped, /&lt;img/)
  assert.match(escaped, /&lt;script&gt;/)
})
