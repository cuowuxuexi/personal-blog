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

test('default probes test and build the checked-out snapshot without replacing package metadata', async () => {
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
    'docs:build': 'node -e "require(\'fs\').mkdirSync(\'docs/.vitepress/dist\', { recursive: true }); require(\'fs\').writeFileSync(\'snapshot-build-ran\', \'yes\')"',
  }, 'head-package')
  const expectedPackage = fs.readFileSync(path.join(snapshotDir, 'package.json'), 'utf8')
  const probes = createDefaultProbes({ repoRoot, productionOrigin: '' })

  try {
    await probes.test({ snapshotDir, repoRoot })
    const built = await probes.build({ snapshotDir, repoRoot })
    assert.equal(fs.readFileSync(path.join(snapshotDir, 'package.json'), 'utf8'), expectedPackage)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'snapshot-test-ran')), true)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'snapshot-build-ran')), true)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'repo-test-ran')), false)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'repo-build-ran')), false)
    assert.equal(built.distDir, path.join(snapshotDir, 'docs', '.vitepress', 'dist'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
