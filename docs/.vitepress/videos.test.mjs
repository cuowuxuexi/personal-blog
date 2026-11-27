import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { normalizeVideos } from './videos.mjs'
import { resolveVideoPlayer } from './video-embed.mjs'

const REPORTS = [{ code: '002714.SZ', slug: 'report-002714-sz', company: '牧原股份' }]
const GOOD = {
  title: '牧原股份的猪周期',
  date: '2026-11-20',
  duration: '12:34',
  cover: 'https://example.com/c.jpg',
  url: 'https://www.bilibili.com/video/BV1xx411c7mD',
}

test('合规条目通过，有 report 时补 reportSlug 与 reportCompany', () => {
  const [row] = normalizeVideos([{ ...GOOD, report: '002714.SZ' }], REPORTS)
  assert.equal(row.reportSlug, 'report-002714-sz')
  assert.equal(row.reportCompany, '牧原股份')
  const [plain] = normalizeVideos([GOOD], REPORTS)
  assert.equal(plain.reportSlug, undefined)
})

test('空数组返回空数组', () => {
  assert.deepEqual(normalizeVideos([], REPORTS), [])
})

test('缺字段、格式错误各自抛错并报出字段', () => {
  const cases = [
    ['title', { ...GOOD, title: ' ' }],
    ['date', { ...GOOD, date: '2026/11/20' }],
    ['duration', { ...GOOD, duration: '1234' }],
    ['cover', { ...GOOD, cover: undefined }],
    ['cover', { ...GOOD, cover: 'http://example.com/c.jpg' }],
    ['url', { ...GOOD, url: 'http://example.com/v' }],
    ['url', { ...GOOD, url: undefined }],
    ['report', { ...GOOD, report: '000000.SZ' }],
  ]
  for (const [field, row] of cases) {
    assert.throws(
      () => normalizeVideos([GOOD, row], REPORTS),
      (err) => err.message.includes('下标 1') && err.message.includes(`「${field}」`),
      `${field} ${JSON.stringify(row)}`,
    )
  }
})

test('缺 // 的 https 写法与不存在的日期都拒绝', () => {
  assert.throws(() => normalizeVideos([{ ...GOOD, url: 'https:example.com/v' }], REPORTS), /「url」/)
  assert.throws(() => normalizeVideos([{ ...GOOD, cover: 'https:example.com/c.jpg' }], REPORTS), /「cover」/)
  assert.throws(() => normalizeVideos([{ ...GOOD, date: '2026-02-30' }], REPORTS), /「date」/)
  assert.throws(() => normalizeVideos([{ ...GOOD, date: '2026-11-31' }], REPORTS), /「date」/)
  assert.equal(normalizeVideos([{ ...GOOD, date: '2028-02-29' }], REPORTS).length, 1)
})

test('站内封面文件必须存在', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-test-'))
  try {
    fs.mkdirSync(path.join(root, 'images', 'videos'), { recursive: true })
    fs.writeFileSync(path.join(root, 'images', 'videos', 'a.jpg'), '')
    const ok = { ...GOOD, cover: '/images/videos/a.jpg' }
    assert.equal(normalizeVideos([ok], REPORTS, { coverRoot: root }).length, 1)
    assert.throws(
      () => normalizeVideos([{ ...GOOD, cover: '/images/videos/missing.jpg' }], REPORTS, { coverRoot: root }),
      /「cover」/,
    )
    // 越出目录、指向目录都拒绝
    fs.writeFileSync(path.join(root, 'images', 'outside.jpg'), '')
    assert.throws(() => normalizeVideos([{ ...GOOD, cover: '/images/videos/../outside.jpg' }], REPORTS, { coverRoot: root }), /「cover」/)
    fs.mkdirSync(path.join(root, 'images', 'videos', 'dir'))
    assert.throws(() => normalizeVideos([{ ...GOOD, cover: '/images/videos/dir' }], REPORTS, { coverRoot: root }), /「cover」/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('按日期降序，同日按标题排序', () => {
  const rows = normalizeVideos(
    [
      { ...GOOD, title: 'B', date: '2026-11-19' },
      { ...GOOD, title: 'b', date: '2026-11-20' },
      { ...GOOD, title: 'a', date: '2026-11-20' },
    ],
    REPORTS,
  )
  assert.deepEqual(rows.map((r) => r.title), ['a', 'b', 'B'])
})

test('可选 videoUrl 校验与站内播放器解析（直链优先，B站/YouTube 嵌入，未知回退）', () => {
  const [withSrc] = normalizeVideos([{ ...GOOD, videoUrl: 'https://cdn.example.com/ep1.mp4' }], REPORTS)
  assert.equal(withSrc.videoUrl, 'https://cdn.example.com/ep1.mp4')
  assert.throws(() => normalizeVideos([{ ...GOOD, videoUrl: 'http://cdn.example.com/ep1.mp4' }], REPORTS), /「videoUrl」/)

  assert.deepEqual(resolveVideoPlayer(withSrc), {
    kind: 'native',
    provider: 'self',
    src: 'https://cdn.example.com/ep1.mp4',
  })

  const bili = resolveVideoPlayer({ url: 'https://www.bilibili.com/video/BV1J417zmE4K/?p=2' })
  assert.equal(bili.kind, 'iframe')
  assert.equal(bili.provider, 'bilibili')
  assert.match(bili.src, /player\.bilibili\.com\/player\.html\?.*bvid=BV1J417zmE4K.*page=2/)

  const yt = resolveVideoPlayer({ url: 'https://youtu.be/dQw4w9WgXcQ' })
  assert.deepEqual(yt, {
    kind: 'iframe',
    provider: 'youtube',
    src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
  })

  assert.equal(resolveVideoPlayer({ url: 'https://example.com/watch/1' }), null)
})
