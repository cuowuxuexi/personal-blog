import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { writeTargetsAtomic } from './lib/atomic-write.mjs'

test('failed atomic write restores every target', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-tx-'))
  const a = path.join(dir, 'a.md')
  const b = path.join(dir, 'b.md')
  fs.writeFileSync(a, 'old-a\n')
  fs.writeFileSync(b, 'old-b\n')
  let calls = 0
  assert.throws(() => {
    writeTargetsAtomic([
      { abs: a, content: 'new-a' },
      { abs: b, content: 'new-b' },
    ], {
      writeFile() {
        calls += 1
        if (calls === 2) throw new Error('boom')
        fs.writeFileSync(a, 'new-a\n')
      },
    })
  })
  assert.equal(fs.readFileSync(a, 'utf8'), 'old-a\n')
  assert.equal(fs.readFileSync(b, 'utf8'), 'old-b\n')
  fs.rmSync(dir, { recursive: true, force: true })
})
