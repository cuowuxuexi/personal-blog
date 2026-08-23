import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { CONTENT_PARITY_EXCEPTIONS } from './verify/exceptions.mjs'
import { checkContentParity } from './verify/parity.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('live file ↔ projected posts ↔ sidebar parity follows the shared contract', () => {
  const result = checkContentParity(REPO_ROOT)
  assert.ok(Array.isArray(CONTENT_PARITY_EXCEPTIONS))
  assert.equal(
    result.ok,
    true,
    result.failures.map((item) => `${item.code}: ${item.message}`).join('\n'),
  )
  assert.equal(result.warnings.length, 0)
  assert.ok(result.counts.projectedPosts >= 1)
  assert.ok(result.counts.files >= 1)
})
