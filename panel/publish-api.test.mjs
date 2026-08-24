import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRepoPaths } from './lib/paths.mjs'
import { validateWeeklySnapshot } from './lib/content-validation.mjs'
import { assertPublishable, dirtyJourneyMetaPaths } from './lib/scope.mjs'
import { executePublication } from './lib/publish-job.mjs'
import { createServer } from './server.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const LIFE_MD = `---
title: 第001期-看烟花
date: 2026-08-12
category: AI与生活
type: weekly
issue: 1
description: 测试
pageClass: weekly-post weekly-post--life
---

# 第001期-看烟花

<p class="weekly-theme-cover">
  <img src="/images/hero-fireworks.png" alt="cover" />
</p>

<p class="weekly-theme-caption">caption</p>

<div class="weekly-fireworks-section">

## 看烟花！！！ {#kan-yanhua}

<div class="weekly-outline-only" aria-hidden="true">

### 第一条

</div>

<WeeklyEntry
  tags="测试"
  title="第一条"
>
正文里有图 ![图](/images/weekly/2026-08-12-01-test.webp) 以及 /images/weekly/2026-08-12-01-test.webp
</WeeklyEntry>

</div>
`

const INVEST_MD = LIFE_MD
  .replace('AI与生活', '投资')
  .replace('weekly-post--life', 'weekly-post--invest')
  .replaceAll('2026-08-12', '2026-08-13')

const POSTS_TS = `const manualPosts: PostItem[] = [
  {
    title: "第001期-看烟花",
    date: "2026-08-12",
    category: "AI与生活",
    type: 'weekly',
    issue: 1,
    link: "/AI与生活/2026-08-12",
    description: "测试",
  },
]
`

const CONFIG_MTS = `export default {
  themeConfig: {
    sidebar: {
      '/AI与生活/': [
        {
          text: '周记 · 2026年',
          collapsed: false,
          items: [
            { text: '第001期-看烟花', link: '/AI与生活/2026-08-12' },
          ],
        },
      ],
      '/投资/周记/': [
        {
          text: '2026年',
          collapsed: false,
          items: [
            { text: '第001期-看烟花', link: '/投资/周记/2026-08-13-看烟花' },
          ],
        },
      ],
      '/AI与生活/我的AI历程/': [
        {
          text: 'AI与生活',
          items: [
            { text: '最新周记', link: '/AI与生活/' },
          ],
        },
        {
          text: '我的AI历程',
          collapsed: false,
          items: [
            { text: '系列入口', link: '/AI与生活/我的AI历程/' },
            { text: '基础设施篇', link: '/AI与生活/我的AI历程/基础设施篇' },
          ],
        },
      ],
    },
  },
}
`

const JOURNEY_MD = `---
title: 基础设施篇
date: 2026-08-12
category: AI与生活
type: journey
description: 测试篇章
pageClass: weekly-post weekly-post--life
---

# 基础设施篇

<div class="weekly-fireworks-section">

<div class="weekly-outline-only" aria-hidden="true">

### 已有一条

</div>

<WeeklyEntry
  tags="测试"
  title="已有一条"
>
篇章正文
</WeeklyEntry>

</div>
`

const JOURNEY_INDEX_MD = `---
title: 我的AI历程
---

# 我的AI历程
`

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
}

function initRepo(dir) {
  const life = path.join(dir, 'docs', 'AI与生活', '2026-08-12.md')
  const invest = path.join(dir, 'docs', '投资', '周记', '2026-08-13-看烟花.md')
  const image = path.join(dir, 'docs', 'public', 'images', 'weekly', '2026-08-12-01-test.webp')
  fs.mkdirSync(path.dirname(life), { recursive: true })
  fs.mkdirSync(path.dirname(invest), { recursive: true })
  fs.mkdirSync(path.dirname(image), { recursive: true })
  fs.mkdirSync(path.join(dir, 'docs', '.vitepress'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'docs', '投资', '投研'), { recursive: true })
  const journeyDir = path.join(dir, 'docs', 'AI与生活', '我的AI历程')
  fs.mkdirSync(journeyDir, { recursive: true })
  fs.writeFileSync(life, LIFE_MD)
  fs.writeFileSync(invest, INVEST_MD)
  fs.writeFileSync(image, 'webp')
  fs.writeFileSync(path.join(dir, 'docs', 'public', 'images', 'weekly', '2026-08-13-01-test.webp'), 'webp')
  fs.writeFileSync(path.join(journeyDir, '基础设施篇.md'), JOURNEY_MD)
  fs.writeFileSync(path.join(journeyDir, '工具篇.md'), JOURNEY_MD.replaceAll('基础设施篇', '工具篇'))
  fs.writeFileSync(path.join(journeyDir, 'AI开支记录与优化.md'), JOURNEY_MD.replaceAll('基础设施篇', 'AI开支记录与优化'))
  fs.writeFileSync(path.join(journeyDir, 'index.md'), JOURNEY_INDEX_MD)
  fs.writeFileSync(path.join(journeyDir, 'README.md'), '# readme\n')
  fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), POSTS_TS)
  fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), CONFIG_MTS)
  fs.writeFileSync(path.join(dir, 'README.md'), 'fixture\n')
  git(dir, ['init', '-b', 'main'])
  git(dir, ['config', 'user.email', 'panel@test.local'])
  git(dir, ['config', 'user.name', 'Panel Test'])
  git(dir, ['add', '.'])
  git(dir, ['commit', '-m', 'init'])
  const remote = path.join(dir, 'remote.git')
  execFileSync('git', ['init', '--bare', remote])
  git(dir, ['remote', 'add', 'origin', remote])
  git(dir, ['push', '-u', 'origin', 'main'])
}

function makeProbes(overrides = {}) {
  let n = 0
  let pushN = 0
  let deployN = 0
  return {
    async test(args) {
      if (typeof overrides.test === 'function') return overrides.test(args)
      if (overrides.failTest) throw new Error('测试失败：fake')
      return { ok: true }
    },
    async build({ snapshotDir, previewBase, previewPath, headingAnchor }) {
      if (overrides.failBuild) throw new Error('构建失败：vitepress exploded')
      if (overrides.assertSnapshot) overrides.assertSnapshot(snapshotDir)
      if (overrides.assertPreviewBase) overrides.assertPreviewBase(previewBase)
      if (overrides.assertPreviewTarget) overrides.assertPreviewTarget({ previewPath, headingAnchor })
      const distDir = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
      const relativeUrl = decodeURIComponent(String(previewPath || '').replace(/^\/+/, ''))
      const relativeHtml = !relativeUrl || relativeUrl.endsWith('/')
        ? `${relativeUrl}index.html`
        : `${relativeUrl}.html`
      const htmlFile = path.join(distDir, relativeHtml)
      fs.mkdirSync(path.dirname(htmlFile), { recursive: true })
      fs.writeFileSync(
        htmlFile,
        `<html><main><h2 id="${headingAnchor || 'preview'}">ok</h2></main></html>`,
      )
      return { distDir }
    },
    async push({ git: gitApi }) {
      pushN += 1
      if (overrides.failPush) throw new Error('推送失败：fake')
      if (typeof overrides.failPushUntil === 'number' && pushN <= overrides.failPushUntil) {
        throw new Error('推送失败：fake')
      }
      if (overrides.delayPushMs) await new Promise((resolve) => setTimeout(resolve, overrides.delayPushMs))
      await gitApi.push()
    },
    async deploy(args) {
      deployN += 1
      if (overrides.failDeploy) throw new Error('国内上传失败：fake')
      if (typeof overrides.failDeployUntil === 'number' && deployN <= overrides.failDeployUntil) {
        throw new Error('国内上传失败：fake')
      }
      if (typeof overrides.deploy === 'function') return overrides.deploy({ ...args, n: deployN })
      return { ok: true }
    },
    async deployStatus({ sha }) {
      if (overrides.deployStatus) return overrides.deployStatus({ sha, n: n + 1 })
      return { state: 'success', sha }
    },
    async productionVersion({ sha }) {
      n += 1
      if (overrides.productionVersion) return overrides.productionVersion({ sha, n })
      return { sha, builtAt: '2026-08-15T00:00:00.000Z' }
    },
    async onlineAssets({ urls }) {
      if (overrides.onlineAssets) return overrides.onlineAssets({ urls })
      return { ok: true, missing: [] }
    },
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        port,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
    server.on('error', reject)
  })
}

async function withPanel(options, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-pub-'))
  initRepo(dir)
  const server = createServer({
    repoRoot: dir,
    paths: createRepoPaths(dir),
    dataDir: path.join(dir, '.panel-data'),
    probes: makeProbes(options.probes),
    productionOrigin: 'https://blog.example.test',
    verifyTimeoutMs: options.verifyTimeoutMs ?? 2000,
    pollIntervalMs: options.pollIntervalMs ?? 15,
    maxJsonBytes: options.maxJsonBytes,
    bodyTimeoutMs: options.bodyTimeoutMs ?? 4000,
  })
  const listener = await listen(server)
  try {
    await fn({
      dir,
      url: listener.url,
      port: listener.port,
      ctx: server.panelContext,
    })
  } finally {
    await listener.close()
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function post(url, pathname, body) {
  const response = await fetch(`${url}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, payload: await response.json() }
}

