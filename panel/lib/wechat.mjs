import MarkdownIt from 'markdown-it'
import { normalizeDisplayMath } from '../../docs/.vitepress/normalize-math.mjs'
import { normalizeWeeklyEntryHeadings } from '../../docs/.vitepress/normalize-weekly-headings.mjs'
import { parseChrome, parseEntries, parseFrontmatter } from './weekly.mjs'
import { resolveWechatLocalAsset, toWechatJpegDataUri } from './images.mjs'

const DEFAULT_COVER = '/images/hero-fireworks.png'
const DEFAULT_COVER_ALT = '机械之手指向夜空烟花'
const DEFAULT_CAPTION = '烟花朵朵开，想法自然来。'
const DEFAULT_SECTION_TITLE = '看烟花！！！'
const INK_COLOR = '#1a1a18'
const BODY_COLOR = '#4a4a45'
const MUTED_COLOR = '#8a8a82'
const LINK_COLOR = '#607fa6'
const CODE_COLOR = '#007aaa'
const DIVIDER = 'rgba(120,120,112,0.18)'
const TITLE_RULE = '#e7e7eb'
const PAPER_TINT = 'rgba(26,26,24,0.02)'
const SANS = "'Noto Sans SC','PingFang SC','Microsoft YaHei',-apple-system,sans-serif"
const SERIF = "'Noto Serif SC','Songti SC','STSong',Georgia,serif"
const MONO = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace"

const THEMES = {
  life: '#0d7a5f',
  invest: '#2949a4',
}

const STYLES = {
  article: `margin:0;padding:8px 0 0;font-family:${SANS};font-size:15px;line-height:1.9;color:${BODY_COLOR};background:${PAPER_TINT};`,
  paragraph: `margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.9;color:${BODY_COLOR};word-break:break-word;overflow-wrap:break-word;`,
  h1: `margin:22px 0 12px;font-family:${SERIF};font-size:22px;line-height:1.4;font-weight:700;color:${INK_COLOR};`,
  h2: `margin:22px 0 12px;font-family:${SERIF};font-size:22px;line-height:1.4;font-weight:700;color:${INK_COLOR};`,
  h3: `margin:20px 0 10px;font-family:${SERIF};font-size:20px;line-height:1.4;font-weight:700;color:${INK_COLOR};`,
  h4: `margin:18px 0 8px;font-family:${SANS};font-size:17px;line-height:1.5;font-weight:600;color:${INK_COLOR};`,
  h5: `margin:16px 0 8px;font-family:${SANS};font-size:16px;line-height:1.5;font-weight:600;color:${INK_COLOR};`,
  h6: `margin:16px 0 8px;font-family:${SANS};font-size:15px;line-height:1.5;font-weight:600;color:${INK_COLOR};`,
  ul: `margin:0 0 14px;padding:0 0 0 1.4em;list-style-type:circle;color:${BODY_COLOR};`,
  ol: `margin:0 0 14px;padding:0 0 0 1.4em;color:${BODY_COLOR};`,
  li: `margin:0 0 6px;font-size:15px;line-height:1.9;color:${BODY_COLOR};`,
  blockquote: 'margin:0 0 14px;padding:0 0 0 10px;border-left:3px solid #dbdbdb;color:#5b5b64;',
  code: `font-family:${MONO};font-size:13.5px;color:${CODE_COLOR};background:rgba(26,26,24,0.06);padding:1px 5px;border-radius:3px;word-break:break-all;`,
  pre: `margin:0 0 14px;padding:14px 16px;border-radius:3px;background:rgba(26,26,24,0.06);overflow-x:auto;white-space:pre-wrap;word-break:break-word;font-family:${MONO};font-size:13px;line-height:1.7;color:${BODY_COLOR};`,
  table: `width:100%;margin:0 0 14px;border-collapse:collapse;border-spacing:0;font-size:14px;line-height:1.6;color:${BODY_COLOR};`,
  th: `padding:8px 10px;border:1px solid ${TITLE_RULE};background-color:#f3f3f5;font-weight:600;text-align:left;`,
  td: `padding:8px 10px;border:1px solid ${TITLE_RULE};text-align:left;vertical-align:top;`,
  image: 'display:block;max-width:100%;width:100%;height:auto;margin:0 0 14px;border:0;',
  hr: `height:0;margin:20px 0;border:0;border-top:1px solid ${DIVIDER};`,
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeXmlAttr(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
}

function stripHtml(value) {
  return decodeXmlAttr(String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' '))
    .trim()
}

