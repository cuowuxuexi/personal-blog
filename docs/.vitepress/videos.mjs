import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadReports } from './research-reports.mjs'

/**
 * 视频元数据（只在 Node 端用）。视频外链托管，博客只存元数据：docs/视频/videos.json。
 * 任一条不合规就抛错，报出下标与字段。
 */

const DOCS_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const VIDEOS_FILE = path.join(DOCS_DIR, '视频', 'videos.json')
const COVER_DIR = path.join(DOCS_DIR, 'public')

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DURATION_RE = /^(?:\d{1,2}:[0-5]\d|\d{1,2}:[0-5]\d:[0-5]\d)$/

/** YYYY-MM-DD 是否为真实存在的日期（排除 2026-02-30 这类）。 */
function isRealDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/** 数组下标 index 的条目缺 field 或不合规。 */
function bad(index, field, reason) {
  return new Error(`videos.json 第 ${index} 条（下标 ${index}）字段「${field}」${reason}`)
}

function isHttps(value) {
  if (typeof value !== 'string') return false
  try {
    // 要求字面上以 https:// 开头：URL() 会接受 https:example.com 这种缺 // 的写法
    return /^https:\/\/[^/\s]/.test(value) && new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeVideos(list, reports = [], { coverRoot = COVER_DIR } = {}) {
  if (!Array.isArray(list)) throw new Error('videos.json 必须是数组')
  const byCode = new Map(reports.map((r) => [String(r.code).toUpperCase(), r]))
  const rows = list.map((raw, i) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw bad(i, '条目', '必须是对象')
    const { title, date, duration, cover, url, videoUrl, report } = raw
    if (typeof title !== 'string' || !title.trim()) throw bad(i, 'title', '必须是非空字符串')
    if (typeof date !== 'string' || !DATE_RE.test(date) || !isRealDate(date)) {
      throw bad(i, 'date', '必须是 YYYY-MM-DD')
    }
    if (typeof duration !== 'string' || !DURATION_RE.test(duration)) {
      throw bad(i, 'duration', '必须是 m:ss、mm:ss 或 h:mm:ss')
    }
    if (typeof cover !== 'string' || !cover) throw bad(i, 'cover', '必填')
    if (cover.startsWith('/images/videos/')) {
      const abs = path.resolve(coverRoot, '.' + cover)
      const videosDir = path.resolve(coverRoot, 'images', 'videos') + path.sep
      if (!abs.startsWith(videosDir)) throw bad(i, 'cover', `不得越出 /images/videos/：${cover}`)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw bad(i, 'cover', `指向的文件不存在：${cover}`)
    } else if (!isHttps(cover)) {
      throw bad(i, 'cover', '必须以 /images/videos/ 开头，或是 https:// 外链')
    }
    if (!isHttps(url)) throw bad(i, 'url', '必须是 https:// 外链')
    const out = { title: title.trim(), date, duration, cover, url }
    if (videoUrl !== undefined) {
      if (!isHttps(videoUrl)) throw bad(i, 'videoUrl', '必须是 https:// 外链')
      out.videoUrl = videoUrl
    }
    if (report !== undefined) {
      const hit = typeof report === 'string' ? byCode.get(report.toUpperCase()) : undefined
      if (!hit) throw bad(i, 'report', `对不上已落地研报：${report}`)
      out.report = report
      out.reportSlug = hit.slug
      out.reportCompany = hit.company
    }
    return out
  })
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.title < b.title ? -1 : a.title > b.title ? 1 : 0
  })
}

export function loadVideos(file = VIDEOS_FILE) {
  let list
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`读取 ${file} 失败：${err.message}`)
  }
  return normalizeVideos(list, loadReports().reports)
}