async function get(url, pathname) {
  const response = await fetch(`${url}${pathname}`)
  return { status: response.status, payload: await response.json() }
}

function rawGet(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname }, (res) => {
      const chunks = []
      res.on('data', (chunk) => { chunks.push(chunk) })
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || '',
      }))
    })
    req.on('error', reject)
    req.end()
  })
}

const appendBody = {
  kindId: 'life',
  mode: 'append',
  issueLink: '/AI与生活/2026-08-12',
  entry: { title: '新的一条', body: '追加正文 ![图](/images/weekly/2026-08-12-01-test.webp)', tags: '测试' },
}

test('prepare does not commit or push', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const headBefore = git(dir, ['rev-parse', 'HEAD'])
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 200)
    assert.equal(prepared.payload.state, 'PreviewReady')
    assert.equal(git(dir, ['rev-parse', 'HEAD']), headBefore)
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '1')
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '1')
  })
})

test('job query does not upload or match domestic SHA after execute', async () => {
  let deploys = 0
  let versions = 0
  await withPanel({
    probes: {
      deploy() {
        deploys += 1
        return { ok: true }
      },
      productionVersion({ sha }) {
        versions += 1
        return { sha, builtAt: '2026-08-15T00:00:00.000Z' }
      },
    },
  }, async ({ url, ctx, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const job = ctx.jobs.get(prepared.payload.jobId)
    await executePublication(ctx, job)
    assert.equal(job.state, 'Pushed')
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '2')
    assert.equal(deploys, 0)
    assert.equal(versions, 0)

    const queried = await get(url, `/api/publish/jobs/${prepared.payload.jobId}`)
    assert.equal(queried.status, 200)
    assert.equal(queried.payload.state, 'Pushed')
    assert.equal(deploys, 0)
    assert.equal(versions, 0)

    const continued = await post(url, `/api/publish/jobs/${prepared.payload.jobId}/continue-verify`, {})
    assert.equal(continued.status, 200)
    assert.equal(continued.payload.state, 'Published')
    assert.equal(deploys, 1)
    assert.ok(versions >= 1)
  })
})

test('continue-verify does not retry a finished failure', async () => {
  let versions = 0
  await withPanel({
    verifyTimeoutMs: 80,
    pollIntervalMs: 15,
    probes: {
      deployStatus: ({ sha }) => ({ state: 'success', sha }),
      productionVersion: () => {
        versions += 1
        return { sha: 'oldsha', builtAt: '2026-08-01T00:00:00.000Z' }
      },
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Failed')
    const afterConfirm = versions
    const continued = await post(url, `/api/publish/jobs/${prepared.payload.jobId}/continue-verify`, {})
    assert.equal(continued.status, 200)
    assert.equal(continued.payload.state, 'Failed')
    assert.ok(continued.payload.retryActions.includes('retry-verify'))
    assert.equal(versions, afterConfirm)
  })
})

test('confirm uploads to guonei before production SHA verification', async () => {
  const seen = []
  await withPanel({
    probes: {
      deploy(args) {
        seen.push(args)
        return { ok: true }
      },
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.payload.state, 'Published')
    assert.equal(seen.length, 1)
    assert.equal(seen[0].sha, confirmed.payload.commitSha)
    assert.ok(seen[0].snapshotDir)
    assert.equal(seen[0].origin, 'https://blog.example.test')
  })
})

test('domestic upload failure can retry verify without pushing again', async () => {
  await withPanel({ probes: { failDeployUntil: 1 } }, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const first = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(first.status, 409)
    assert.match(first.payload.error, /国内上传失败/)
    const failed = await get(url, `/api/publish/jobs/${prepared.payload.jobId}`)
    assert.equal(failed.payload.state, 'Failed')
    assert.ok(failed.payload.commitSha)
    assert.ok(failed.payload.retryActions.includes('retry-verify'))
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '2')
    const retried = await post(url, `/api/publish/jobs/${prepared.payload.jobId}/retry-verify`, {})
    assert.equal(retried.status, 200)
    assert.equal(retried.payload.state, 'Published')
    assert.equal(retried.payload.commitSha, failed.payload.commitSha)
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '2')
  })
})

test('prepare, preview, confirm, push and production verification succeed', async () => {
  let expectedPreviewBase = ''
  let expectedPreviewTarget = null
  await withPanel({
    probes: {
      assertPreviewBase(previewBase) {
        expectedPreviewBase = previewBase
      },
      assertPreviewTarget(target) {
        expectedPreviewTarget = target
      },
    },
  }, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    assert.equal(draft.status, 200)
    assert.ok(draft.payload.draftId)
    assert.equal(draft.payload.previewKind, 'workspace')
    const prepared = await post(url, '/api/publish/prepare', {
      draftId: draft.payload.draftId,
      headingAnchor: 'kan-yanhua',
    })
    assert.equal(prepared.status, 200)
    assert.equal(prepared.payload.state, 'PreviewReady')
    assert.equal(expectedPreviewBase, `/release-preview/${prepared.payload.jobId}/`)
    assert.deepEqual(expectedPreviewTarget, {
      previewPath: '/AI与生活/2026-08-12',
      headingAnchor: 'kan-yanhua',
    })
    assert.ok(prepared.payload.confirmationToken)
    assert.ok(prepared.payload.manifest.some((item) => item.path.endsWith('2026-08-12.md')))
    assert.equal(prepared.payload.manifest.filter((item) => item.path.includes('2026-08-12-01-test.webp')).length, 1)
    assert.equal(prepared.payload.wechatPreview.status, 'AssetsOnline')
    assert.equal(prepared.payload.wechatPreview.copyAllowed, true)
    assert.match(prepared.payload.wechatPreview.url, new RegExp(`/wechat-preview/${prepared.payload.jobId}/`))
    const preview = await fetch(`${url}${prepared.payload.releasePreviewUrl}`)
    assert.equal(preview.status, 200)
    assert.match(await preview.text(), /id="kan-yanhua"/)
    const wechatPreview = await fetch(`${url}${prepared.payload.wechatPreview.url}`)
    assert.equal(wechatPreview.status, 200)
    assert.match(await wechatPreview.text(), /第一条/)
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.payload.state, 'Published')
    assert.equal(confirmed.payload.wechatPreview.status, 'ProductionVerified')
    assert.equal(confirmed.payload.wechatPreview.copyAllowed, true)
    assert.ok(confirmed.payload.commitSha)
    assert.equal(confirmed.payload.verifiedUrl, `https://blog.example.test/AI与生活/2026-08-12#kan-yanhua`)
    assert.ok(git(dir, ['log', '-1', '--format=%H']))
    assert.match(git(dir, ['log', '-1', '--name-only']), /2026-08-12\.md/)
  })
})

