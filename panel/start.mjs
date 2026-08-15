import { execSync, spawn } from 'node:child_process'
import { REPO_ROOT, loadEnv } from './lib/paths.mjs'
import { createServer, PORT, VITEPRESS_URL } from './server.mjs'

loadEnv()

const children = []
let startedVite = false

async function isUp(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
    return response.status < 500
  } catch {
    return false
  }
}

function killListener(port) {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -and $_.OwningProcess -ne ${process.pid}) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"`,
      { stdio: 'ignore', windowsHide: true },
    )
    return
  }
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' })
  } catch {
    // port already free
  }
}

function openBrowser(url) {
  spawn('cmd', ['/c', 'start', '', url], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref()
}

async function ensureVitepress() {
  if (await isUp(VITEPRESS_URL)) {
    console.log(`VitePress 已在运行：${VITEPRESS_URL}`)
    return
  }
  console.log('正在启动 VitePress 本地预览…')
  const child = spawn('pnpm', ['docs:dev', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: REPO_ROOT,
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'inherit',
    shell: true,
  })
  children.push(child)
  startedVite = true
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (await isUp(VITEPRESS_URL)) {
      console.log(`VitePress 已就绪：${VITEPRESS_URL}`)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.warn('VitePress 启动超时，仍可先写草稿；预览稍后再试。')
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const panelUrl = `http://127.0.0.1:${PORT}`
let reopenBrowser = true

if (await isUp(`${panelUrl}/api/bootstrap`)) {
  console.log('发现已在运行的发布面板，正在重启以加载最新代码…')
  reopenBrowser = false
  killListener(PORT)
  const deadline = Date.now() + 8000
  while (Date.now() < deadline && await isUp(`${panelUrl}/api/bootstrap`)) {
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

const server = createServer()
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 被其它程序占用。关掉占用它的窗口后再开一次，或换一个 PANEL_PORT。`)
    process.exit(1)
  }
  throw error
})
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`发布面板 ${panelUrl}`)
  await ensureVitepress()
  if (reopenBrowser) openBrowser(panelUrl)
  else console.log('已重启。请刷新原来的发布面板窗口，不要新开一个以免冲掉草稿。')
  if (startedVite) {
    console.log('关闭这个窗口会同时停掉发布面板（本进程拉起的预览也会停）。')
  } else {
    console.log('关闭这个窗口会停掉发布面板；已有的 VitePress 预览会继续跑。')
  }
})
