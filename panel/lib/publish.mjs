import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { REPO_ROOT } from './paths.mjs'

function run(command, args, { timeout = 180000, shell = false, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      shell,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`${command} ${args.join(' ')} 超时`))
    }, timeout)
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error((stderr || stdout || `${command} 退出码 ${code}`).trim()))
    })
    if (input != null) child.stdin.end(input)
  })
}

const ALLOWED_PREFIXES = [
  'docs/AI与生活/',
  'docs/投资/周记/',
  'docs/public/images/weekly/',
  'docs/.vitepress/posts.ts',
  'docs/.vitepress/config.mts',
]

export function collectReferencedWeeklyImages(files) {
  const extra = []
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const abs = path.join(REPO_ROOT, file)
    if (!fs.existsSync(abs)) continue
    const text = fs.readFileSync(abs, 'utf8')
    for (const match of text.matchAll(/\/images\/weekly\/([^"'\)\s]+)/g)) {
      const rel = `docs/public/images/weekly/${match[1]}`
      if (fs.existsSync(path.join(REPO_ROOT, rel))) extra.push(rel)
    }
  }
  return extra
}

export function assertPublishable(files) {
  const allowed = files.filter((file) => (
    ALLOWED_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix))
    && !file.includes('..')
    && !file.startsWith('docs/投资/投研/')
  ))
  if (!allowed.length) throw new Error('没有可发布的周记文件')
  return [...new Set(allowed)]
}

export async function buildSite() {
  return run('pnpm', ['docs:build'], { timeout: 240000, shell: true })
}

export async function publishFiles(files, message) {
  const staged = assertPublishable([...files, ...collectReferencedWeeklyImages(files)])
  await run('git', ['add', '--', ...staged])
  await run('git', ['commit', '-F', '-'], { input: `${message}\n` })
  await run('git', ['push', 'origin', 'HEAD'], { timeout: 120000 })
  return { staged, message }
}
