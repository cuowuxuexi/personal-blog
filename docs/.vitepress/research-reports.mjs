import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 研报集元数据提取（只在 Node 端用）。
 * 研报集 = docs/public/html/report-<slug>/，引言页结构以牧原六页为准。
 * 任何字段取不到就抛错，报出 slug 与字段名，不静默留空。
 */

const PUBLIC_HTML_DIR = path.resolve(fileURLToPath(new URL('../public/html', import.meta.url)))

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export function textOf(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

function classTokens(attrs) {
  const match = String(attrs).match(/(?<=^|\s)class\s*=\s*["']([^"']*)["']/i)
  return match ? match[1].split(/\s+/).filter(Boolean) : []
}

/** 在 html 里找第一个带指定 class 的元素，按同名标签配平，返回内部 html 与开标签属性。 */
export function findElement(html, { className, tag, id } = {}) {
  const source = String(html || '')
  const open = /<([a-zA-Z][\w-]*)\b([^>]*)>/g
  let match
  while ((match = open.exec(source))) {
    const [whole, name, attrs] = match
    if (tag && name.toLowerCase() !== tag) continue
    if (className && !classTokens(attrs).includes(className)) continue
    if (id && !new RegExp(`(?<=^|\\s)id\\s*=\\s*["']${id}["']`, 'i').test(attrs)) continue
    const start = match.index + whole.length
    const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi')
    re.lastIndex = start
    let depth = 1
    let close
    while ((close = re.exec(source))) {
      depth += close[1] ? -1 : 1
      if (depth === 0) return { inner: source.slice(start, close.index), attrs }
    }
    return null
  }
  return null
}

/** 从一页引言 HTML 取全部字段。缺任一字段抛错，信息含 slug 与字段名。 */
export function extractReportFields(html, slug = '?') {
  const need = (field, value) => {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${slug}: 研报元数据缺少字段「${field}」`)
    }
    return value
  }

  const box = findElement(html, { className: 'ticker-box' })
  need('公司名/代码', box)
  const codeEl = findElement(box.inner, { className: 'ticker-code' })
  const code = need('代码', codeEl && textOf(codeEl.inner))
  const company = need('公司名', textOf(box.inner.replace(/<span[^>]*ticker-code[\s\S]*?<\/span>/i, '')))

  const section = need('s1-1 段', findElement(html, { tag: 'section', id: 's1-1' }))
  const row = need('badge-row', findElement(section.inner, { className: 'badge-row' }))
  const crimson = findElement(row.inner, { className: 'badge-crimson' })
  const stance = need('立场', crimson && textOf(crimson.inner))
  const dateMatch = textOf(row.inner).match(/价格时点\s*(\d{4}-\d{2}-\d{2})/)
  const priceDate = need('价格时点', dateMatch && dateMatch[1])
  const priceMatch = textOf(row.inner).match(/(?:终审价|收盘价)\s*([\d.,]+)\s*元/)
  const finalPrice = need('终审价', priceMatch && priceMatch[1])
  const capMatch = textOf(row.inner).match(/总市值\s*([\d.,]+)\s*亿元/)
  const marketCap = need('总市值', capMatch && capMatch[1])
  const banner = findElement(section.inner, { className: 'thesis-banner' })
  const thesis = need('一句判断', banner && textOf(banner.inner))

  const tabs = need('layer-tabs', findElement(html, { tag: 'nav', className: 'layer-tabs' }))
  const pages = []
  for (const m of tabs.inner.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = (m[1].match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1]
    const text = textOf(m[2])
    if (href && text) pages.push({ text, href })
  }
  need('各页直达', pages.length ? pages : null)

  return { company, code, stance, priceDate, finalPrice, marketCap, thesis, pages }
}

const UPDATED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/

/** Date → 北京时间 ISO（YYYY-MM-DDTHH:mm:ss+08:00），与机器时区无关。无效时间抛错。 */
export function formatUpdatedAt(date) {
  const ms = date instanceof Date ? date.getTime() : NaN
  if (Number.isNaN(ms)) throw new Error('formatUpdatedAt: 无效时间')
  const t = new Date(ms + 8 * 3600 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}T${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}+08:00`
}

/** 格式对、且是真实存在的时刻（拒绝 2026-02-30 这类）。 */
export function isValidUpdatedAt(value) {
  return typeof value === 'string' && UPDATED_AT_RE.test(value) && formatUpdatedAt(new Date(value)) === value
}

export function readReportMeta(setDir) {
  const slug = path.basename(setDir)
  const metaFile = path.join(setDir, 'blog-meta.json')
  let meta
  try {
    meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  } catch {
    meta = undefined
  }
  const industry = meta?.industry
  if (typeof industry !== 'string' || !industry.trim()) {
    throw new Error(`${slug}: 研报元数据缺少字段「行业」（blog-meta.json 的 industry）`)
  }
  let updatedAt = ''
  if (Object.hasOwn(meta, 'updatedAt')) {
    if (!isValidUpdatedAt(meta.updatedAt)) {
      throw new Error(`${slug}: blog-meta.json 的 updatedAt 格式不对：要 YYYY-MM-DDTHH:mm:ss+08:00，实际 ${JSON.stringify(meta.updatedAt)}`)
    }
    updatedAt = meta.updatedAt
  }
  return { industry, updatedAt }
}

const STANCE_KEYWORDS = [
  ['bear', ['看空', '回避', '卖出', '减持', '低配']],
  ['bull', ['看多', '买入', '进场', '增持', '超配']],
  ['neutral', ['中性', '观望', '持有', '观察']],
]
const NEGATED = /[不未非勿待]$/

/** 立场文字 → 色调。取最早出现、且前一个字不是否定/等待词的关键字；都没有则 neutral。 */
export function stanceTone(stance) {
  const text = String(stance || '')
  let best = null
  for (const [tone, words] of STANCE_KEYWORDS) {
    for (const word of words) {
      let at = text.indexOf(word)
      while (at !== -1) {
        if (!NEGATED.test(text.slice(0, at)) && (best === null || at < best.at)) best = { tone, at }
        at = text.indexOf(word, at + 1)
      }
    }
  }
  return best ? best.tone : 'neutral'
}

export function readReport(setDir) {
  const slug = path.basename(setDir)
  const indexFile = path.join(setDir, 'index.html')
  if (!fs.existsSync(indexFile)) throw new Error(`${slug}: 缺少 index.html`)
  const fields = extractReportFields(fs.readFileSync(indexFile, 'utf8'), slug)
  const { company, code, stance, priceDate, finalPrice, marketCap, thesis, pages } = fields
  const { industry, updatedAt } = readReportMeta(setDir)
  const updatedDate = updatedAt ? updatedAt.slice(0, 10) : priceDate
  return { slug, company, code, industry, stance, tone: stanceTone(stance), priceDate, updatedAt, updatedDate, finalPrice, marketCap, thesis, pages }
}

const sortKey = (r) => r.updatedAt || `${r.priceDate}T00:00:00+08:00`

/** 更新时间降序（缺 updatedAt 按价格时点当天北京时间 00:00）；同刻按价格时点降序，再按代码升序。 */
export function sortReports(reports) {
  return [...reports].sort((a, b) => {
    const ka = sortKey(a)
    const kb = sortKey(b)
    if (ka !== kb) return ka < kb ? 1 : -1
    if (a.priceDate !== b.priceDate) return a.priceDate < b.priceDate ? 1 : -1
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0
  })
}

/** 取 CSS 里第一个 :root 块的全部 --* 声明，返回 [名, 值] 数组。 */
export function extractRootVars(css) {
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '')
  const block = clean.match(/:root\s*\{([^}]*)\}/)
  if (!block) return []
  const vars = []
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.push([m[1], m[2].trim()])
  return vars
}

