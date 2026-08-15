import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { createVitepressSupervisor } from './lib/vitepress-supervisor.mjs'

function fakeChild() {
  const child = new EventEmitter()
  child.exitCode = null
  child.killed = false
  child.kill = () => { child.killed = true }
  return child
}

test('monitor restarts an externally managed preview after it goes down', async () => {
  let healthy = true
  let starts = 0
  let tick = null
  const supervisor = createVitepressSupervisor({
    checkHealth: async () => healthy,
    startProcess() {
      starts += 1
      healthy = true
      return fakeChild()
    },
    setIntervalFn(fn) {
      tick = fn
      return 1
    },
    clearIntervalFn() {},
    sleep: async () => {},
    startupTimeoutMs: 10,
  })

  await supervisor.ensureRunning()
  assert.equal(starts, 0)
  supervisor.startMonitoring()
  healthy = false
  await tick()
  assert.equal(starts, 1)
  supervisor.stop()
})

test('concurrent health checks never start duplicate preview processes', async () => {
  let starts = 0
  const supervisor = createVitepressSupervisor({
    checkHealth: async () => false,
    startProcess() {
      starts += 1
      return fakeChild()
    },
    sleep: async () => {},
    startupTimeoutMs: 0,
  })
  await Promise.all([supervisor.ensureRunning(), supervisor.ensureRunning(), supervisor.ensureRunning()])
  assert.equal(starts, 1)
  supervisor.stop()
})
