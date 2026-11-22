import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  extractTicker,
  landReport,
  replaceBacklink,
  scanPrivateTraces,
  slugOf,
  tickerMatches,
} from './land-report.mjs'

const OLD_LINK = '<a class="back-link" href="http://127.0.0.1:18519/画布.html">← 研究入口</a>'

// 落页会在副本上跑研报集检查，所以夹具必须是结构完整的研报页
function page(extra = '', { link = OLD_LINK, thesis = '<div class="thesis-banner">一句判断</div>' } = {}) {
  return `<!DOCTYPE html><html><head><link rel="stylesheet" href="assets/report.css"></head><body>${link}<span class="ticker-box">测试公司 <span class="ticker-code">000001.SZ</span></span>
<nav class="layer-tabs"><a href="index.html">引言</a><a href="business.html">生意</a></nav>
<section id="s1-1"><div class="badge-row"><span class="badge">价格时点 2026-11-20 收盘</span><span class="badge">终审价 <span class="num">44.85</span> 元</span><span class="badge">总市值 <span class="num">2,589</span> 亿元</span><span class="badge badge-crimson">看空</span></div>${thesis}</section>${extra}</body></html>`
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

/** 临时仓库 + 源目录。有旧标的时放在 docs/投资/投研/测试行业/测试公司/。 */
function fixture({ withOld = true, srcPages = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'land-test-'))
  const repo = path.join(root, 'repo')
  const src = path.join(root, 'src')
  fs.mkdirSync(path.join(repo, 'docs', 'public', 'html'), { recursive: true })
  write(path.join(repo, 'docs', '投资', 'index.md'), '# 投研')
  write(path.join(src, 'index.html'), page())
  write(path.join(src, 'business.html'), page('<p>二页</p>'))
  write(path.join(src, 'assets', 'report.css'), ':root { --bg: #fff; }')
  fs.writeFileSync(path.join(src, 'assets', 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))
  for (const [name, html] of Object.entries(srcPages)) write(path.join(src, name), html)
  const oldDir = path.join(repo, 'docs', '投资', '投研', '测试行业', '测试公司')
  const canvas = path.join(repo, 'docs', 'public', 'html', 'old-canvas')
  if (withOld) {
    write(path.join(oldDir, 'index.md'), '---\ntitle: 测试公司\nticker: 000001.SZ / 0001.HK\npublicHref: /html/old-canvas\n---\n正文')
    write(path.join(oldDir, '章节', 'index.md'), '章节')
    write(path.join(canvas, 'index.html'), '<html>旧画布</html>')
  }
  return {
    root, repo, src, oldDir, canvas,
    target: path.join(repo, 'docs', 'public', 'html', 'report-000001-sz'),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

test('纯函数：取代码与公司、slug、回链、痕迹、ticker 比对', () => {
  assert.deepEqual(extractTicker(page()), { company: '测试公司', code: '000001.SZ' })
  assert.equal(extractTicker('<html></html>'), null)
  assert.equal(slugOf('002714.SZ'), '002714-sz')
  assert.equal(replaceBacklink(page()).count, 1)
  assert.equal(replaceBacklink(page()).html.includes('href="/投资/"'), true)
  assert.equal(replaceBacklink('<a>x</a>').count, 0)
  assert.equal(scanPrivateTraces('a\nhttp://x/y\nC:\\Users\\a').length, 1)
  assert.equal(scanPrivateTraces('http://example.com/a').length, 0)
  assert.equal(scanPrivateTraces('<a href="http://localhost:1">').length, 1)
  assert.equal(scanPrivateTraces('/邹佩轩/x').length, 1)
  assert.equal(tickerMatches('603259.SH / 2359.HK', '2359.hk'), true)
  assert.equal(tickerMatches('002714.SZ', '002714.SH'), false)
  assert.equal(tickerMatches('', '002714.SZ'), false)
})

test('落页：回链替换、写 blog-meta.json、行业取自旧标的、旧页原样保留', () => {
  const f = fixture()
  try {
    const r = landReport({ srcDir: f.src, repoRoot: f.repo, now: new Date('2026-11-22T05:05:00Z') })
    assert.equal(r.industry, '测试行业')
    assert.equal(r.updatedAt, '2026-11-22T13:05:00+08:00')
    assert.equal(
      fs.readFileSync(path.join(f.target, 'blog-meta.json'), 'utf8'),
      '{"industry":"测试行业","updatedAt":"2026-11-22T13:05:00+08:00"}',
    )
    assert.match(fs.readFileSync(path.join(f.target, 'index.html'), 'utf8'), /href="\/投资\/"/)
    assert.ok(fs.readFileSync(path.join(f.target, 'assets', 'a.png')).equals(fs.readFileSync(path.join(f.src, 'assets', 'a.png'))))
    assert.ok(fs.existsSync(f.oldDir) && fs.existsSync(f.canvas))
    assert.equal(r.old.dir, f.oldDir)
  } finally {
    f.cleanup()
  }
})

test('回链命中数不为 1 时失败且目标不动', () => {
  for (const bad of [page('', { link: '' }), page(OLD_LINK)]) {
    const f = fixture({ srcPages: { 'root.html': bad } })
    try {
      write(path.join(f.target, 'sentinel.txt'), 'keep')
      assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo }), /回链.*命中/)
      assert.equal(fs.readFileSync(path.join(f.target, 'sentinel.txt'), 'utf8'), 'keep')
      assert.equal(fs.existsSync(path.join(f.target, 'index.html')), false)
    } finally {
      f.cleanup()
    }
  }
})

