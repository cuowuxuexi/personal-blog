import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import {
  ensureWechatJpegCompanion,
  materializeWechatJpegCompanions,
  resolveWechatLocalAsset,
  saveWeeklyImage,
  toWechatJpegDataUri,
  wechatCompatibleAssetUrl,
  wechatJpegCompanionPath,
} from './lib/images.mjs'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('rewrites only the WebP extension for WeChat-compatible URLs', () => {
  assert.equal(
    wechatCompatibleAssetUrl('https://cuowo.cn/images/weekly/2026-08-17-05-002-aitoken.webp'),
    'https://cuowo.cn/images/weekly/2026-08-17-05-002-aitoken.jpg',
  )
  assert.equal(
    wechatCompatibleAssetUrl('/images/weekly/foo.webp?v=1'),
    '/images/weekly/foo.jpg?v=1',
  )
  assert.equal(wechatCompatibleAssetUrl('/images/hero-fireworks.png'), '/images/hero-fireworks.png')
  assert.equal(wechatJpegCompanionPath('docs/public/images/weekly/a.webp'), 'docs/public/images/weekly/a.jpg')
})

test('saveWeeklyImage writes a JPEG companion beside the blog WebP', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-img-'))
  const saved = await saveWeeklyImage({
    data: TINY_PNG.toString('base64'),
    name: 'cover.png',
    date: '2026-08-23',
    hint: 'cover',
    repoRoot: root,
  })
  assert.match(saved.url, /^\/images\/weekly\/2026-08-23-01-cover\.webp$/)
  const webpAbs = path.join(root, saved.rel)
  const jpegAbs = path.join(root, wechatJpegCompanionPath(saved.rel))
  assert.equal(fs.existsSync(webpAbs), true)
  assert.equal(fs.existsSync(jpegAbs), true)
  assert.equal((await sharp(webpAbs).metadata()).format, 'webp')
  assert.equal((await sharp(jpegAbs).metadata()).format, 'jpeg')
})

test('materializeWechatJpegCompanions creates missing JPEGs and skips invalid bytes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-img-'))
  const dir = path.join(root, 'docs', 'public', 'images', 'weekly')
  fs.mkdirSync(dir, { recursive: true })
  const webpRel = 'docs/public/images/weekly/real.webp'
  const fakeRel = 'docs/public/images/weekly/fake.webp'
  await sharp(TINY_PNG).webp().toFile(path.join(root, webpRel))
  fs.writeFileSync(path.join(root, fakeRel), 'not-an-image')

  const extra = await materializeWechatJpegCompanions([webpRel, fakeRel, 'docs/public/images/weekly/miss.webp'], root)
  assert.deepEqual(extra, ['docs/public/images/weekly/real.jpg'])
  assert.equal(fs.existsSync(path.join(root, 'docs/public/images/weekly/real.jpg')), true)
  assert.equal(await ensureWechatJpegCompanion(path.join(root, fakeRel)), '')
})

test('resolves production or preview URLs to snapshot files and encodes JPEG data URIs', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-img-'))
  const weekly = path.join(root, 'docs', 'public', 'images', 'weekly')
  fs.mkdirSync(weekly, { recursive: true })
  const webpRel = 'docs/public/images/weekly/real.webp'
  await sharp(TINY_PNG).webp().toFile(path.join(root, webpRel))

  assert.equal(
    resolveWechatLocalAsset('https://cuowo.cn/images/weekly/real.jpg', { snapshotDir: root }),
    path.join(root, webpRel),
  )
  assert.equal(
    resolveWechatLocalAsset('/wechat-preview-assets/job%201/images/weekly/real.webp', {
      snapshotDir: root,
      jobId: 'job 1',
    }),
    path.join(root, webpRel),
  )
  const uri = await toWechatJpegDataUri(path.join(root, webpRel))
  assert.match(uri, /^data:image\/jpeg;base64,/)
})