test('wechat copy stays locked until missing production images are rechecked online', async () => {
  let checks = 0
  await withPanel({
    probes: {
      onlineAssets: ({ urls }) => {
        checks += 1
        return checks === 1
          ? { ok: false, missing: [urls[0]] }
          : { ok: true, missing: [] }
      },
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.payload.wechatPreview.status, 'WaitingForOnlineAssets')
    assert.equal(prepared.payload.wechatPreview.copyAllowed, false)
    assert.equal(prepared.payload.wechatPreview.missingAssets.length, 1)
    const checked = await post(url, `/api/publish/jobs/${prepared.payload.jobId}/check-wechat-assets`, {})
    assert.equal(checked.payload.wechatPreview.status, 'AssetsOnline')
    assert.equal(checked.payload.wechatPreview.copyAllowed, true)
  })
})

test('production SHA does not bypass a failed external image check', async () => {
  let checks = 0
  await withPanel({
    probes: {
      onlineAssets: ({ urls }) => {
        checks += 1
        const external = urls.find((url) => url.startsWith('https://cdn.example.test/'))
        if (checks === 1) return { ok: true, missing: [] }
        return { ok: false, missing: external ? [external] : [] }
      },
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', {
      ...appendBody,
      entry: {
        ...appendBody.entry,
        body: '外部图片 ![图](https://cdn.example.test/chart.webp)',
      },
    })
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.payload.wechatPreview.copyAllowed, true)
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Published')
    assert.equal(confirmed.payload.wechatPreview.status, 'WaitingForOnlineAssets')
    assert.equal(confirmed.payload.wechatPreview.copyAllowed, false)
    assert.deepEqual(confirmed.payload.wechatPreview.missingAssets, [
      'https://cdn.example.test/chart.webp',
    ])
  })
})

test('wechat preview is rendered from the isolated snapshot and artifacts stay out of manifest', async () => {
  await withPanel({}, async ({ url, dir, ctx }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const weekly = path.join(dir, 'docs', 'AI与生活', '2026-08-12.md')
    fs.appendFileSync(weekly, '\n工作区后续漂移，不应进入已准备的公众号快照\n')
    const response = await fetch(`${url}${prepared.payload.wechatPreview.url}`)
    const html = await response.text()
    assert.match(html, /新的一条/)
    assert.doesNotMatch(html, /工作区后续漂移/)
    assert.equal(prepared.payload.manifest.some((item) => item.path.includes('.panel-wechat')), false)
    const job = ctx.jobs.get(prepared.payload.jobId)
    assert.ok(fs.existsSync(job.wechatPreviewFile))
  })
})

test('wechat preview asset route rejects malformed encoding and traversal variants', async () => {
  await withPanel({}, async ({ url, port }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const jobId = prepared.payload.jobId
    const image = await rawGet(port, `/wechat-preview-assets/${jobId}/images/weekly/2026-08-12-01-test.webp`)
    assert.equal(image.status, 200)
    assert.equal(image.body.toString('utf8'), 'webp')

    for (const malformed of ['%', '%E0%A4%A']) {
      const response = await rawGet(port, `/wechat-preview-assets/${jobId}/${malformed}`)
      assert.ok(response.status === 400 || response.status === 404)
      assert.doesNotMatch(response.body.toString('utf8'), /URI malformed|fixture/)
    }

    for (const traversal of [
      '%2e%2e%2fREADME.md',
      '%2e%2e%5cREADME.md',
      'images%2f..%2f..%2fREADME.md',
      'images%5c..%5c..%5cREADME.md',
    ]) {
      const response = await rawGet(port, `/wechat-preview-assets/${jobId}/${traversal}`)
      assert.ok([400, 403, 404].includes(response.status))
      assert.doesNotMatch(response.body.toString('utf8'), /fixture/)
    }
  })
})

test('unrelated staged files are rejected and left untouched', async () => {
  await withPanel({}, async ({ url, dir }) => {
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'keep me staged\n')
    git(dir, ['add', 'notes.txt'])
    const stagedBefore = git(dir, ['diff', '--cached', '--name-only'])
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 409)
    assert.match(confirmed.payload.error, /暂存/)
    assert.equal(git(dir, ['diff', '--cached', '--name-only']), stagedBefore)
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '1')
  })
})

test('unrelated unstaged files stay out of the isolated snapshot and commit', async () => {
  let snapshotHadDirty = null
  await withPanel({
    probes: {
      assertSnapshot(snapshotDir) {
        snapshotHadDirty = fs.existsSync(path.join(snapshotDir, 'dirty.txt'))
          || fs.existsSync(path.join(snapshotDir, 'docs', '投资', '投研', 'secret.md'))
      },
    },
  }, async ({ url, dir }) => {
    fs.writeFileSync(path.join(dir, 'dirty.txt'), 'do not publish\n')
    fs.writeFileSync(path.join(dir, 'docs', '投资', '投研', 'secret.md'), 'research\n')
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(snapshotHadDirty, false)
    assert.ok(prepared.payload.excluded.some((item) => item.path === 'dirty.txt'))
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Published')
    const names = git(dir, ['show', '--name-only', '--pretty=format:', 'HEAD'])
    assert.equal(names.includes('dirty.txt'), false)
    assert.equal(names.includes('secret.md'), false)
    assert.equal(fs.readFileSync(path.join(dir, 'dirty.txt'), 'utf8'), 'do not publish\n')
  })
})

test('branch other than main is rejected', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    git(dir, ['checkout', '-b', 'topic'])
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 409)
    assert.match(confirmed.payload.error, /main/)
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '1')
  })
})

test('hash drift invalidates confirmation', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const weekly = path.join(dir, 'docs', 'AI与生活', '2026-08-12.md')
    fs.appendFileSync(weekly, '\n被改了\n')
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 409)
    assert.match(confirmed.payload.error, /漂移/)
  })
})

test('new issue writes article only; projection owns posts/sidebar', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const postsBefore = fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8')
    const configBefore = fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8')
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'newIssue',
      entry: { title: '开篇', body: '新期正文 ![图](/images/weekly/2026-08-12-01-test.webp)' },
      issue: { theme: '测试期', date: '2026-08-16' },
    })
    assert.equal(draft.status, 200)
    assert.ok(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '2026-08-16.md')))
    assert.equal(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), postsBefore)
    assert.equal(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8'), configBefore)
    assert.ok(!draft.payload.files.some((f) => f.endsWith('posts.ts') || f.endsWith('config.mts')))
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.payload.manifest.some((item) => item.path.endsWith('posts.ts')), false)
    assert.equal(prepared.payload.manifest.some((item) => item.path.endsWith('config.mts')), false)
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Published')
  })
})

