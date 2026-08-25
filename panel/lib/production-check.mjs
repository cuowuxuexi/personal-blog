import {
  checkWechatAssetsForJob,
  fail,
  now,
  saveJob,
  TERMINAL_OK,
  VERIFY_STATES,
  wasPushed,
} from './publish-job-record.mjs'

function productionUrl(ctx, job) {
  const origin = ctx.productionOrigin.replace(/\/$/, '')
  const hash = job.headingAnchor ? `#${job.headingAnchor.replace(/^#/, '')}` : ''
  return `${origin}${job.articleUrl}${hash}`
}

function finalizeSummary(job) {
  job.summary = {
    files: job.manifest.map((item) => item.path),
    commitSha: job.commitSha,
    deployedAt: job.publishedAt,
    verifiedUrl: job.verifiedUrl,
    excluded: job.excluded,
  }
}

export function isProductionCheckOpen(job) {
  return VERIFY_STATES.has(job.state)
}

export async function checkProduction(ctx, job) {
  if (TERMINAL_OK.has(job.state) || ['Failed', 'Cancelled', 'Superseded'].includes(job.state)) {
    return job
  }
  if (!wasPushed(job) || !job.commitSha) {
    fail('还没有推送到远端，无法上线核对', 409)
  }
  if (job.verifying) return job
  job.verifying = true
  try {
    if (!job.deployed) {
      job.state = 'Deploying'
      job.failureReason = null
      saveJob(ctx, job)
      if (typeof ctx.probes.deploy === 'function') {
        await ctx.probes.deploy({
          snapshotDir: job.snapshotDir,
          repoRoot: ctx.repoRoot,
          sha: job.commitSha,
          expectedBaselineSha: job.baseSha,
          origin: ctx.productionOrigin,
        })
      }
      job.deployed = true
      saveJob(ctx, job)
    }
    const started = Date.now()
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
        if (job.wechatPreviewFile) {
          if ((job.wechatExternalAssetUrls || []).length) {
            await checkWechatAssetsForJob(ctx, job)
            if (job.wechatExternalAssetStatus === 'AssetsOnline') {
              job.wechatAssetStatus = 'ProductionVerified'
              job.wechatMissingAssets = []
            }
          } else {
            job.wechatAssetStatus = 'ProductionVerified'
            job.wechatMissingAssets = []
            job.wechatAssetCheckedAt = now()
          }
        }
        finalizeSummary(job)
        return saveJob(ctx, job)
      }
      if (version?.sha && version.sha !== job.commitSha && deploy?.state === 'superseded') {
        job.state = 'Superseded'
        job.failureReason = '国内站已切到另一个提交'
        job.retryActions = ['prepare']
        return saveJob(ctx, job)
      }
      await new Promise((resolve) => setTimeout(resolve, ctx.pollIntervalMs))
    }
    job.state = 'Failed'
    job.failureReason = '国内站校验超时，尚未返回目标提交'
    job.retryActions = ['retry-verify']
    return saveJob(ctx, job)
  } finally {
    job.verifying = false
  }
}

export async function continueProductionCheck(ctx, job) {
  if (TERMINAL_OK.has(job.state) || ['Failed', 'Cancelled', 'Superseded'].includes(job.state)) {
    return job
  }
  if (!isProductionCheckOpen(job)) {
    fail(`当前状态 ${job.state} 不能继续核对`, 409)
  }
  return checkProduction(ctx, job)
}

export async function retryProductionCheck(ctx, job) {
  if (!job.commitSha) fail('还没有目标提交，无法重试校验', 409)
  if (job.state === 'Published') return job
  if (!wasPushed(job)) fail('还没有推送到远端，请先重试推送', 409)
  job.state = 'Pushed'
  job.deployed = false
  job.failureReason = null
  job.retryActions = []
  saveJob(ctx, job)
  return checkProduction(ctx, job)
}
