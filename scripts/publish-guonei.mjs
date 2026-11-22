/**
 * 把当前提交（HEAD）构建后上传到 cuowo.cn。不 commit、不 push。
 * 构建在临时 git worktree 里做，工作区里没提交的改动不会上线，也不会挡住上传。
 */
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_PRODUCTION_ORIGIN,
  readGuoneiConfig,
  uploadDist,
} from '../panel/lib/guonei.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SITE_PATH = /^(docs\/|panel\/|content-catalog\/|scripts\/|package\.json|pnpm-lock\.yaml)/

/** 工作区里没提交、因而这次不会上线的站点文件（只用于提示）。 */
export function uncommittedSitePaths(porcelain) {
  const paths = []
  for (const line of String(porcelain || '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const rest = line.slice(3).replace(/^"|"$/g, '')
    const dest = rest.includes(' -> ') ? rest.split(' -> ').pop() : rest
    const rel = String(dest || '').replace(/\\/g, '/')
    if (SITE_PATH.test(rel)) paths.push(rel)
  }
  return paths
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

function runPnpm(args, env = process.env, cwd = REPO_ROOT) {
  if (process.platform === 'win32') {
    return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], { cwd, env, timeout: 600000 })
  }
  return run('pnpm', args, { cwd, env, timeout: 600000 })
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

function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

async function main() {
  const sha = git(['rev-parse', 'HEAD'])
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new Error('无法读取当前提交 SHA')

  const config = readGuoneiConfig()
  if (!config.enabled) {
    throw new Error('未配置国内站上传：请设置 PANEL_GUONEI_KEY，或把 id_ed25519_servers 放到本机 .ssh')
  }

  const pending = uncommittedSitePaths(git(['status', '--porcelain']))
  if (pending.length) {
    console.log(`提示：以下 ${pending.length} 个没提交的站点文件不会上线（从提交 ${sha.slice(0, 7)} 构建）`)
    for (const rel of pending.slice(0, 10)) console.log(`  ${rel}`)
    if (pending.length > 10) console.log('  …')
  }

  const tree = fs.mkdtempSync(path.join(os.tmpdir(), `guonei-${sha.slice(0, 7)}-`))
  fs.rmSync(tree, { recursive: true, force: true })
  git(['worktree', 'add', '--detach', tree, sha])
  try {
    const distDir = path.join(tree, 'docs', '.vitepress', 'dist')
    await runPnpm(['install', '--frozen-lockfile', '--prefer-offline'], process.env, tree)
    await runPnpm(['docs:build'], { ...process.env, VITEPRESS_BASE: '/' }, tree)
    await run(process.execPath, [path.join(tree, 'scripts', 'write-build-metadata.mjs'), distDir], {
      cwd: tree,
      env: { ...process.env, PANEL_BUILD_SHA: sha },
    })

    const expectedBaselineSha = await fetchExpectedBaselineSha()
    const result = await uploadDist({
      distDir,
      config,
      run,
      sha,
      expectedBaselineSha,
    })
    console.log(`cuowo.cn 已上传 ${result.mode} sha=${sha}`)
  } finally {
    // node_modules 层级深，git 在 Windows 上删不掉长路径，先由 Node 删
    fs.rmSync(path.join(tree, 'node_modules'), { recursive: true, force: true })
    try {
      git(['worktree', 'remove', '--force', tree])
    } catch {
      fs.rmSync(tree, { recursive: true, force: true })
      try { git(['worktree', 'prune']) } catch {}
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })
}
