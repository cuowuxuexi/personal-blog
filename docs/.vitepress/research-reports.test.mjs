import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  extractReportFields,
  extractRootVars,
  formatUpdatedAt,
  isValidUpdatedAt,
  loadReports,
  siteTokenCss,
  sortReports,
  stanceTone,
} from './research-reports.mjs'

const INTRO = `<!DOCTYPE html><html><body>
<header class="topbar"><div class="brand-group">
  <a class="back-link" href="/投资/">← 研究入口</a>
  <span class="ticker-box">测试公司 <span class="ticker-code">000001.SZ</span></span>
</div>
<nav class="layer-tabs" aria-label="研报导航"><a class="layer-tab" aria-current="page" href="index.html">引言</a><a class="layer-tab" href="business.html">生意与前提</a></nav></header>
<section id="s1-1" data-title="判断">
  <div class="badge-row"><span class="badge badge-dark">引言</span><span class="badge">价格时点 2026-11-20 收盘</span><span class="badge">终审价 <span class="num">44.85</span> 元</span><span class="badge">总市值 <span class="num">2,589</span> 亿元</span><span class="badge badge-crimson"><span class="sq-dot"></span> 看空（长期价值）· 附条件</span></div>
  <h2>判断</h2>
  <div class="thesis-banner">一句判断，含 <span class="num">12</span> 个数。</div>
</section>
<section id="s1-2"><div class="thesis-banner">不是这一句</div></section>
</body></html>`

function withoutPart(html, pattern) {
  assert.ok(pattern.test(html))
  return html.replace(pattern, '')
}

test('从引言页取到全部字段', () => {
  const fields = extractReportFields(INTRO, 'report-000001-sz')
  assert.equal(fields.company, '测试公司')
  assert.equal(fields.code, '000001.SZ')
  assert.equal(fields.stance, '看空（长期价值）· 附条件')
  assert.equal(fields.priceDate, '2026-11-20')
  assert.equal(fields.thesis, '一句判断，含 12 个数。')
  assert.deepEqual(fields.pages, [
    { text: '引言', href: 'index.html' },
    { text: '生意与前提', href: 'business.html' },
  ])
})

test('取到终审价', () => {
  assert.equal(extractReportFields(INTRO, 'report-000001-sz').finalPrice, '44.85')
})

test('价格标签写作「收盘价」时也取到终审价', () => {
  const html = INTRO.replace('<span class="badge">终审价 ', '<span class="badge">收盘价 ')
  assert.equal(extractReportFields(html, 'report-000001-sz').finalPrice, '44.85')
})

test('取到总市值', () => {
  assert.equal(extractReportFields(INTRO, 'report-000001-sz').marketCap, '2,589')
})

test('缺总市值 badge 时抛错并含「总市值」', () => {
  const html = withoutPart(INTRO, /<span class="badge">总市值[\s\S]*?亿元<\/span>/)
  assert.throws(
    () => extractReportFields(html, 'report-000001-sz'),
    (err) => err.message.includes('report-000001-sz') && err.message.includes('总市值'),
  )
})

test('缺终审价 badge 时抛错并含「终审价」', () => {
  const html = withoutPart(INTRO, /<span class="badge">终审价[\s\S]*?元<\/span>/)
  assert.throws(
    () => extractReportFields(html, 'report-000001-sz'),
    (err) => err.message.includes('report-000001-sz') && err.message.includes('终审价'),
  )
})

test('缺任一字段时抛错并报出 slug 与字段名', () => {
  const cases = [
    ['公司名/代码', /<span class="ticker-box">[\s\S]*?<\/span><\/span>/],
    ['立场', /<span class="badge badge-crimson"><span class="sq-dot"><\/span>[^<]*<\/span>/],
    ['价格时点', /<span class="badge">价格时点[^<]*<\/span>/],
    ['一句判断', /<div class="thesis-banner">一句判断[\s\S]*?<\/div>/],
    ['layer-tabs', /<nav class="layer-tabs"[\s\S]*?<\/nav>/],
    ['s1-1 段', /<section id="s1-1"/],
  ]
  for (const [field, pattern] of cases) {
    const html = withoutPart(INTRO, pattern)
    assert.throws(
      () => extractReportFields(html, 'report-000001-sz'),
      (err) => err.message.includes('report-000001-sz') && err.message.includes(field),
      field,
    )
  }
})

test('formatUpdatedAt 输出北京时间 +08:00，跨日正确', () => {
  assert.equal(formatUpdatedAt(new Date('2026-11-22T05:05:09Z')), '2026-11-22T13:05:09+08:00')
  assert.equal(formatUpdatedAt(new Date('2026-11-22T16:30:00Z')), '2026-11-23T00:30:00+08:00')
  assert.throws(() => formatUpdatedAt(new Date('x')))
})

test('isValidUpdatedAt 只认 +08:00 的真实时刻', () => {
  assert.equal(isValidUpdatedAt('2026-11-22T13:05:00+08:00'), true)
  for (const bad of ['2026-11-22', '2026-11-22T13:05:00Z', '2026-11-22T13:05:00+09:00', '2026-02-30T10:00:00+08:00', '', 123, null]) {
    assert.equal(isValidUpdatedAt(bad), false, `isValidUpdatedAt(${JSON.stringify(bad)})`)
  }
})

