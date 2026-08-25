import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { sha256File, sha256Text } from './hash.mjs'

export const DEFAULT_PRODUCTION_ORIGIN = 'https://cuowo.cn'
export const DEFAULT_GUONEI_HOST = '100.88.115.43'
export const DEFAULT_GUONEI_USER = 'root'
export const DEFAULT_GUONEI_SITE_DIR = '/var/www/blog'
export const DEFAULT_GUONEI_REMOTE_TAR = '/tmp/blog-dist.tar'
export const DEFAULT_IDENTITY_NAME = 'id_ed25519_servers'
export const DIST_MANIFEST_NAME = '.panel-dist-manifest.json'
export const DIST_ARCHIVE_NAME = 'blog-dist.tar'
export const DEPLOY_LOCK_SUFFIX = '.deploy-lock'

const SKIP_DIST_NAMES = new Set([
  DIST_ARCHIVE_NAME,
  DIST_MANIFEST_NAME,
])
const SKIP_DIST_SEGMENTS = new Set([
  'release-preview',
  '.panel-production-candidate',
  '.panel-preview-dist',
  '.panel-wechat',
  '.panel-production-dist',
])

const HOST_RE = /^[A-Za-z0-9.:-]+$/
const USER_RE = /^[A-Za-z0-9._-]+$/
const ABS_UNIX_RE = /^\/[A-Za-z0-9._/-]+$/

export function defaultIdentityFile(env = process.env) {
  const home = env.USERPROFILE || env.HOME || os.homedir()
  if (!home) return ''
  const candidate = path.join(home, '.ssh', DEFAULT_IDENTITY_NAME)
  return fs.existsSync(candidate) ? candidate : ''
}

export function readGuoneiConfig(env = process.env) {
  const host = String(env.PANEL_GUONEI_HOST || DEFAULT_GUONEI_HOST).trim()
  const user = String(env.PANEL_GUONEI_USER || DEFAULT_GUONEI_USER).trim()
  const identityFile = String(env.PANEL_GUONEI_KEY || '').trim() || defaultIdentityFile(env)
  const siteDir = String(env.PANEL_GUONEI_SITE_DIR || DEFAULT_GUONEI_SITE_DIR).trim()
  const remoteTar = String(env.PANEL_GUONEI_REMOTE_TAR || DEFAULT_GUONEI_REMOTE_TAR).trim()
  return {
    host,
    user,
    identityFile,
    siteDir,
    remoteTar,
    enabled: Boolean(host && user && identityFile && fs.existsSync(identityFile)),
  }
}

function assertSafeUnixPath(value, label, { mustEndWithTar = false } = {}) {
  if (!ABS_UNIX_RE.test(value || '') || String(value).includes('..')) {
    throw new Error(`${label}不合法`)
  }
  if (mustEndWithTar && !String(value).endsWith('.tar')) throw new Error(`${label}不合法`)
}

export function assertSafeDistRelPath(value) {
  const rel = String(value || '')
  if (!rel || rel.startsWith('/') || rel.includes('\\') || rel.includes('..')) {
    throw new Error('国内站产物路径不合法')
  }
  if (/[\r\n\0'"`;$|&<>]/.test(rel) || /^[A-Za-z]:/.test(rel) || path.isAbsolute(rel)) {
    throw new Error('国内站产物路径不合法')
  }
  const parts = rel.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error('国内站产物路径不合法')
  }
  return rel
}

export function assertSafeSha256Hex(value) {
  const digest = String(value || '')
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('国内站清单摘要不合法')
  return digest
}

export function productionDeployLockDir(siteDir) {
  assertSafeUnixPath(siteDir, '国内站站点目录')
  const lockDir = `${siteDir}${DEPLOY_LOCK_SUFFIX}`
  assertSafeUnixPath(lockDir, '国内站部署锁')
  return lockDir
}

function withProductionDeployLock(siteDir, commands) {
  const lockDir = productionDeployLockDir(siteDir)
  return [`mkdir ${lockDir}`, `trap 'rmdir ${lockDir}' EXIT`, ...commands].join(' && ')
}

