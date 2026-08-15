import { spawn } from 'node:child_process'

export function createGit(repoRoot) {
  function run(args, { timeout = 60000, input } = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('git', ['-c', 'core.quotepath=false', ...args], {
        cwd: repoRoot,
        windowsHide: true,
      })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error(`git ${args.join(' ')} 超时`))
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
        else reject(new Error((stderr || stdout || `git 退出码 ${code}`).trim()))
      })
      if (input != null) child.stdin.end(input)
    })
  }

  return {
    run,
    async currentBranch() {
      const { stdout } = await run(['rev-parse', '--abbrev-ref', 'HEAD'])
      return stdout.trim()
    },
    async headSha() {
      const { stdout } = await run(['rev-parse', 'HEAD'])
      return stdout.trim()
    },
    async stagedFiles() {
      const { stdout } = await run(['diff', '--cached', '--name-only', '-z'])
      return stdout.split('\0').map((item) => item.replace(/\\/g, '/')).filter(Boolean)
    },
    async cachedNameStatus() {
      const { stdout } = await run(['diff', '--cached', '--name-status', '-z'])
      const parts = stdout.split('\0').filter(Boolean)
      const files = []
      for (let i = 0; i < parts.length; i += 1) {
        const status = parts[i]
        const file = parts[i + 1]
        if (!file) break
        i += 1
        files.push({ status: status[0], path: file.replace(/\\/g, '/') })
      }
      return files
    },
    async statusPorcelain() {
      const { stdout } = await run(['status', '--porcelain'])
      return stdout.split(/\r?\n/).filter(Boolean).map((line) => ({
        code: line.slice(0, 2),
        path: line.slice(3).replace(/\\/g, '/'),
      }))
    },
    async lsHead() {
      const { stdout } = await run(['ls-tree', '-r', '--name-only', 'HEAD'])
      return stdout.split(/\r?\n/).map((item) => item.replace(/\\/g, '/')).filter(Boolean)
    },
    async checkoutIndex(dest) {
      const prefix = dest.replace(/\\/g, '/') + '/'
      await run(['checkout-index', '-a', '-f', `--prefix=${prefix}`])
    },
    async add(files) {
      if (!files.length) return
      await run(['add', '--', ...files])
    },
    async rm(files) {
      if (!files.length) return
      await run(['rm', '-f', '--', ...files])
    },
    async commit(message) {
      await run(['commit', '-F', '-'], { input: `${message}\n` })
      return this.headSha()
    },
    async push() {
      await run(['push', 'origin', 'HEAD'], { timeout: 120000 })
    },
  }
}
