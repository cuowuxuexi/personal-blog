import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createDefaultProbes } from './lib/probes.mjs'

function writePackage(dir, scripts, marker) {
  fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({
    name: marker,
    private: true,
    scripts,
  }, null, 2)}\n`)
}

test('default probes validate content and build the checked-out snapshot without replacing package metadata', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-'))
  const repoRoot = path.join(root, 'repo')
  const snapshotDir = path.join(root, 'snapshot')
  fs.mkdirSync(repoRoot, { recursive: true })
  fs.mkdirSync(snapshotDir, { recursive: true })
  writePackage(repoRoot, {
    'test:panel': 'node -e "require(\'fs\').writeFileSync(\'repo-test-ran\', \'yes\')"',
    'docs:build': 'node -e "require(\'fs\').writeFileSync(\'repo-build-ran\', \'yes\')"',
  }, 'worktree-package')
  writePackage(snapshotDir, {
    'test:panel': 'node -e "require(\'fs\').writeFileSync(\'snapshot-test-ran\', \'yes\')"',
    'docs:build': 'node snapshot-build.cjs',
  }, 'head-package')
  fs.writeFileSync(path.join(snapshotDir, 'snapshot-build.cjs'), `
const fs = require('node:fs')
fs.mkdirSync('docs/.vitepress/dist', { recursive: true })
fs.writeFileSync('snapshot-build-ran', process.env.VITEPRESS_BASE || 'missing')
`)
  const expectedPackage = fs.readFileSync(path.join(snapshotDir, 'package.json'), 'utf8')
  const probes = createDefaultProbes({ repoRoot, productionOrigin: '' })

  try {
    fs.mkdirSync(path.join(snapshotDir, 'docs', 'AI与生活'), { recursive: true })
    fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '2026-08-12.md'), '<WeeklyEntry title="唯一">\n\n正文\n\n</WeeklyEntry>\n')
    await probes.test({ snapshotDir, repoRoot })
    const built = await probes.build({
      snapshotDir,
      repoRoot,
      previewBase: '/release-preview/j_test/',
    })
    assert.equal(fs.readFileSync(path.join(snapshotDir, 'package.json'), 'utf8'), expectedPackage)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'snapshot-test-ran')), false)
    assert.equal(
      fs.readFileSync(path.join(snapshotDir, 'snapshot-build-ran'), 'utf8'),
      '/release-preview/j_test/',
    )
    assert.equal(fs.existsSync(path.join(snapshotDir, 'repo-test-ran')), false)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'repo-build-ran')), false)
    assert.equal(built.distDir, path.join(snapshotDir, 'docs', '.vitepress', 'dist'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
