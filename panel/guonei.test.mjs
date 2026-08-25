import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertSafeDistRelPath,
  assertSafeGuoneiConfig,
  buildDistManifest,
  defaultIdentityFile,
  diffDistManifests,
  packDistArchive,
  parseRemoteManifest,
  prepareProductionDist,
  productionDeltaSwapCommands,
  productionSwapCommands,
  readGuoneiConfig,
  uploadDist,
  writeDistManifest,
  writeProductionBuildMeta,
} from './lib/guonei.mjs'
import { sha256Text } from './lib/hash.mjs'

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

function writeHtml(dir, relative, html) {
  const file = path.join(dir, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, html)
}

function writeRootCandidate(dir, marker = 'root-candidate') {
  writeHtml(dir, 'index.html', [
    '<head><link href="/assets/root.css"></head>',
    `<body><div id="app">${marker}</div>`,
    '    <script>window.__VP_HASH_MAP__={root:true}</script></body>',
  ].join('\n'))
}

function writePrefixedPreview(dir, marker = 'preview-base') {
  writeHtml(dir, 'index.html', [
    '<head><link href="/release-preview/j_test/assets/preview.css"></head>',
    `<body><div id="app">${marker}</div>`,
    '    <script>window.__VP_HASH_MAP__={preview:true}</script></body>',
  ].join('\n'))
}

test('prepareProductionDist reuses a valid root candidate and only injects production meta', async () => {
  const snapshotDir = tempDir('panel-guonei-reuse-')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  const candidateDir = path.join(snapshotDir, '.panel-production-candidate')
  writePrefixedPreview(liveDist)
  writeRootCandidate(candidateDir)
  let buildCalls = 0
  try {
    const productionDir = await prepareProductionDist({
      snapshotDir,
      sha: 'reuse-sha',
      builtAt: '2026-08-25T01:00:00.000Z',
      async build() {
        buildCalls += 1
        throw new Error('有效候选不应再跑第三次 docs:build')
      },
    })
    assert.equal(buildCalls, 0)
    assert.match(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), /preview-base/)
    assert.match(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), /\/release-preview\//)
    assert.match(fs.readFileSync(path.join(productionDir, 'index.html'), 'utf8'), /root-candidate/)
    assert.doesNotMatch(fs.readFileSync(path.join(productionDir, 'index.html'), 'utf8'), /\/release-preview\//)
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(productionDir, 'build.json'), 'utf8')),
      { sha: 'reuse-sha', builtAt: '2026-08-25T01:00:00.000Z' },
    )
    assert.equal(fs.existsSync(path.join(candidateDir, 'build.json')), false)
  } finally {
    fs.rmSync(snapshotDir, { recursive: true, force: true })
  }
})

test('prepareProductionDist falls back to a root build when the candidate is missing', async () => {
  const snapshotDir = tempDir('panel-guonei-missing-')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  writePrefixedPreview(liveDist)
  let buildCalls = 0
  try {
    const productionDir = await prepareProductionDist({
      snapshotDir,
      sha: 'fallback-sha',
      builtAt: '2026-08-25T02:00:00.000Z',
      async build({ previewBase }) {
        buildCalls += 1
        assert.equal(previewBase, '/')
        writeRootCandidate(liveDist, 'rebuilt-root')
        return { distDir: liveDist }
      },
    })
    assert.equal(buildCalls, 1)
    assert.match(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), /preview-base/)
    assert.match(fs.readFileSync(path.join(productionDir, 'index.html'), 'utf8'), /rebuilt-root/)
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(productionDir, 'build.json'), 'utf8')),
      { sha: 'fallback-sha', builtAt: '2026-08-25T02:00:00.000Z' },
    )
  } finally {
    fs.rmSync(snapshotDir, { recursive: true, force: true })
  }
})

