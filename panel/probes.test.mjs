import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
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

function listen(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
    server.on('error', reject)
  })
}

test('default online asset probe reports mixed success and failures', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/ok.webp') {
      res.writeHead(200, { 'Content-Type': 'image/webp' })
      res.end('ok')
      return
    }
    res.writeHead(404)
    res.end('missing')
  })
  const listener = await listen(server)
  try {
    const probes = createDefaultProbes({ repoRoot: process.cwd(), productionOrigin: listener.origin })
    const result = await probes.onlineAssets({
      urls: [`${listener.origin}/ok.webp`, `${listener.origin}/missing.webp`],
    })
    assert.equal(result.ok, false)
    assert.deepEqual(result.missing, [`${listener.origin}/missing.webp`])
  } finally {
    await listener.close()
  }
})

test('default online asset probe rejects a 200 HTML response', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<html>not an image</html>')
  })
  const listener = await listen(server)
  try {
    const url = `${listener.origin}/fake.webp`
    const probes = createDefaultProbes({ repoRoot: process.cwd(), productionOrigin: listener.origin })
    assert.deepEqual(await probes.onlineAssets({ urls: [url] }), {
      ok: false,
      missing: [url],
    })
  } finally {
    await listener.close()
  }
})

test('default online asset probe accepts a journey production image URL', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/images/journey/cover.webp') {
      res.writeHead(200, { 'Content-Type': 'image/webp' })
      res.end('ok')
      return
    }
    res.writeHead(404)
    res.end('missing')
  })
  const listener = await listen(server)
  try {
    const probes = createDefaultProbes({ repoRoot: process.cwd(), productionOrigin: listener.origin })
    const url = `${listener.origin}/images/journey/cover.webp`
    assert.deepEqual(await probes.onlineAssets({ urls: [url] }), { ok: true, missing: [] })
  } finally {
    await listener.close()
  }
})

test('default online asset probe reports a missing journey production image', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(404)
    res.end('missing')
  })
  const listener = await listen(server)
  try {
    const url = `${listener.origin}/images/journey/missing.webp`
    const probes = createDefaultProbes({ repoRoot: process.cwd(), productionOrigin: listener.origin })
    assert.deepEqual(await probes.onlineAssets({ urls: [url] }), {
      ok: false,
      missing: [url],
    })
  } finally {
    await listener.close()
  }
})

test('default online asset probe tolerates an empty image list', async () => {
  const probes = createDefaultProbes({ repoRoot: process.cwd(), productionOrigin: '' })
  assert.deepEqual(await probes.onlineAssets({ urls: [] }), { ok: true, missing: [] })
})

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
    fs.mkdirSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程'), { recursive: true })
    fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '2026-08-12.md'), '<WeeklyEntry title="唯一">\n\n正文\n\n</WeeklyEntry>\n')
    fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), [
      '---',
      'type: journey',
      '---',
      '',
      '篇章正文，不引用缺失图片。',
      '',
    ].join('\n'))
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

test('default probes without kind/files ignore broken journey chapters in the snapshot', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-weekly-safe-'))
  const snapshotDir = path.join(root, 'snapshot')
  fs.mkdirSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程'), { recursive: true })
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '2026-08-12.md'), '<WeeklyEntry title="唯一">\n\n正文\n\n</WeeklyEntry>\n')
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/missing.webp)',
    '',
  ].join('\n'))
  const probes = createDefaultProbes({ repoRoot: path.join(root, 'repo'), productionOrigin: '' })
  try {
    const result = await probes.test({ snapshotDir })
    assert.equal(result.ok, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('default probes reject a journey task when its scoped chapter is missing a referenced image', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-missing-'))
  const snapshotDir = path.join(root, 'snapshot')
  fs.mkdirSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程'), { recursive: true })
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '2026-08-12.md'), '<WeeklyEntry title="唯一">\n\n正文\n\n</WeeklyEntry>\n')
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/missing.webp)',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程', '工具篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/also-missing.webp)',
    '',
  ].join('\n'))
  const probes = createDefaultProbes({ repoRoot: path.join(root, 'repo'), productionOrigin: '' })
  try {
    await assert.rejects(
      () => probes.test({
        snapshotDir,
        kindId: 'journey',
        contentFiles: ['docs/AI与生活/我的AI历程/基础设施篇.md'],
      }),
      /缺少图片.*missing\.webp/,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('default probes accept a journey task when another chapter is missing an image', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-isolate-'))
  const snapshotDir = path.join(root, 'snapshot')
  const images = path.join(snapshotDir, 'docs', 'public', 'images', 'journey')
  fs.mkdirSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程'), { recursive: true })
  fs.mkdirSync(images, { recursive: true })
  fs.writeFileSync(path.join(images, 'cover.webp'), 'image')
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/cover.webp)',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(snapshotDir, 'docs', 'AI与生活', '我的AI历程', '工具篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/missing.webp)',
    '',
  ].join('\n'))
  const probes = createDefaultProbes({ repoRoot: path.join(root, 'repo'), productionOrigin: '' })
  try {
    const result = await probes.test({
      snapshotDir,
      kindId: 'journey',
      contentFiles: ['docs/AI与生活/我的AI历程/基础设施篇.md'],
    })
    assert.equal(result.ok, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