test('私有痕迹命中失败且目标不动', () => {
  const f = fixture()
  try {
    write(path.join(f.src, 'assets', 'report.js'), 'fetch("http://localhost:3000/x")')
    write(path.join(f.target, 'sentinel.txt'), 'keep')
    assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo }), /私有痕迹[\s\S]*report\.js:1/)
    assert.equal(fs.readFileSync(path.join(f.target, 'sentinel.txt'), 'utf8'), 'keep')
  } finally {
    f.cleanup()
  }
})

test('无旧标的又没有 --industry 时失败；重落沿用已有 blog-meta.json', () => {
  const f = fixture({ withOld: false })
  try {
    assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo }), /--industry/)
    landReport({ srcDir: f.src, repoRoot: f.repo, industry: '行业甲', now: new Date('2026-11-22T05:05:00Z') })
    const again = landReport({ srcDir: f.src, repoRoot: f.repo, now: new Date('2026-11-23T01:00:00Z') })
    assert.equal(again.industry, '行业甲')
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.target, 'blog-meta.json'), 'utf8')), {
      industry: '行业甲',
      updatedAt: '2026-11-23T09:00:00+08:00',
    })
  } finally {
    f.cleanup()
  }
})

test('取不到 ticker 时失败', () => {
  const f = fixture()
  try {
    write(path.join(f.src, 'index.html'), '<html><body>无</body></html>')
    assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo }), /ticker/)
  } finally {
    f.cleanup()
  }
})

const htmlDirOf = (f) => path.join(f.repo, 'docs', 'public', 'html')
const dotLeftovers = (f) => fs.readdirSync(htmlDirOf(f)).filter((n) => n.startsWith('.report-'))

test('重落：暂存复制失败时上一版目标完好，没有残留', () => {
  const f = fixture({ withOld: false })
  try {
    landReport({ srcDir: f.src, repoRoot: f.repo, industry: '行业甲' })
    const before = fs.readFileSync(path.join(f.target, 'index.html'), 'utf8')
    write(path.join(f.src, 'index.html'), page('<p>新版</p>'))
    const cpSync = (from, to, opts) => {
      if (String(to).includes('.staging-')) {
        fs.mkdirSync(to, { recursive: true })
        throw new Error('注入：复制失败')
      }
      return fs.cpSync(from, to, opts)
    }
    assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo, ops: { cpSync } }), /注入/)
    assert.equal(fs.readFileSync(path.join(f.target, 'index.html'), 'utf8'), before)
    assert.deepEqual(dotLeftovers(f), [])
  } finally {
    f.cleanup()
  }
})