test('new issue uses a YAML-safe text summary when the body starts with an image', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'newIssue',
      entry: {
        title: '图片开篇',
        body: '![题图](/images/weekly/2026-08-12-01-test.webp)',
      },
      issue: { theme: '图片开篇测试', date: '2026-08-16' },
    })
    assert.equal(draft.status, 200)

    const weekly = fs.readFileSync(
      path.join(dir, 'docs', 'AI与生活', '2026-08-16.md'),
      'utf8',
    )
    assert.match(weekly, /^description: "图片开篇测试"$/m)
    assert.doesNotMatch(weekly, /^description: !\[/m)

    const prepared = await post(url, '/api/publish/prepare', {
      draftId: draft.payload.draftId,
    })
    assert.equal(prepared.payload.state, 'PreviewReady')
  })
})

test('deleting an existing entry creates a publishable draft without touching other entries', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const weekly = path.join(dir, 'docs', 'AI与生活', '2026-08-12.md')
    const appended = await post(url, '/api/draft', appendBody)
    assert.equal(appended.status, 200)
    const before = fs.readFileSync(weekly, 'utf8')
    const beforeCount = (before.match(/<WeeklyEntry\b/g) || []).length
    const deleted = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'delete',
      issueLink: '/AI与生活/2026-08-12',
      entryIndex: 0,
    })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.payload.mode, 'delete')
    assert.ok(deleted.payload.draftId)
    const after = fs.readFileSync(weekly, 'utf8')
    assert.equal((after.match(/<WeeklyEntry\b/g) || []).length, beforeCount - 1)
    assert.match(after, /追加正文/)
    const prepared = await post(url, '/api/publish/prepare', { draftId: deleted.payload.draftId })
    assert.equal(prepared.payload.state, 'PreviewReady')
  })
})

test('repeating the same append is rejected before another entry is written', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const weekly = path.join(dir, 'docs', 'AI与生活', '2026-08-12.md')
    const first = await post(url, '/api/draft', appendBody)
    assert.equal(first.status, 200)
    const countAfterFirst = (fs.readFileSync(weekly, 'utf8').match(/<WeeklyEntry\b/g) || []).length
    const repeated = await post(url, '/api/draft', appendBody)
    assert.ok(repeated.status >= 400)
    assert.match(repeated.payload.error, /重复|已经存在/)
    assert.equal((fs.readFileSync(weekly, 'utf8').match(/<WeeklyEntry\b/g) || []).length, countAfterFirst)
  })
})

test('new issue still writes markdown when sidebar shell is empty', async () => {
  await withPanel({}, async ({ url, dir }) => {
    fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'export default { themeConfig: { sidebar: {} } }\n')
    const postsBefore = fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8')
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'newIssue',
      entry: { title: '开篇', body: '新期正文' },
      issue: { theme: '空壳期', date: '2026-08-17' },
    })
    assert.equal(draft.status, 200)
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '2026-08-17.md')), true)
    assert.equal(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), postsBefore)
  })
})

test('weekly scope rejects a mixed life draft that includes a journey chapter', () => {
  assert.throws(
    () => assertPublishable(
      ['docs/AI与生活/2026-08-12.md', 'docs/AI与生活/我的AI历程/基础设施篇.md'],
      { kindId: 'life', capability: { publishScope: 'weekly' } },
    ),
    (error) => error.status === 422 && /范围/.test(error.message) && /我的AI历程/.test(error.message),
  )
})

test('dirtyJourneyMetaPaths is empty after Wave D de-triple-write', () => {
  assert.deepEqual(
    dirtyJourneyMetaPaths([
      { path: 'docs/.vitepress/posts.ts' },
      { path: 'docs/.vitepress/config.mts' },
      { path: 'docs/AI与生活/2026-08-17.md' },
      { path: 'dirty.txt' },
    ]),
    [],
  )
})

test('journey newIssue publishable set is the body only', () => {
  assert.deepEqual(
    assertPublishable(
      ['docs/AI与生活/我的AI历程/2026-08-18.md'],
      { kindId: 'journey', capability: { publishScope: 'journey' } },
    ),
    ['docs/AI与生活/我的AI历程/2026-08-18.md'],
  )
  assert.throws(
    () => assertPublishable(
      [
        'docs/AI与生活/我的AI历程/2026-08-18.md',
        'docs/.vitepress/posts.ts',
        'docs/.vitepress/config.mts',
      ],
      { kindId: 'journey', capability: { publishScope: 'journey' } },
    ),
    (error) => error.status === 422 && /范围/.test(error.message),
  )
})

test('theme and research paths cannot enter the weekly manifest', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    ctx.drafts.set('d_bad', {
      files: ['docs/.vitepress/theme/foo.js', 'docs/投资/投研/secret.md'],
      previewLink: '/x',
      commitHint: 'nope',
      kindId: 'life',
    })
    const prepared = await post(url, '/api/publish/prepare', { draftId: 'd_bad' })
    assert.ok(prepared.status >= 400)
    assert.match(prepared.payload.error, /范围/)
  })
})

test('only explicitly listed deleted weekly files enter the manifest', async () => {
  await withPanel({}, async ({ url, dir, ctx }) => {
    const extra = path.join(dir, 'docs', 'AI与生活', '2026-08-10-gone.md')
    const unrelated = path.join(dir, 'docs', 'AI与生活', '2026-08-09-unrelated.md')
    fs.writeFileSync(extra, LIFE_MD)
    fs.writeFileSync(unrelated, LIFE_MD)
    git(dir, ['add', 'docs/AI与生活/2026-08-10-gone.md', 'docs/AI与生活/2026-08-09-unrelated.md'])
    git(dir, ['commit', '-m', 'extra'])
    fs.unlinkSync(extra)
    fs.unlinkSync(unrelated)
    const draft = await post(url, '/api/draft', appendBody)
    const storedDraft = ctx.drafts.get(draft.payload.draftId)
    storedDraft.files.push('docs/AI与生活/2026-08-10-gone.md')
    ctx.drafts.set(draft.payload.draftId, storedDraft)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.ok(prepared.payload.manifest.some((item) => item.path.endsWith('2026-08-10-gone.md') && item.action === 'delete'))
    assert.equal(prepared.payload.manifest.some((item) => item.path.endsWith('2026-08-09-unrelated.md')), false)
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Published')
    assert.equal(fs.existsSync(extra), false)
    const names = git(dir, ['ls-tree', '-r', '--name-only', 'HEAD'])
    assert.equal(names.includes('2026-08-10-gone.md'), false)
    assert.equal(names.includes('2026-08-09-unrelated.md'), true)
    assert.match(git(dir, ['status', '--short']), /2026-08-09-unrelated\.md/)
  })
})

test('confirmation rejects a job when HEAD changed after prepare', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const preparedHead = git(dir, ['rev-parse', 'HEAD'])
    fs.writeFileSync(path.join(dir, 'after-prepare.txt'), 'new baseline\n')
    git(dir, ['add', 'after-prepare.txt'])
    git(dir, ['commit', '-m', 'advance head'])
    const advancedHead = git(dir, ['rev-parse', 'HEAD'])
    assert.notEqual(advancedHead, preparedHead)

    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 409)
    assert.match(confirmed.payload.error, /基线|HEAD/)
    assert.equal(git(dir, ['rev-parse', 'HEAD']), advancedHead)
  })
})

test('release preview rejects encoded Windows traversal into a sibling directory', async () => {
  await withPanel({}, async ({ url, port, ctx }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const job = ctx.jobs.get(prepared.payload.jobId)
    const sibling = `${job.distDir}-evil`
    fs.mkdirSync(sibling, { recursive: true })
    fs.writeFileSync(path.join(sibling, 'secret.txt'), 'SIBLING_SECRET')
    const traversal = `/release-preview/${prepared.payload.jobId}/%2e%2e%5c${path.basename(sibling)}%5csecret.txt`
    const response = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: traversal }, (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body }))
      })
      req.on('error', reject)
      req.end()
    })
    if (process.platform === 'win32') assert.equal(response.status, 403)
    else assert.ok(response.status === 403 || response.status === 404)
    assert.doesNotMatch(response.body, /SIBLING_SECRET/)
  })
})

