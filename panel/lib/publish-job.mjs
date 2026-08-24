import { preparePublication } from './prepare-publication.mjs'
import { executePublication } from './execute-publication.mjs'
import {
  checkProduction,
  continueProductionCheck,
  retryProductionCheck,
  isProductionCheckOpen,
} from './production-check.mjs'
import {
  canRetryPush,
  checkWechatAssets,
  fail,
  failJob,
  IDEMPOTENT_STATES,
  listRecoverableJobs,
  loadJob,
  publicJob,
  recoverInterrupted,
  snapshotDist,
  snapshotWechatPreview,
  snapshotWechatPublic,
  TERMINAL_OK,
  wasPushed,
} from './publish-job-record.mjs'

export {
  checkWechatAssets,
  executePublication,
  listRecoverableJobs,
  preparePublication,
  publicJob,
  snapshotDist,
  snapshotWechatPreview,
  snapshotWechatPublic,
}

export { checkProduction as verifyProduction }

async function runCheck(ctx, job) {
  try {
    await checkProduction(ctx, job)
    return publicJob(job)
  } catch (error) {
    failJob(job, error, ctx)
    throw error
  }
}

async function executeThenCheck(ctx, job) {
  await executePublication(ctx, job)
  return runCheck(ctx, job)
}

export async function confirmPublication(ctx, { jobId, confirmationToken }) {
  if (!jobId || !confirmationToken) fail('确认发布必须携带 job ID 和确认令牌')
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (job.confirmationToken !== confirmationToken) fail('确认令牌无效或已过期', 409)
  if (TERMINAL_OK.has(job.state)) return publicJob(job)
  if (IDEMPOTENT_STATES.has(job.state) && wasPushed(job)) {
    if (isProductionCheckOpen(job)) return runCheck(ctx, job)
    return publicJob(job)
  }
  if (canRetryPush(job) || job.state === 'PreviewReady') {
    return executeThenCheck(ctx, job)
  }
  fail(`当前状态 ${job.state} 不能确认发布`, 409)
}

export async function getPublication(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  return publicJob(job, { includeToken: job.state === 'PreviewReady' })
}

export async function continueVerify(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (TERMINAL_OK.has(job.state) || ['Failed', 'Cancelled', 'Superseded'].includes(job.state)) {
    return publicJob(job, { includeToken: job.state === 'PreviewReady' })
  }
  try {
    await continueProductionCheck(ctx, job)
    return publicJob(job, { includeToken: job.state === 'PreviewReady' })
  } catch (error) {
    if (error.status === 409 && !wasPushed(job)) throw error
    failJob(job, error, ctx)
    throw error
  }
}

export async function retryPush(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (!job.commitSha) fail('还没有目标提交，无法重试推送', 409)
  if (TERMINAL_OK.has(job.state)) return publicJob(job)
  if (wasPushed(job)) {
    if (isProductionCheckOpen(job) || (job.retryActions || []).includes('retry-verify')) {
      return retryVerification(ctx, jobId)
    }
    return publicJob(job)
  }
  if (!canRetryPush(job)) fail(`当前状态 ${job.state} 不能重试推送`, 409)
  return executeThenCheck(ctx, job)
}

export async function retryVerification(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  await retryProductionCheck(ctx, job)
  return publicJob(job)
}
