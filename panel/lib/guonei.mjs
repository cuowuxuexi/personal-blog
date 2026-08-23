import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const DEFAULT_PRODUCTION_ORIGIN = 'https://cuowo.cn'
export const DEFAULT_GUONEI_HOST = '100.88.115.43'
export const DEFAULT_GUONEI_USER = 'root'
export const DEFAULT_GUONEI_SITE_DIR = '/var/www/blog'
export const DEFAULT_GUONEI_REMOTE_TAR = '/tmp/blog-dist.tar'
export const DEFAULT_IDENTITY_NAME = 'id_ed25519_servers'

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

export function writeProductionBuildMeta(distDir, { sha, builtAt } = {}) {
  if (!sha) throw new Error('write-build-metadata: missing sha')
  fs.mkdirSync(distDir, { recursive: true })
  const payload = { sha, builtAt: builtAt || new Date().toISOString() }
  fs.writeFileSync(path.join(distDir, 'build.json'), `${JSON.stringify(payload)}\n`, 'utf8')
  return payload
}

export function productionSwapCommands({
  siteDir = DEFAULT_GUONEI_SITE_DIR,
  remoteTar = DEFAULT_GUONEI_REMOTE_TAR,
} = {}) {
  assertSafeUnixPath(siteDir, '国内站站点目录')
  assertSafeUnixPath(remoteTar, '国内站远程归档路径', { mustEndWithTar: true })
  return [
    `rm -rf ${siteDir}.new ${siteDir}.old`,
    `mkdir -p ${siteDir}.new`,
    `tar -xf ${remoteTar} -C ${siteDir}.new`,
    `rm -f ${siteDir}.new/blog-dist.tar`,
    `if [ -d ${siteDir} ]; then mv ${siteDir} ${siteDir}.old; fi`,
    `mv ${siteDir}.new ${siteDir}`,
    `chown -R nginx:nginx ${siteDir}`,
    `chmod -R a+rX ${siteDir}`,
  ].join(' && ')
}

export async function packDistArchive(distDir, {
  run,
  archiveName = 'blog-dist.tar',
} = {}) {
  if (typeof run !== 'function') throw new Error('打包国内站产物缺少 run')
  const archivePath = path.join(distDir, archiveName)
  if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true })
  await run('tar', ['-cf', archiveName, '--exclude', archiveName, '.'], { cwd: distDir })
  if (!fs.existsSync(archivePath)) throw new Error('打包国内站产物失败')
  return archivePath
}

export async function uploadDist({ distDir, config, run, timeout = 300000 } = {}) {
  const safe = assertSafeGuoneiConfig(config)
  if (typeof run !== 'function') throw new Error('上传国内站缺少 run')
  const archivePath = await packDistArchive(distDir, { run })
  const target = `${safe.user}@${safe.host}:${safe.remoteTar}`
  const sshOpts = [
    '-i', safe.identityFile,
    '-o', 'BatchMode=yes',
    '-o', 'IdentitiesOnly=yes',
    '-o', 'ConnectTimeout=20',
  ]
  try {
    await run('scp', [...sshOpts, archivePath, target], { timeout })
    await run('ssh', [...sshOpts, `${safe.user}@${safe.host}`, productionSwapCommands(safe)], { timeout })
  } finally {
    if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true })
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
    const built = await build({ snapshotDir, previewBase: '/' })
    const distDir = built?.distDir || liveDist
    writeProductionBuildMeta(distDir, { sha, builtAt })
    if (fs.existsSync(productionHold)) fs.rmSync(productionHold, { recursive: true, force: true })
    fs.cpSync(distDir, productionHold, { recursive: true })
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