test('build failure removes generated WeChat preview from the failed job', async () => {
  await withPanel({ probes: { failBuild: true } }, async ({ url, port, dir, ctx }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /构建失败/)
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '1')

    const [job] = ctx.jobs.values()
    assert.equal(job.state, 'Failed')
    assert.equal(job.wechatPreviewFile, '')
    assert.equal(job.wechatPreviewUrl, '')
    assert.deepEqual(job.wechatAssetUrls, [])
    assert.equal(fs.existsSync(path.join(job.snapshotDir, '.panel-wechat')), false)

    const failed = await get(url, `/api/publish/jobs/${job.id}`)
    assert.equal(failed.payload.wechatPreview.url, '')
    assert.equal(failed.payload.wechatPreview.status, 'NotGenerated')
    assert.equal(failed.payload.wechatPreview.copyAllowed, false)
    const preview = await rawGet(port, `/wechat-preview/${job.id}/`)
    assert.equal(preview.status, 404)
  })
})

test('repeated confirmation is idempotent', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const first = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    const second = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(first.payload.commitSha, second.payload.commitSha)
    assert.equal(second.payload.state, 'Published')
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '2')
  })
})

test('concurrent confirmations of different jobs do not race', async () => {
  await withPanel({ probes: { delayPushMs: 250 } }, async ({ url }) => {
    const firstDraft = await post(url, '/api/draft', appendBody)
    const firstPrep = await post(url, '/api/publish/prepare', { draftId: firstDraft.payload.draftId })
    const secondDraft = await post(url, '/api/draft', {
      kindId: 'invest',
      mode: 'append',
      issueLink: '/投资/周记/2026-08-13-看烟花',
      entry: { title: '另一条', body: '投资追加', tags: '测试' },
    })
    const secondPrep = await post(url, '/api/publish/prepare', { draftId: secondDraft.payload.draftId })
    const [a, b] = await Promise.all([
      post(url, '/api/publish/confirm', {
        jobId: firstPrep.payload.jobId,
        confirmationToken: firstPrep.payload.confirmationToken,
      }),
      post(url, '/api/publish/confirm', {
        jobId: secondPrep.payload.jobId,
        confirmationToken: secondPrep.payload.confirmationToken,
      }),
    ])
    const statuses = [a.status, b.status].sort()
    assert.ok(statuses.includes(200))
    assert.ok(statuses.includes(409))
  })
})

test('superseded deployment is not reported as published', async () => {
  await withPanel({
    probes: { deployStatus: () => ({ state: 'superseded', sha: 'other' }) },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Superseded')
    assert.notEqual(confirmed.payload.state, 'Published')
  })
})

test('CI success with an old custom-domain SHA is not published', async () => {
  await withPanel({
    verifyTimeoutMs: 80,
    pollIntervalMs: 15,
    probes: {
      deployStatus: ({ sha }) => ({ state: 'success', sha }),
      productionVersion: () => ({ sha: 'oldsha', builtAt: '2026-08-01T00:00:00.000Z' }),
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Failed')
    assert.ok(confirmed.payload.retryActions.includes('retry-verify'))
    assert.ok(confirmed.payload.commitSha)
  })
})

test('production SHA can match after a retryable wait', async () => {
  await withPanel({
    probes: {
      productionVersion: ({ sha, n }) => (
        n < 2
          ? { sha: 'oldsha', builtAt: '2026-08-01T00:00:00.000Z' }
          : { sha, builtAt: '2026-08-15T00:00:00.000Z' }
      ),
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Published')
  })
})

test('panel restart restores WeChat preview, image serving, and copy gate', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-pub-'))
  initRepo(dir)
  const dataDir = path.join(dir, '.panel-data')
  const options = {
    repoRoot: dir,
    paths: createRepoPaths(dir),
    dataDir,
    probes: makeProbes(),
    productionOrigin: 'https://blog.example.test',
    verifyTimeoutMs: 2000,
    pollIntervalMs: 15,
  }
  const first = createServer(options)
  const listen1 = await listen(first)
  const draft = await post(listen1.url, '/api/draft', appendBody)
  const prepared = await post(listen1.url, '/api/publish/prepare', { draftId: draft.payload.draftId })
  await listen1.close()
  const second = createServer(options)
  const listen2 = await listen(second)
  try {
    const boot = await get(listen2.url, '/api/bootstrap')
    const recovered = boot.payload.activeJobs.find((job) => job.jobId === prepared.payload.jobId)
    assert.ok(recovered)
    assert.equal(recovered.state, 'PreviewReady')
    assert.ok(recovered.confirmationToken)
    assert.equal(recovered.wechatPreview.url, prepared.payload.wechatPreview.url)
    assert.equal(recovered.wechatPreview.status, 'AssetsOnline')
    assert.equal(recovered.wechatPreview.copyAllowed, true)
    assert.ok(recovered.wechatPreview.checkedAt)

    const preview = await rawGet(listen2.port, recovered.wechatPreview.url)
    assert.equal(preview.status, 200)
    assert.match(preview.body.toString('utf8'), /第一条/)
    const image = await rawGet(
      listen2.port,
      `/wechat-preview-assets/${recovered.jobId}/images/weekly/2026-08-12-01-test.webp`,
    )
    assert.equal(image.status, 200)
    assert.equal(image.body.toString('utf8'), 'webp')

    const persisted = await get(listen2.url, `/api/publish/jobs/${recovered.jobId}`)
    assert.equal(persisted.payload.wechatPreview.status, 'AssetsOnline')
    assert.equal(persisted.payload.wechatPreview.copyAllowed, true)

    const job = second.panelContext.jobs.get(recovered.jobId)
    fs.rmSync(job.wechatPreviewFile, { force: true })
    const missingPreview = await rawGet(listen2.port, recovered.wechatPreview.url)
    assert.equal(missingPreview.status, 404)
    assert.match(missingPreview.contentType, /application\/json/)
    assert.match(missingPreview.body.toString('utf8'), /还没有公众号预览/)

    fs.rmSync(path.join(job.snapshotDir, 'docs', 'public', 'images', 'weekly', '2026-08-12-01-test.webp'), { force: true })
    const missingImage = await rawGet(
      listen2.port,
      `/wechat-preview-assets/${recovered.jobId}/images/weekly/2026-08-12-01-test.webp`,
    )
    assert.equal(missingImage.status, 404)
    assert.equal(missingImage.body.toString('utf8'), 'not found')
  } finally {
    await listen2.close()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('oversized JSON is rejected', async () => {
  await withPanel({ maxJsonBytes: 64 }, async ({ url }) => {
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'append',
      issueLink: '/AI与生活/2026-08-12',
      entry: { title: 'x'.repeat(200), body: 'y'.repeat(200) },
    })
    assert.equal(draft.status, 413)
  })
})

test('stalled request is rejected within a bound', async () => {
  await withPanel({ bodyTimeoutMs: 80 }, async ({ port }) => {
    const started = Date.now()
    const status = await new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        path: '/api/draft',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': 80 },
      }, (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode))
      })
      req.on('error', reject)
      req.write('{')
    })
    assert.equal(status, 408)
    assert.ok(Date.now() - started < 2000)
  })
})