test('重落：暂存改名失败时上一版目标被恢复，没有残留', () => {
  const f = fixture({ withOld: false })
  try {
    landReport({ srcDir: f.src, repoRoot: f.repo, industry: '行业甲' })
    const before = fs.readFileSync(path.join(f.target, 'index.html'), 'utf8')
    write(path.join(f.src, 'index.html'), page('<p>新版</p>'))
    let calls = 0
    const renameSync = (from, to) => {
      calls += 1
      if (calls === 2) throw new Error('注入：改名失败')
      return fs.renameSync(from, to)
    }
    assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo, ops: { renameSync } }), /注入/)
    assert.equal(fs.readFileSync(path.join(f.target, 'index.html'), 'utf8'), before)
    assert.deepEqual(dotLeftovers(f), [])
    const again = landReport({ srcDir: f.src, repoRoot: f.repo })
    assert.equal(again.industry, '行业甲')
    assert.match(fs.readFileSync(path.join(f.target, 'index.html'), 'utf8'), /新版/)
    assert.deepEqual(dotLeftovers(f), [])
  } finally {
    f.cleanup()
  }
})

test('副本元数据缺字段：失败，目标与旧页都不动', () => {
  const f = fixture()
  try {
    write(path.join(f.src, 'index.html'), page('', { thesis: '' }))
    write(path.join(f.target, 'sentinel.txt'), 'keep')
    assert.throws(
      () => landReport({ srcDir: f.src, repoRoot: f.repo }),
      /副本校验失败[\s\S]*一句判断/,
    )
    assert.equal(fs.readFileSync(path.join(f.target, 'sentinel.txt'), 'utf8'), 'keep')
    assert.ok(fs.existsSync(f.oldDir) && fs.existsSync(f.canvas))
  } finally {
    f.cleanup()
  }
})

test('副本里出现别的失败（断链）时中止', () => {
  const f = fixture()
  try {
    write(path.join(f.src, 'business.html'), page('<img src="assets/missing.png">'))
    assert.throws(() => landReport({ srcDir: f.src, repoRoot: f.repo }), /副本校验失败[\s\S]*missing\.png/)
    assert.equal(fs.existsSync(f.target), false)
  } finally {
    f.cleanup()
  }
})

test('最终清理删除 .old 失败：不回滚、不抛错，返回残留路径', () => {
  const f = fixture({ withOld: false })
  try {
    landReport({ srcDir: f.src, repoRoot: f.repo, industry: '行业甲' })
    write(path.join(f.src, 'index.html'), page('<p>新版</p>'))
    const rmSync = (p, opts) => {
      if (String(p).includes('.old-')) throw new Error('注入：删除失败')
      return fs.rmSync(p, opts)
    }
    const r = landReport({ srcDir: f.src, repoRoot: f.repo, ops: { rmSync } })
    assert.equal(r.warnings.length, 1, r.warnings.join('\n'))
    assert.ok(r.warnings[0].includes('.old-'))
    assert.match(fs.readFileSync(path.join(f.target, 'index.html'), 'utf8'), /新版/)
  } finally {
    f.cleanup()
  }
})

test('与旧标的同代码：落页成功，旧页原样保留', () => {
  const f = fixture()
  try {
    const before = fs.readFileSync(path.join(f.oldDir, 'index.md'), 'utf8')
    const r = landReport({ srcDir: f.src, repoRoot: f.repo })
    assert.match(r.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/)
    assert.ok(r.old)
    assert.equal(fs.readFileSync(path.join(f.oldDir, 'index.md'), 'utf8'), before)
    assert.ok(fs.existsSync(path.join(f.canvas, 'index.html')))
  } finally {
    f.cleanup()
  }
})
