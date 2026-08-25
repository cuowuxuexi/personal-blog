import fs from 'node:fs'
import path from 'node:path'
import { redact } from './redact.mjs'
import { kindIdFromArticleUrl, withPreviewHash } from './preview-nav.mjs'

export const VERIFY_STATES = new Set(['Pushed', 'Deploying', 'VerifyingProduction'])
export const TERMINAL_OK = new Set(['Published'])
export const IDEMPOTENT_STATES = new Set([
  'Confirmed', 'Committing', 'Pushed', 'Deploying', 'VerifyingProduction', 'Published',
])

export function fail(message, status = 400) {
  const error = new Error(message)
  error.status = status
  throw error
}

export function now() {
  return new Date().toISOString()
}

function wechatPublicState(job) {
  const generated = Boolean(job.wechatPreviewFile)
  const published = job.state === 'Published'
  const externalAssetsReady = !job.wechatExternalAssetUrls?.length
    || job.wechatExternalAssetStatus === 'AssetsOnline'
  const status = published && generated && externalAssetsReady
    ? 'ProductionVerified'
    : (job.wechatAssetStatus || 'NotGenerated')
  return {
    url: generated ? job.wechatPreviewUrl : '',
    status,
    copyAllowed: generated && (
      job.wechatAssetStatus === 'AssetsOnline'
      || (published && externalAssetsReady)
    ),
    checkedAt: job.wechatAssetCheckedAt || null,
    missingAssets: job.wechatMissingAssets || [],
  }
}

