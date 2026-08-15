import fs from 'node:fs'
import path from 'node:path'
import { newId, newToken, sha256File, sha256Text } from './hash.mjs'
import { createGit } from './git.mjs'
import { redact } from './redact.mjs'
import { assertPublishable, isAllowedPublishPath, posixPath } from './scope.mjs'
import { collectReferencedWeeklyImages } from './publish.mjs'

const VERIFY_STATES = new Set(['Pushed', 'Deploying', 'VerifyingProduction'])
const TERMINAL_OK = new Set(['Published'])
const IDEMPOTENT_STATES = new Set([
  'Confirmed', 'Committing', 'Pushed', 'Deploying', 'VerifyingProduction', 'Published',
])

function fail(message, status = 400) {
  const error = new Error(message)
  error.status = status
  throw error
}

function now() {
  return new Date().toISOString()
}

export function publicJob(job, { includeToken = false } = {}) {
  const tokenVisible = includeToken && job.state === 'PreviewReady'
  return {
    jobId: job.id,
    draftId: job.draftId,
    state: job.state,
    manifest: job.manifest,
    excluded: job.excluded,
    releasePreviewUrl: job.releasePreviewUrl,
    confirmationToken: tokenVisible ? job.confirmationToken : undefined,
    commitSha: job.commitSha || null,
    articleUrl: job.articleUrl,
    headingAnchor: job.headingAnchor || '',
    verifiedUrl: job.verifiedUrl || null,
    failureReason: job.failureReason || null,
    retryActions: job.retryActions || [],
    summary: job.summary || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    publishedAt: job.publishedAt || null,
  }
}

function saveJob(ctx, job) {
  job.updatedAt = now()
  ctx.jobs.set(job.id, job)
  return job
}

function loadJob(ctx, jobId) {
  const job = ctx.jobs.get(jobId)
  if (!job) fail('找不到该发布任务', 404)
  return job
}

function loadDraft(ctx, draftId) {
  const draft = ctx.drafts.get(draftId)
  if (!draft) fail('找不到该草稿，请先保存', 404)
  return draft
}

function wasPushed(job) {
  return Boolean(job.pushed) || VERIFY_STATES.has(job.state) || job.state === 'Published'
}

function canRetryPush(job) {
  return Boolean(job.commitSha) && !wasPushed(job)
    && ['Confirmed', 'Committing', 'Failed'].includes(job.state)
}

function recoverInterrupted(ctx) {
  for (const job of ctx.jobs.values()) {
    if (job.state === 'Committing' && !job.commitSha) {
      job.state = 'Failed'
      job.failureReason = '面板重启时提交中断，请重新准备发布'
      job.retryActions = ['prepare']
      saveJob(ctx, job)
      continue
    }
    if (job.state === 'Committing' && job.commitSha && !wasPushed(job)) {
      job.state = 'Failed'
      job.failureReason = '面板重启时推送中断，本地提交还在，可以重试推送'
      job.retryActions = ['retry-push']
      saveJob(ctx, job)
    }
  }
}

