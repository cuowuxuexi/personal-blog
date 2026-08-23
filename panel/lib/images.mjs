import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { REPO_ROOT, todayISO } from './paths.mjs'

sharp.cache({ files: 0, items: 0, memory: 0 })

const MAX_WIDTH = 1600
const WEBP_QUALITY = 82
const WECHAT_JPEG_QUALITY = 85
const ALLOWED_ASSET_DIRECTORIES = new Set([
  'docs/public/images/weekly',
  'docs/public/images/journey',
])

/** WeChat's editor transloads JPEG/PNG/GIF, not WebP. Blog Markdown keeps .webp. */
export function wechatCompatibleAssetUrl(url) {
  return String(url ?? '').replace(/\.webp(?=[?#]|$)/i, '.jpg')
}

export function wechatJpegCompanionPath(rel) {
  return posix(rel).replace(/\.webp$/i, '.jpg')
}

export function slugify(input) {
  const ascii = String(input || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .slice(0, 40)
  return ascii || 'img'
}

function posix(value) {
  return String(value || '').replace(/\\/g, '/')
}

function resolveAssetDir({
  assetDirectory = 'docs/public/images/weekly',
  repoRoot = REPO_ROOT,
}) {
  const dir = posix(assetDirectory).replace(/\/+$/, '')
  if (!ALLOWED_ASSET_DIRECTORIES.has(dir)) {
    throw new Error('不支持的图片目录')
  }
  return {
    dir,
    abs: path.join(repoRoot, dir),
    urlPrefix: `/${dir.slice('docs/public/'.length)}/`,
  }
}

function nextSeq(date, assetAbs) {
  fs.mkdirSync(assetAbs, { recursive: true })
  const used = fs.readdirSync(assetAbs)
    .map((name) => {
      const match = name.match(new RegExp(`^${date}-(\\d{2})-`))
      return match ? Number(match[1]) : 0
    })
    .filter(Boolean)
  const next = (used.length ? Math.max(...used) : 0) + 1
  return String(next).padStart(2, '0')
}

export async function saveWeeklyImage({
  data,
  name,
  date = todayISO(),
  hint = '',
  assetDirectory = 'docs/public/images/weekly',
  repoRoot = REPO_ROOT,
} = {}) {
  const asset = resolveAssetDir({ assetDirectory, repoRoot })
  const buffer = Buffer.from(data, 'base64')
  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error('图片超过 20MB，请先压缩再上传')
  }
  const seq = nextSeq(date, asset.abs)
  const slug = slugify(hint || path.parse(name || '').name)
  const fileName = `${date}-${seq}-${slug}.webp`
  const jpegName = wechatJpegCompanionPath(fileName)
  const abs = path.join(asset.abs, fileName)
  const jpegAbs = path.join(asset.abs, jpegName)
  const image = sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  await Promise.all([
    image.clone().webp({ quality: WEBP_QUALITY }).toFile(abs),
    image.clone().jpeg({ quality: WECHAT_JPEG_QUALITY, mozjpeg: true }).toFile(jpegAbs),
  ])
  return {
    fileName,
    rel: `${asset.dir}/${fileName}`,
    url: `${asset.urlPrefix}${fileName}`,
  }
}

export async function ensureWechatJpegCompanion(absWebp) {
  const source = String(absWebp || '')
  if (!/\.webp$/i.test(source) || !fs.existsSync(source)) return ''
  const dest = source.replace(/\.webp$/i, '.jpg')
  if (fs.existsSync(dest)) return dest
  try {
    await sharp(source)
      .rotate()
      .jpeg({ quality: WECHAT_JPEG_QUALITY, mozjpeg: true })
      .toFile(dest)
    return dest
  } catch {
    return ''
  }
}

export async function toWechatJpegDataUri(absPath) {
  const source = String(absPath || '')
  if (!source || !fs.existsSync(source)) return ''
  try {
    const buffer = await sharp(source)
      .rotate()
      .jpeg({ quality: WECHAT_JPEG_QUALITY, mozjpeg: true })
      .toBuffer()
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

export function resolveWechatLocalAsset(src, { snapshotDir, jobId = '' } = {}) {
  const raw = String(src || '').trim()
  if (!raw || raw.startsWith('data:') || !snapshotDir) return ''
  let pathname = ''
  const previewPrefix = `/wechat-preview-assets/${encodeURIComponent(String(jobId))}`
  if (raw.startsWith(previewPrefix)) pathname = raw.slice(previewPrefix.length)
  else if (raw.startsWith('/images/')) pathname = raw.split('?')[0]
  else {
    try {
      pathname = new URL(raw).pathname
    } catch {
      return ''
    }
  }
  pathname = decodeURIComponent(String(pathname || '').split('?')[0])
  if (!pathname.startsWith('/images/') || pathname.includes('..')) return ''
  const abs = path.join(snapshotDir, 'docs', 'public', ...pathname.split('/').filter(Boolean))
  const candidates = [abs]
  if (/\.jpg$/i.test(abs)) {
    candidates.push(abs.replace(/\.jpg$/i, '.webp'), abs.replace(/\.jpg$/i, '.png'))
  } else if (/\.webp$/i.test(abs)) {
    candidates.push(abs.replace(/\.webp$/i, '.jpg'), abs.replace(/\.webp$/i, '.png'))
  }
  return candidates.find((file) => fs.existsSync(file)) || ''
}

export async function materializeWechatJpegCompanions(imageRels, repoRoot = REPO_ROOT) {
  const extra = []
  const seen = new Set()
  for (const rel of imageRels || []) {
    const webp = posix(rel)
    if (!/\.webp$/i.test(webp) || webp.includes('..')) continue
    const dest = await ensureWechatJpegCompanion(path.join(repoRoot, webp))
    if (!dest) continue
    const jpgRel = wechatJpegCompanionPath(webp)
    if (seen.has(jpgRel)) continue
    seen.add(jpgRel)
    extra.push(jpgRel)
  }
  return extra
}
