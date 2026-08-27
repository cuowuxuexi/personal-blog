/**
 * 构建当前仓库并上传到 cuowo.cn。不 commit、不 push。
 * 作者说「上传」且投研改动已提交后，再跑 pnpm publish:guonei。
 */
import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_PRODUCTION_ORIGIN,
  readGuoneiConfig,
  uploadDist,
} from '../panel/lib/guonei.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = path.join(REPO_ROOT, 'docs', '.vitepress', 'dist')

const BLOCKING_PATH = /^(docs\/|panel\/|content-catalog\/|scripts\/|package\.json|pnpm-lock\.yaml)/

export function publishBlockingPaths(porcelain) {
  const blocked = []
  for (const line of String(porcelain || '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const rest = line.slice(3).replace(/^"|"$/g, '')
    const dest = rest.includes(' -> ') ? rest.split(' -> ').pop() : rest
    const rel = String(dest || '').replace(/\\/g, '/')
    if (BLOCKING_PATH.test(rel)) blocked.push(rel)
  }
  return blocked
}

export function assertPublishReady(porcelain) {
  const blocked = publishBlockingPaths(porcelain)
  if (blocked.length) {
    throw new Error(`工作区还有未提交的站点改动，先只提交这次要上的文件：\n${blocked.join('\n')}`)
  }
}

function run(command, args, { cwd = REPO_ROOT, timeout = 300000, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true, shell: false })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`${command} 超时`))
    }, timeout)
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error((stderr || stdout || `${command} 退出码 ${code}`).trim()))
    })
  })
}

function runPnpm(args, env = process.env) {
  if (process.platform === 'win32') {
    return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], { env })
  }
  return run('pnpm', args, { env })
}

export async function fetchExpectedBaselineSha(origin = DEFAULT_PRODUCTION_ORIGIN) {
  try {
    const url = `${String(origin).replace(/\/$/, '')}/build.json?t=${Date.now()}`
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!response.ok) return undefined
    const payload = await response.json()
    return payload.sha || undefined
  } catch {
    return undefined
  }
}

async function main() {
  const porcelain = execFileSync('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assertPublishReady(porcelain)

  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim()
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new Error('无法读取当前提交 SHA')

  const config = readGuoneiConfig()
  if (!config.enabled) {
    throw new Error('未配置国内站上传：请设置 PANEL_GUONEI_KEY，或把 id_ed25519_servers 放到本机 .ssh')
  }

  await runPnpm(['docs:build'], { ...process.env, VITEPRESS_BASE: '/' })
  await run(process.execPath, [path.join(REPO_ROOT, 'scripts', 'write-build-metadata.mjs')], {
    env: { ...process.env, PANEL_BUILD_SHA: sha },
  })

  const expectedBaselineSha = await fetchExpectedBaselineSha()
  const result = await uploadDist({
    distDir: DIST_DIR,
    config,
    run,
    sha,
    expectedBaselineSha,
  })
  console.log(`cuowo.cn 已上传 ${result.mode} sha=${sha}`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })
}