export function listRecoverableJobs(ctx) {
  recoverInterrupted(ctx)
  return ctx.jobs.values()
    .filter((job) => !['Published', 'Failed', 'Cancelled', 'Superseded'].includes(job.state)
      || job.updatedAt > new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .map((job) => publicJob(job, { includeToken: true }))
}

async function sameAsHead(git, rel) {
  try {
    const head = (await git.run(['rev-parse', `HEAD:${rel}`])).stdout.trim()
    const working = (await git.run(['hash-object', rel])).stdout.trim()
    return head === working
  } catch {
    return false
  }
}

async function buildManifest(ctx, git, draft, statusRows, headFiles) {
  const repoRoot = ctx.repoRoot
  const files = assertPublishable([
    ...draft.files,
    ...collectReferencedWeeklyImages(draft.files, repoRoot),
  ])
  const unique = [...new Set(files)]
  const manifest = []
  for (const rel of unique) {
    const abs = path.join(repoRoot, rel)
    if (!fs.existsSync(abs)) {
      manifest.push({ path: rel, action: 'delete', hash: sha256Text(`delete:${rel}`) })
      continue
    }
    const inHead = headFiles.includes(rel)
    const hash = sha256File(abs)
    let action = 'add'
    if (inHead) action = await sameAsHead(git, rel) ? 'keep' : 'modify'
    manifest.push({ path: rel, action, hash })
  }
  const manifestSet = new Set(manifest.map((item) => item.path))
  const excluded = []
  for (const row of statusRows) {
    const rel = posixPath(row.path)
    if (manifestSet.has(rel)) continue
    excluded.push({
      path: rel,
      inScope: isAllowedPublishPath(rel),
    })
  }
  return { manifest, excluded }
}

function overlaySnapshot(snapshotDir, repoRoot, manifest) {
  for (const entry of manifest) {
    const dest = path.join(snapshotDir, entry.path)
    if (entry.action === 'delete') {
      if (fs.existsSync(dest)) fs.rmSync(dest, { force: true })
      continue
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(path.join(repoRoot, entry.path), dest)
  }
}

function writePreviewBuildMeta(distDir, jobId) {
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true })
  fs.writeFileSync(
    path.join(distDir, 'build.json'),
    `${JSON.stringify({ sha: null, jobId, builtAt: now() }, null, 2)}\n`,
    'utf8',
  )
}

export async function preparePublication(ctx, { draftId, headingAnchor = '' }) {
  if (!draftId) fail('准备发布必须携带 draft ID')
  const draft = loadDraft(ctx, draftId)
  const git = createGit(ctx.repoRoot)
  const job = {
    id: newId('j'),
    draftId,
    state: 'Preparing',
    manifest: [],
    excluded: [],
    confirmationToken: newToken(),
    snapshotDir: '',
    distDir: '',
    releasePreviewUrl: '',
    articleUrl: draft.previewLink,
    headingAnchor: headingAnchor || '',
    commitMessage: draft.commitHint || 'weekly: 发布面板更新',
    baseSha: '',
    commitSha: null,
    pushed: false,
    verifiedUrl: null,
    failureReason: null,
    retryActions: [],
    summary: null,
    createdAt: now(),
    updatedAt: now(),
  }
  saveJob(ctx, job)
  try {
    const [baseSha, statusRows, headFiles] = await Promise.all([
      git.headSha(),
      git.statusPorcelain(),
      git.lsHead(),
    ])
    job.baseSha = baseSha
    const { manifest, excluded } = await buildManifest(ctx, git, draft, statusRows, headFiles)
    job.manifest = manifest
    job.excluded = excluded
    const snapshotDir = path.join(ctx.dataDir, 'snapshots', job.id)
    fs.rmSync(snapshotDir, { recursive: true, force: true })
    fs.mkdirSync(snapshotDir, { recursive: true })
    await git.checkoutIndex(snapshotDir)
    overlaySnapshot(snapshotDir, ctx.repoRoot, manifest)
    job.snapshotDir = snapshotDir
    const testResult = await ctx.probes.test({ snapshotDir, repoRoot: ctx.repoRoot })
    if (testResult && testResult.ok === false) fail(testResult.error || '测试失败', 422)
    const previewBase = `/release-preview/${job.id}/`
    const built = await ctx.probes.build({
      snapshotDir,
      repoRoot: ctx.repoRoot,
      previewBase,
    })
    job.distDir = built.distDir
    writePreviewBuildMeta(job.distDir, job.id)
    job.releasePreviewUrl = `/release-preview/${job.id}${draft.previewLink}`
    job.state = 'PreviewReady'
    return publicJob(saveJob(ctx, job), { includeToken: true })
  } catch (error) {
    job.state = 'Failed'
    job.failureReason = redact(error.message)
    job.retryActions = ['prepare']
    saveJob(ctx, job)
    error.message = job.failureReason
    if (!error.status) error.status = 422
    throw error
  }
}

function assertHashes(ctx, job) {
  for (const entry of job.manifest) {
    const abs = path.join(ctx.repoRoot, entry.path)
    if (entry.action === 'delete') {
      if (fs.existsSync(abs)) fail('清单哈希已漂移，请重新准备发布', 409)
      continue
    }
    if (!fs.existsSync(abs) || sha256File(abs) !== entry.hash) {
      fail('清单哈希已漂移，请重新准备发布', 409)
    }
  }
}

