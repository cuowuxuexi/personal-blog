import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { validateWeeklySnapshot } from './content-validation.mjs'
import {
  persistProductionCandidate,
  prepareProductionDist,
  readGuoneiConfig,
  uploadDist,
} from './guonei.mjs'

function run(command, args, {
  cwd,
  timeout = 240000,
  shell = false,
  env = process.env,
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell, env, windowsHide: true })
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

function runPnpm(args, cwd, { env = process.env } = {}) {
  if (process.platform === 'win32') {
    return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], { cwd, env })
  }
  return run('pnpm', args, { cwd, env })
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function previewHtmlFile(distDir, previewPath) {
  let pathname
  try {
    pathname = decodeURIComponent(String(previewPath || '').split(/[?#]/, 1)[0])
  } catch {
    throw new Error(`发布预览路径无法解码：${previewPath}`)
  }
  const relativeUrl = pathname.replace(/^\/+/, '')
  const relativeHtml = !relativeUrl || relativeUrl.endsWith('/')
    ? `${relativeUrl}index.html`
    : relativeUrl.endsWith('.html')
      ? relativeUrl
      : `${relativeUrl}.html`
  const resolved = path.resolve(distDir, relativeHtml)
  const relativeFs = path.relative(path.resolve(distDir), resolved)
  if (relativeFs.startsWith('..') || path.isAbsolute(relativeFs)) {
    throw new Error(`发布预览路径越界：${previewPath}`)
  }
  return resolved
}

export function validateBuiltPreview({ distDir, previewPath, headingAnchor } = {}) {
  if (!previewPath) return
  const htmlFile = previewHtmlFile(distDir, previewPath)
  if (!fs.existsSync(htmlFile)) {
    throw new Error(`发布预览未生成目标页面：${previewPath}`)
  }
  const html = fs.readFileSync(htmlFile, 'utf8')
  if (/class=(['"])[^'"]*\bNotFound\b[^'"]*\1/.test(html)) {
    throw new Error(`发布预览目标页面被错误渲染为 404：${previewPath}`)
  }
  const anchor = String(headingAnchor || '').replace(/^#/, '')
  if (anchor && !new RegExp(`\\bid=(['"])${escapeRegex(anchor)}\\1`).test(html)) {
    throw new Error(`发布预览缺少目标锚点：#${anchor}`)
  }
}

function htmlFilesUnder(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return htmlFilesUnder(full)
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : []
  })
}

function describeDistFile(distDir, file) {
  return path.relative(distDir, file).split(path.sep).join('/')
}

function appRegion(html, label) {
  const start = html.indexOf('<div id="app">')
  const end = html.indexOf('\n    <script>window.__VP_HASH_MAP__', start)
  if (start < 0 && end < 0) return null
  if (start < 0 || end < 0) throw new Error(`无法识别 VitePress HTML 壳：${label}`)
  return { start, end, content: html.slice(start, end) }
}

function prefixRootHtmlUrls(html, previewBase) {
  return html
    .replace(/\b(href|src|action|poster|data-src)=(['"])\/(?!\/)/g, `$1=$2${previewBase}`)
    .replace(/url\(\/(?!\/)/g, `url(${previewBase}`)
}

export function mergeRootSsrIntoPreviewDist({ rootDistDir, previewDistDir, previewBase }) {
  const base = String(previewBase || '/')
  if (!base.startsWith('/') || !base.endsWith('/')) {
    throw new Error(`发布预览 base 必须以 / 开始并以 / 结束：${base}`)
  }
  for (const rootFile of htmlFilesUnder(rootDistDir)) {
    const relative = path.relative(rootDistDir, rootFile)
    const previewFile = path.join(previewDistDir, relative)
    if (!fs.existsSync(previewFile)) continue
    const rootHtml = fs.readFileSync(rootFile, 'utf8')
    const previewHtml = fs.readFileSync(previewFile, 'utf8')
    const label = describeDistFile(rootDistDir, rootFile)
    const rootApp = appRegion(rootHtml, label)
    const previewApp = appRegion(previewHtml, label)
    if (!rootApp && !previewApp) continue
    if (!rootApp || !previewApp) {
      throw new Error(`无法识别 VitePress HTML 壳：${label}`)
    }
    const repairedApp = prefixRootHtmlUrls(rootApp.content, base)
    fs.writeFileSync(
      previewFile,
      `${previewHtml.slice(0, previewApp.start)}${repairedApp}${previewHtml.slice(previewApp.end)}`,
    )
  }
}

function ensureSnapshotBaseConfig(snapshotDir) {
  const configFile = path.join(snapshotDir, 'docs', '.vitepress', 'config.mts')
  if (!fs.existsSync(configFile)) return
  const source = fs.readFileSync(configFile, 'utf8')
  if (source.includes("base: process.env.VITEPRESS_BASE || '/'")) return
  const marker = 'export default defineConfig({'
  if (!source.includes(marker)) {
    throw new Error('无法为发布快照注入 VITEPRESS_BASE：未识别 config.mts')
  }
  fs.writeFileSync(
    configFile,
    source.replace(marker, `${marker}\n  base: process.env.VITEPRESS_BASE || '/',`),
  )
}

export function createDefaultProbes({ repoRoot, productionOrigin, guonei, run: runOverride } = {}) {
  function linkDependencies(snapshotDir) {
    const nodeModules = path.join(repoRoot, 'node_modules')
    const snapshotModules = path.join(snapshotDir, 'node_modules')
    if (fs.existsSync(nodeModules) && !fs.existsSync(snapshotModules)) {
      const type = process.platform === 'win32' ? 'junction' : 'dir'
      fs.symlinkSync(nodeModules, snapshotModules, type)
    }
  }

  const probes = {
    async test({ snapshotDir, kindId, contentFiles, files } = {}) {
      return {
        ok: true,
        ...validateWeeklySnapshot(snapshotDir, {
          kindId,
          contentFiles: contentFiles || files,
        }),
      }
    },
    async build({ snapshotDir, previewBase, previewPath, headingAnchor }) {
      linkDependencies(snapshotDir)
      ensureSnapshotBaseConfig(snapshotDir)
      const base = previewBase || '/'
      const distDir = path.join(snapshotDir, 'docs', '.vitepress', 'dist')
      if (base === '/') {
        await runPnpm(['docs:build'], snapshotDir, {
          env: { ...process.env, VITEPRESS_BASE: '/' },
        })
      } else {
        await runPnpm(['docs:build'], snapshotDir, {
          env: { ...process.env, VITEPRESS_BASE: '/' },
        })
        const rootDistDir = persistProductionCandidate({ snapshotDir, rootDistDir: distDir })
        const mergeScratch = path.join(snapshotDir, 'docs', '.vitepress', '.preview-root-dist')
        if (fs.existsSync(mergeScratch)) fs.rmSync(mergeScratch, { recursive: true, force: true })
        await runPnpm(['docs:build'], snapshotDir, {
          env: { ...process.env, VITEPRESS_BASE: base },
        })
        mergeRootSsrIntoPreviewDist({ rootDistDir, previewDistDir: distDir, previewBase: base })
      }
      validateBuiltPreview({ distDir, previewPath, headingAnchor })
      return { distDir }
    },
    async push({ git }) {
      await git.push()
    },
    async deploy({ snapshotDir, sha }) {
      if (process.env.NODE_TEST_CONTEXT && !runOverride && !guonei) {
        throw new Error('测试中拒绝真实国内上传')
      }
      const config = guonei || readGuoneiConfig()
      if (!config.enabled) {
        throw new Error('未配置国内站上传：请在 .env 设置 PANEL_GUONEI_KEY，或把 id_ed25519_servers 放到本机 .ssh')
      }
      const productionDir = await prepareProductionDist({
        snapshotDir,
        sha,
        build: (args) => probes.build(args),
      })
      await uploadDist({
        distDir: productionDir,
        config,
        run: runOverride || run,
        sha,
      })
      return { ok: true, origin: productionOrigin }
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
    async onlineAssets({ urls }) {
      const unique = [...new Set((urls || []).filter(Boolean))]
      const checks = await Promise.all(unique.map(async (url) => {
        try {
          const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
          })
          await response.body?.cancel().catch(() => {})
          const type = response.headers.get('content-type') || ''
          const finalUrl = new URL(response.url || url)
          return response.ok
            && /^https?:$/.test(finalUrl.protocol)
            && /^image\//i.test(type)
            ? null
            : url
        } catch {
          return url
        }
      }))
      const missing = checks.filter(Boolean)
      return { ok: missing.length === 0, missing }
    },
  }
  return probes
}