export function productionManifestGuardCommand({ siteDir, manifestDigest } = {}) {
  assertSafeUnixPath(siteDir, '国内站站点目录')
  const digest = assertSafeSha256Hex(manifestDigest)
  return `test "$(sha256sum < ${siteDir}/${DIST_MANIFEST_NAME} | awk '{print $1}')" = '${digest}'`
}

export function assertSafeGuoneiConfig(config) {
  if (!HOST_RE.test(config.host || '')) throw new Error('国内站 SSH 主机不合法')
  if (!USER_RE.test(config.user || '')) throw new Error('国内站 SSH 用户不合法')
  assertSafeUnixPath(config.siteDir, '国内站站点目录')
  assertSafeUnixPath(config.remoteTar, '国内站远程归档路径', { mustEndWithTar: true })
  if (!config.identityFile || !fs.existsSync(config.identityFile)) {
    throw new Error('未找到国内站 SSH 私钥。请在 .env 设置 PANEL_GUONEI_KEY，或把 id_ed25519_servers 放到本机 .ssh')
  }
  return config
}

export const PRODUCTION_CANDIDATE_DIRNAME = '.panel-production-candidate'
const RELEASE_PREVIEW_MARK = '/release-preview/'

export function productionCandidateDir(snapshotDir) {
  return path.join(snapshotDir, PRODUCTION_CANDIDATE_DIRNAME)
}

function htmlFilesUnder(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return htmlFilesUnder(full)
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : []
  })
}

export function persistProductionCandidate({ snapshotDir, rootDistDir }) {
  if (!snapshotDir) throw new Error('生产候选缺少 snapshotDir')
  if (!rootDistDir || !fs.existsSync(rootDistDir)) {
    throw new Error('生产候选缺少未 merge 的根构建')
  }
  const dest = productionCandidateDir(snapshotDir)
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(rootDistDir, dest, { recursive: true })
  return dest
}

export function isUsableProductionCandidate(snapshotDir) {
  const dir = productionCandidateDir(snapshotDir)
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false
    const indexFile = path.join(dir, 'index.html')
    if (!fs.existsSync(indexFile) || !fs.statSync(indexFile).isFile()) return false
    const html = fs.readFileSync(indexFile, 'utf8')
    if (!html.trim()) return false
    for (const file of htmlFilesUnder(dir)) {
      if (fs.readFileSync(file, 'utf8').includes(RELEASE_PREVIEW_MARK)) return false
    }
    const metaFile = path.join(dir, 'build.json')
    if (fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
      if (!meta || meta.sha == null || meta.jobId) return false
    }
    return true
  } catch {
    return false
  }
}

export function writeProductionBuildMeta(distDir, { sha, builtAt } = {}) {
  if (!sha) throw new Error('write-build-metadata: missing sha')
  fs.mkdirSync(distDir, { recursive: true })
  const payload = { sha, builtAt: builtAt || new Date().toISOString() }
  fs.writeFileSync(path.join(distDir, 'build.json'), `${JSON.stringify(payload)}\n`, 'utf8')
  return payload
}

function shouldSkipDistRel(rel) {
  const parts = rel.split('/')
  if (SKIP_DIST_NAMES.has(parts.at(-1))) return true
  return parts.some((part) => SKIP_DIST_SEGMENTS.has(part))
}

function listDistFiles(distDir) {
  const files = []
  const walk = (current, prefix = '') => {
    if (!fs.existsSync(current)) return
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (shouldSkipDistRel(rel)) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full, rel)
      else if (entry.isFile()) files.push(rel)
    }
  }
  walk(distDir)
  return files.sort()
}

export function measureDistPayloadBytes(distDir) {
  return listDistFiles(distDir).reduce((total, rel) => {
    const file = path.join(distDir, rel)
    return total + (fs.existsSync(file) ? fs.statSync(file).size : 0)
  }, 0) + (
    fs.existsSync(path.join(distDir, DIST_MANIFEST_NAME))
      ? fs.statSync(path.join(distDir, DIST_MANIFEST_NAME)).size
      : 0
  )
}

