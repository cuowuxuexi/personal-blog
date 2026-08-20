import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPanelContext } from './lib/context.mjs'
import { saveWeeklyImage } from './lib/images.mjs'
import { clearFormDraft, readFormDraft, writeFormDraft } from './lib/form-draft.mjs'
import { newId } from './lib/hash.mjs'
import { listModels, polishEntry, POLISH_TIMEOUT_MS } from './lib/polish.mjs'
import {
  DEFAULT_MODEL,
  KINDS,
  PANEL_DIR,
  PINNED_MODELS,
  isPathInside,
  loadEnv,
  todayISO,
} from './lib/paths.mjs'
import { allowsCreate, kindCapability, publicKindCapability } from './lib/repo-paths.mjs'
import {
  checkWechatAssets,
  confirmPublication,
  getPublication,
  listRecoverableJobs,
  preparePublication,
  retryPush,
  retryVerification,
  snapshotDist,
  snapshotWechatPreview,
  snapshotWechatPublic,
} from './lib/publish-job.mjs'
import {
  applyDraft,
  collectTags,
  currentIssue,
  listIssues,
  nextIssueNumber,
  previewUrl,
} from './lib/weekly.mjs'
import {
  isPreviewArticlePath,
  isReleasePreviewRoot,
  previewArticleLocation,
  previewHeading,
} from './lib/preview-nav.mjs'

loadEnv()

const PUBLIC_DIR = path.join(PANEL_DIR, 'public')
const PORT = Number(process.env.PANEL_PORT || 4177)
const VITEPRESS_URL = process.env.VITEPRESS_URL || 'http://127.0.0.1:5173'

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

function readBody(req, { maxBytes, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const timer = setTimeout(() => {
      req.pause()
      const error = new Error('请求超时')
      error.status = 408
      reject(error)
    }, timeoutMs)
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        clearTimeout(timer)
        req.pause()
        const error = new Error('请求体过大')
        error.status = 413
        reject(error)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      clearTimeout(timer)
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

function mimeFor(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.json')) return 'application/json; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.webp')) return 'image/webp'
  if (file.endsWith('.png')) return 'image/png'
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg'
  if (file.endsWith('.gif')) return 'image/gif'
  if (file.endsWith('.woff2')) return 'font/woff2'
  if (file.endsWith('.ico')) return 'image/x-icon'
  return 'application/octet-stream'
}

function streamFile(res, abs) {
  res.writeHead(200, { 'Content-Type': mimeFor(abs) })
  fs.createReadStream(abs).pipe(res)
}

function streamPreviewHtml(res, abs, heading) {
  if (!heading || !abs.endsWith('.html')) {
    streamFile(res, abs)
    return
  }
  const script = `<script>(function(){var a=${JSON.stringify(heading)};if(a&&!location.hash)location.replace(location.pathname+location.search+'#'+a);})();</script>`
  let html = fs.readFileSync(abs, 'utf8')
  html = html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : `${script}${html}`
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/fonts/')) {
    const publicRoot = path.join(PANEL_DIR, '..', 'docs', 'public')
    const abs = path.normalize(path.join(publicRoot, url.pathname))
    if (!isPathInside(publicRoot, abs)) return send(res, 403, 'forbidden')
    if (!fs.existsSync(abs)) return send(res, 404, 'not found')
    return streamFile(res, abs)
  }
  if (url.pathname === '/favicon.ico') {
    const abs = path.join(PANEL_DIR, 'publishing-panel-fireworks.ico')
    if (fs.existsSync(abs)) return streamFile(res, abs)
    return send(res, 404, 'not found')
  }
  const rel = url.pathname === '/' ? '/index.html' : url.pathname
  const abs = path.normalize(path.join(PUBLIC_DIR, rel))
  if (!isPathInside(PUBLIC_DIR, abs)) return send(res, 403, 'forbidden')
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return send(res, 404, 'not found')
  }
  return streamFile(res, abs)
}

