import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { WEEKLY_IMAGES, todayISO } from './paths.mjs'

const MAX_WIDTH = 1600
const WEBP_QUALITY = 82

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

function nextSeq(date) {
  fs.mkdirSync(WEEKLY_IMAGES, { recursive: true })
  const prefix = `${date}-`
  const used = fs.readdirSync(WEEKLY_IMAGES)
    .map((name) => {
      const match = name.match(new RegExp(`^${date}-(\\d{2})-`))
      return match ? Number(match[1]) : 0
    })
    .filter(Boolean)
  const next = (used.length ? Math.max(...used) : 0) + 1
  return String(next).padStart(2, '0')
}

export async function saveWeeklyImage({ data, name, date = todayISO(), hint = '' }) {
  const buffer = Buffer.from(data, 'base64')
  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error('图片超过 20MB，请先压缩再上传')
  }
  const seq = nextSeq(date)
  const slug = slugify(hint || path.parse(name || '').name)
  const fileName = `${date}-${seq}-${slug}.webp`
  const abs = path.join(WEEKLY_IMAGES, fileName)
  await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(abs)
  return {
    fileName,
    rel: `docs/public/images/weekly/${fileName}`,
    url: `/images/weekly/${fileName}`,
  }
}
