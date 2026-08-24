import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkOverviewLists } from './verify/overview.mjs'
import { projectStructureFromFs } from './project-fs.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('live overview lists are generated or reconcile against the structure declaration', () => {
  const nodes = projectStructureFromFs(REPO_ROOT)
  const result = checkOverviewLists(REPO_ROOT, nodes)
  assert.equal(result.ok, true, result.failures.map((item) => item.message).join('\n'))
})