test('build metadata contract only contains sha and builtAt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-meta-'))
  execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'write-build-metadata.mjs'), dir], {
    env: { ...process.env, GITHUB_SHA: 'abc123def', BUILD_TIME: '2026-08-15T00:00:00.000Z' },
  })
  const payload = JSON.parse(fs.readFileSync(path.join(dir, 'build.json'), 'utf8'))
  assert.deepEqual(Object.keys(payload).sort(), ['builtAt', 'sha'])
  assert.equal(payload.sha, 'abc123def')
  assert.equal(payload.builtAt, '2026-08-15T00:00:00.000Z')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('prepare requires a draft id and does not use lastDraft', async () => {
  await withPanel({}, async ({ url }) => {
    await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', {})
    assert.ok(prepared.status >= 400)
    assert.match(prepared.payload.error, /draft ID/)
  })
})

test('push failure keeps the local commit and can retry push', async () => {
  await withPanel({ probes: { failPushUntil: 1 } }, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    const first = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(first.status, 409)
    assert.match(first.payload.error, /推送失败/)
    const failed = await get(url, `/api/publish/jobs/${prepared.payload.jobId}`)
    assert.equal(failed.payload.state, 'Failed')
    assert.ok(failed.payload.commitSha)
    assert.ok(failed.payload.retryActions.includes('retry-push'))
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '2')
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '1')
    const retried = await post(url, `/api/publish/jobs/${prepared.payload.jobId}/retry-push`, {})
    assert.equal(retried.status, 200)
    assert.equal(retried.payload.state, 'Published')
    assert.equal(retried.payload.commitSha, failed.payload.commitSha)
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '2')
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '2')
  })
})

test('release preview site root redirects to the article preview', async () => {
  await withPanel({}, async ({ url }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', {
      draftId: draft.payload.draftId,
      headingAnchor: 'kan-yanhua',
    })
    assert.equal(prepared.status, 200)
    const jobId = prepared.payload.jobId
    const root = await fetch(`${url}/release-preview/${jobId}/`, { redirect: 'manual' })
    assert.equal(root.status, 302)
    assert.equal(
      decodeURI(root.headers.get('location') || ''),
      `/release-preview/${jobId}/AI与生活/2026-08-12#kan-yanhua`,
    )
    const article = await fetch(`${url}${prepared.payload.releasePreviewUrl}`, { redirect: 'manual' })
    assert.notEqual(article.status, 302)
    assert.match(prepared.payload.releasePreviewUrl, /#kan-yanhua$/)
  })
})

test('restart after a committed-but-unpushed job allows retry-push', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-pub-'))
  initRepo(dir)
  const dataDir = path.join(dir, '.panel-data')
  const first = createServer({
    repoRoot: dir,
    paths: createRepoPaths(dir),
    dataDir,
    probes: makeProbes({ failPush: true }),
    productionOrigin: 'https://blog.example.test',
    verifyTimeoutMs: 2000,
    pollIntervalMs: 15,
  })
  const listen1 = await listen(first)
  const draft = await post(listen1.url, '/api/draft', appendBody)
  const prepared = await post(listen1.url, '/api/publish/prepare', { draftId: draft.payload.draftId })
  const failed = await post(listen1.url, '/api/publish/confirm', {
    jobId: prepared.payload.jobId,
    confirmationToken: prepared.payload.confirmationToken,
  })
  assert.equal(failed.status, 409)
  await listen1.close()
  const second = createServer({
    repoRoot: dir,
    paths: createRepoPaths(dir),
    dataDir,
    probes: makeProbes(),
    productionOrigin: 'https://blog.example.test',
    verifyTimeoutMs: 2000,
    pollIntervalMs: 15,
  })
  const listen2 = await listen(second)
  try {
    const boot = await get(listen2.url, '/api/bootstrap')
    const recovered = boot.payload.activeJobs.find((job) => job.jobId === prepared.payload.jobId)
    assert.ok(recovered)
    assert.equal(recovered.state, 'Failed')
    assert.ok(recovered.retryActions.includes('retry-push'))
    const retried = await post(listen2.url, `/api/publish/jobs/${prepared.payload.jobId}/retry-push`, {})
    assert.equal(retried.payload.state, 'Published')
    assert.equal(git(dir, ['rev-list', '--count', 'origin/main']), '2')
  } finally {
    await listen2.close()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('bootstrap exposes journey capability and the next issue number', async () => {
  await withPanel({}, async ({ url }) => {
    const boot = await get(url, '/api/bootstrap')
    assert.equal(boot.status, 200)
    const journey = boot.payload.kinds.find((kind) => kind.id === 'journey')
    const life = boot.payload.kinds.find((kind) => kind.id === 'life')
    assert.ok(journey)
    assert.equal(journey.nextIssue, 1)
    assert.equal(journey.current?.title, '基础设施篇')
    assert.equal(journey.current?.issue, null)
    assert.ok(journey.issues.every((item) => item.issue == null))
    assert.deepEqual(journey.issues.map((item) => item.title), [
      '基础设施篇',
      '工具篇',
      'AI开支记录与优化',
    ])
    assert.equal(journey.capability.contentType, 'journey')
    assert.equal(journey.capability.allowCreate, true)
    assert.equal(journey.capability.selectorLabel, '期数与篇章')
    assert.equal(journey.capability.headingAnchor, '')
    assert.equal(journey.capability.assetDirectory, 'docs/public/images/journey')
    assert.equal(journey.capability.assetUrlPrefix, '/images/journey/')
    assert.equal(journey.capability.wechatTheme, 'life')
    assert.equal(journey.capability.publishScope, 'journey')
    assert.equal(life.capability.contentType, 'weekly')
    assert.equal(life.capability.allowCreate, true)
    assert.equal(typeof life.nextIssue, 'number')
  })
})

test('journey newIssue writes a dated issue at /api/draft', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const infraBefore = fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), 'utf8')
    const draft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'newIssue',
      entry: { title: '开篇', body: '历程第一期' },
      issue: { theme: '底座', date: '2026-08-18', caption: '一句说明' },
    })
    assert.equal(draft.status, 200)
    assert.equal(draft.payload.previewLink, '/AI与生活/我的AI历程/2026-08-18')
    assert.match(draft.payload.commitHint, /^journey: 第001期-底座$/)
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '2026-08-18.md')), true)
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '新篇章.md')), false)
    assert.equal(fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), 'utf8'), infraBefore)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 200)
    assert.equal(prepared.payload.state, 'PreviewReady')
    const manifestPaths = prepared.payload.manifest.map((item) => item.path)
    assert.ok(manifestPaths.some((item) => item.endsWith('2026-08-18.md')))
    assert.equal(manifestPaths.some((item) => item.endsWith('posts.ts')), false)
    assert.equal(manifestPaths.some((item) => item.endsWith('config.mts')), false)
    assert.equal(manifestPaths.filter((item) => item.includes('我的AI历程/') && item.endsWith('.md')).length, 1)
  })
})