function safeHref(value) {
  const href = String(value ?? '').trim()
  if (!href || /[\\\u0000-\u001f\u007f]/.test(href)) return ''
  if (/^(?:https?:|mailto:)/i.test(href)) return href
  if (/^\/(?!\/)/.test(href)) return href
  return ''
}

function safeProductionOrigin(value) {
  try {
    const url = new URL(String(value || ''))
    if (!/^https?:$/.test(url.protocol)) return ''
    return url.origin
  } catch {
    return ''
  }
}

const THEME_BY_KIND = {
  life: 'life',
  journey: 'life',
  invest: 'invest',
  investment: 'invest',
}

function normalizeKind(kind) {
  return THEME_BY_KIND[String(kind)] || 'life'
}

function kickerLabel(kind) {
  return String(kind) === 'journey' ? '历程随记' : '本周随记'
}

function hexToRgba(hex, alpha) {
  const n = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return `rgba(13,122,95,${alpha})`
  return `rgba(${Number.parseInt(n.slice(0, 2), 16)},${Number.parseInt(n.slice(2, 4), 16)},${Number.parseInt(n.slice(4, 6), 16)},${alpha})`
}

function formatDate(value) {
  const raw = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw)
  if (!match) return raw
  return `${match[1]}年${match[2].padStart(2, '0')}月${match[3].padStart(2, '0')}日`
}