async function commitSnapshot(ctx, job, git) {
  const staged = await git.stagedFiles()
  if (staged.length) fail('已有暂存文件，发布不会改动它们。请先处理后再发布', 409)
  const branch = await git.currentBranch()
  if (branch !== ctx.publicationBranch) {
    fail(`当前分支是 ${branch}，发布基线必须是 ${ctx.publicationBranch}`, 409)
  }
  const currentHead = await git.headSha()
  if (!job.baseSha || currentHead !== job.baseSha) {
    fail('HEAD 已偏离准备发布时的基线，请重新准备发布', 409)
  }
  assertHashes(ctx, job)
  const adds = job.manifest.filter((item) => item.action === 'add' || item.action === 'modify').map((item) => item.path)
  const deletes = job.manifest.filter((item) => item.action === 'delete').map((item) => item.path)
  if (deletes.length) await git.rm(deletes)
  if (adds.length) await git.add(adds)
  const cached = await git.stagedFiles()
  const cachedSet = new Set(cached)
  const expected = new Set(job.manifest.filter((item) => item.action !== 'keep').map((item) => item.path))
  if (cachedSet.size !== expected.size || [...expected].some((file) => !cachedSet.has(file))) {
    fail('暂存 diff 与发布清单不一致，已中止', 409)
  }
  job.commitSha = await git.commit(job.commitMessage)
}

function productionUrl(ctx, job) {
  const origin = ctx.productionOrigin.replace(/\/$/, '')
  const hash = job.headingAnchor ? `#${job.headingAnchor.replace(/^#/, '')}` : ''
  return `${origin}${job.articleUrl}${hash}`
}

function finalizeSummary(job, ctx) {
  job.summary = {
    files: job.manifest.map((item) => item.path),
    commitSha: job.commitSha,
    deployedAt: job.publishedAt,
    verifiedUrl: job.verifiedUrl,
    excluded: job.excluded,
  }
}

export async function verifyProduction(ctx, job) {
  if (TERMINAL_OK.has(job.state) || ['Failed', 'Cancelled', 'Superseded'].includes(job.state)) {
    return job
  }
  if (job.verifying) return job
  job.verifying = true
  const started = Date.now()
  try {
    while (Date.now() - started < ctx.verifyTimeoutMs) {
      const deploy = await ctx.probes.deployStatus({ sha: job.commitSha })
      if (deploy?.state === 'cancelled' || deploy?.state === 'superseded') {
        job.state = 'Superseded'
        job.failureReason = '部署已被取消或被更新的提交取代'
        job.retryActions = ['prepare']
        return saveJob(ctx, job)
      }
      if (deploy?.state === 'in_progress') job.state = 'Deploying'
      else job.state = 'VerifyingProduction'
      saveJob(ctx, job)
      const version = await ctx.probes.productionVersion({
        sha: job.commitSha,
        origin: ctx.productionOrigin,
      })
      if (version?.sha && version.sha === job.commitSha) {
        job.state = 'Published'
        job.publishedAt = version.builtAt || now()
        job.verifiedUrl = productionUrl(ctx, job)
        job.failureReason = null
        job.retryActions = []
        finalizeSummary(job, ctx)
        return saveJob(ctx, job)
      }
      if (version?.sha && version.sha !== job.commitSha && deploy?.state === 'superseded') {
        job.state = 'Superseded'
        job.failureReason = '生产域名已切到另一个提交'
        job.retryActions = ['prepare']
        return saveJob(ctx, job)
      }
      await new Promise((resolve) => setTimeout(resolve, ctx.pollIntervalMs))
    }
    job.state = 'Failed'
    job.failureReason = '生产校验超时，域名尚未返回目标提交'
    job.retryActions = ['retry-verify']
    return saveJob(ctx, job)
  } finally {
    job.verifying = false
  }
}