test('journey prepare excludes already-dirty posts.ts and config.mts', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const postsFile = path.join(dir, 'docs', '.vitepress', 'posts.ts')
    const configFile = path.join(dir, 'docs', '.vitepress', 'config.mts')
    const postsBefore = fs.readFileSync(postsFile, 'utf8')
    const configBefore = fs.readFileSync(configFile, 'utf8')
    fs.writeFileSync(postsFile, `${postsBefore.replace(/\s*$/, '')}\n  // dirty weekly nav\n`)
    fs.writeFileSync(
      configFile,
      configBefore.replace('系列入口', 'AI开支记录与优化'),
    )
    fs.writeFileSync(path.join(dir, 'dirty.txt'), 'leave me\n')

    const draft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: { title: '带上导航', body: '清单不应再吃导航索引', tags: '测试' },
    })
    assert.equal(draft.status, 200)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 200)
    const manifestPaths = prepared.payload.manifest.map((item) => item.path)
    assert.ok(manifestPaths.includes('docs/AI与生活/我的AI历程/基础设施篇.md'))
    assert.equal(manifestPaths.includes('docs/.vitepress/posts.ts'), false)
    assert.equal(manifestPaths.includes('docs/.vitepress/config.mts'), false)
    assert.equal(manifestPaths.some((item) => item === 'dirty.txt' || item.endsWith('2026-08-17.md')), false)
    assert.ok(prepared.payload.excluded.some((item) => item.path === 'docs/.vitepress/config.mts'))
    assert.ok(prepared.payload.excluded.some((item) => item.path === 'docs/.vitepress/posts.ts'))
  })
})

test('journey append uses journey commit hint and does not touch weekly files', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const weeklyBefore = fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '2026-08-12.md'), 'utf8')
    const draft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: { title: '新服务', body: '用途与判断', tags: '开支' },
    })
    assert.equal(draft.status, 200)
    assert.match(draft.payload.commitHint, /^journey: 基础设施篇 追加「新服务」$/)
    assert.doesNotMatch(draft.payload.commitHint, /weekly:/)
    const chapter = fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), 'utf8')
    assert.match(chapter, /新服务/)
    assert.equal(fs.readFileSync(path.join(dir, 'docs', 'AI与生活', '2026-08-12.md'), 'utf8'), weeklyBefore)
  })
})

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

test('images API requires kindId and ignores a client-supplied directory', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const missing = await post(url, '/api/images', {
      files: [{ name: 'x.png', data: TINY_PNG, hint: 'no-kind' }],
    })
    assert.equal(missing.status, 400)
    assert.match(missing.payload.error, /kindId/)

    const uploaded = await post(url, '/api/images', {
      kindId: 'journey',
      date: '2026-08-18',
      assetDirectory: 'docs/public/images/weekly',
      directory: 'docs/public/images/evil',
      files: [{ name: 'cover.png', role: 'body', hint: 'spend', data: TINY_PNG }],
    })
    assert.equal(uploaded.status, 200)
    assert.equal(uploaded.payload.images.length, 1)
    assert.match(uploaded.payload.images[0].url, /^\/images\/journey\/2026-08-18-\d{2}-spend\.webp$/)
    assert.match(uploaded.payload.images[0].rel, /^docs\/public\/images\/journey\//)
    assert.equal(fs.existsSync(path.join(dir, uploaded.payload.images[0].rel)), true)
    assert.equal(fs.existsSync(path.join(dir, uploaded.payload.images[0].rel.replace(/\.webp$/i, '.jpg'))), true)
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'public', 'images', 'weekly', uploaded.payload.images[0].fileName)), false)

    const weekly = await post(url, '/api/images', {
      kindId: 'life',
      date: '2026-08-18',
      files: [{ name: 'weekly.png', hint: 'weekly', data: TINY_PNG }],
    })
    assert.equal(weekly.status, 200)
    assert.match(weekly.payload.images[0].url, /^\/images\/weekly\/2026-08-18-\d{2}-weekly\.webp$/)
  })
})

test('journey image upload enters manifest, wechat preview and production asset gate', async () => {
  let snapshotImage = ''
  let seenAssetUrls = []
  await withPanel({
    probes: {
      assertSnapshot(snapshotDir) {
        snapshotImage = snapshotDir
      },
      onlineAssets({ urls }) {
        seenAssetUrls = urls
        return { ok: true, missing: [] }
      },
    },
  }, async ({ url, port, dir }) => {
    const uploaded = await post(url, '/api/images', {
      kindId: 'journey',
      date: '2026-08-18',
      files: [{ name: 'gpu.png', hint: 'gpu', data: TINY_PNG }],
    })
    assert.equal(uploaded.status, 200)
    const image = uploaded.payload.images[0]
    assert.match(image.url, /^\/images\/journey\//)

    const draft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: {
        title: '显卡账',
        body: `用途说明 ![图](${image.url})`,
        tags: '开支',
      },
    })
    assert.equal(draft.status, 200)
    assert.match(draft.payload.commitHint, /^journey:/)

    const prepared = await post(url, '/api/publish/prepare', {
      draftId: draft.payload.draftId,
      headingAnchor: 'kan-yanhua',
    })
    assert.equal(prepared.status, 200)
    assert.equal(prepared.payload.state, 'PreviewReady')
    assert.equal(prepared.payload.kindId, 'journey')
    assert.equal(prepared.payload.headingAnchor, '')
    assert.doesNotMatch(prepared.payload.releasePreviewUrl, /#kan-yanhua/)
    assert.match(prepared.payload.releasePreviewUrl, /\/AI与生活\/我的AI历程\/基础设施篇$/)

    const manifestPaths = prepared.payload.manifest.map((item) => item.path)
    const chapterPaths = manifestPaths.filter((item) => item.startsWith('docs/AI与生活/我的AI历程/'))
    assert.deepEqual(chapterPaths, ['docs/AI与生活/我的AI历程/基础设施篇.md'])
    assert.equal(manifestPaths.filter((item) => item.endsWith('.md')).length, 1)
    assert.ok(manifestPaths.includes(image.rel))
    assert.ok(manifestPaths.includes(image.rel.replace(/\.webp$/i, '.jpg')))
    assert.equal(manifestPaths.some((item) => item.endsWith('posts.ts') || item.endsWith('config.mts')), false)
    assert.equal(manifestPaths.some((item) => item.includes('/images/weekly/')), false)
    assert.equal(manifestPaths.some((item) => item.includes('.panel-wechat')), false)

    assert.equal(fs.existsSync(path.join(snapshotImage, image.rel)), true)
    assert.match(
      fs.readFileSync(path.join(snapshotImage, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md'), 'utf8'),
      /显卡账/,
    )

    const wechatPreview = await fetch(`${url}${prepared.payload.wechatPreview.url}`)
    assert.equal(wechatPreview.status, 200)
    const html = await wechatPreview.text()
    assert.match(html, /显卡账/)
    assert.match(html, new RegExp(`/wechat-preview-assets/${prepared.payload.jobId}${image.url.replace(/\//g, '\\/')}`))
    assert.match(html, /#0d7a5f/)

    const asset = await rawGet(port, `/wechat-preview-assets/${prepared.payload.jobId}${image.url}`)
    assert.equal(asset.status, 200)
    assert.ok(asset.body.length > 0)

    assert.ok(seenAssetUrls.some((item) => item.endsWith(image.url)))
    assert.equal(prepared.payload.wechatPreview.status, 'AssetsOnline')
    assert.equal(prepared.payload.wechatPreview.copyAllowed, true)

    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.payload.state, 'Published')
    assert.equal(confirmed.payload.wechatPreview.status, 'ProductionVerified')
    assert.equal(confirmed.payload.verifiedUrl, 'https://blog.example.test/AI与生活/我的AI历程/基础设施篇')
    const committed = git(dir, ['-c', 'core.quotepath=false', 'log', '-1', '--name-only'])
    assert.match(git(dir, ['log', '-1', '--format=%s']), /^journey:/)
    assert.match(committed, /基础设施篇\.md/)
    assert.match(committed, /images\/journey\//)
    assert.doesNotMatch(committed, /posts\.ts|config\.mts/)
  })
})

test('prepare rejects a life draft that mixes in a journey chapter', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    ctx.drafts.set('d_life_mixed', {
      files: ['docs/AI与生活/2026-08-12.md', 'docs/AI与生活/我的AI历程/基础设施篇.md'],
      previewLink: '/AI与生活/2026-08-12',
      commitHint: 'weekly: 混入历程',
      kindId: 'life',
    })
    const prepared = await post(url, '/api/publish/prepare', { draftId: 'd_life_mixed' })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /范围/)
    assert.match(prepared.payload.error, /我的AI历程/)
  })
})