export function buildDistManifest(distDir, { sha } = {}) {
  const files = {}
  for (const rel of listDistFiles(distDir)) {
    assertSafeDistRelPath(rel)
    files[rel] = sha256File(path.join(distDir, rel))
  }
  return {
    version: 1,
    algorithm: 'sha256',
    sha: sha || null,
    files,
  }
}

export function writeDistManifest(distDir, manifest) {
  const files = {}
  for (const key of Object.keys(manifest.files || {}).sort()) files[key] = manifest.files[key]
  const payload = {
    version: 1,
    algorithm: 'sha256',
    sha: manifest.sha || null,
    files,
  }
  fs.writeFileSync(path.join(distDir, DIST_MANIFEST_NAME), `${JSON.stringify(payload)}\n`, 'utf8')
  return payload
}

export function parseRemoteManifest(text) {
  try {
    if (!String(text || '').trim()) return { ok: false }
    const data = JSON.parse(text)
    if (data.version !== 1 || data.algorithm !== 'sha256' || !data.sha || !data.files || typeof data.files !== 'object') {
      return { ok: false }
    }
    for (const [rel, hash] of Object.entries(data.files)) {
      assertSafeDistRelPath(rel)
      if (!/^[a-f0-9]{64}$/i.test(String(hash || ''))) return { ok: false }
    }
    return { ok: true, manifest: data }
  } catch {
    return { ok: false }
  }
}

export function diffDistManifests(previous, next) {
  const prevFiles = previous?.files || {}
  const nextFiles = next?.files || {}
  const added = []
  const changed = []
  const deleted = []
  const kept = []
  for (const rel of Object.keys(nextFiles).sort()) {
    if (!(rel in prevFiles)) added.push(rel)
    else if (prevFiles[rel] !== nextFiles[rel]) changed.push(rel)
    else kept.push(rel)
  }
  for (const rel of Object.keys(prevFiles).sort()) {
    if (!(rel in nextFiles)) deleted.push(rel)
  }
  return { added, changed, deleted, kept }
}

export function productionSwapCommands({
  siteDir = DEFAULT_GUONEI_SITE_DIR,
  remoteTar = DEFAULT_GUONEI_REMOTE_TAR,
} = {}) {
  assertSafeUnixPath(siteDir, '国内站站点目录')
  assertSafeUnixPath(remoteTar, '国内站远程归档路径', { mustEndWithTar: true })
  return withProductionDeployLock(siteDir, [
    `rm -rf ${siteDir}.new ${siteDir}.old`,
    `mkdir -p ${siteDir}.new`,
    `tar -xf ${remoteTar} -C ${siteDir}.new`,
    `rm -f ${siteDir}.new/blog-dist.tar`,
    `if [ -d ${siteDir} ]; then mv ${siteDir} ${siteDir}.old; fi`,
    `mv ${siteDir}.new ${siteDir}`,
    `chown -R nginx:nginx ${siteDir}`,
    `chmod -R a+rX ${siteDir}`,
  ])
}

export function productionDeltaSwapCommands({
  siteDir = DEFAULT_GUONEI_SITE_DIR,
  remoteTar = DEFAULT_GUONEI_REMOTE_TAR,
  deletions = [],
  manifestDigest,
} = {}) {
  assertSafeUnixPath(siteDir, '国内站站点目录')
  assertSafeUnixPath(remoteTar, '国内站远程归档路径', { mustEndWithTar: true })
  const guard = productionManifestGuardCommand({ siteDir, manifestDigest })
  const removes = deletions.map((rel) => {
    const safeRel = assertSafeDistRelPath(rel)
    return `rm -f -- '${siteDir}.new/${safeRel}'`
  })
  return withProductionDeployLock(siteDir, [
    guard,
    `rm -rf ${siteDir}.new ${siteDir}.old`,
    `if [ -d ${siteDir} ]; then cp -a ${siteDir} ${siteDir}.new; else mkdir -p ${siteDir}.new; fi`,
    `tar -xf ${remoteTar} -C ${siteDir}.new`,
    `rm -f ${siteDir}.new/${DIST_ARCHIVE_NAME}`,
    ...removes,
    `if [ -d ${siteDir} ]; then mv ${siteDir} ${siteDir}.old; fi`,
    `mv ${siteDir}.new ${siteDir}`,
    `chown -R nginx:nginx ${siteDir}`,
    `chmod -R a+rX ${siteDir}`,
  ])
}

