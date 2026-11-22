#!/usr/bin/env node
/**
 * 研报落页：把投研系统交来的研报目录原样落到 docs/public/html/report-<slug>/。
 * 用法：node scripts/land-report.mjs <研报源目录> [--industry <行业>]
 * 源目录只作为参数出现，不写进任何入库文件。旧页原样保留，不归档、不删除。
 * 每次落页把 blog-meta.json 的 updatedAt 刷新为本次落页时间（北京时间）。
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from '../content-catalog/frontmatter.mjs'
import { findElement, formatUpdatedAt, textOf } from '../docs/.vitepress/research-reports.mjs'
import { buildCatalogTitleLinks, checkReportSet } from './check-standalone-html.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const BACKLINK_OLD = 'href="http://127.0.0.1:18519/画布.html"'
export const BACKLINK_NEW = 'href="/投资/"'
export const PRIVATE_TRACE_RE = /127\.0\.0\.1|localhost|\bfile:\/|(?<![A-Za-z])[A-Za-z]:[\\/]|\/邹佩轩\//
const SCAN_EXT = new Set(['.html', '.js', '.css'])

// ---------- 纯函数 ----------

/** 从引言页 HTML 取公司名与代码；取不到返回 null。 */
export function extractTicker(html) {
  const box = findElement(html, { className: 'ticker-box' })
  if (!box) return null
  const codeEl = findElement(box.inner, { className: 'ticker-code' })
  const code = codeEl ? textOf(codeEl.inner) : ''
  const company = textOf(box.inner.replace(/<span[^>]*ticker-code[\s\S]*?<\/span>/i, ''))
  if (!code || !company) return null
  return { company, code }
}

/** 代码小写、`.` 换 `-`：002714.SZ → 002714-sz。 */
export function slugOf(code) {
  return String(code).trim().toLowerCase().replace(/\./g, '-')
}

/** 回链替换，返回新 html 与命中数。 */
export function replaceBacklink(html) {
  const parts = String(html).split(BACKLINK_OLD)
  return { html: parts.join(BACKLINK_NEW), count: parts.length - 1 }
}

/** 逐行扫描私有痕迹，返回 [{ line, text }]。 */
export function scanPrivateTraces(text) {
  const hits = []
  String(text).split(/\r?\n/).forEach((line, i) => {
    const m = line.match(PRIVATE_TRACE_RE)
    if (m) hits.push({ line: i + 1, text: m[0] })
  })
  return hits
}

/** `ticker` 按 `/` 拆开、去空格后逐个与代码比对（忽略大小写）。 */
export function tickerMatches(ticker, code) {
  const want = String(code || '').trim().toUpperCase()
  if (!want) return false
  return String(ticker || '')
    .split('/')
    .map((part) => part.trim().toUpperCase())
    .some((part) => part === want)
}

// ---------- 文件系统辅助 ----------

function walkFiles(root, rel = '') {
  const out = []
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...walkFiles(root, r))
    else if (e.isFile()) out.push(r)
  }
  return out.sort()
}

export function scanSetForPrivateTraces(root) {
  const hits = []
  for (const rel of walkFiles(root)) {
    if (!SCAN_EXT.has(path.extname(rel).toLowerCase())) continue
    for (const hit of scanPrivateTraces(fs.readFileSync(path.join(root, rel), 'utf8'))) {
      hits.push(`${rel}:${hit.line} ${hit.text}`)
    }
  }
  return hits
}

/** docs/投资/投研 下 ticker 含该代码的标的。返回 [{ dir, industry, name, canvasDir }]。 */
export function findOldSubjects(repoRoot, code) {
  const base = path.join(repoRoot, 'docs', '投资', '投研')
  if (!fs.existsSync(base)) return []
  const found = []
  for (const rel of walkFiles(base)) {
    if (path.basename(rel) !== 'index.md') continue
    const file = path.join(base, rel)
    const { fm } = parseFrontmatter(fs.readFileSync(file, 'utf8'))
    if (!tickerMatches(fm.ticker, code)) continue
    const dir = path.dirname(file)
    const segs = path.relative(base, dir).split(path.sep)
    let canvasDir = null
    if (fm.publicHref) {
      const m = String(fm.publicHref).match(/^\/html\/([^/]+)\/?$/)
      const candidate = m && path.join(repoRoot, 'docs', 'public', 'html', m[1])
      if (candidate && fs.existsSync(candidate)) canvasDir = candidate
    }
    found.push({ file, dir, industry: segs.length > 1 ? segs[0] : '', name: segs[segs.length - 1], canvasDir })
  }
  return found
}

const DEFAULT_OPS = { cpSync: fs.cpSync, renameSync: fs.renameSync, rmSync: fs.rmSync }

function randomSuffix() {
  return crypto.randomBytes(4).toString('hex')
}

// ---------- 主流程 ----------

/**
 * 步骤 2：复制到同级暂存目录，再改名切换；旧目标先改名为 .old，**保留**备份由调用方在
 * 全部提交后才删。本函数内部失败时自行恢复。暂存/旧目录以 . 开头，不会被当成研报集。
 * 返回 undo（把新目标撤掉、恢复旧目标）与 finish（删备份）。
 */