test('prepare rejects an invest draft that mixes in a journey chapter', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    ctx.drafts.set('d_invest_mixed', {
      files: ['docs/投资/周记/2026-08-13-看烟花.md', 'docs/AI与生活/我的AI历程/基础设施篇.md'],
      previewLink: '/投资/周记/2026-08-13-看烟花',
      commitHint: 'weekly: 混入历程',
      kindId: 'invest',
    })
    const prepared = await post(url, '/api/publish/prepare', { draftId: 'd_invest_mixed' })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /范围/)
    assert.match(prepared.payload.error, /我的AI历程/)
  })
})

test('journey prepare rejects a missing referenced journey image', async () => {
  await withPanel({
    probes: {
      async test({ snapshotDir, kindId, contentFiles }) {
        return { ok: true, ...validateWeeklySnapshot(snapshotDir, { kindId, contentFiles }) }
      },
    },
  }, async ({ url }) => {
    const draft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: {
        title: '断图',
        body: '![图](/images/journey/missing.webp)',
        tags: '测试',
      },
    })
    assert.equal(draft.status, 200)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /缺少图片.*missing\.webp/)
    assert.notEqual(prepared.payload.state, 'PreviewReady')
  })
})

test('life prepare ignores an unrelated journey chapter with a missing image', async () => {
  await withPanel({
    probes: {
      async test({ snapshotDir, kindId, contentFiles }) {
        return { ok: true, ...validateWeeklySnapshot(snapshotDir, { kindId, contentFiles }) }
      },
    },
  }, async ({ url, dir }) => {
    const broken = path.join(dir, 'docs', 'AI与生活', '我的AI历程', '工具篇.md')
    fs.writeFileSync(broken, [
      '---',
      'type: journey',
      '---',
      '',
      '![图](/images/journey/missing.webp)',
      '',
    ].join('\n'))
    git(dir, ['add', 'docs/AI与生活/我的AI历程/工具篇.md'])
    git(dir, ['commit', '-m', 'fixture: broken unrelated journey'])
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'append',
      issueLink: '/AI与生活/2026-08-12',
      entry: {
        title: '周记条目',
        body: '正常周记正文',
        tags: '测试',
      },
    })
    assert.equal(draft.status, 200)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 200)
    assert.equal(prepared.payload.state, 'PreviewReady')
  })
})

test('journey prepare ignores another chapter with a missing image', async () => {
  await withPanel({
    probes: {
      async test({ snapshotDir, kindId, contentFiles }) {
        return { ok: true, ...validateWeeklySnapshot(snapshotDir, { kindId, contentFiles }) }
      },
    },
  }, async ({ url, dir }) => {
    const images = path.join(dir, 'docs', 'public', 'images', 'journey')
    fs.mkdirSync(images, { recursive: true })
    fs.writeFileSync(path.join(images, 'cover.webp'), 'webp')
    fs.writeFileSync(path.join(dir, 'docs', 'AI与生活', '我的AI历程', '工具篇.md'), [
      '---',
      'type: journey',
      '---',
      '',
      '![图](/images/journey/missing.webp)',
      '',
    ].join('\n'))
    git(dir, ['add', 'docs/AI与生活/我的AI历程/工具篇.md'])
    git(dir, ['commit', '-m', 'fixture: broken other journey'])
    const draft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: {
        title: '正常服务',
        body: '![图](/images/journey/cover.webp)',
        tags: '测试',
      },
    })
    assert.equal(draft.status, 200)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 200)
    assert.equal(prepared.payload.state, 'PreviewReady')
  })
})

test('journey publish rejects index, readme, other AI dirs, research, theme and panel files', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    const forbidden = [
      ['docs/AI与生活/我的AI历程/index.md'],
      ['docs/AI与生活/我的AI历程/README.md'],
      ['docs/AI与生活/我的AI历程/基础设施篇.md', 'docs/AI与生活/我的AI历程/工具篇.md'],
      ['docs/AI与生活/大事件/2026.md'],
      ['docs/AI与生活/Hermes日记/2026-08-12.md'],
      ['docs/投资/投研/secret.md'],
      ['docs/.vitepress/theme/foo.js'],
      ['panel/server.mjs'],
    ]
    for (const [index, files] of forbidden.entries()) {
      const draftId = `d_journey_bad_${index}`
      ctx.drafts.set(draftId, {
        files,
        previewLink: '/AI与生活/我的AI历程/基础设施篇',
        commitHint: 'journey: 不应发布',
        kindId: 'journey',
      })
      const prepared = await post(url, '/api/publish/prepare', { draftId })
      assert.ok(prepared.status >= 400, files.join(','))
      assert.match(prepared.payload.error, /范围|恰好一篇正文|一篇正文/)
    }
  })
})

test('prepare rejects an explicit unknown kindId', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    const draft = await post(url, '/api/draft', appendBody)
    assert.equal(draft.status, 200)
    const stored = ctx.drafts.get(draft.payload.draftId)
    stored.kindId = 'evil'
    ctx.drafts.set(draft.payload.draftId, stored)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /未知栏目：evil/)
    assert.notEqual(prepared.payload.state, 'PreviewReady')
  })
})

test('prepare infers a registered life or journey kind when kindId is missing', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    const lifeDraft = await post(url, '/api/draft', appendBody)
    assert.equal(lifeDraft.status, 200)
    const lifeStored = ctx.drafts.get(lifeDraft.payload.draftId)
    delete lifeStored.kindId
    ctx.drafts.set(lifeDraft.payload.draftId, lifeStored)
    const lifePrepared = await post(url, '/api/publish/prepare', { draftId: lifeDraft.payload.draftId })
    assert.equal(lifePrepared.status, 200)
    assert.equal(lifePrepared.payload.state, 'PreviewReady')
    assert.equal(lifePrepared.payload.kindId, 'life')

    const journeyDraft = await post(url, '/api/draft', {
      kindId: 'journey',
      mode: 'append',
      issueLink: '/AI与生活/我的AI历程/基础设施篇',
      entry: { title: '推断栏目', body: '缺失 kind 仍可按 URL 发布', tags: '测试' },
    })
    assert.equal(journeyDraft.status, 200)
    const journeyStored = ctx.drafts.get(journeyDraft.payload.draftId)
    journeyStored.kindId = ''
    ctx.drafts.set(journeyDraft.payload.draftId, journeyStored)
    const journeyPrepared = await post(url, '/api/publish/prepare', { draftId: journeyDraft.payload.draftId })
    assert.equal(journeyPrepared.status, 200)
    assert.equal(journeyPrepared.payload.state, 'PreviewReady')
    assert.equal(journeyPrepared.payload.kindId, 'journey')
  })
})

test('prepare rejects when kindId is missing and the URL cannot be recognized', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    const draft = await post(url, '/api/draft', appendBody)
    assert.equal(draft.status, 200)
    const stored = ctx.drafts.get(draft.payload.draftId)
    stored.kindId = ''
    stored.previewLink = '/unknown/path'
    stored.articleUrl = '/also-unknown'
    ctx.drafts.set(draft.payload.draftId, stored)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /无法识别发布栏目/)
    assert.notEqual(prepared.payload.state, 'PreviewReady')
  })
})