function serveReleasePreview(ctx, res, pathname) {
  const match = pathname.match(/^\/release-preview\/([^/]+)(?:\/(.*))?$/)
  if (!match) return false
  const jobId = match[1]
  let rel = decodeURIComponent(match[2] || '')
  if (isReleasePreviewRoot(rel)) {
    const location = previewArticleLocation(ctx.jobs.get(jobId))
    if (location) {
      res.writeHead(302, { Location: encodeURI(location) })
      res.end()
      return true
    }
  }
  if (!rel || rel.endsWith('/')) rel += 'index.html'
  const dist = snapshotDist(ctx, jobId)
  const job = ctx.jobs.get(jobId)
  const heading = isPreviewArticlePath(rel, job) ? previewHeading(job) : ''
  const abs = path.normalize(path.join(dist, rel))
  if (!isPathInside(dist, abs)) {
    send(res, 403, 'forbidden')
    return true
  }
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    streamPreviewHtml(res, abs, heading)
    return true
  }
  const html = `${abs.replace(/\.html$/, '')}.html`
  if (fs.existsSync(html)) {
    streamPreviewHtml(res, html, heading)
    return true
  }
  send(res, 404, 'not found')
  return true
}

function serveWechatPreview(ctx, res, pathname) {
  const match = pathname.match(/^\/wechat-preview\/([^/]+)\/?$/)
  if (!match) return false
  streamFile(res, snapshotWechatPreview(ctx, match[1]))
  return true
}

function serveWechatAsset(ctx, res, pathname) {
  const match = pathname.match(/^\/wechat-preview-assets\/([^/]+)\/(.*)$/)
  if (!match) return false
  const root = snapshotWechatPublic(ctx, match[1])
  let rel = ''
  try {
    rel = decodeURIComponent(match[2] || '')
  } catch {
    send(res, 400, 'bad request')
    return true
  }
  const abs = path.normalize(path.join(root, rel))
  if (!isPathInside(root, abs)) {
    send(res, 403, 'forbidden')
    return true
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    send(res, 404, 'not found')
    return true
  }
  streamFile(res, abs)
  return true
}