test('按更新时间降序，缺省回退价格时点，同刻比价格时点再比代码', () => {
  const rows = [
    { code: '300750.SZ', priceDate: '2026-11-20', updatedAt: '2026-11-22T10:00:00+08:00' },
    { code: '000002.SZ', priceDate: '2026-11-22', updatedAt: '' },
    { code: '600519.SH', priceDate: '2026-11-18', updatedAt: '2026-11-23T09:00:00+08:00' },
    { code: '002714.SZ', priceDate: '2026-11-20', updatedAt: '2026-11-22T10:00:00+08:00' },
    { code: '000003.SZ', priceDate: '2026-11-23', updatedAt: '' },
    { code: '000001.SZ', priceDate: '2026-11-21', updatedAt: '2026-11-22T10:00:00+08:00' },
  ]
  assert.deepEqual(
    sortReports(rows).map((r) => r.code),
    ['600519.SH', '000003.SZ', '000001.SZ', '002714.SZ', '300750.SZ', '000002.SZ'],
  )
})

test('取第一个 :root 块的全部 --* 声明', () => {
  const css = `/* c */
:root {
  /* palette */
  --bg: #fafaf9;
  --font-sans: "PingFang SC", sans-serif;
  --radius: 0px;
}
:root { --later: 1; }
.x { --not-root: 2; }`
  assert.deepEqual(extractRootVars(css), [
    ['--bg', '#fafaf9'],
    ['--font-sans', '"PingFang SC", sans-serif'],
    ['--radius', '0px'],
  ])
})

test('loadReports 按排序返回并取首家样式变量', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-test-'))
  try {
    for (const [slug, date, code, meta] of [
      ['report-000001-sz', '2026-11-18', '000001.SZ', '{"industry":"测试行业","updatedAt":"2026-11-22T13:05:00+08:00"}'],
      ['report-000002-sz', '2026-11-20', '000002.SZ', '{"industry":"测试行业"}'],
    ]) {
      const set = path.join(dir, slug)
      fs.mkdirSync(path.join(set, 'assets'), { recursive: true })
      fs.writeFileSync(
        path.join(set, 'index.html'),
        INTRO.replace('000001.SZ', code).replace('2026-11-20', date),
      )
      fs.writeFileSync(path.join(set, 'blog-meta.json'), meta)
      fs.writeFileSync(path.join(set, 'assets', 'report.css'), `:root { --bg: ${slug}; }`)
    }
    const { reports, cssVars } = loadReports(dir)
    assert.deepEqual(reports.map((r) => r.slug), ['report-000001-sz', 'report-000002-sz'])
    assert.equal(reports[0].industry, '测试行业')
    assert.equal(reports[0].tone, 'bear')
    assert.deepEqual(cssVars, [['--bg', 'report-000001-sz']])
    assert.equal(reports[0].updatedAt, '2026-11-22T13:05:00+08:00')
    assert.equal(reports[0].updatedDate, '2026-11-22')
    assert.equal(reports[1].updatedAt, '')
    assert.equal(reports[1].updatedDate, '2026-11-20')

    for (const bad of ['"2026-11-22"', '"2026-11-22T13:05:00Z"', '""', 'null']) {
      fs.writeFileSync(path.join(dir, 'report-000001-sz', 'blog-meta.json'), `{"industry":"测试行业","updatedAt":${bad}}`)
      assert.throws(
        () => loadReports(dir),
        (err) => err.message.includes('report-000001-sz') && err.message.includes('updatedAt') && !err.message.includes('行业'),
        bad,
      )
    }

    fs.writeFileSync(path.join(dir, 'report-000001-sz', 'blog-meta.json'), '{"industry":"测试行业"}')
    fs.writeFileSync(path.join(dir, 'report-000002-sz', 'blog-meta.json'), '{"industry":""}')
    assert.throws(() => loadReports(dir), /report-000002-sz.*行业/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('siteTokenCss 生成三块全站变量', () => {
  const css = siteTokenCss([
    ['--bg', '#fafaf9'],
    ['--primary', '#2949a4'],
    ['--font-serif', '"Noto Serif SC", serif'],
  ])
  assert.ok(css.includes('html:not(.dark)'))
  assert.ok(css.includes('--vp-c-bg: var(--bg)'))
  assert.ok(css.includes('html:root'))
  assert.ok(css.includes('html.dark'))
  assert.ok(css.includes('color-mix(in srgb, #2949a4 55%, white)'))
  assert.ok(!css.includes('&quot;'))
})

test('siteTokenCss 空数组返回空串，非法值抛错', () => {
  assert.equal(siteTokenCss([]), '')
  assert.throws(() => siteTokenCss([['--bg', '</style><script>']]), /</)
  assert.throws(() => siteTokenCss([['bg', '#fff']]), /--/)
})

test('stanceTone 把立场文字映射为 bear / bull / neutral', () => {
  const cases = [
    ['看空（长期价值）· 附条件', 'bear'],
    ['回避', 'bear'],
    ['卖出', 'bear'],
    ['减持', 'bear'],
    ['看多', 'bull'],
    ['买入（附条件）', 'bull'],
    ['进场', 'bull'],
    ['增持', 'bull'],
    ['中性', 'neutral'],
    ['观望', 'neutral'],
    ['持有', 'neutral'],
    ['观察', 'neutral'],
    ['中性偏多', 'neutral'],
    ['短期看多，长期看空', 'bull'],
    ['看空，待看多信号确认', 'bear'],
    ['不看空', 'neutral'],
    ['暂不买入', 'neutral'],
    ['等待进场', 'neutral'],
    ['观察，等待进场', 'neutral'],
    ['', 'neutral'],
    [undefined, 'neutral'],
    ['其他', 'neutral'],
  ]
  for (const [input, expected] of cases) {
    assert.equal(stanceTone(input), expected, `stanceTone(${JSON.stringify(input)})`)
  }
})