export function publicJob(job, { includeToken = false } = {}) {
  const tokenVisible = includeToken && job.state === 'PreviewReady'
  return {
    jobId: job.id,
    draftId: job.draftId,
    kindId: job.kindId || kindIdFromArticleUrl(job.articleUrl || job.releasePreviewUrl || ''),
    state: job.state,
    manifest: job.manifest,
    excluded: job.excluded,
    releasePreviewUrl: withPreviewHash(job.releasePreviewUrl, job),
    wechatPreview: wechatPublicState(job),
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

export function saveJob(ctx, job) {
  job.updatedAt = now()
  ctx.jobs.set(job.id, job)
  return job
}

export function loadJob(ctx, jobId) {
  const job = ctx.jobs.get(jobId)
  if (!job) fail('找不到该发布任务', 404)
  return job
}

export function loadDraft(ctx, draftId) {
  const draft = ctx.drafts.get(draftId)
  if (!draft) fail('找不到该草稿，请先保存', 404)
  return draft
}

export function wasPushed(job) {
  return Boolean(job.pushed) || VERIFY_STATES.has(job.state) || job.state === 'Published'
}

export function canRetryPush(job) {
  return Boolean(job.commitSha) && !wasPushed(job)
    && ['Confirmed', 'Committing', 'Failed'].includes(job.state)
}

export function recoverInterrupted(ctx) {
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

export function acquireCommitLock(ctx, job) {
  if (ctx.lock.committingJobId && ctx.lock.committingJobId !== job.id) {
    fail('已有发布任务正在提交，请稍后再试', 409)
  }
  ctx.lock.committingJobId = job.id
}

export function releaseCommitLock(ctx, job) {
  if (ctx.lock.committingJobId === job.id) ctx.lock.committingJobId = null
}

export function failJob(job, error, ctx) {
  job.state = 'Failed'
  job.failureReason = redact(error.message)
  job.retryActions = wasPushed(job) ? ['retry-verify'] : (job.commitSha ? ['retry-push'] : ['prepare'])
  saveJob(ctx, job)
  error.message = job.failureReason
  if (!error.status) error.status = 409
}

function wechatCheckFlights(ctx) {
  if (!ctx.lock.wechatChecks) ctx.lock.wechatChecks = new Map()
  return ctx.lock.wechatChecks
}

const WECHAT_PATCH_FIELDS = [
  'wechatMissingAssets',
  'wechatAssetStatus',
  'wechatExternalAssetStatus',
  'wechatAssetCheckedAt',
]

function applyWechatFields(target, source) {
  for (const key of WECHAT_PATCH_FIELDS) {
    if (Object.hasOwn(source, key)) target[key] = source[key]
  }
  return target
}

function patchWechatFields(ctx, jobId, fields, mirror) {
  const latest = loadJob(ctx, jobId)
  applyWechatFields(latest, fields)
  saveJob(ctx, latest)
  if (mirror) applyWechatFields(mirror, latest)
  return latest
}

export async function checkWechatAssetsForJob(ctx, job) {
  if (!job.wechatPreviewFile) return job
  const flights = wechatCheckFlights(ctx)
  const existing = flights.get(job.id)
  if (existing) {
    await existing
    applyWechatFields(job, loadJob(ctx, job.id))
    return job
  }

  const run = (async () => {
    try {
      patchWechatFields(ctx, job.id, { wechatAssetStatus: 'CheckingAssets' }, job)
      const current = loadJob(ctx, job.id)
      const urls = current.wechatAssetUrls || []
      const externalUrls = current.wechatExternalAssetUrls || []
      let wechatMissingAssets
      let wechatAssetStatus
      let wechatExternalAssetStatus
      try {
        const result = await ctx.probes.onlineAssets({ urls })
        wechatMissingAssets = result?.missing || []
        wechatAssetStatus = result?.ok === true ? 'AssetsOnline' : 'WaitingForOnlineAssets'
        const externalMissing = new Set(wechatMissingAssets)
        wechatExternalAssetStatus = externalUrls.some((url) => externalMissing.has(url))
          ? 'WaitingForOnlineAssets'
          : 'AssetsOnline'
      } catch {
        wechatMissingAssets = urls
        wechatAssetStatus = 'WaitingForOnlineAssets'
        wechatExternalAssetStatus = externalUrls.length
          ? 'WaitingForOnlineAssets'
          : 'AssetsOnline'
      }
      const latest = loadJob(ctx, job.id)
      if (latest.state === 'Published' && latest.wechatAssetStatus === 'ProductionVerified') {
        applyWechatFields(job, latest)
        return job
      }
      return patchWechatFields(ctx, job.id, {
        wechatMissingAssets,
        wechatAssetStatus,
        wechatExternalAssetStatus,
        wechatAssetCheckedAt: now(),
      }, job)
    } finally {
      flights.delete(job.id)
    }
  })()

  flights.set(job.id, run)
  return run
}

export function clearWechatPreview(job) {
  const previewDir = job.wechatPreviewFile ? path.dirname(job.wechatPreviewFile) : ''
  if (previewDir) {
    try {
      fs.rmSync(previewDir, { recursive: true, force: true })
    } catch {
      // Keep the original preparation failure while still clearing public fields.
    }
  }
  job.wechatPreviewFile = ''
  job.wechatPreviewUrl = ''
  job.wechatAssetUrls = []
  job.wechatExternalAssetUrls = []
  job.wechatExternalAssetStatus = 'NotGenerated'
  job.wechatAssetStatus = 'NotGenerated'
  job.wechatAssetCheckedAt = null
  job.wechatMissingAssets = []
}

export function listRecoverableJobs(ctx) {
  recoverInterrupted(ctx)
  return ctx.jobs.values()
    .filter((job) => !['Published', 'Failed', 'Cancelled', 'Superseded'].includes(job.state)
      || job.updatedAt > new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .map((job) => publicJob(job, { includeToken: true }))
}

export function snapshotWechatPreview(ctx, jobId) {
  const job = loadJob(ctx, jobId)
  if (!job.wechatPreviewFile || !fs.existsSync(job.wechatPreviewFile)) fail('还没有公众号预览', 404)
  return job.wechatPreviewFile
}

export function snapshotWechatPublic(ctx, jobId) {
  const job = loadJob(ctx, jobId)
  const publicRoot = path.join(job.snapshotDir || '', 'docs', 'public')
  if (!job.snapshotDir || !fs.existsSync(publicRoot)) fail('还没有公众号预览资源', 404)
  return publicRoot
}

export function snapshotDist(ctx, jobId) {
  const job = loadJob(ctx, jobId)
  if (!job.distDir || !fs.existsSync(job.distDir)) fail('还没有发布前预览', 404)
  return job.distDir
}

export async function checkWechatAssets(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (!job.wechatPreviewFile) fail('还没有公众号预览', 404)
  await checkWechatAssetsForJob(ctx, job)
  const latest = loadJob(ctx, jobId)
  return publicJob(latest, { includeToken: latest.state === 'PreviewReady' })
}