async function handleBootstrap(ctx) {
  const clipro = cliproConfig()
  let models = modelsCache.ids
  if (clipro.apiKey && Date.now() - modelsCache.at > 5 * 60 * 1000) {
    try {
      models = await listModels(clipro)
      modelsCache = { at: Date.now(), ids: models }
    } catch {
      models = modelsCache.ids
    }
  }
  return {
    ok: true,
    today: todayISO(),
    vitepressUrl: VITEPRESS_URL,
    productionOrigin: ctx.productionOrigin,
    cliproReady: Boolean(clipro.apiKey),
    defaultModel: clipro.defaultModel,
    polishTimeoutMs: POLISH_TIMEOUT_MS,
    autosave: readFormDraft(),
    activeJobs: listRecoverableJobs(ctx),
    models,
    tags: collectTags(ctx.paths),
    kinds: Object.values(ctx.paths.KINDS || KINDS).map((kind) => {
      const capability = publicKindCapability(kind)
      const issues = listIssues(kind.id, ctx.paths).map(summarizeIssue)
      return {
        id: kind.id,
        label: kind.label,
        category: kind.category,
        capability,
        nextIssue: allowsCreate(kind) ? nextIssueNumber(kind.id, ctx.paths) : null,
        current: summarizeIssue(currentIssue(kind.id, ctx.paths)),
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

export function createServer(options = {}) {
  const ctx = options.ctx || createPanelContext(options)
  const routes = {
    'GET /api/bootstrap': async () => handleBootstrap(ctx),
    'POST /api/images': async (req) => {
      const body = await readBody(req, { maxBytes: ctx.maxUploadBytes, timeoutMs: ctx.bodyTimeoutMs })
      const kind = (ctx.paths.KINDS || KINDS)[body.kindId]
      if (!kind) {
        const error = new Error('上传图片必须携带有效的栏目 kindId')
        error.status = 400
        throw error
      }
      const capability = kindCapability(kind)
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
            assetDirectory: capability.assetDirectory,
            repoRoot: ctx.repoRoot,
          }),
        })
      }
      return { ok: true, images }
    },
    'POST /api/autosave': async (req) => {
      const body = await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
      if (body.clear) {
        clearFormDraft()
        return { ok: true, cleared: true }
      }
      return { ok: true, draft: writeFormDraft(body) }
    },
    'POST /api/polish': async (req) => {
      const body = await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
      const clipro = cliproConfig()
      if (!clipro.apiKey) throw new Error('未配置 CLIPRO_API_KEY，请检查仓库根目录 .env')
      const result = await polishEntry({
        ...clipro,
        model: body.model || clipro.defaultModel,
        title: body.title || '',
        body: body.body || '',
        tags: body.tags || [],
        historicalTags: collectTags(ctx.paths).map((item) => item.tag),
      })
      return { ok: true, ...result }
    },
    'POST /api/draft': async (req) => {
      const body = await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
      const kind = (ctx.paths.KINDS || KINDS)[body.kindId]
      if (body.mode === 'newIssue' && kind && !allowsCreate(kind)) {
        throw new Error('当前栏目不能开新一期')
      }
      const result = applyDraft(body, ctx.paths)
      const draftId = newId('d')
      ctx.drafts.set(draftId, { ...result, kindId: body.kindId || '', createdAt: new Date().toISOString() })
      return {
        ok: true,
        ...result,
        draftId,
        previewUrl: previewUrl(result.previewLink, VITEPRESS_URL),
        previewKind: 'workspace',
      }
    },
    'POST /api/publish/prepare': async (req) => {
      const body = await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
      const job = await preparePublication(ctx, {
        draftId: body.draftId,
        headingAnchor: body.headingAnchor || '',
      })
      return { ok: true, ...job }
    },
    'POST /api/publish/confirm': async (req) => {
      const body = await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
      const job = await confirmPublication(ctx, {
        jobId: body.jobId,
        confirmationToken: body.confirmationToken,
      })
      return { ok: true, ...job }
    },
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
      const key = `${req.method} ${url.pathname}`
      if (routes[key]) {
        const payload = await routes[key](req, res, url)
        return send(res, 200, payload)
      }
      const jobGet = url.pathname.match(/^\/api\/publish\/jobs\/([^/]+)$/)
      if (req.method === 'GET' && jobGet) {
        return send(res, 200, { ok: true, ...await getPublication(ctx, jobGet[1]) })
      }
      const jobRetry = url.pathname.match(/^\/api\/publish\/jobs\/([^/]+)\/retry-verify$/)
      if (req.method === 'POST' && jobRetry) {
        await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
        return send(res, 200, { ok: true, ...await retryVerification(ctx, jobRetry[1]) })
      }
      const jobRetryPush = url.pathname.match(/^\/api\/publish\/jobs\/([^/]+)\/retry-push$/)
      if (req.method === 'POST' && jobRetryPush) {
        await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
        return send(res, 200, { ok: true, ...await retryPush(ctx, jobRetryPush[1]) })
      }
      const jobWechatAssets = url.pathname.match(/^\/api\/publish\/jobs\/([^/]+)\/check-wechat-assets$/)
      if (req.method === 'POST' && jobWechatAssets) {
        await readBody(req, { maxBytes: ctx.maxJsonBytes, timeoutMs: ctx.bodyTimeoutMs })
        return send(res, 200, { ok: true, ...await checkWechatAssets(ctx, jobWechatAssets[1]) })
      }
      if (req.method === 'GET' && url.pathname.startsWith('/release-preview/')) {
        if (serveReleasePreview(ctx, res, url.pathname)) return
      }
      if (req.method === 'GET' && url.pathname.startsWith('/wechat-preview/')) {
        if (serveWechatPreview(ctx, res, url.pathname)) return
      }
      if (req.method === 'GET' && url.pathname.startsWith('/wechat-preview-assets/')) {
        if (serveWechatAsset(ctx, res, url.pathname)) return
      }
      if (req.method === 'GET') return serveStatic(req, res)
      send(res, 404, { ok: false, error: 'not found' })
    } catch (error) {
      send(res, error.status || 400, { ok: false, error: error.message || String(error) })
    }
  })
  server.requestTimeout = ctx.bodyTimeoutMs + 1000
  server.headersTimeout = ctx.bodyTimeoutMs + 1000
  server.timeout = Math.max(ctx.verifyTimeoutMs + 30000, 300000)
  server.panelContext = ctx
  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`发布面板 http://127.0.0.1:${PORT}`)
  })
}

export { PORT, VITEPRESS_URL }