function isWeeklySectionHeading(line) {
  const match = /^##[ \t]+(.+)$/.exec(String(line).trim())
  if (!match) return false
  const heading = match[1]
  if (/\{#kan-yanhua\}\s*$/i.test(heading)) return true
  if (/\bclass=["'][^"']*weekly-section-icon[^"']*["']/i.test(heading)) return true
  return stripHtml(heading).replace(/\s*\{#[^}]+\}\s*$/, '').trim() === DEFAULT_SECTION_TITLE
}

function parseSection(body) {
  const beforeEntry = String(body).split(/<WeeklyEntry\b/i, 1)[0]
  const headingLine = beforeEntry.split(/\r?\n/).find(isWeeklySectionHeading) || ''
  const heading = headingLine.replace(/^##[ \t]+/, '')
  const imageMatch = heading.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)
  const title = stripHtml(
    heading
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/\s*\{#[^}]+\}\s*$/, ''),
  )
  return {
    image: imageMatch?.[1] || DEFAULT_COVER,
    title: title || DEFAULT_SECTION_TITLE,
  }
}

function extractPreamble(body) {
  const beforeEntry = String(body).split(/<WeeklyEntry\b/i, 1)[0]
  return beforeEntry
    .replace(/^#[ \t]+.*(?:\r?\n|$)/m, '')
    .replace(/<p class=["']weekly-theme-cover["']>[\s\S]*?<\/p>/gi, '')
    .replace(/<p class=["']weekly-theme-caption["']>[\s\S]*?<\/p>/gi, '')
    .replace(/<div class=["']weekly-outline-only["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/^<div class=["']weekly-fireworks-section["']>\s*$/gim, '')
    .split(/\r?\n/)
    .filter((line) => !isWeeklySectionHeading(line))
    .join('\n')
    .trim()
}

function imageDescriptor(src, {
  jobId,
  productionOrigin,
  assetUrls,
  assetSet,
  externalAssetUrls,
  externalAssetSet,
}) {
  const raw = String(src ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('/images/')) {
    const online = productionOrigin ? `${productionOrigin}${raw}` : raw
    if (!assetSet.has(online)) {
      assetSet.add(online)
      assetUrls.push(online)
    }
    return {
      preview: `/wechat-preview-assets/${encodeURIComponent(String(jobId ?? ''))}${raw}`,
      online,
    }
  }
  if (/^https?:\/\//i.test(raw)) {
    if (!assetSet.has(raw)) {
      assetSet.add(raw)
      assetUrls.push(raw)
    }
    if (!externalAssetSet.has(raw)) {
      externalAssetSet.add(raw)
      externalAssetUrls.push(raw)
    }
    return { preview: raw, online: '' }
  }
  return null
}

function renderImage(src, alt, context, style = STYLES.image) {
  const descriptor = imageDescriptor(src, context)
  if (!descriptor) return ''
  const online = descriptor.online
    ? ` data-online-src="${escapeHtml(descriptor.online)}"`
    : ''
  return `<img src="${escapeHtml(descriptor.preview)}"${online} alt="${escapeHtml(alt)}" style="${style}" />`
}

function renderLink(url, text, accent, extraStyle = '') {
  const href = safeHref(url)
  if (!href) return escapeHtml(text)
  return `<a href="${escapeHtml(href)}" style="color:${accent};text-decoration:none;${extraStyle}">${escapeHtml(text)}</a>`
}

function prepareMath(markdown) {
  const formulas = []
  const normalized = normalizeDisplayMath(String(markdown))
  const source = normalized.replace(/^\$\$[ \t]*\r?\n([\s\S]*?)\r?\n\$\$[ \t]*$/gm, (_, formula) => {
    const index = formulas.push(formula.trim()) - 1
    return `\n<div data-wechat-math="${index}"></div>\n`
  })
  return { source, formulas }
}

function markdownRenderer({ accent, imageContext }) {
  const md = new MarkdownIt({ html: true, breaks: true, linkify: false, typographer: false })
  const defaultHtmlBlock = md.renderer.rules.html_block
  const defaultHtmlInline = md.renderer.rules.html_inline
  const renderSafeHtml = (tokens, index, options, env, self, fallback) => {
    const content = tokens[index].content
    const image = /^\s*<img\b([^>]*)\/?>\s*$/i.exec(content)
    if (image) {
      const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(image[1])
      const alt = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(image[1])
      return renderImage(src?.[1] ?? src?.[2] ?? '', alt?.[1] ?? alt?.[2] ?? '', imageContext)
    }
    if (/^\s*<br\s*\/?>\s*$/i.test(content)) return '<br />'
    return fallback ? fallback(tokens, index, options, env, self).replace(/</g, '&lt;').replace(/>/g, '&gt;') : escapeHtml(content)
  }
  md.renderer.rules.html_block = (tokens, index, options, env, self) => renderSafeHtml(tokens, index, options, env, self, defaultHtmlBlock)
  md.renderer.rules.html_inline = (tokens, index, options, env, self) => renderSafeHtml(tokens, index, options, env, self, defaultHtmlInline)
  const setOpen = (name, tag, style) => {
    md.renderer.rules[name] = () => `<${tag} style="${style}">`
  }
  setOpen('paragraph_open', 'p', STYLES.paragraph)
  md.renderer.rules.paragraph_close = () => '</p>\n'
  setOpen('bullet_list_open', 'ul', STYLES.ul)
  setOpen('ordered_list_open', 'ol', STYLES.ol)
  setOpen('list_item_open', 'li', STYLES.li)
  setOpen('blockquote_open', 'blockquote', STYLES.blockquote)
  setOpen('table_open', 'table', STYLES.table)
  setOpen('thead_open', 'thead', '')
  setOpen('tbody_open', 'tbody', '')
  setOpen('tr_open', 'tr', '')
  setOpen('th_open', 'th', STYLES.th)
  setOpen('td_open', 'td', STYLES.td)

  md.renderer.rules.heading_open = (tokens, index) => {
    const tag = tokens[index].tag
    return `<${tag} style="${STYLES[tag] || STYLES.h6}">`
  }
  md.renderer.rules.strong_open = () => `<strong style="color:${INK_COLOR};font-weight:600;">`
  md.renderer.rules.strong_close = () => '</strong>'
  md.renderer.rules.em_open = () => '<em style="font-style:italic;">'
  md.renderer.rules.em_close = () => '</em>'
  md.renderer.rules.code_inline = (tokens, index) => (
    `<code style="${STYLES.code}">${escapeHtml(tokens[index].content)}</code>`
  )
  const renderCodeBlock = (tokens, index) => (
    `<pre style="${STYLES.pre}"><code style="margin:0;padding:0;background:transparent;font:inherit;color:inherit;">${escapeHtml(tokens[index].content)}</code></pre>\n`
  )
  md.renderer.rules.fence = renderCodeBlock
  md.renderer.rules.code_block = renderCodeBlock
  md.renderer.rules.hr = () => `<hr style="${STYLES.hr}" />`
  md.renderer.rules.link_open = (tokens, index) => {
    const href = safeHref(tokens[index].attrGet('href'))
    if (!href) return '<span>'
    return `<a href="${escapeHtml(href)}" style="color:${LINK_COLOR};text-decoration:none;word-break:break-word;">`
  }
  md.renderer.rules.link_close = (tokens, index, options, env) => {
    const opening = tokens.slice(0, index).reverse().find((token) => token.type === 'link_open' || token.type === 'link_close')
    return opening?.type === 'link_open' && safeHref(opening.attrGet('href')) ? '</a>' : '</span>'
  }
  md.renderer.rules.image = (tokens, index) => {
    const token = tokens[index]
    return renderImage(token.attrGet('src'), token.content, imageContext)
  }

  return (markdown) => {
    const { source, formulas } = prepareMath(markdown)
    let rendered = md.render(source)
    for (let index = 0; index < formulas.length; index += 1) {
      const marker = `<div data-wechat-math="${index}"></div>`
      const escapedMarker = new RegExp(`&lt;div data-wechat-math=(?:&quot;|")${index}(?:&quot;|")&gt;&lt;\\/div&gt;`)
      const block = `<pre style="${STYLES.pre}border-left:4px solid ${accent};"><code style="margin:0;padding:0;background:transparent;font:inherit;color:inherit;">${escapeHtml(formulas[index])}</code></pre>`
      rendered = rendered.replace(marker, block).replace(escapedMarker, block)
    }
    return rendered
  }
}

function renderTags(tags, accent) {
  if (!Array.isArray(tags) || !tags.length) return ''
  const border = hexToRgba(accent, 0.28)
  const items = tags.map((tag) => (
    `<span style="display:inline-block;margin:0 8px 8px 0;padding:1px 8px;border:1px solid ${border};border-radius:3px;font-family:${MONO};font-size:12px;line-height:18px;color:${accent};">${escapeHtml(tag)}</span>`
  )).join('')
  return `<p style="margin:0 0 12px;font-size:0;">${items}</p>`
}

function renderEntry(entry, issueDate, index, count, accent, renderMarkdown, imageContext) {
  const decoded = {
    ...entry,
    title: decodeXmlAttr(entry.title),
    subtitle: decodeXmlAttr(entry.subtitle),
    linkHref: decodeXmlAttr(entry.linkHref),
    subtitleHref: decodeXmlAttr(entry.subtitleHref),
    image: decodeXmlAttr(entry.image),
    imageAlt: decodeXmlAttr(entry.imageAlt),
    badgeImage: decodeXmlAttr(entry.badgeImage),
    badgeAlt: decodeXmlAttr(entry.badgeAlt),
    date: decodeXmlAttr(entry.date),
    tags: entry.tags.map(decodeXmlAttr),
  }
  const link = safeHref(decoded.linkHref)
  const subtitleLink = safeHref(decoded.subtitleHref)
  const headerImage = renderImage(
    decoded.image,
    decoded.imageAlt || decoded.title,
    imageContext,
    `display:block;max-width:100%;width:100%;border:0;${decoded.imageFit === 'cover' ? 'height:400px;max-height:50vh;object-fit:cover;object-position:center;' : 'height:auto;'}`,
  )
  const badge = renderImage(
    decoded.badgeImage,
    decoded.badgeAlt || '',
    imageContext,
    'display:inline-block;max-width:100%;height:18px;width:auto;vertical-align:middle;border:0;margin:0;',
  )
  const date = formatDate(decoded.date || issueDate)
  const separator = index < count - 1 ? `border-bottom:1px solid ${DIVIDER};` : ''
  return [
    `<section style="max-width:640px;margin:0 auto;padding:28px 16px 8px;${separator}">`,
    `<h3 style="margin:0 0 10px;font-family:${SERIF};font-size:22px;font-weight:700;line-height:1.4;color:${accent};">${escapeHtml(decoded.title)}</h3>`,
    link
      ? `<p style="margin:0 0 10px;font-size:13px;line-height:21px;word-break:break-all;">${renderLink(link, `${decoded.linkHref} ↗`, LINK_COLOR, `font-family:${MONO};`)}</p>`
      : '',
    renderTags(decoded.tags, accent),
    badge ? `<p style="margin:0 0 12px;padding:0;">${badge}</p>` : '',
    decoded.subtitle
      ? `<p style="margin:0 0 ${subtitleLink ? '4px' : '14px'};font-family:${SANS};font-size:15px;line-height:1.9;color:${MUTED_COLOR};">${escapeHtml(decoded.subtitle)}</p>`
      : '',
    subtitleLink
      ? `<p style="margin:0 0 14px;font-size:13px;line-height:21px;word-break:break-all;">${renderLink(subtitleLink, `${decoded.subtitleHref} ↗`, LINK_COLOR, `font-family:${MONO};`)}</p>`
      : '',
    headerImage ? `<p style="margin:0 0 14px;padding:0;">${headerImage}</p>` : '',
    renderMarkdown(entry.body),
    date ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED_COLOR};">${escapeHtml(date)}</p>` : '',
    '</section>',
  ].filter(Boolean).join('\n')
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function buildWechatClipboardPayload(articleHtml, plainText = '') {
  const html = String(articleHtml ?? '')
    .replace(/\s+id=(["'])article\1/i, '')
    .replace(/<img\b[^>]*>/gi, (image) => {
      const online = /\sdata-online-src=(["'])(.*?)\1/i.exec(image)
      if (!online) return image
      const productionSrc = online[2]
      return image
        .replace(/\sdata-online-src=(["'])(.*?)\1/i, '')
        .replace(/\ssrc=(["'])(.*?)\1/i, ` src="${productionSrc}"`)
    })
  return { html, text: String(plainText ?? '') }
}

export async function embedWechatClipboardImages(articleHtml, options = {}) {
  const payload = buildWechatClipboardPayload(articleHtml, stripHtml(articleHtml))
  const images = payload.html.match(/<img\b[^>]*>/gi) || []
  let html = payload.html
  for (const image of images) {
    const src = /\ssrc=(["'])(.*?)\1/i.exec(image)?.[2] || ''
    const abs = resolveWechatLocalAsset(src, options)
    if (!abs) continue
    const dataUri = await toWechatJpegDataUri(abs)
    if (!dataUri) continue
    const next = image.replace(/\ssrc=(["'])(.*?)\1/i, ` src="${dataUri}"`)
    html = html.replace(image, next)
  }
  return { html, text: payload.text }
}

export function buildWechatPreviewDocument({
  articleHtml,
  title,
  description,
  accent,
  jobId,
  clipboard,
}) {
  return renderPage({ articleHtml, title, description, accent, jobId, clipboard })
}

function renderPage({ articleHtml, title, description, accent, jobId, clipboard }) {
  const jobJson = safeJson(String(jobId ?? ''))
  const resolved = clipboard || buildWechatClipboardPayload(articleHtml, stripHtml(articleHtml))
  const clipboardHtmlJson = safeJson(resolved.html)
  const clipboardTextJson = safeJson(resolved.text)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(`公众号版 · ${title}`)}</title>
<style>
body{margin:0;background:#ededed}.toolbar{position:sticky;top:0;z-index:9;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;padding:12px 20px;background:#fff;border-bottom:1px solid #d8dadd;font:13px/1.6 system-ui,"Microsoft YaHei",sans-serif;color:#555}.toolbar button{padding:8px 18px;border:0;border-radius:6px;background:${accent};color:#fff;font-size:14px;font-weight:600;cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.45}.paper{max-width:780px;margin:0 auto 48px;padding:20px 16px 36px;background:#fff}
</style>
</head>
<body>
<div class="toolbar">
<button id="copy-wechat" type="button" disabled>复制全文到公众号</button>
<span>预览确认并获准复制后，点击复制，再到公众号编辑器正文中粘贴。建议标题「${escapeHtml(title)}」；建议摘要「${escapeHtml(description)}」</span>
</div>
<div class="paper">${articleHtml}</div>
<script>
(function () {
  var jobId = ${jobJson};
  var clipboardHtml = ${clipboardHtmlJson};
  var clipboardText = ${clipboardTextJson};
  var button = document.getElementById('copy-wechat');
  var timer = null;
  function setAllowed(allowed) {
    button.disabled = !allowed;
    button.title = allowed ? '' : '发布任务尚未允许复制公众号正文';
    if (allowed && timer) { clearInterval(timer); timer = null; }
  }
  async function refreshPermission() {
    try {
      var response = await fetch('/api/publish/jobs/' + encodeURIComponent(jobId), { headers: { accept: 'application/json' } });
      if (!response.ok) return setAllowed(false);
      var payload = await response.json();
      setAllowed(Boolean(payload && payload.wechatPreview && payload.wechatPreview.copyAllowed));
    } catch (error) { setAllowed(false); }
  }
  function copyWithSelection(html) {
    var holder = document.createElement('div');
    holder.style.position = 'fixed'; holder.style.left = '-100000px'; holder.style.top = '0';
    holder.innerHTML = html; document.body.appendChild(holder);
    var node = holder.firstElementChild;
    var range = document.createRange(); range.selectNodeContents(node);
    var selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    var ok = false; try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
    selection.removeAllRanges(); holder.remove();
    if (!ok) throw new Error('execCommand copy failed');
  }
  async function copyArticle() {
    if (button.disabled) return;
    var original = button.textContent;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([clipboardHtml], { type: 'text/html' }), 'text/plain': new Blob([clipboardText], { type: 'text/plain' }) })]);
      } else {
        copyWithSelection(clipboardHtml);
      }
      button.textContent = '已复制，请到公众号粘贴';
    } catch (error) {
      try { copyWithSelection(clipboardHtml); button.textContent = '已复制，请到公众号粘贴'; }
      catch (fallbackError) { button.textContent = '复制失败，请手动复制白色正文区'; }
    }
    setTimeout(function () { button.textContent = original; }, 4000);
  }
  button.addEventListener('click', copyArticle);
  refreshPermission(); timer = setInterval(refreshPermission, 2000);
}());
</script>
</body>
</html>`
}

/**
 * Render a weekly Markdown source into an isolated WeChat preview document.
 * The function is pure: it reads no files and performs no network or process work.
 */
export function renderWechatPreview({ source, kind = 'life', productionOrigin = '', jobId = '' }) {
  const normalizedSource = normalizeWeeklyEntryHeadings(String(source ?? ''))
  const { fm, body } = parseFrontmatter(normalizedSource)
  const entries = parseEntries(body)
  const chrome = parseChrome(body)
  const section = parseSection(body)
  const preamble = extractPreamble(body)
  const themeKind = normalizeKind(kind)
  const accent = THEMES[themeKind]
  const origin = safeProductionOrigin(productionOrigin)
  const assetUrls = []
  const externalAssetUrls = []
  const imageContext = {
    jobId,
    productionOrigin: origin,
    assetUrls,
    assetSet: new Set(),
    externalAssetUrls,
    externalAssetSet: new Set(),
  }
  const title = String(fm.title || body.match(/^#\s+(.+)$/m)?.[1] || '未命名').trim()
  const description = String(fm.description || '').trim()
  const issueDate = String(fm.date || '').trim()
  const cover = renderImage(
    chrome.cover || DEFAULT_COVER,
    chrome.coverAlt || DEFAULT_COVER_ALT,
    imageContext,
    'display:block;width:100%;height:auto;border:0;margin:0;',
  )
  const sectionIcon = renderImage(
    section.image,
    '',
    imageContext,
    'display:inline-block;height:22px;width:auto;vertical-align:-4px;margin:0 8px 0 0;border:0;',
  )
  const renderMarkdown = markdownRenderer({ accent, imageContext })
  const entryHtml = entries.map((entry, index) => (
    renderEntry(entry, issueDate, index, entries.length, accent, renderMarkdown, imageContext)
  )).join('\n')
  const articleHtml = [
    `<section id="article" data-theme-accent="${accent}" style="${STYLES.article}">`,
    `<h1 style="margin:0 0 14px;padding:0 16px 10px;border-bottom:1px solid ${TITLE_RULE};font-family:${SANS};font-size:22px;line-height:1.4;font-weight:400;color:${INK_COLOR};">${escapeHtml(title)}</h1>`,
    cover ? `<p style="margin:0 0 12px;padding:0 16px;">${cover}</p>` : '',
    `<p style="margin:0 0 8px;padding:0 16px;font-family:${SANS};font-size:15px;line-height:1.9;color:${MUTED_COLOR};">${escapeHtml(stripHtml(chrome.caption) || DEFAULT_CAPTION)}</p>`,
    preamble ? `<section style="max-width:640px;margin:0 auto;padding:12px 16px 0;">${renderMarkdown(preamble)}</section>` : '',
    '<section style="max-width:640px;margin:0 auto;padding:24px 16px 8px;">',
    `<p style="font-family:${MONO};font-size:12px;color:${accent};letter-spacing:1px;margin:0 0 8px;">${escapeHtml(kickerLabel(kind))}</p>`,
    `<section style="border-top:1px solid ${DIVIDER};height:0;margin:0 0 20px;"></section>`,
    `<h2 style="margin:0;font-family:${SERIF};font-size:22px;font-weight:700;line-height:1.4;color:${INK_COLOR};">${sectionIcon}${escapeHtml(section.title)}</h2>`,
    '</section>',
    entryHtml,
    `<p style="max-width:640px;margin:28px auto 0;padding:20px 16px 8px;border-top:1px solid ${DIVIDER};font-size:13px;line-height:1.7;color:#9a9aa2;">本文同步发布于博客${origin ? `：${escapeHtml(new URL(origin).host)}` : ''}（可点击文末「阅读原文」查看）。</p>`,
    '</section>',
  ].filter(Boolean).join('\n')

  return {
    html: renderPage({ articleHtml, title, description, accent, jobId }),
    articleHtml,
    assetUrls,
    externalAssetUrls,
    title,
    description,
    accent,
  }
}