export function listReportDirs(publicHtmlDir = PUBLIC_HTML_DIR) {
  if (!fs.existsSync(publicHtmlDir)) return []
  return fs
    .readdirSync(publicHtmlDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('report-'))
    .map((e) => path.join(publicHtmlDir, e.name))
    .sort()
}

export function loadReports(publicHtmlDir = PUBLIC_HTML_DIR) {
  const reports = sortReports(listReportDirs(publicHtmlDir).map(readReport))
  let cssVars = []
  if (reports.length) {
    const cssFile = path.join(publicHtmlDir, reports[0].slug, 'assets', 'report.css')
    if (!fs.existsSync(cssFile)) throw new Error(`${reports[0].slug}: 缺少 assets/report.css`)
    cssVars = extractRootVars(fs.readFileSync(cssFile, 'utf8'))
    if (!cssVars.length) throw new Error(`${reports[0].slug}: assets/report.css 没有 :root 变量`)
  }
  return { reports, cssVars }
}

const SITE_TOKEN_MAP = [
  ['--vp-c-bg', 'var(--bg)'],
  ['--vp-c-bg-alt', 'var(--muted-warm)'],
  ['--vp-c-bg-soft', 'var(--muted)'],
  ['--vp-c-bg-elv', 'var(--card)'],
  ['--vp-c-text-1', 'var(--fg)'],
  ['--vp-c-text-2', 'var(--fg-muted)'],
  ['--vp-c-text-3', 'var(--fg-subtle)'],
  ['--vp-c-divider', 'var(--border)'],
  ['--vp-c-gutter', 'var(--border)'],
  ['--vp-c-border', 'var(--border-strong)'],
  ['--vp-c-brand-1', 'var(--primary)'],
  ['--vp-c-brand-3', 'var(--primary)'],
  ['--vp-c-brand-2', 'var(--primary-hover)'],
  ['--vp-c-brand-soft', 'var(--primary-soft)'],
  ['--blog-link', 'var(--primary)'],
  ['--blog-cat-invest', 'var(--primary)'],
  ['--blog-link-visited', 'var(--primary-hover)'],
  ['--blog-cat-life', 'var(--slate)'],
  ['--vp-nav-bg-color', 'var(--bg)'],
  ['--vp-nav-screen-bg-color', 'var(--bg)'],
]

