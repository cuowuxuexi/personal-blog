#!/usr/bin/env node
/**
 * 研报一条龙：落页 → 登记 → 测试与构建 →（--upload）只提交这家研报 → push main → 上传 cuowo.cn → 线上核对。
 * 用法：node scripts/ship-report.mjs <研报源目录> [--industry <行业>] [--upload]
 * 不带 --upload 停在本地构建通过；源目录只作为参数出现，不写进任何入库文件。
 */

import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { landReport } from './land-report.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const README_REL = 'docs/public/html/README.md'
const ORIGIN = 'https://cuowo.cn'
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// ---------- 纯函数 ----------

export function parseArgs(argv) {
  const args = { srcDir: '', industry: '', upload: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--industry') args.industry = argv[++i] || ''
    else if (a === '--upload') args.upload = true
    else if (a.startsWith('--')) throw new Error(`未知参数 ${a}`)
    else if (!args.srcDir) args.srcDir = a
    else throw new Error(`多余的参数 ${a}`)
  }
  if (!args.srcDir) throw new Error('用法：node scripts/ship-report.mjs <研报源目录> [--industry <行业>] [--upload]')
  return args
}

/** 在 html/README.md 的研报行后登记这家；已登记则原样返回。 */
export function registerReportRow(readme, { slug, company, pageCount }) {
  const text = String(readme)
  if (text.includes(`| \`${slug}/\` |`)) return text
  const pages = CN_NUM[pageCount] || String(pageCount)
  const row = `| \`${slug}/\` | ${company}研报（${pages}页）；行业见 \`blog-meta.json\`；\`/投资/\` 研报段入口 |`
  const lines = text.split('\n')
  let at = -1
  lines.forEach((line, i) => { if (/^\| `report-[^`]+\/` \|/.test(line)) at = i })
  if (at < 0) throw new Error(`${README_REL} 里找不到研报登记行，请手动登记 ${slug}`)
  lines.splice(at + 1, 0, row)
  return lines.join('\n')
}

/**
 * 落页后这家目录的改动是否只有 updatedAt：porcelain 只列出 blog-meta.json 一项改动，
 * 且新旧两份除 updatedAt 外相同。
 */
export function onlyTimestampChanged(porcelainLines, slug, headMeta, newMeta) {
  const lines = porcelainLines.filter((l) => l.trim())
  if (lines.length !== 1) return false
  if (!/^ M /.test(lines[0]) || !lines[0].endsWith(`${slug}/blog-meta.json`)) return false
  try {
    const a = JSON.parse(headMeta)
    const b = JSON.parse(newMeta)
    delete a.updatedAt
    delete b.updatedAt
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

// ---------- 副作用 ----------

function git(args, { keepLeading = false } = {}) {
  const out = execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' })
  return keepLeading ? out.trimEnd() : out.trim()
}

function step(title, command, args) {
  process.stdout.write(`\n▶ ${title}\n`)
  const isWin = process.platform === 'win32'
  const r = isWin
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], { cwd: REPO_ROOT, stdio: 'inherit' })
    : spawnSync(command, args, { cwd: REPO_ROOT, stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`${title} 失败（退出码 ${r.status}）`)
}

async function fetchText(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`${url} 返回 ${res.status}`)
  return res.text()
}

async function onlineSha() {
  try {
    return JSON.parse(await fetchText(`${ORIGIN}/build.json`)).sha || ''
  } catch {
    return ''
  }
}

async function verifyOnline({ sha, slug, company }) {
  let got = ''
  for (let i = 0; i < 6; i++) {
    got = await onlineSha()
    if (got === sha) break
    await new Promise((r) => setTimeout(r, 5000))
  }
  if (got !== sha) throw new Error(`线上 build.json 的 sha 是 ${got || '（取不到）'}，不等于本次提交 ${sha}`)
  const html = await fetchText(`${ORIGIN}/html/${slug}/`)
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || ''
  if (!title.includes(company)) throw new Error(`线上 /html/${slug}/ 标题是「${title}」，不含「${company}」`)
  return title
}

function pushAndPublish() {
  step('推送 main', 'git', ['push', 'origin', 'main'])
  step('上传 cuowo.cn', process.execPath, [path.join('scripts', 'publish-guonei.mjs')])
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const srcDir = path.resolve(args.srcDir)

  if (args.upload) {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
    if (branch !== 'main') throw new Error(`当前分支是 ${branch}，--upload 只在 main 上做`)
    const staged = git(['diff', '--cached', '--name-only'])
    if (staged) throw new Error(`暂存区已有别的文件，先处理掉再上传：\n${staged}`)
  }

  const slugDirRel = (slug) => `docs/public/html/${slug}`
  const r = landReport({ srcDir, industry: args.industry })
  const rel = slugDirRel(r.slug)
  process.stdout.write(`已落页：${r.company} ${r.code} → ${rel}（行业：${r.industry}）\n`)

  const isNew = !git(['ls-files', rel])
  if (!isNew) {
    const porcelain = git(['status', '--porcelain', '--', rel], { keepLeading: true }).split('\n')
    let headMeta = ''
    try { headMeta = git(['show', `HEAD:${rel}/blog-meta.json`]) } catch {}
    const newMeta = fs.readFileSync(path.join(REPO_ROOT, rel, 'blog-meta.json'), 'utf8')
    if (onlyTimestampChanged(porcelain, r.slug, headMeta, newMeta)) {
      git(['checkout', '--', `${rel}/blog-meta.json`])
      process.stdout.write('博客里这份研报已是最新，没有改动。\n')
      if (!args.upload) return
      const sha = git(['rev-parse', 'HEAD'])
      if ((await onlineSha()) === sha) {
        process.stdout.write(`cuowo.cn 也已是最新（sha=${sha.slice(0, 7)}）。\n`)
        return
      }
      process.stdout.write('cuowo.cn 落后于本地提交，补推送并上传。\n')
      pushAndPublish()
      const title = await verifyOnline({ sha, slug: r.slug, company: r.company })
      process.stdout.write(`\n线上核对通过：${ORIGIN}/html/${r.slug}/ 「${title}」\n`)
      return
    }
  }

  const readmeFile = path.join(REPO_ROOT, README_REL)
  const pageCount = fs.readdirSync(path.join(REPO_ROOT, rel)).filter((f) => f.endsWith('.html')).length
  const before = fs.readFileSync(readmeFile, 'utf8')
  const after = registerReportRow(before, { slug: r.slug, company: r.company, pageCount })
  if (after !== before) {
    fs.writeFileSync(readmeFile, after)
    process.stdout.write(`已在 ${README_REL} 登记 ${r.slug}\n`)
  }

  step('内容测试', 'pnpm', ['test:content'])
  step('独立 HTML 检查', 'pnpm', ['check:html'])
  step('站点构建', 'pnpm', ['docs:build'])

  if (!args.upload) {
    process.stdout.write(`\n本地已通过。预览：pnpm docs:preview 后打开 /html/${r.slug}/；确认后加 --upload 重跑。\n`)
    return
  }

  git(['add', '--', rel, README_REL])
  git(['commit', '-m', `feat: ${isNew ? '落地' : '更新'}${r.company}研报`])
  const sha = git(['rev-parse', 'HEAD'])
  process.stdout.write(`\n已提交 ${sha.slice(0, 7)}（只含 ${rel}/ 与 ${README_REL}）\n`)
  pushAndPublish()
  const title = await verifyOnline({ sha, slug: r.slug, company: r.company })
  process.stdout.write(`\n线上核对通过：${ORIGIN}/html/${r.slug}/ 「${title}」\n`)
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  main().catch((err) => {
    process.stderr.write(`ship-report: ${err.message}\n`)
    process.exitCode = 1
  })
}
