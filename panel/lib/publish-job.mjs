import fs from 'node:fs'
import path from 'node:path'
import { newId, newToken, sha256File, sha256Text } from './hash.mjs'
import { createGit } from './git.mjs'
import { redact } from './redact.mjs'
import { assertPublishable, isAllowedPublishPath, isJourneyChapterPath, posixPath, publishScopeOf } from './scope.mjs'
import { collectReferencedImages } from './publish.mjs'
import { materializeWechatJpegCompanions } from './images.mjs'
import { buildWechatPreviewDocument, embedWechatClipboardImages, renderWechatPreview } from './wechat.mjs'
import { kindIdFromArticleUrl, withPreviewHash } from './preview-nav.mjs'
import { parseFrontmatter } from './weekly.mjs'

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

function kindRecord(ctx, kindId) {
  return ctx.paths?.KINDS?.[kindId] || null
}

function resolveDraftKindId(draft, fallbackUrl = '') {
  return draft.kindId || kindIdFromArticleUrl(draft.previewLink || draft.articleUrl || fallbackUrl || '')
}

function registeredKindId(ctx, draft, fallbackUrl = '') {
  const kindId = resolveDraftKindId(draft, fallbackUrl)
  if (!ctx.paths?.KINDS?.[kindId]) {
    fail(kindId ? `未知栏目：${kindId}` : '无法识别发布栏目', 422)
  }
  return kindId
}

function scopeOptions(ctx, kindId) {
  const kind = kindRecord(ctx, kindId)
  return {
    kindId,
    capability: kind?.capability,
    scope: publishScopeOf(kindId, kind?.capability),
  }
}

function assetDirectoryForKind(ctx, kindId) {
  return kindRecord(ctx, kindId)?.capability?.assetDirectory
    || (kindId === 'journey' ? 'docs/public/images/journey' : 'docs/public/images/weekly')
}

