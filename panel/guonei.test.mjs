import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertSafeGuoneiConfig,
  defaultIdentityFile,
  packDistArchive,
  prepareProductionDist,
  productionSwapCommands,
  readGuoneiConfig,
  uploadDist,
  writeProductionBuildMeta,
} from './lib/guonei.mjs'

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

test('readGuoneiConfig uses domestic defaults and enables only when the key exists', () => {
  const root = tempDir('panel-guonei-cfg-')
  try {
    const missing = readGuoneiConfig({
      PANEL_GUONEI_HOST: '100.88.115.43',
      PANEL_GUONEI_USER: 'root',
      PANEL_GUONEI_KEY: path.join(root, 'missing_key'),
      USERPROFILE: root,
      HOME: root,
    })
    assert.equal(missing.enabled, false)
    assert.equal(missing.host, '100.88.115.43')
    assert.equal(missing.siteDir, '/var/www/blog')

    const sshDir = path.join(root, '.ssh')
    fs.mkdirSync(sshDir, { recursive: true })
    const key = path.join(sshDir, 'id_ed25519_servers')
    fs.writeFileSync(key, 'fake')
    const found = readGuoneiConfig({
      USERPROFILE: root,
      HOME: root,
    })
    assert.equal(found.enabled, true)
    assert.equal(found.identityFile, key)
    assert.equal(defaultIdentityFile({ USERPROFILE: root }), key)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('assertSafeGuoneiConfig rejects injection in host or remote paths', () => {
  const root = tempDir('panel-guonei-safe-')
  const key = path.join(root, 'key')
  fs.writeFileSync(key, 'fake')
  try {
    assert.throws(
      () => assertSafeGuoneiConfig({
        host: 'host; rm -rf /',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/blog',
        remoteTar: '/tmp/blog-dist.tar',
      }),
      /主机不合法/,
    )
    assert.throws(
      () => assertSafeGuoneiConfig({
        host: '100.88.115.43',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/../etc',
        remoteTar: '/tmp/blog-dist.tar',
      }),
      /站点目录不合法/,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('production swap is an atomic directory replace', () => {
  const script = productionSwapCommands({
    siteDir: '/var/www/blog',
    remoteTar: '/tmp/blog-dist.tar',
  })
  assert.match(script, /rm -rf \/var\/www\/blog\.new \/var\/www\/blog\.old/)
  assert.match(script, /tar -xf \/tmp\/blog-dist\.tar -C \/var\/www\/blog\.new/)
  assert.match(script, /mv \/var\/www\/blog\.new \/var\/www\/blog/)
  assert.match(script, /chown -R nginx:nginx \/var\/www\/blog/)
})

test('writeProductionBuildMeta keeps the sha/builtAt contract', () => {
  const dir = tempDir('panel-guonei-meta-')
  try {
    const payload = writeProductionBuildMeta(dir, {
      sha: 'abc123def',
      builtAt: '2026-08-15T00:00:00.000Z',
    })
    assert.deepEqual(payload, { sha: 'abc123def', builtAt: '2026-08-15T00:00:00.000Z' })
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(dir, 'build.json'), 'utf8')),
      payload,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('prepareProductionDist builds with / and restores the preview dist', async () => {
  const snapshotDir = tempDir('panel-guonei-dist-')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  fs.mkdirSync(liveDist, { recursive: true })
  fs.writeFileSync(path.join(liveDist, 'index.html'), 'preview-base')
  try {
    const productionDir = await prepareProductionDist({
      snapshotDir,
      sha: 'commitsha',
      builtAt: '2026-08-22T00:00:00.000Z',
      async build({ previewBase }) {
        assert.equal(previewBase, '/')
        fs.writeFileSync(path.join(liveDist, 'index.html'), 'production-base')
        return { distDir: liveDist }
      },
    })
    assert.equal(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), 'preview-base')
    assert.equal(fs.readFileSync(path.join(productionDir, 'index.html'), 'utf8'), 'production-base')
    const meta = JSON.parse(fs.readFileSync(path.join(productionDir, 'build.json'), 'utf8'))
    assert.equal(meta.sha, 'commitsha')
    assert.equal(meta.builtAt, '2026-08-22T00:00:00.000Z')
  } finally {
    fs.rmSync(snapshotDir, { recursive: true, force: true })
  }
})

test('prepareProductionDist restores preview when production build fails', async () => {
  const snapshotDir = tempDir('panel-guonei-fail-')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  fs.mkdirSync(liveDist, { recursive: true })
  fs.writeFileSync(path.join(liveDist, 'index.html'), 'preview-base')
  try {
    await assert.rejects(
      () => prepareProductionDist({
        snapshotDir,
        sha: 'commitsha',
        async build() {
          fs.writeFileSync(path.join(liveDist, 'index.html'), 'half-written')
          throw new Error('构建失败')
        },
      }),
      /构建失败/,
    )
    assert.equal(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), 'preview-base')
  } finally {
    fs.rmSync(snapshotDir, { recursive: true, force: true })
  }
})

test('uploadDist packs locally then scp/ssh with the swap script', async () => {
  const root = tempDir('panel-guonei-upload-')
  const distDir = path.join(root, 'dist')
  const key = path.join(root, 'id_ed25519_servers')
  fs.mkdirSync(distDir, { recursive: true })
  fs.writeFileSync(path.join(distDir, 'index.html'), 'site')
  fs.writeFileSync(key, 'fake')
  const calls = []
  try {
    await uploadDist({
      distDir,
      config: {
        host: '100.88.115.43',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/blog',
        remoteTar: '/tmp/blog-dist.tar',
      },
      async run(command, args, options = {}) {
        calls.push({ command, args, cwd: options.cwd })
        if (command === 'tar') {
          fs.writeFileSync(path.join(options.cwd, 'blog-dist.tar'), 'archive')
        }
      },
    })
    assert.equal(calls[0].command, 'tar')
    assert.deepEqual(calls[0].args.slice(0, 2), ['-cf', 'blog-dist.tar'])
    assert.equal(calls[0].cwd, distDir)
    assert.equal(calls[1].command, 'scp')
    assert.ok(calls[1].args.includes(`${key}`))
    assert.ok(calls[1].args.at(-1).endsWith('root@100.88.115.43:/tmp/blog-dist.tar'))
    assert.equal(calls[2].command, 'ssh')
    assert.match(calls[2].args.at(-1), /mv \/var\/www\/blog\.new \/var\/www\/blog/)
    assert.equal(fs.existsSync(path.join(distDir, 'blog-dist.tar')), false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
