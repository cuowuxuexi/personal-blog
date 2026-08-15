import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function run(command, args, { cwd, timeout = 240000, shell = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell, windowsHide: true })
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

function runPnpm(script, cwd) {
  if (process.platform === 'win32') {
    return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `pnpm ${script}`], { cwd })
  }
  return run('pnpm', [script], { cwd })
}

export function createDefaultProbes({ repoRoot, productionOrigin }) {
  function linkDependencies(snapshotDir) {
    const nodeModules = path.join(repoRoot, 'node_modules')
    const snapshotModules = path.join(snapshotDir, 'node_modules')
    if (fs.existsSync(nodeModules) && !fs.existsSync(snapshotModules)) {
      const type = process.platform === 'win32' ? 'junction' : 'dir'
      fs.symlinkSync(nodeModules, snapshotModules, type)
    }
  }

  return {
    async test({ snapshotDir }) {
      linkDependencies(snapshotDir)
      await runPnpm('test:panel', snapshotDir)
      return { ok: true }
    },
    async build({ snapshotDir }) {
      linkDependencies(snapshotDir)
      await runPnpm('docs:build', snapshotDir)
      return { distDir: path.join(snapshotDir, 'docs', '.vitepress', 'dist') }
    },
    async push({ git }) {
      await git.push()
    },
    async deployStatus() {
      return { state: 'unknown' }
    },
    async productionVersion() {
      if (!productionOrigin) return null
      const url = `${productionOrigin.replace(/\/$/, '')}/build.json?t=${Date.now()}`
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if (!response.ok) return null
      const payload = await response.json()
      return { sha: payload.sha || null, builtAt: payload.builtAt || null }
    },
  }
}
