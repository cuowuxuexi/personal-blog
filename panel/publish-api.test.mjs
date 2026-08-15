import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRepoPaths } from './lib/paths.mjs'
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
    },
  },
}
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
  fs.writeFileSync(life, LIFE_MD)
  fs.writeFileSync(invest, INVEST_MD)
  fs.writeFileSync(image, 'webp')
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
  return {
    async test() {
      if (overrides.failTest) throw new Error('测试失败：fake')
      return { ok: true }
    },
    async build({ snapshotDir }) {
      if (overrides.failBuild) throw new Error('构建失败：vitepress exploded')
      if (overrides.assertSnapshot) overrides.assertSnapshot(snapshotDir)
      const distDir = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
      fs.mkdirSync(path.join(distDir, 'AI与生活'), { recursive: true })
      fs.writeFileSync(path.join(distDir, 'index.html'), '<html>ok</html>')
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
    async deployStatus({ sha }) {
      if (overrides.deployStatus) return overrides.deployStatus({ sha, n: n + 1 })
      return { state: 'success', sha }
    },
    async productionVersion({ sha }) {
      n += 1
      if (overrides.productionVersion) return overrides.productionVersion({ sha, n })
      return { sha, builtAt: '2026-08-15T00:00:00.000Z' }
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

const appendBody = {
  kindId: 'life',
  mode: 'append',
  issueLink: '/AI与生活/2026-08-12',
  entry: { title: '新的一条', body: '追加正文 ![图](/images/weekly/2026-08-12-01-test.webp)', tags: '测试' },
}

test('prepare, preview, confirm, push and production verification succeed', async () => {
  await withPanel({}, async ({ url, dir }) => {
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
    assert.ok(prepared.payload.confirmationToken)
    assert.ok(prepared.payload.manifest.some((item) => item.path.endsWith('2026-08-12.md')))
    assert.equal(prepared.payload.manifest.filter((item) => item.path.includes('2026-08-12-01-test.webp')).length, 1)
    const preview = await fetch(`${url}${prepared.payload.releasePreviewUrl}`)
    assert.ok(preview.status === 200 || preview.status === 404)
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.payload.state, 'Published')
    assert.ok(confirmed.payload.commitSha)
    assert.equal(confirmed.payload.verifiedUrl, `https://blog.example.test/AI与生活/2026-08-12#kan-yanhua`)
    assert.ok(git(dir, ['log', '-1', '--format=%H']))
    assert.match(git(dir, ['log', '-1', '--name-only']), /2026-08-12\.md/)
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

test('new issue writes article, posts index and sidebar together', async () => {
  await withPanel({}, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'newIssue',
      entry: { title: '开篇', body: '新期正文 ![图](/images/weekly/2026-08-12-01-test.webp)' },
      issue: { theme: '测试期', date: '2026-08-16' },
    })
    assert.equal(draft.status, 200)
    assert.ok(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '2026-08-16.md')))
    assert.match(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8'), /2026-08-16/)
    assert.match(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'utf8'), /第002期-测试期/)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.ok(prepared.payload.manifest.some((item) => item.path.endsWith('posts.ts')))
    assert.ok(prepared.payload.manifest.some((item) => item.path.endsWith('config.mts')))
    const confirmed = await post(url, '/api/publish/confirm', {
      jobId: prepared.payload.jobId,
      confirmationToken: prepared.payload.confirmationToken,
    })
    assert.equal(confirmed.payload.state, 'Published')
  })
})

test('missing sidebar key fails before any new-issue file is written', async () => {
  await withPanel({}, async ({ url, dir }) => {
    fs.writeFileSync(path.join(dir, 'docs', '.vitepress', 'config.mts'), 'export default { themeConfig: { sidebar: {} } }\n')
    const draft = await post(url, '/api/draft', {
      kindId: 'life',
      mode: 'newIssue',
      entry: { title: '开篇', body: '新期正文' },
      issue: { theme: '失败期', date: '2026-08-17' },
    })
    assert.ok(draft.status >= 400)
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '2026-08-17.md')), false)
    assert.equal(fs.readFileSync(path.join(dir, 'docs', '.vitepress', 'posts.ts'), 'utf8').includes('2026-08-17'), false)
  })
})

test('theme and research paths cannot enter the weekly manifest', async () => {
  await withPanel({}, async ({ url, ctx }) => {
    ctx.drafts.set('d_bad', {
      files: ['docs/.vitepress/theme/foo.js', 'docs/投资/投研/secret.md'],
      previewLink: '/x',
      commitHint: 'nope',
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

test('build failure produces no commit or push', async () => {
  await withPanel({ probes: { failBuild: true } }, async ({ url, dir }) => {
    const draft = await post(url, '/api/draft', appendBody)
    const prepared = await post(url, '/api/publish/prepare', { draftId: draft.payload.draftId })
    assert.equal(prepared.status, 422)
    assert.match(prepared.payload.error, /构建失败/)
    assert.equal(git(dir, ['rev-list', '--count', 'HEAD']), '1')
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

test('panel restart recovers the existing job', async () => {
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
