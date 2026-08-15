import assert from 'node:assert/strict'
import test from 'node:test'
import { singleFlight } from './public/publish-flow.mjs'

test('one publish preparation action coalesces accidental double clicks', async () => {
  let calls = 0
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const action = singleFlight(async () => {
    calls += 1
    await gate
    return 'ready'
  })
  const first = action()
  const second = action()
  assert.equal(first, second)
  assert.equal(calls, 1)
  release()
  assert.equal(await first, 'ready')
  assert.equal(await action(), 'ready')
  assert.equal(calls, 2)
})
