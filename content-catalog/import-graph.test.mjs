import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  checkBrowserSafeImportGraph,
  collectRelativeImportGraph,
} from './verify/import-graph.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..')

test('posts.ts / adapter / catalog index reachable graph stays free of project-fs and node:fs', () => {
  const result = checkBrowserSafeImportGraph([
    path.join(REPO_ROOT, 'docs', '.vitepress', 'posts.ts'),
    path.join(REPO_ROOT, 'docs', '.vitepress', 'content-catalog-adapter.mjs'),
    path.join(REPO_ROOT, 'content-catalog', 'index.mjs'),
  ])
  assert.equal(
    result.ok,
    true,
    result.failures.map((item) => item.message).join('\n'),
  )
})

test('mutation: index re-exporting project-fs turns browser graph red', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-graph-'))
  try {
    const projectFs = path.join(dir, 'project-fs.mjs')
    const index = path.join(dir, 'index.mjs')
    const adapter = path.join(dir, 'adapter.mjs')
    fs.writeFileSync(projectFs, "import fs from 'node:fs'\nexport const x = fs\n")
    fs.writeFileSync(index, "export { x } from './project-fs.mjs'\n")
    fs.writeFileSync(adapter, "export { x } from './index.mjs'\n")

    const greenish = checkBrowserSafeImportGraph([path.join(dir, 'adapter.mjs')])
    assert.equal(greenish.ok, false)
    assert.ok(greenish.failures.some((item) => item.code === 'browser-fs-leak'))

    const { files } = collectRelativeImportGraph(adapter)
    assert.ok(files.some((file) => path.basename(file) === 'project-fs.mjs'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('mutation: dynamic import(./project-fs.mjs) turns browser graph red', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-dyn-'))
  try {
    const projectFs = path.join(dir, 'project-fs.mjs')
    const entry = path.join(dir, 'entry.mjs')
    fs.writeFileSync(projectFs, "import fs from 'node:fs'\nexport const x = fs\n")
    fs.writeFileSync(entry, "export async function load() { return import('./project-fs.mjs') }\n")

    const result = checkBrowserSafeImportGraph([entry])
    assert.equal(result.ok, false)
    assert.ok(result.failures.some((item) => item.code === 'browser-fs-leak'))
    const { files, edges } = collectRelativeImportGraph(entry)
    assert.ok(files.some((file) => path.basename(file) === 'project-fs.mjs'))
    assert.ok(edges.some((edge) => edge.specifier === './project-fs.mjs'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('mutation: static and side-effect fs/promises imports turn browser graph red', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-fsp-'))
  try {
    const staticEntry = path.join(dir, 'static.mjs')
    const sideEffectEntry = path.join(dir, 'side-effect.mjs')
    fs.writeFileSync(staticEntry, "import fsp from 'node:fs/promises'\nexport const read = fsp.readFile\n")
    fs.writeFileSync(sideEffectEntry, "import 'fs/promises'\nexport const marker = true\n")

    for (const entry of [staticEntry, sideEffectEntry]) {
      const result = checkBrowserSafeImportGraph([entry])
      assert.equal(result.ok, false)
      assert.ok(result.failures.some((item) => item.code === 'browser-fs-leak'))
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