function readDistBuildSha(distDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(distDir, 'build.json'), 'utf8')).sha || null
  } catch {
    return null
  }
}

export async function packDistArchive(distDir, {
  run,
  archiveName = DIST_ARCHIVE_NAME,
} = {}) {
  if (typeof run !== 'function') throw new Error('打包国内站产物缺少 run')
  const archivePath = path.join(distDir, archiveName)
  if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true })
  await run('tar', [
    '-cf', archiveName,
    '--exclude', archiveName,
    '--exclude', 'release-preview',
    '--exclude', '.panel-production-candidate',
    '--exclude', '.panel-preview-dist',
    '--exclude', '.panel-wechat',
    '.',
  ], { cwd: distDir })
  if (!fs.existsSync(archivePath)) throw new Error('打包国内站产物失败')
  return archivePath
}

function sshOptsOf(safe) {
  return [
    '-i', safe.identityFile,
    '-o', 'BatchMode=yes',
    '-o', 'IdentitiesOnly=yes',
    '-o', 'ConnectTimeout=20',
  ]
}

function sshTarget(safe) {
  return `${safe.user}@${safe.host}`
}

async function fetchRemoteBaseline({ safe, run, timeout }) {
  const opts = sshOptsOf(safe)
  const target = sshTarget(safe)
  try {
    const listed = await run('ssh', [...opts, target, `cat ${safe.siteDir}/${DIST_MANIFEST_NAME}`], { timeout })
    const manifestText = listed?.stdout || ''
    const parsed = parseRemoteManifest(manifestText)
    if (!parsed.ok) return null
    const manifestDigest = sha256Text(manifestText)
    assertSafeSha256Hex(manifestDigest)
    const build = await run('ssh', [...opts, target, `cat ${safe.siteDir}/build.json`], { timeout })
    const meta = JSON.parse(build?.stdout || '')
    return {
      manifest: parsed.manifest,
      buildSha: meta?.sha || null,
      manifestText,
      manifestDigest,
    }
  } catch {
    return null
  }
}

function isTrustedBaseline(remote, expectedBaselineSha) {
  if (!remote?.manifest?.sha) return false
  if (expectedBaselineSha && remote.manifest.sha !== expectedBaselineSha) return false
  if (remote.buildSha && remote.manifest.sha !== remote.buildSha) return false
  if (expectedBaselineSha && remote.buildSha && remote.buildSha !== expectedBaselineSha) return false
  return true
}

function copyRelFile(fromDir, toDir, rel) {
  const safeRel = assertSafeDistRelPath(rel)
  const src = path.join(fromDir, ...safeRel.split('/'))
  const dest = path.join(toDir, ...safeRel.split('/'))
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

async function uploadFull({ distDir, safe, run, timeout }) {
  const archivePath = await packDistArchive(distDir, { run })
  const opts = sshOptsOf(safe)
  try {
    await run('scp', [...opts, archivePath, `${sshTarget(safe)}:${safe.remoteTar}`], { timeout })
    await run('ssh', [...opts, sshTarget(safe), productionSwapCommands(safe)], { timeout })
  } finally {
    if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true })
  }
}