function acquireCommitLock(ctx, job) {
  if (ctx.lock.committingJobId && ctx.lock.committingJobId !== job.id) {
    fail('已有发布任务正在提交，请稍后再试', 409)
  }
  ctx.lock.committingJobId = job.id
}

function failJob(job, error, ctx) {
  job.state = 'Failed'
  job.failureReason = redact(error.message)
  job.retryActions = wasPushed(job) ? ['retry-verify'] : (job.commitSha ? ['retry-push'] : ['prepare'])
  saveJob(ctx, job)
  error.message = job.failureReason
  if (!error.status) error.status = 409
}

async function pushCommittedJob(ctx, job) {
  const git = createGit(ctx.repoRoot)
  acquireCommitLock(ctx, job)
  try {
    job.state = 'Committing'
    job.failureReason = null
    job.retryActions = []
    saveJob(ctx, job)
    await ctx.probes.push({ git, repoRoot: ctx.repoRoot, sha: job.commitSha })
    job.pushed = true
    job.state = 'Pushed'
    saveJob(ctx, job)
    await verifyProduction(ctx, job)
    return publicJob(job)
  } catch (error) {
    failJob(job, error, ctx)
    throw error
  } finally {
    if (ctx.lock.committingJobId === job.id) ctx.lock.committingJobId = null
  }
}

export async function confirmPublication(ctx, { jobId, confirmationToken }) {
  if (!jobId || !confirmationToken) fail('确认发布必须携带 job ID 和确认令牌')
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (job.confirmationToken !== confirmationToken) fail('确认令牌无效或已过期', 409)
  if (TERMINAL_OK.has(job.state)) return publicJob(job)
  if (IDEMPOTENT_STATES.has(job.state) && wasPushed(job)) {
    if (VERIFY_STATES.has(job.state)) await verifyProduction(ctx, job)
    return publicJob(job)
  }
  if (canRetryPush(job)) return pushCommittedJob(ctx, job)
  if (job.state !== 'PreviewReady') fail(`当前状态 ${job.state} 不能确认发布`, 409)
  acquireCommitLock(ctx, job)
  const git = createGit(ctx.repoRoot)
  try {
    job.state = 'Confirmed'
    saveJob(ctx, job)
    job.state = 'Committing'
    saveJob(ctx, job)
    await commitSnapshot(ctx, job, git)
    await ctx.probes.push({ git, repoRoot: ctx.repoRoot, sha: job.commitSha })
    job.pushed = true
    job.state = 'Pushed'
    saveJob(ctx, job)
    await verifyProduction(ctx, job)
    return publicJob(job)
  } catch (error) {
    failJob(job, error, ctx)
    throw error
  } finally {
    if (ctx.lock.committingJobId === job.id) ctx.lock.committingJobId = null
  }
}

export async function getPublication(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (VERIFY_STATES.has(job.state)) await verifyProduction(ctx, job)
  return publicJob(job, { includeToken: job.state === 'PreviewReady' })
}

export async function retryPush(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (!job.commitSha) fail('还没有目标提交，无法重试推送', 409)
  if (TERMINAL_OK.has(job.state)) return publicJob(job)
  if (wasPushed(job)) {
    if (VERIFY_STATES.has(job.state) || (job.retryActions || []).includes('retry-verify')) {
      return retryVerification(ctx, jobId)
    }
    return publicJob(job)
  }
  if (!canRetryPush(job)) fail(`当前状态 ${job.state} 不能重试推送`, 409)
  return pushCommittedJob(ctx, job)
}

export async function retryVerification(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (!job.commitSha) fail('还没有目标提交，无法重试校验', 409)
  if (job.state === 'Published') return publicJob(job)
  if (!wasPushed(job)) fail('还没有推送到远端，请先重试推送', 409)
  job.state = 'Pushed'
  job.failureReason = null
  job.retryActions = []
  saveJob(ctx, job)
  await verifyProduction(ctx, job)
  return publicJob(job)
}

export function snapshotDist(ctx, jobId) {
  const job = loadJob(ctx, jobId)
  if (!job.distDir || !fs.existsSync(job.distDir)) fail('还没有发布前预览', 404)
  return job.distDir
}
