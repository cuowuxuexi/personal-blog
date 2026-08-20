import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { REPO_ROOT, todayISO } from './paths.mjs'

const MAX_WIDTH = 1600
const WEBP_QUALITY = 82
const ALLOWED_ASSET_DIRECTORIES = new Set([
  'docs/public/images/weekly',
  'docs/public/images/journey',
])

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
  const abs = path.join(asset.abs, fileName)
  await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(abs)
  return {
    fileName,
    rel: `${asset.dir}/${fileName}`,
    url: `${asset.urlPrefix}${fileName}`,
  }
}