async function uploadDelta({ distDir, manifest, diff, safe, run, timeout, manifestDigest }) {
  for (const rel of [...diff.added, ...diff.changed, ...diff.deleted]) {
    assertSafeDistRelPath(rel)
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-guonei-delta-'))
  try {
    for (const rel of [...diff.added, ...diff.changed]) {
      copyRelFile(distDir, stage, rel)
    }
    writeDistManifest(stage, manifest)
    const deltaBytes = measureDistPayloadBytes(stage)
    const archivePath = await packDistArchive(stage, { run })
    const opts = sshOptsOf(safe)
    try {
      await run('scp', [...opts, archivePath, `${sshTarget(safe)}:${safe.remoteTar}`], { timeout })
      await run('ssh', [...opts, sshTarget(safe), productionDeltaSwapCommands({
        siteDir: safe.siteDir,
        remoteTar: safe.remoteTar,
        deletions: diff.deleted,
        manifestDigest,
      })], { timeout })
    } finally {
      if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true })
    }
    return { deltaBytes }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true })
  }
}

export async function uploadDist({
  distDir,
  config,
  run,
  timeout = 300000,
  sha,
  expectedBaselineSha,
} = {}) {
  const safe = assertSafeGuoneiConfig(config)
  if (typeof run !== 'function') throw new Error('上传国内站缺少 run')
  const nextSha = sha || readDistBuildSha(distDir)
  const nextManifest = writeDistManifest(distDir, buildDistManifest(distDir, { sha: nextSha }))
  const fullBytes = measureDistPayloadBytes(distDir)
  const remote = await fetchRemoteBaseline({ safe, run, timeout })
  let diff = { added: [], changed: [], deleted: [], kept: [] }
  if (isTrustedBaseline(remote, expectedBaselineSha)) {
    try {
      diff = diffDistManifests(remote.manifest, nextManifest)
      const packed = await uploadDelta({
        distDir,
        manifest: nextManifest,
        diff,
        safe,
        run,
        timeout,
        manifestDigest: remote.manifestDigest,
      })
      return {
        mode: 'delta',
        added: diff.added,
        changed: diff.changed,
        deleted: diff.deleted,
        fullBytes,
        deltaBytes: packed.deltaBytes,
        ratio: fullBytes ? packed.deltaBytes / fullBytes : 1,
      }
    } catch {
      // fail-closed: incremental prepare/apply errors fall back to full tar
    }
  }
  await uploadFull({ distDir, safe, run, timeout })
  return {
    mode: 'full',
    added: diff.added,
    changed: diff.changed,
    deleted: diff.deleted,
    fullBytes,
    deltaBytes: fullBytes,
    ratio: 1,
  }
}

export async function prepareProductionDist({ snapshotDir, sha, builtAt, build }) {
  if (!sha) throw new Error('国内站构建缺少提交 SHA')
  if (typeof build !== 'function') throw new Error('国内站构建缺少 build')
  const liveDist = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
  const previewHold = path.join(snapshotDir, '.panel-preview-dist')
  const productionHold = path.join(snapshotDir, '.panel-production-dist')

  if (fs.existsSync(previewHold)) fs.rmSync(previewHold, { recursive: true, force: true })
  if (fs.existsSync(liveDist)) fs.cpSync(liveDist, previewHold, { recursive: true })

  try {
    if (isUsableProductionCandidate(snapshotDir)) {
      if (fs.existsSync(productionHold)) fs.rmSync(productionHold, { recursive: true, force: true })
      fs.cpSync(productionCandidateDir(snapshotDir), productionHold, { recursive: true })
      writeProductionBuildMeta(productionHold, { sha, builtAt })
    } else {
      const built = await build({ snapshotDir, previewBase: '/' })
      const distDir = built?.distDir || liveDist
      writeProductionBuildMeta(distDir, { sha, builtAt })
      if (fs.existsSync(productionHold)) fs.rmSync(productionHold, { recursive: true, force: true })
      fs.cpSync(distDir, productionHold, { recursive: true })
    }
  } catch (error) {
    restoreHeldDist(previewHold, liveDist)
    throw error
  }

  restoreHeldDist(previewHold, liveDist)
  return productionHold
}

function restoreHeldDist(holdDir, liveDist) {
  if (!fs.existsSync(holdDir)) return
  if (fs.existsSync(liveDist)) fs.rmSync(liveDist, { recursive: true, force: true })
  fs.renameSync(holdDir, liveDist)
}
