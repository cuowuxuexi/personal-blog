import fs from 'node:fs'
import path from 'node:path'
import { sha256File } from './hash.mjs'
import { createGit } from './git.mjs'
import {
  acquireCommitLock,
  canRetryPush,
  fail,
  failJob,
  releaseCommitLock,
  saveJob,
  TERMINAL_OK,
  wasPushed,
} from './publish-job-record.mjs'

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
  if (!expected.size) {
    fail('这次没有可提交的文件改动。正文和图片已与 main 一致时，确认发布不会生成空提交。', 409)
  }
  job.commitSha = await git.commit(job.commitMessage)
}

async function pushSnapshot(ctx, job, git) {
  await ctx.probes.push({ git, repoRoot: ctx.repoRoot, sha: job.commitSha })
  job.pushed = true
  job.state = 'Pushed'
  saveJob(ctx, job)
}

export async function executePublication(ctx, job) {
  if (TERMINAL_OK.has(job.state) || wasPushed(job)) return job
  if (!canRetryPush(job) && job.state !== 'PreviewReady') {
    fail(`当前状态 ${job.state} 不能执行发布`, 409)
  }
  acquireCommitLock(ctx, job)
  const git = createGit(ctx.repoRoot)
  try {
    job.failureReason = null
    job.retryActions = []
    if (!job.commitSha) {
      job.state = 'Confirmed'
      saveJob(ctx, job)
      job.state = 'Committing'
      saveJob(ctx, job)
      await commitSnapshot(ctx, job, git)
    } else {
      job.state = 'Committing'
      saveJob(ctx, job)
    }
    await pushSnapshot(ctx, job, git)
    return job
  } catch (error) {
    failJob(job, error, ctx)
    throw error
  } finally {
    releaseCommitLock(ctx, job)
  }
}