function replaceTarget(copy, target, slug, ops) {
  const parent = path.dirname(target)
  const suffix = randomSuffix()
  const staging = path.join(parent, `.${slug}.staging-${suffix}`)
  const backup = path.join(parent, `.${slug}.old-${suffix}`)
  let movedOld = false
  try {
    ops.cpSync(copy, staging, { recursive: true })
    if (fs.existsSync(target)) {
      ops.renameSync(target, backup)
      movedOld = true
    }
    ops.renameSync(staging, target)
  } catch (err) {
    if (movedOld && !fs.existsSync(target)) ops.renameSync(backup, target)
    fs.rmSync(staging, { recursive: true, force: true })
    throw err
  }
  return {
    backup: movedOld ? backup : null,
    undo() {
      fs.rmSync(target, { recursive: true, force: true })
      if (movedOld) ops.renameSync(backup, target)
    },
  }
}

/**
 * 顺序：副本处理与校验 → 公开切换（保留 .old）→ 成功后删 .old。
 * 切换失败整体回滚；最后的清理失败只给警告。旧页不动。
 */
export function landReport({ srcDir, industry, repoRoot = REPO_ROOT, ops = {}, now = new Date() }) {
  const updatedAt = formatUpdatedAt(now)
  const o = { ...DEFAULT_OPS, ...ops }
  const indexFile = path.join(srcDir, 'index.html')
  if (!fs.existsSync(indexFile)) throw new Error(`源目录缺少 index.html：${srcDir}`)
  const ticker = extractTicker(fs.readFileSync(indexFile, 'utf8'))
  if (!ticker) throw new Error('取不到 .ticker-box 公司名或 .ticker-code 代码')
  const slug = `report-${slugOf(ticker.code)}`
  const target = path.join(repoRoot, 'docs', 'public', 'html', slug)

  const olds = findOldSubjects(repoRoot, ticker.code)
  if (olds.length > 1) throw new Error(`代码 ${ticker.code} 匹配到多个旧标的：${olds.map((x) => x.dir).join('；')}`)
  const old = olds[0] || null

  let finalIndustry = industry || old?.industry
  if (!finalIndustry) {
    try {
      finalIndustry = JSON.parse(fs.readFileSync(path.join(target, 'blog-meta.json'), 'utf8')).industry
    } catch {
      finalIndustry = ''
    }
  }
  if (!finalIndustry) throw new Error('无法确定行业：请加 --industry <行业>')

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'land-report-'))
  let replaced = null
  try {
    const copy = path.join(tmp, slug)
    o.cpSync(srcDir, copy, { recursive: true })
    for (const rel of walkFiles(copy)) {
      if (!rel.toLowerCase().endsWith('.html')) continue
      const file = path.join(copy, rel)
      const { html, count } = replaceBacklink(fs.readFileSync(file, 'utf8'))
      if (count !== 1) throw new Error(`${rel}: 回链 ${BACKLINK_OLD} 命中 ${count} 次，必须恰为 1`)
      fs.writeFileSync(file, html)
    }
    const hits = scanSetForPrivateTraces(copy)
    if (hits.length) throw new Error(`发现私有痕迹：\n${hits.join('\n')}`)
    fs.writeFileSync(path.join(copy, 'blog-meta.json'), JSON.stringify({ industry: finalIndustry, updatedAt }))

    // 公开切换之前，先在临时副本上跑研报集检查
    const failures = checkReportSet(repoRoot, copy, buildCatalogTitleLinks(repoRoot))
    if (failures.length) throw new Error(`副本校验失败：\n${failures.join('\n')}`)

    replaced = replaceTarget(copy, target, slug, o)
  } catch (err) {
    const problems = []
    if (replaced) {
      try {
        replaced.undo()
      } catch (e) {
        problems.push(`恢复 ${target}：${e.message}`)
      }
    }
    if (problems.length) err.message += `\n回滚未完全成功，需要手动处理：\n${problems.join('\n')}`
    throw err
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  // 公开切换已提交；清理失败只警告，不回滚
  const warnings = []
  if (replaced?.backup) {
    try {
      o.rmSync(replaced.backup, { recursive: true, force: true })
    } catch (e) {
      warnings.push(`${replaced.backup}（${e.message}）`)
    }
  }

  return { ...ticker, slug, target, industry: finalIndustry, updatedAt, old, warnings }
}

function parseArgs(argv) {
  const args = { srcDir: '', industry: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--industry') args.industry = argv[++i] || ''
    else if (a.startsWith('--')) throw new Error(`未知参数 ${a}`)
    else if (!args.srcDir) args.srcDir = a
    else throw new Error(`多余的参数 ${a}`)
  }
  if (!args.srcDir) throw new Error('用法：node scripts/land-report.mjs <研报源目录> [--industry <行业>]')
  args.srcDir = path.resolve(args.srcDir)
  return args
}

function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
    const r = landReport(args)
    const rel = (p) => path.relative(REPO_ROOT, p).replace(/\\/g, '/')
    const lines = [`已落页：${r.company} ${r.code}`, `目标目录：${rel(r.target)}`, `行业：${r.industry}`, `更新时间：${r.updatedAt}`]
    if (r.old) lines.push(`旧版里有这家：${rel(r.old.dir)}`)
    if (r.warnings.length) {
      lines.push('警告：公开切换已提交，但下列残留清理失败，需要手动删除：')
      lines.push(...r.warnings.map((x) => `  ${x}`))
    }
    process.stdout.write(`${lines.join('\n')}\n`)
  } catch (err) {
    process.stderr.write(`land-report: ${err.message}\n`)
    process.exitCode = 1
  }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) main()