test('prepareProductionDist falls back when the candidate is damaged or prefixed', async () => {
  const cases = [
    {
      name: 'empty-index',
      seed(candidateDir) {
        writeHtml(candidateDir, 'index.html', '')
      },
    },
    {
      name: 'missing-index',
      seed(candidateDir) {
        fs.mkdirSync(candidateDir, { recursive: true })
        fs.writeFileSync(path.join(candidateDir, 'marker.txt'), '/')
      },
    },
    {
      name: 'prefixed-preview',
      seed(candidateDir) {
        writePrefixedPreview(candidateDir, 'leaked-preview')
      },
    },
    {
      name: 'preview-meta',
      seed(candidateDir) {
        writeRootCandidate(candidateDir, 'preview-meta')
        fs.writeFileSync(path.join(candidateDir, 'build.json'), `${JSON.stringify({
          sha: null,
          jobId: 'j_test',
          builtAt: '2026-08-25T00:00:00.000Z',
        })}\n`)
      },
    },
  ]
  for (const item of cases) {
    const snapshotDir = tempDir(`panel-guonei-${item.name}-`)
    const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
    const candidateDir = path.join(snapshotDir, '.panel-production-candidate')
    writePrefixedPreview(liveDist)
    item.seed(candidateDir)
    let buildCalls = 0
    try {
      const productionDir = await prepareProductionDist({
        snapshotDir,
        sha: `fallback-${item.name}`,
        builtAt: '2026-08-25T03:00:00.000Z',
        async build({ previewBase }) {
          buildCalls += 1
          assert.equal(previewBase, '/')
          writeRootCandidate(liveDist, `rebuilt-${item.name}`)
          return { distDir: liveDist }
        },
      })
      assert.equal(buildCalls, 1, item.name)
      assert.match(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), /preview-base/)
      assert.match(fs.readFileSync(path.join(productionDir, 'index.html'), 'utf8'), new RegExp(`rebuilt-${item.name}`))
      assert.doesNotMatch(fs.readFileSync(path.join(productionDir, 'index.html'), 'utf8'), /leaked-preview/)
      assert.equal(
        JSON.parse(fs.readFileSync(path.join(productionDir, 'build.json'), 'utf8')).sha,
        `fallback-${item.name}`,
      )
    } finally {
      fs.rmSync(snapshotDir, { recursive: true, force: true })
    }
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
    const tar = calls.find((item) => item.command === 'tar')
    const scp = calls.find((item) => item.command === 'scp')
    const sshApply = calls.filter((item) => item.command === 'ssh').at(-1)
    assert.ok(tar)
    assert.deepEqual(tar.args.slice(0, 2), ['-cf', 'blog-dist.tar'])
    assert.equal(tar.cwd, distDir)
    assert.ok(scp)
    assert.ok(scp.args.includes(`${key}`))
    assert.ok(scp.args.at(-1).endsWith('root@100.88.115.43:/tmp/blog-dist.tar'))
    assert.match(sshApply.args.at(-1), /mv \/var\/www\/blog\.new \/var\/www\/blog/)
    assert.doesNotMatch(sshApply.args.at(-1), /cp -a/)
    assert.equal(fs.existsSync(path.join(distDir, 'blog-dist.tar')), false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

function writeSized(dir, relative, content) {
  const file = path.join(dir, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function payloadBytes(dir, extraSkip = []) {
  const skip = new Set(['blog-dist.tar', ...extraSkip])
  const walk = (current, prefix = '') => {
    let total = 0
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (skip.has(entry.name)) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) total += walk(full, rel)
      else if (entry.isFile()) total += fs.statSync(full).size
    }
    return total
  }
  return walk(dir)
}

function fakePackRun(calls, {
  remoteManifest,
  remoteBuild,
  failDeltaSsh = false,
} = {}) {
  let deltaFailed = false
  return async (command, args, options = {}) => {
    calls.push({ command, args, cwd: options.cwd })
    if (command === 'tar') {
      const archiveName = args[1]
      const packedFiles = fs.readdirSync(options.cwd).filter((name) => name !== archiveName)
      calls.at(-1).packedFiles = packedFiles
      const total = payloadBytes(options.cwd, [archiveName])
      fs.writeFileSync(path.join(options.cwd, archiveName), Buffer.alloc(Math.max(total, 1)))
      return { stdout: '', stderr: '' }
    }
    if (command === 'ssh' && String(args.at(-1) || '').includes('.panel-dist-manifest.json')) {
      if (remoteManifest == null) throw new Error('远端清单不存在')
      return { stdout: remoteManifest, stderr: '' }
    }
    if (command === 'ssh' && String(args.at(-1) || '').includes('build.json')) {
      if (remoteBuild == null) throw new Error('远端 build.json 不存在')
      return { stdout: remoteBuild, stderr: '' }
    }
    if (command === 'ssh' && failDeltaSsh && !deltaFailed && String(args.at(-1) || '').includes('cp -a')) {
      deltaFailed = true
      throw new Error('增量切换失败')
    }
    return { stdout: '', stderr: '' }
  }
}

test('assertSafeDistRelPath rejects traversal, absolute, newline and injection', () => {
  assert.equal(assertSafeDistRelPath('AI与生活/2026-08-17.html'), 'AI与生活/2026-08-17.html')
  assert.throws(() => assertSafeDistRelPath('/etc/passwd'), /不合法/)
  assert.throws(() => assertSafeDistRelPath('../etc/passwd'), /不合法/)
  assert.throws(() => assertSafeDistRelPath('foo/../../etc/passwd'), /不合法/)
  assert.throws(() => assertSafeDistRelPath('foo\nbar.html'), /不合法/)
  assert.throws(() => assertSafeDistRelPath("foo'; rm -rf /"), /不合法/)
  assert.throws(() => assertSafeDistRelPath('C:/Windows/system32'), /不合法/)
})

test('buildDistManifest hashes uploadable files and skips leak/archive metadata', () => {
  const distDir = tempDir('panel-guonei-manifest-')
  try {
    writeSized(distDir, 'index.html', 'index-root')
    writeSized(distDir, 'AI与生活/keep.html', 'keep')
    writeSized(distDir, 'blog-dist.tar', 'archive-should-skip')
    writeSized(distDir, 'release-preview/j_test/index.html', 'preview-leak')
    writeSized(distDir, '.panel-production-candidate/index.html', 'candidate-leak')
    writeSized(distDir, '.panel-wechat/index.html', 'wechat-temp')
    const manifest = buildDistManifest(distDir, { sha: 'gitsha1' })
    assert.equal(manifest.version, 1)
    assert.equal(manifest.algorithm, 'sha256')
    assert.equal(manifest.sha, 'gitsha1')
    assert.deepEqual(Object.keys(manifest.files).sort(), ['AI与生活/keep.html', 'index.html'])
    assert.equal(manifest.files['index.html'], sha256Text('index-root'))
    assert.equal(manifest.files['AI与生活/keep.html'], sha256Text('keep'))
    assert.equal(manifest.files['blog-dist.tar'], undefined)
    assert.equal(manifest.files['release-preview/j_test/index.html'], undefined)
  } finally {
    fs.rmSync(distDir, { recursive: true, force: true })
  }
})

test('diffDistManifests reports added, changed, deleted and ignores unchanged', () => {
  const previous = {
    version: 1,
    algorithm: 'sha256',
    sha: 'old',
    files: {
      'keep.html': sha256Text('same'),
      'change.html': sha256Text('before'),
      'gone.html': sha256Text('delete-me'),
    },
  }
  const next = {
    version: 1,
    algorithm: 'sha256',
    sha: 'new',
    files: {
      'keep.html': sha256Text('same'),
      'change.html': sha256Text('after'),
      'fresh.html': sha256Text('added'),
    },
  }
  const diff = diffDistManifests(previous, next)
  assert.deepEqual(diff.added, ['fresh.html'])
  assert.deepEqual(diff.changed, ['change.html'])
  assert.deepEqual(diff.deleted, ['gone.html'])
  assert.deepEqual(diff.kept, ['keep.html'])
  assert.ok(!diff.added.includes('keep.html'))
})

test('diffDistManifests reports a zero-change deploy', () => {
  const files = { 'index.html': sha256Text('same'), 'assets/app.css': sha256Text('css') }
  const diff = diffDistManifests(
    { version: 1, algorithm: 'sha256', sha: 'a', files },
    { version: 1, algorithm: 'sha256', sha: 'b', files: { ...files } },
  )
  assert.deepEqual(diff, { added: [], changed: [], deleted: [], kept: ['assets/app.css', 'index.html'] })
})

test('parseRemoteManifest rejects missing, damaged or untrusted baselines', () => {
  assert.equal(parseRemoteManifest('').ok, false)
  assert.equal(parseRemoteManifest('{not json').ok, false)
  assert.equal(parseRemoteManifest(JSON.stringify({ version: 1, files: {} })).ok, false)
  assert.equal(parseRemoteManifest(JSON.stringify({
    version: 1,
    algorithm: 'sha256',
    sha: 'abc',
    files: { '../etc/passwd': 'a'.repeat(64) },
  })).ok, false)
  const trusted = parseRemoteManifest(JSON.stringify({
    version: 1,
    algorithm: 'sha256',
    sha: 'abc123',
    files: { 'index.html': sha256Text('ok') },
  }))
  assert.equal(trusted.ok, true)
  assert.equal(trusted.manifest.sha, 'abc123')
})

test('production delta swap copies current site then overlays and deletes before atomic replace', () => {
  const script = productionDeltaSwapCommands({
    siteDir: '/var/www/blog',
    remoteTar: '/tmp/blog-dist.tar',
    deletions: ['old/page.html', 'AI与生活/gone.html'],
  })
  assert.match(script, /rm -rf \/var\/www\/blog\.new \/var\/www\/blog\.old/)
  assert.match(script, /cp -a \/var\/www\/blog \/var\/www\/blog\.new/)
  assert.match(script, /tar -xf \/tmp\/blog-dist\.tar -C \/var\/www\/blog\.new/)
  assert.match(script, /rm -f -- '\/var\/www\/blog\.new\/old\/page\.html'/)
  assert.match(script, /rm -f -- '\/var\/www\/blog\.new\/AI与生活\/gone\.html'/)
  assert.match(script, /mv \/var\/www\/blog\.new \/var\/www\/blog/)
  assert.match(script, /chown -R nginx:nginx \/var\/www\/blog/)
  assert.throws(
    () => productionDeltaSwapCommands({
      siteDir: '/var/www/blog',
      remoteTar: '/tmp/blog-dist.tar',
      deletions: ['../etc/passwd'],
    }),
    /不合法/,
  )
})

test('uploadDist uses a trusted remote manifest for changed/new/deleted incremental deploy', async () => {
  const root = tempDir('panel-guonei-delta-')
  const distDir = path.join(root, 'dist')
  const key = path.join(root, 'id_ed25519_servers')
  writeSized(distDir, 'keep.html', 'same')
  writeSized(distDir, 'change.html', 'after')
  writeSized(distDir, 'fresh.html', 'added')
  writeProductionBuildMeta(distDir, { sha: 'newsha', builtAt: '2026-08-25T04:00:00.000Z' })
  fs.writeFileSync(key, 'fake')
  const previous = {
    version: 1,
    algorithm: 'sha256',
    sha: 'oldsha',
    files: {
      'keep.html': sha256Text('same'),
      'change.html': sha256Text('before'),
      'gone.html': sha256Text('delete-me'),
      'build.json': sha256Text('old-meta'),
    },
  }
  const calls = []
  try {
    const result = await uploadDist({
      distDir,
      sha: 'newsha',
      expectedBaselineSha: 'oldsha',
      config: {
        host: '100.88.115.43',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/blog',
        remoteTar: '/tmp/blog-dist.tar',
      },
      run: fakePackRun(calls, {
        remoteManifest: `${JSON.stringify(previous)}\n`,
        remoteBuild: `${JSON.stringify({ sha: 'oldsha', builtAt: '2026-08-24T00:00:00.000Z' })}\n`,
      }),
    })
    assert.equal(result.mode, 'delta')
    assert.deepEqual(result.added.sort(), ['fresh.html'])
    assert.ok(result.changed.includes('change.html'))
    assert.deepEqual(result.deleted, ['gone.html'])
    assert.ok(!result.added.includes('keep.html'))
    assert.ok(!result.changed.includes('keep.html'))
    assert.ok(result.deltaBytes > 0)
    assert.ok(result.fullBytes > result.deltaBytes)
    assert.ok(result.ratio < 1)
    const packed = calls.find((item) => item.command === 'tar')
    assert.ok(!packed.packedFiles.includes('keep.html'))
    assert.ok(packed.packedFiles.includes('change.html'))
    assert.ok(packed.packedFiles.includes('fresh.html'))
    assert.ok(!packed.packedFiles.includes('gone.html'))
    const sshApply = calls.filter((item) => item.command === 'ssh').at(-1)
    assert.match(sshApply.args.at(-1), /cp -a \/var\/www\/blog \/var\/www\/blog\.new/)
    assert.match(sshApply.args.at(-1), /gone\.html/)
    assert.equal(calls.some((item) => item.command === 'scp'), true)
    assert.equal(fs.existsSync(path.join(distDir, 'blog-dist.tar')), false)
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(distDir, '.panel-dist-manifest.json'), 'utf8')).sha,
      'newsha',
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('uploadDist records synthetic full/delta bytes and a zero-change ratio', async () => {
  const root = tempDir('panel-guonei-bytes-')
  const distDir = path.join(root, 'dist')
  const key = path.join(root, 'id_ed25519_servers')
  writeSized(distDir, 'keep.bin', Buffer.alloc(1000, 1))
  writeSized(distDir, 'change.bin', Buffer.alloc(2500, 2))
  writeSized(distDir, 'fresh.bin', Buffer.alloc(500, 3))
  writeProductionBuildMeta(distDir, { sha: 'bytes-new', builtAt: '2026-08-25T05:00:00.000Z' })
  fs.writeFileSync(key, 'fake')
  const previous = buildDistManifest(distDir, { sha: 'bytes-old' })
  previous.files['change.bin'] = sha256Text('old-change')
  previous.files['gone.bin'] = sha256Text('old-gone')
  delete previous.files['fresh.bin']
  const calls = []
  try {
    const result = await uploadDist({
      distDir,
      sha: 'bytes-new',
      expectedBaselineSha: 'bytes-old',
      config: {
        host: '100.88.115.43',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/blog',
        remoteTar: '/tmp/blog-dist.tar',
      },
      run: fakePackRun(calls, {
        remoteManifest: `${JSON.stringify(previous)}\n`,
        remoteBuild: `${JSON.stringify({ sha: 'bytes-old' })}\n`,
      }),
    })
    assert.equal(result.mode, 'delta')
    assert.ok(result.fullBytes > 3000)
    assert.ok(result.deltaBytes < result.fullBytes)
    assert.ok(result.ratio > 0 && result.ratio < 1)
    writeDistManifest(distDir, buildDistManifest(distDir, { sha: 'bytes-new' }))
    const same = await uploadDist({
      distDir,
      sha: 'bytes-new',
      expectedBaselineSha: 'bytes-new',
      config: {
        host: '100.88.115.43',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/blog',
        remoteTar: '/tmp/blog-dist.tar',
      },
      run: fakePackRun([], {
        remoteManifest: fs.readFileSync(path.join(distDir, '.panel-dist-manifest.json'), 'utf8'),
        remoteBuild: `${JSON.stringify({ sha: 'bytes-new' })}\n`,
      }),
    })
    assert.equal(same.mode, 'delta')
    assert.deepEqual(same.added, [])
    assert.deepEqual(same.deleted, [])
    assert.ok(same.deltaBytes <= same.fullBytes)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('uploadDist falls back to full tar when remote manifest is missing or damaged', async () => {
  const cases = [
    { name: 'missing', remoteManifest: null, remoteBuild: null },
    { name: 'damaged', remoteManifest: '{bad', remoteBuild: `${JSON.stringify({ sha: 'x' })}\n` },
    {
      name: 'mismatch',
      remoteManifest: `${JSON.stringify({
        version: 1,
        algorithm: 'sha256',
        sha: 'other',
        files: { 'index.html': sha256Text('site') },
      })}\n`,
      remoteBuild: `${JSON.stringify({ sha: 'expected' })}\n`,
      expectedBaselineSha: 'expected',
    },
  ]
  for (const item of cases) {
    const root = tempDir(`panel-guonei-${item.name}-`)
    const distDir = path.join(root, 'dist')
    const key = path.join(root, 'id_ed25519_servers')
    writeSized(distDir, 'index.html', 'site')
    writeProductionBuildMeta(distDir, { sha: 'fullsha', builtAt: '2026-08-25T06:00:00.000Z' })
    fs.writeFileSync(key, 'fake')
    const calls = []
    try {
      const result = await uploadDist({
        distDir,
        sha: 'fullsha',
        expectedBaselineSha: item.expectedBaselineSha,
        config: {
          host: '100.88.115.43',
          user: 'root',
          identityFile: key,
          siteDir: '/var/www/blog',
          remoteTar: '/tmp/blog-dist.tar',
        },
        run: fakePackRun(calls, item),
      })
      assert.equal(result.mode, 'full', item.name)
      const sshApply = calls.filter((entry) => entry.command === 'ssh').at(-1)
      assert.match(sshApply.args.at(-1), /mkdir -p \/var\/www\/blog\.new/, item.name)
      assert.doesNotMatch(sshApply.args.at(-1), /cp -a/, item.name)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }
})

test('uploadDist falls back to full atomic replace when incremental apply fails', async () => {
  const root = tempDir('panel-guonei-delta-fail-')
  const distDir = path.join(root, 'dist')
  const key = path.join(root, 'id_ed25519_servers')
  writeSized(distDir, 'index.html', 'next')
  writeProductionBuildMeta(distDir, { sha: 'nextsha', builtAt: '2026-08-25T07:00:00.000Z' })
  fs.writeFileSync(key, 'fake')
  const previous = {
    version: 1,
    algorithm: 'sha256',
    sha: 'prevsha',
    files: { 'index.html': sha256Text('prev'), 'build.json': sha256Text('old') },
  }
  const calls = []
  try {
    const result = await uploadDist({
      distDir,
      sha: 'nextsha',
      expectedBaselineSha: 'prevsha',
      config: {
        host: '100.88.115.43',
        user: 'root',
        identityFile: key,
        siteDir: '/var/www/blog',
        remoteTar: '/tmp/blog-dist.tar',
      },
      run: fakePackRun(calls, {
        remoteManifest: `${JSON.stringify(previous)}\n`,
        remoteBuild: `${JSON.stringify({ sha: 'prevsha' })}\n`,
        failDeltaSsh: true,
      }),
    })
    assert.equal(result.mode, 'full')
    assert.ok(calls.filter((item) => item.command === 'tar').length >= 2)
    const sshApply = calls.filter((item) => item.command === 'ssh').at(-1)
    assert.match(sshApply.args.at(-1), /mkdir -p \/var\/www\/blog\.new/)
    assert.match(sshApply.args.at(-1), /mv \/var\/www\/blog\.new \/var\/www\/blog/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
