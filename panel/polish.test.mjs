import assert from 'node:assert/strict'
import test from 'node:test'
import { POLISH_TIMEOUT_MS, polishErrorMessage } from './lib/polish.mjs'

test('polish timeout is long enough for a 4k-char weekly note', () => {
  assert.ok(POLISH_TIMEOUT_MS >= 180000)
})

test('maps AbortSignal timeout to a Chinese hint', () => {
  const timeout = new Error('The operation was aborted due to timeout')
  timeout.name = 'TimeoutError'
  const message = polishErrorMessage(timeout)
  assert.match(message, /超时/)
  assert.doesNotMatch(message, /aborted due to timeout/)
})

test('keeps other polish errors intact', () => {
  assert.equal(polishErrorMessage(new Error('润色失败：400 bad model')), '润色失败：400 bad model')
})
