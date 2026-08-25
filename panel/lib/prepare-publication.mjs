import fs from 'node:fs'
import path from 'node:path'
import { newId, newToken, sha256File, sha256Text } from './hash.mjs'
import { createGit } from './git.mjs'
import { assetRulesFor } from '../../content-catalog/index.mjs'
import { catalogIdForPanelKind } from './content-kind-adapter.mjs'
import { assertPublishable, isAllowedPublishPath, isJourneyChapterPath, isPublicationSourcePath, posixPath, publishScopeOf } from './scope.mjs'
import { collectReferencedImages } from './publish.mjs'
import { materializeWechatJpegCompanions } from './images.mjs'
import { buildWechatPreviewDocument, embedWechatClipboardImages, renderWechatPreview } from './wechat.mjs'
import { kindIdFromArticleUrl } from './preview-nav.mjs'
import { parseFrontmatter } from './weekly.mjs'
import { redact } from './redact.mjs'
import {
  checkWechatAssetsForJob,
  clearWechatPreview,
  fail,
  loadDraft,
  now,
  publicJob,
  saveJob,
} from './publish-job-record.mjs'

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
    || assetRulesFor(catalogIdForPanelKind(kindId)).directory
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
    const ready = publicJob(job, { includeToken: true })
    void checkWechatAssetsForJob(ctx, job).catch(() => {})
    return ready
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
