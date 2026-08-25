import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createDefaultProbes,
  mergeRootSsrIntoPreviewDist,
  validateBuiltPreview,
} from './lib/probes.mjs'
import { createPanelContext } from './lib/context.mjs'
import { DEFAULT_PRODUCTION_ORIGIN } from './lib/guonei.mjs'

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

test('non-root preview keeps preview assets but replaces broken SSR app with root-build markup', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-preview-merge-'))
  const rootDistDir = path.join(root, 'root-dist')
  const previewDistDir = path.join(root, 'preview-dist')
  const relative = path.join('AI与生活', '2026-08-17.html')
  const rootFile = path.join(rootDistDir, relative)
  const previewFile = path.join(previewDistDir, relative)
  fs.mkdirSync(path.dirname(rootFile), { recursive: true })
  fs.mkdirSync(path.dirname(previewFile), { recursive: true })
  fs.writeFileSync(rootFile, [
    '<head><link href="/assets/root.css"></head>',
    '<body><div id="app"><a href="/AI与生活/"><img src="/images/cover.webp"><h2 id="kan-yanhua">正文</h2></a></div>',
    '    <script>window.__VP_HASH_MAP__={root:true}</script></body>',
  ].join('\n'))
  fs.writeFileSync(previewFile, [
    '<head><link href="/release-preview/j_test/assets/preview.css"></head>',
    '<body><div id="app"><div class="NotFound">404</div></div>',
    '    <script>window.__VP_HASH_MAP__={preview:true}</script></body>',
  ].join('\n'))
  try {
    mergeRootSsrIntoPreviewDist({
      rootDistDir,
      previewDistDir,
      previewBase: '/release-preview/j_test/',
    })
    const html = fs.readFileSync(previewFile, 'utf8')
    assert.match(html, /preview\.css/)
    assert.match(html, /__VP_HASH_MAP__=\{preview:true\}/)
    assert.match(html, /href="\/release-preview\/j_test\/AI与生活\/"/)
    assert.match(html, /src="\/release-preview\/j_test\/images\/cover\.webp"/)
    assert.match(html, /id="kan-yanhua"/)
    assert.doesNotMatch(html, /NotFound/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('SSR merge skips standalone public HTML that is copied into both dists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-preview-standalone-'))
  const rootDistDir = path.join(root, 'root-dist')
  const previewDistDir = path.join(root, 'preview-dist')
  const pageRel = path.join('AI与生活', '2026-08-17.html')
  const standaloneRel = path.join('journey-guides', 'pi-shortcuts', 'index.html')
  const siblingRel = path.join('journey-guides', 'pi-shortcuts.html')
  const standalone = [
    '<!DOCTYPE html><html><head><title>Pi</title></head>',
    '<body><main>独立图解</main></body></html>',
  ].join('\n')
  for (const distDir of [rootDistDir, previewDistDir]) {
    const pageFile = path.join(distDir, pageRel)
    fs.mkdirSync(path.dirname(pageFile), { recursive: true })
    fs.mkdirSync(path.dirname(path.join(distDir, standaloneRel)), { recursive: true })
    fs.writeFileSync(pageFile, [
      '<head><link href="/assets/root.css"></head>',
      '<body><div id="app"><h2 id="kan-yanhua">正文</h2></div>',
      '    <script>window.__VP_HASH_MAP__={ok:true}</script></body>',
    ].join('\n'))
    fs.writeFileSync(path.join(distDir, standaloneRel), standalone)
    fs.writeFileSync(path.join(distDir, siblingRel), standalone)
  }
  fs.writeFileSync(path.join(previewDistDir, pageRel), [
    '<head><link href="/release-preview/j_test/assets/preview.css"></head>',
    '<body><div id="app"><div class="NotFound">404</div></div>',
    '    <script>window.__VP_HASH_MAP__={preview:true}</script></body>',
  ].join('\n'))
  try {
    mergeRootSsrIntoPreviewDist({
      rootDistDir,
      previewDistDir,
      previewBase: '/release-preview/j_test/',
    })
    assert.match(fs.readFileSync(path.join(previewDistDir, pageRel), 'utf8'), /id="kan-yanhua"/)
    assert.equal(fs.readFileSync(path.join(previewDistDir, standaloneRel), 'utf8'), standalone)
    assert.equal(fs.readFileSync(path.join(previewDistDir, siblingRel), 'utf8'), standalone)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('SSR merge reports a repo-relative path when a VitePress page is half-formed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-preview-shell-'))
  const rootDistDir = path.join(root, 'root-dist')
  const previewDistDir = path.join(root, 'preview-dist')
  const relative = path.join('AI与生活', '2026-08-17.html')
  const rootFile = path.join(rootDistDir, relative)
  const previewFile = path.join(previewDistDir, relative)
  fs.mkdirSync(path.dirname(rootFile), { recursive: true })
  fs.mkdirSync(path.dirname(previewFile), { recursive: true })
  fs.writeFileSync(rootFile, '<body><div id="app">正文</div></body>')
  fs.writeFileSync(previewFile, [
    '<body><div id="app">预览</div>',
    '    <script>window.__VP_HASH_MAP__={preview:true}</script></body>',
  ].join('\n'))
  try {
    assert.throws(
      () => mergeRootSsrIntoPreviewDist({
        rootDistDir,
        previewDistDir,
        previewBase: '/release-preview/j_test/',
      }),
      /无法识别 VitePress HTML 壳：AI与生活\/2026-08-17\.html/,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('built preview validation rejects SSR 404 output and missing anchors', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-preview-output-'))
  const pageDir = path.join(root, 'AI与生活')
  const pageFile = path.join(pageDir, '2026-08-17.html')
  fs.mkdirSync(pageDir, { recursive: true })
  try {
    fs.writeFileSync(pageFile, '<div class="NotFound">404</div>')
    assert.throws(
      () => validateBuiltPreview({
        distDir: root,
        previewPath: '/AI与生活/2026-08-17',
        headingAnchor: 'kan-yanhua',
      }),
      /错误渲染为 404/,
    )

    fs.writeFileSync(pageFile, '<main><h2 id="other">正文</h2></main>')
    assert.throws(
      () => validateBuiltPreview({
        distDir: root,
        previewPath: '/AI与生活/2026-08-17',
        headingAnchor: 'kan-yanhua',
      }),
      /缺少目标锚点/,
    )

    fs.writeFileSync(pageFile, '<main><h2 id="kan-yanhua">正文</h2></main>')
    assert.doesNotThrow(() => validateBuiltPreview({
      distDir: root,
      previewPath: '/AI与生活/2026-08-17',
      headingAnchor: '#kan-yanhua',
    }))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

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
fs.writeFileSync('snapshot-build-args', JSON.stringify(process.argv.slice(2)))
`)
  const expectedPackage = fs.readFileSync(path.join(snapshotDir, 'package.json'), 'utf8')
  const probes = createDefaultProbes({ repoRoot, productionOrigin: '' })

  try {
    fs.mkdirSync(path.join(snapshotDir, 'docs', '.vitepress'), { recursive: true })
    fs.writeFileSync(
      path.join(snapshotDir, 'docs', '.vitepress', 'config.mts'),
      "import { defineConfig } from 'vitepress'\nexport default defineConfig({\n  title: 'fixture',\n})\n",
    )
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
    assert.equal(
      fs.readFileSync(path.join(snapshotDir, 'snapshot-build-args'), 'utf8'),
      '[]',
      'preview base must come from VITEPRESS_BASE, not unsupported VitePress CLI arguments',
    )
    assert.match(
      fs.readFileSync(path.join(snapshotDir, 'docs', '.vitepress', 'config.mts'), 'utf8'),
      /base: process\.env\.VITEPRESS_BASE \|\| '\/'/,
    )
    assert.equal(fs.existsSync(path.join(snapshotDir, 'repo-test-ran')), false)
    assert.equal(fs.existsSync(path.join(snapshotDir, 'repo-build-ran')), false)
    assert.equal(built.distDir, path.join(snapshotDir, 'docs', '.vitepress', 'dist'))
    assert.equal(
      fs.existsSync(path.join(snapshotDir, 'docs', '.vitepress', '.preview-root-dist')),
      false,
      'merge scratch must not replace the snapshot production candidate',
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('non-root preview persists an unmerged root-base production candidate', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-candidate-'))
  const snapshotDir = path.join(root, 'snapshot')
  fs.mkdirSync(snapshotDir, { recursive: true })
  writePackage(snapshotDir, {
    'docs:build': 'node snapshot-build.cjs',
  }, 'candidate-package')
  fs.writeFileSync(path.join(snapshotDir, 'snapshot-build.cjs'), `
const fs = require('node:fs')
const path = require('node:path')
const dist = path.join('docs', '.vitepress', 'dist')
fs.mkdirSync(dist, { recursive: true })
const base = process.env.VITEPRESS_BASE || 'missing'
fs.writeFileSync(path.join(dist, 'index.html'), [
  '<head><link href="' + base + 'assets/app.css"></head>',
  '<body><div id="app">' + base + '</div>',
  '    <script>window.__VP_HASH_MAP__={base:"' + base + '"}</script></body>',
].join('\\n'))
fs.writeFileSync(path.join(dist, 'marker.txt'), base)
`)
  const probes = createDefaultProbes({ repoRoot: path.join(root, 'repo'), productionOrigin: '' })
  try {
    const built = await probes.build({
      snapshotDir,
      previewBase: '/release-preview/j_test/',
    })
    const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
    const candidateDir = path.join(snapshotDir, '.panel-production-candidate')
    assert.equal(built.distDir, liveDist)
    assert.equal(fs.readFileSync(path.join(liveDist, 'marker.txt'), 'utf8'), '/release-preview/j_test/')
    assert.match(
      fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'),
      /href="\/release-preview\/j_test\/assets\/app\.css"/,
    )
    assert.equal(fs.readFileSync(path.join(candidateDir, 'marker.txt'), 'utf8'), '/')
    assert.match(
      fs.readFileSync(path.join(candidateDir, 'index.html'), 'utf8'),
      /href="\/assets\/app\.css"/,
    )
    assert.doesNotMatch(
      fs.readFileSync(path.join(candidateDir, 'index.html'), 'utf8'),
      /\/release-preview\//,
    )
    assert.equal(
      fs.existsSync(path.join(snapshotDir, 'docs', '.vitepress', '.preview-root-dist')),
      false,
    )
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

test('panel context defaults production origin to cuowo.cn', () => {
  const previous = process.env.PANEL_PRODUCTION_ORIGIN
  delete process.env.PANEL_PRODUCTION_ORIGIN
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-ctx-'))
  try {
    const ctx = createPanelContext({
      repoRoot: dataDir,
      dataDir,
    })
    assert.equal(ctx.productionOrigin, DEFAULT_PRODUCTION_ORIGIN)
  } finally {
    if (previous == null) delete process.env.PANEL_PRODUCTION_ORIGIN
    else process.env.PANEL_PRODUCTION_ORIGIN = previous
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

test('default deploy probe builds production dist then scp/ssh', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-deploy-'))
  const snapshotDir = path.join(root, 'snapshot')
  const key = path.join(root, 'id_ed25519_servers')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  fs.mkdirSync(liveDist, { recursive: true })
  fs.writeFileSync(path.join(liveDist, 'index.html'), 'preview')
  fs.writeFileSync(key, 'fake')
  const calls = []
  const probes = createDefaultProbes({
    repoRoot: path.join(root, 'repo'),
    productionOrigin: 'https://cuowo.cn',
    guonei: {
      host: '100.88.115.43',
      user: 'root',
      identityFile: key,
      siteDir: '/var/www/blog',
      remoteTar: '/tmp/blog-dist.tar',
      enabled: true,
    },
    run: async (command, args, options = {}) => {
      calls.push({ command, args, cwd: options.cwd })
      if (command === 'tar') fs.writeFileSync(path.join(options.cwd, 'blog-dist.tar'), 'archive')
    },
  })
  probes.build = async ({ previewBase }) => {
    assert.equal(previewBase, '/')
    fs.writeFileSync(path.join(liveDist, 'index.html'), 'production')
    return { distDir: liveDist }
  }
  try {
    const result = await probes.deploy({ snapshotDir, sha: 'deadbeef' })
    assert.equal(result.ok, true)
    assert.equal(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8'), 'preview')
    assert.equal(calls[0].command, 'tar')
    assert.equal(calls[1].command, 'scp')
    assert.equal(calls[2].command, 'ssh')
    const meta = JSON.parse(fs.readFileSync(
      path.join(snapshotDir, '.panel-production-dist', 'build.json'),
      'utf8',
    ))
    assert.equal(meta.sha, 'deadbeef')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('default deploy probe reuses a valid production candidate and never uploads preview dist', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-probes-reuse-'))
  const snapshotDir = path.join(root, 'snapshot')
  const key = path.join(root, 'id_ed25519_servers')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  const candidateDir = path.join(snapshotDir, '.panel-production-candidate')
  fs.mkdirSync(liveDist, { recursive: true })
  fs.mkdirSync(candidateDir, { recursive: true })
  fs.writeFileSync(path.join(liveDist, 'index.html'), [
    '<head><link href="/release-preview/j_test/assets/preview.css"></head>',
    '<body><div id="app">preview</div></body>',
  ].join('\n'))
  fs.writeFileSync(path.join(candidateDir, 'index.html'), [
    '<head><link href="/assets/root.css"></head>',
    '<body><div id="app">root-candidate</div></body>',
  ].join('\n'))
  fs.writeFileSync(key, 'fake')
  const calls = []
  let buildCalls = 0
  const probes = createDefaultProbes({
    repoRoot: path.join(root, 'repo'),
    productionOrigin: 'https://cuowo.cn',
    guonei: {
      host: '100.88.115.43',
      user: 'root',
      identityFile: key,
      siteDir: '/var/www/blog',
      remoteTar: '/tmp/blog-dist.tar',
      enabled: true,
    },
    run: async (command, args, options = {}) => {
      calls.push({ command, args, cwd: options.cwd })
      if (command === 'tar') fs.writeFileSync(path.join(options.cwd, 'blog-dist.tar'), 'archive')
    },
  })
  probes.build = async () => {
    buildCalls += 1
    throw new Error('有效候选不应再跑第三次 docs:build')
  }
  try {
    const result = await probes.deploy({ snapshotDir, sha: 'cafebabe' })
    assert.equal(result.ok, true)
    assert.equal(buildCalls, 0)
    assert.equal(fs.readFileSync(path.join(liveDist, 'index.html'), 'utf8').includes('preview'), true)
    assert.equal(calls[0].command, 'tar')
    assert.equal(calls[0].cwd, path.join(snapshotDir, '.panel-production-dist'))
    assert.match(
      fs.readFileSync(path.join(calls[0].cwd, 'index.html'), 'utf8'),
      /root-candidate/,
    )
    assert.doesNotMatch(
      fs.readFileSync(path.join(calls[0].cwd, 'index.html'), 'utf8'),
      /\/release-preview\//,
    )
    const meta = JSON.parse(fs.readFileSync(
      path.join(snapshotDir, '.panel-production-dist', 'build.json'),
      'utf8',
    ))
    assert.equal(meta.sha, 'cafebabe')
    assert.ok(meta.builtAt)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
