import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { saveWeeklyImage } from './lib/images.mjs'
import { clearFormDraft, readFormDraft, writeFormDraft } from './lib/form-draft.mjs'
import { listModels, polishEntry, POLISH_TIMEOUT_MS } from './lib/polish.mjs'
import {
  DEFAULT_MODEL,
  KINDS,
  PANEL_DIR,
  PINNED_MODELS,
  REPO_ROOT,
  loadEnv,
  todayISO,
} from './lib/paths.mjs'
import { buildSite, publishFiles } from './lib/publish.mjs'
import {
  applyDraft,
  collectTags,
  currentIssue,
  listIssues,
  nextIssueNumber,
  previewUrl,
} from './lib/weekly.mjs'

loadEnv()

const PUBLIC_DIR = path.join(PANEL_DIR, 'public')
const PORT = Number(process.env.PANEL_PORT || 4177)
const VITEPRESS_URL = process.env.VITEPRESS_URL || 'http://127.0.0.1:5173'

let lastDraft = null
let modelsCache = { at: 0, ids: PINNED_MODELS }

function cliproConfig() {
  return {
    baseUrl: process.env.CLIPRO_BASE_URL || 'https://clipro.cuowo.duckdns.org/v1',
    apiKey: process.env.CLIPRO_API_KEY || '',
    defaultModel: process.env.CLIPRO_DEFAULT_MODEL || DEFAULT_MODEL,
  }
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    ...headers,
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

function mimeFor(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.webp')) return 'image/webp'
  if (file.endsWith('.png')) return 'image/png'
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg'
  if (file.endsWith('.gif')) return 'image/gif'
  return 'application/octet-stream'
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (url.pathname.startsWith('/images/')) {
    const publicRoot = path.join(REPO_ROOT, 'docs', 'public')
    const abs = path.normalize(path.join(publicRoot, url.pathname))
    if (!abs.startsWith(publicRoot) || !fs.existsSync(abs)) return send(res, 404, 'not found')
    res.writeHead(200, { 'Content-Type': mimeFor(abs) })
    fs.createReadStream(abs).pipe(res)
    return
  }
  const rel = url.pathname === '/' ? '/index.html' : url.pathname
  const abs = path.normalize(path.join(PUBLIC_DIR, rel))
  if (!abs.startsWith(PUBLIC_DIR)) return send(res, 403, 'forbidden')
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return send(res, 404, 'not found')
  }
  send(res, 200, fs.readFileSync(abs, 'utf8'), { 'Content-Type': mimeFor(abs) })
}

async function handleBootstrap() {
  const clipro = cliproConfig()
  let models = modelsCache.ids
  if (clipro.apiKey && Date.now() - modelsCache.at > 5 * 60 * 1000) {
    try {
      models = await listModels(clipro)
      modelsCache = { at: Date.now(), ids: models }
    } catch {
      models = sortFallback(modelsCache.ids)
    }
  }
  return {
    ok: true,
    today: todayISO(),
    vitepressUrl: VITEPRESS_URL,
    cliproReady: Boolean(clipro.apiKey),
    defaultModel: clipro.defaultModel,
    polishTimeoutMs: POLISH_TIMEOUT_MS,
    autosave: readFormDraft(),
    models,
    tags: collectTags(),
    kinds: Object.values(KINDS).map((kind) => {
      const issues = listIssues(kind.id).map(summarizeIssue)
      return {
        id: kind.id,
        label: kind.label,
        category: kind.category,
        nextIssue: nextIssueNumber(kind.id),
        current: summarizeIssue(currentIssue(kind.id)),
        issues,
      }
    }),
  }
}

function summarizeIssue(issue) {
  if (!issue) return null
  return {
    kind: issue.kind,
    title: issue.title,
    date: issue.date,
    issue: issue.issue,
    description: issue.description,
    link: issue.link,
    rel: issue.rel,
    cover: issue.cover,
    caption: issue.caption,
    entryCount: issue.entryCount,
    entries: issue.entries.map((entry) => ({
      index: entry.index,
      title: entry.title,
      tags: entry.tags,
      subtitle: entry.subtitle,
      subtitleHref: entry.subtitleHref,
      image: entry.image,
      imageAlt: entry.imageAlt,
      imageFit: entry.imageFit,
      linkHref: entry.linkHref,
      badgeImage: entry.badgeImage,
      badgeAlt: entry.badgeAlt,
      date: entry.date,
      body: entry.body,
    })),
  }
}

function sortFallback(ids) {
  return ids
}

const routes = {
  'GET /api/bootstrap': async () => handleBootstrap(),
  'POST /api/images': async (req) => {
    const body = await readBody(req)
    const files = Array.isArray(body.files) ? body.files : []
    if (!files.length) throw new Error('没有图片')
    const images = []
    for (const file of files) {
      images.push({
        role: file.role || 'body',
        alt: file.alt || '',
        ...await saveWeeklyImage({
          data: file.data,
          name: file.name,
          date: body.date || todayISO(),
          hint: file.hint || file.name,
        }),
      })
    }
    return { ok: true, images }
  },
  'POST /api/autosave': async (req) => {
    const body = await readBody(req)
    if (body.clear) {
      clearFormDraft()
      return { ok: true, cleared: true }
    }
    return { ok: true, draft: writeFormDraft(body) }
  },
  'POST /api/polish': async (req) => {
    const body = await readBody(req)
    const clipro = cliproConfig()
    if (!clipro.apiKey) throw new Error('未配置 CLIPRO_API_KEY，请检查仓库根目录 .env')
    const result = await polishEntry({
      ...clipro,
      model: body.model || clipro.defaultModel,
      title: body.title || '',
      body: body.body || '',
      tags: body.tags || [],
      historicalTags: collectTags().map((item) => item.tag),
    })
    return { ok: true, ...result }
  },
  'POST /api/draft': async (req) => {
    const body = await readBody(req)
    const result = applyDraft(body)
    lastDraft = result
    return {
      ok: true,
      ...result,
      previewUrl: previewUrl(result.previewLink, VITEPRESS_URL),
    }
  },
  'POST /api/publish': async (req) => {
    const body = await readBody(req)
    const files = body.files || lastDraft?.files
    const message = body.message || lastDraft?.commitHint || 'weekly: 发布面板更新'
    if (!files?.length) throw new Error('请先保存草稿再发布')
    try {
      await buildSite()
    } catch (error) {
      const err = new Error(`构建失败，已中止推送。\n${error.message}`)
      err.status = 422
      throw err
    }
    const published = await publishFiles(files, message)
    return {
      ok: true,
      ...published,
      notice: '已推送到 main。Cloudflare Pages 部署大约 1–2 分钟后可见。',
    }
  },
}

export function createServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
      const key = `${req.method} ${url.pathname}`
      if (routes[key]) {
        const payload = await routes[key](req, res, url)
        return send(res, 200, payload)
      }
      if (req.method === 'GET') return serveStatic(req, res)
      send(res, 404, { ok: false, error: 'not found' })
    } catch (error) {
      send(res, error.status || 400, { ok: false, error: error.message || String(error) })
    }
  })
  server.requestTimeout = 0
  server.headersTimeout = 0
  server.timeout = 0
  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`发布面板 http://127.0.0.1:${PORT}`)
  })
}

export { PORT, VITEPRESS_URL }