async function buildManifest(ctx, git, draft, statusRows, headFiles) {
  const repoRoot = ctx.repoRoot
  const kindId = registeredKindId(ctx, draft)
  const options = scopeOptions(ctx, kindId)
  const referenced = collectReferencedImages(
    draft.files,
    repoRoot,
    assetDirectoryForKind(ctx, kindId),
  ).map(posixPath)
  const jpegCompanions = (await materializeWechatJpegCompanions(referenced, repoRoot)).map(posixPath)
  const files = assertPublishable([
    ...draft.files,
    ...referenced,
    ...jpegCompanions,
  ], options)
  const unique = options.scope === 'journey'
    ? [...new Set([
      ...files.filter((file) => isJourneyChapterPath(file)),
      ...referenced,
      ...jpegCompanions,
    ])]
    : [...new Set(files)]
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
      inScope: isAllowedPublishPath(rel, options),
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

function isPublicationSourcePath(rel, kindId) {
  const file = posixPath(rel)
  if (!file.endsWith('.md')) return false
  if (kindId === 'journey' || file.startsWith('docs/AI与生活/我的AI历程/')) {
    return kindId === 'journey'
      && file.startsWith('docs/AI与生活/我的AI历程/')
      && !/\/index\.md$/i.test(file)
      && !/\/readme\.md$/i.test(file)
  }
  return file.startsWith('docs/AI与生活/') || file.startsWith('docs/投资/周记/')
}

function publicationSourceFile(snapshotDir, draft, kindId) {
  const candidates = (draft.files || [])
    .filter((rel) => isPublicationSourcePath(rel, kindId))
    .map((rel) => ({ rel, abs: path.join(snapshotDir, rel) }))
    .filter((item) => fs.existsSync(item.abs) && fs.statSync(item.abs).isFile())
  if (candidates.length !== 1) fail('公众号预览需要且只能包含一篇正文', 422)
  if (kindId === 'journey') {
    const { fm } = parseFrontmatter(fs.readFileSync(candidates[0].abs, 'utf8'))
    if (fm.type !== 'journey') fail('公众号预览只接受一篇 journey 正文', 422)
  }
  return candidates[0]
}

async function checkWechatAssetsForJob(ctx, job) {
  if (!job.wechatPreviewFile) return job
  job.wechatAssetStatus = 'CheckingAssets'
  saveJob(ctx, job)
  try {
    const result = await ctx.probes.onlineAssets({ urls: job.wechatAssetUrls || [] })
    job.wechatMissingAssets = result?.missing || []
    job.wechatAssetStatus = result?.ok === true ? 'AssetsOnline' : 'WaitingForOnlineAssets'
    const externalMissing = new Set(job.wechatMissingAssets)
    job.wechatExternalAssetStatus = (job.wechatExternalAssetUrls || [])
      .some((url) => externalMissing.has(url))
      ? 'WaitingForOnlineAssets'
      : 'AssetsOnline'
  } catch {
    job.wechatMissingAssets = job.wechatAssetUrls || []
    job.wechatAssetStatus = 'WaitingForOnlineAssets'
    job.wechatExternalAssetStatus = (job.wechatExternalAssetUrls || []).length
      ? 'WaitingForOnlineAssets'
      : 'AssetsOnline'
  }
  job.wechatAssetCheckedAt = now()
  return saveJob(ctx, job)
}

function clearWechatPreview(job) {
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

export async function preparePublication(ctx, { draftId, headingAnchor = '' }) {
  if (!draftId) fail('准备发布必须携带 draft ID')
  const draft = loadDraft(ctx, draftId)
  const git = createGit(ctx.repoRoot)
  const kindId = registeredKindId(ctx, draft)
  const scope = publishScopeOf(kindId, kindRecord(ctx, kindId)?.capability)
  const job = {
    id: newId('j'),
    draftId,
    kindId,
    state: 'Preparing',
    manifest: [],
    excluded: [],
    confirmationToken: newToken(),
    snapshotDir: '',
    distDir: '',
    releasePreviewUrl: '',
    wechatPreviewFile: '',
    wechatPreviewUrl: '',
    wechatAssetUrls: [],
    wechatExternalAssetUrls: [],
    wechatExternalAssetStatus: 'NotGenerated',
    wechatAssetStatus: 'NotGenerated',
    wechatAssetCheckedAt: null,
    wechatMissingAssets: [],
    articleUrl: draft.previewLink,
    headingAnchor: scope === 'journey' ? '' : (headingAnchor || ''),
    commitMessage: draft.commitHint || (scope === 'journey' ? 'journey: 发布面板更新' : 'weekly: 发布面板更新'),
    baseSha: '',
    commitSha: null,
    pushed: false,
    deployed: false,
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
    const source = publicationSourceFile(snapshotDir, draft, kindId)
    const wechat = renderWechatPreview({
      source: fs.readFileSync(source.abs, 'utf8'),
      kind: kindId,
      productionOrigin: ctx.productionOrigin,
      jobId: job.id,
    })
    const clipboard = await embedWechatClipboardImages(wechat.articleHtml, {
      snapshotDir,
      jobId: job.id,
    })
    const wechatHtml = buildWechatPreviewDocument({
      articleHtml: wechat.articleHtml,
      title: wechat.title,
      description: wechat.description,
      accent: wechat.accent,
      jobId: job.id,
      clipboard,
    })
    const wechatDir = path.join(snapshotDir, '.panel-wechat')
    fs.mkdirSync(wechatDir, { recursive: true })
    job.wechatPreviewFile = path.join(wechatDir, 'index.html')
    fs.writeFileSync(job.wechatPreviewFile, wechatHtml, 'utf8')
    job.wechatPreviewUrl = `/wechat-preview/${job.id}/`
    job.wechatAssetUrls = wechat.assetUrls
    job.wechatExternalAssetUrls = wechat.externalAssetUrls
    job.wechatExternalAssetStatus = wechat.externalAssetUrls.length
      ? 'WaitingForOnlineAssets'
      : 'AssetsOnline'
    job.wechatAssetStatus = 'WaitingForOnlineAssets'
    const contentFiles = (draft.files || [])
      .map(posixPath)
      .filter((rel) => isPublicationSourcePath(rel, kindId))
    const testResult = await ctx.probes.test({
      snapshotDir,
      repoRoot: ctx.repoRoot,
      kindId,
      contentFiles,
    })
    if (testResult && testResult.ok === false) fail(testResult.error || '测试失败', 422)
    const previewBase = `/release-preview/${job.id}/`
    const built = await ctx.probes.build({
      snapshotDir,
      repoRoot: ctx.repoRoot,
      previewBase,
      previewPath: draft.previewLink,
      headingAnchor: job.headingAnchor,
    })
    job.distDir = built.distDir
    writePreviewBuildMeta(job.distDir, job.id)
    const previewHash = job.headingAnchor ? `#${job.headingAnchor.replace(/^#/, '')}` : ''
    job.releasePreviewUrl = `/release-preview/${job.id}${draft.previewLink}${previewHash}`
    job.state = 'PreviewReady'
    saveJob(ctx, job)
    await checkWechatAssetsForJob(ctx, job)
    return publicJob(job, { includeToken: true })
  } catch (error) {
    clearWechatPreview(job)
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
  if (!expected.size) {
    fail('这次没有可提交的文件改动。正文和图片已与 main 一致时，确认发布不会生成空提交。', 409)
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
        finalizeSummary(job, ctx)
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
  job.deployed = false
  job.failureReason = null
  job.retryActions = []
  saveJob(ctx, job)
  await verifyProduction(ctx, job)
  return publicJob(job)
}

export async function checkWechatAssets(ctx, jobId) {
  recoverInterrupted(ctx)
  const job = loadJob(ctx, jobId)
  if (!job.wechatPreviewFile) fail('还没有公众号预览', 404)
  await checkWechatAssetsForJob(ctx, job)
  return publicJob(job, { includeToken: job.state === 'PreviewReady' })
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