/**
 * 全站样式变量：把研报 :root 变量映射成 VitePress / 站点 token。
 * 入参是 loadReports().cssVars（[名, 值] 数组）；为空返回 ''。
 * 输出三块：html:not(.dark)、html:root、html.dark（特异性均高于 style.css 的 :root / .dark）。
 */
export function siteTokenCss(cssVars) {
  if (!Array.isArray(cssVars) || !cssVars.length) return ''
  for (const [name, value] of cssVars) {
    if (!String(name).startsWith('--')) throw new Error(`研报变量名不以 -- 开头：${name}`)
    if (String(value).includes('<')) throw new Error(`研报变量值含 "<"：${name}`)
  }
  const decl = (pairs) => pairs.map(([k, v]) => `${k}: ${v};`).join(' ')
  const light = decl([...cssVars, ...SITE_TOKEN_MAP])
  const primary = cssVars.find(([k]) => k === '--primary')
  const shared = decl([
    ...cssVars.filter(([k]) => k.startsWith('--font-') || k === '--prose-max' || k === '--content-max'),
    ['--vp-font-family-base', 'var(--font-sans)'],
    ['--vp-font-family-mono', 'var(--font-mono)'],
  ])
  const blocks = [`html:not(.dark) { ${light} }`, `html:root { ${shared} }`]
  if (primary) {
    const P = primary[1]
    blocks.push(
      `html.dark { ${decl([
        ['--vp-c-brand-1', `color-mix(in srgb, ${P} 55%, white)`],
        ['--vp-c-brand-2', `color-mix(in srgb, ${P} 70%, white)`],
        ['--vp-c-brand-3', 'var(--vp-c-brand-1)'],
        ['--vp-c-brand-soft', `color-mix(in srgb, ${P} 18%, transparent)`],
        ['--blog-link', 'var(--vp-c-brand-1)'],
        ['--blog-link-visited', 'var(--vp-c-brand-2)'],
        ['--blog-cat-invest', 'var(--vp-c-brand-1)'],
      ])} }`,
    )
  }
  return blocks.join('\n')
}
