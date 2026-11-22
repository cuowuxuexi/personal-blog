import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { standaloneHtmlFile } from '../docs/.vitepress/standalone-html.mjs'
import {
  buildCatalogTitleLinks,
  checkHtmlSource,
  checkReportSet,
  checkStandaloneHtml,
  parseHref,
} from './check-standalone-html.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('live standalone HTML passes the link contract', () => {
  assert.deepEqual(checkStandaloneHtml(REPO_ROOT).failures, [])
})

test('.html 直达的 basePath 等于该文件自身的 URL', () => {
  const found = standaloneHtmlFile('/html/cli-hub/index.html')
  assert.ok(found, '/html/cli-hub/index.html 应能解析')
  assert.equal(found.basePath, '/html/cli-hub/index.html')
})

test('breadcrumb ancestors that hash to #hub fail', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><body>
    <section id="page-hub"></section>
    <nav class="research-breadcrumb">
      <a href="#hub">我的AI历程</a><span>/</span>
      <a href="#hub">工具篇</a><span>/</span>
      <strong>cli篇</strong>
    </nav>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-hub',
  })
  assert.ok(failures.some((line) => line.includes('我的AI历程')), failures.join('\n'))
  assert.ok(failures.some((line) => line.includes('工具篇')), failures.join('\n'))
})

test('breadcrumb ancestors that point at catalog links pass', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><body>
    <section id="page-hub"></section>
    <nav class="research-breadcrumb">
      <a href="/AI与生活/我的AI历程/">我的AI历程</a><span>/</span>
      <a href="/AI与生活/我的AI历程/工具篇">工具篇</a><span>/</span>
      <strong>cli篇</strong>
    </nav>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-ok',
  })
  assert.deepEqual(failures, [])
})

test('current-page breadcrumb may use #hub when page-hub exists', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><body>
    <section id="page-hub"></section>
    <nav class="research-breadcrumb">
      <a href="#hub">cli篇</a><span>/</span>
      <strong>Pi 快捷命令</strong>
    </nav>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-current',
  })
  assert.deepEqual(failures, [])
})

test('missing same-page hash id fails', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><body>
    <nav class="research-breadcrumb"><strong>cli篇</strong></nav>
    <a href="#missing">go</a>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-hash',
  })
  assert.ok(failures.some((line) => line.includes('#missing')), failures.join('\n'))
})

test('base turns #pi into directory + hash, not /html/cli-hub/pi', () => {
  const parts = parseHref('#pi', '/html/cli-hub/', '/html/cli-hub')
  assert.equal(parts.pathname, '/html/cli-hub')
  assert.equal(parts.hash, 'pi')
  assert.equal(parts.hashOnly, true)
  assert.equal(parts.resolved, '/html/cli-hub/#pi')
})

test('hash href with base still checks the fragment', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><head><base href="/html/cli-hub/" /></head><body>
    <section id="page-pi"></section>
    <nav class="research-breadcrumb"><strong>cli篇</strong></nav>
    <a href="#pi">Pi</a>
    <a href="#ghost">missing</a>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-base-hash',
  })
  assert.ok(failures.some((line) => line.includes('#ghost')), failures.join('\n'))
  assert.ok(!failures.some((line) => line.includes('#pi')), failures.join('\n'))
})

test('path plus hash still checks the fragment', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><head><base href="/html/cli-hub/" /></head><body>
    <section id="page-pi"></section>
    <nav class="research-breadcrumb"><strong>cli篇</strong></nav>
    <a href="/html/cli-hub/#ghost">missing</a>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-path-hash',
  })
  assert.ok(failures.some((line) => line.includes('#ghost')), failures.join('\n'))
})

test('cross-page hash is checked against the target standalone file, not the current one', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><head><base href="/html/zou-narrative-map/" /></head><body>
    <nav class="research-breadcrumb"><strong>叙事框架总览</strong></nav>
    <a href="/html/zou-auction#s4">exists there</a>
    <a href="/html/zou-auction#nope">missing there</a>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/zou-narrative-map',
    label: 'fixture-cross-hash',
  })
  assert.ok(!failures.some((line) => line.includes('#s4')), failures.join('\n'))
  assert.ok(failures.some((line) => line.includes('#nope') && line.includes('/html/zou-auction')), failures.join('\n'))
})

test('unknown standalone path fails', () => {
  const catalog = buildCatalogTitleLinks(REPO_ROOT)
  const html = `<!DOCTYPE html><html><body>
    <nav class="research-breadcrumb"><strong>cli篇</strong></nav>
    <a href="/html/does-not-exist">missing</a>
  </body></html>`
  const failures = checkHtmlSource(html, {
    catalog,
    publicHref: '/html/cli-hub',
    label: 'fixture-html',
  })
  assert.ok(failures.some((line) => line.includes('/html/does-not-exist')), failures.join('\n'))
})

// ---- 研报集 ----

const INTRO_HTML = (code, back = '/投资/') => `<!DOCTYPE html><html><head><link rel="stylesheet" href="assets/report.css"></head><body>
<a class="back-link" href="${back}">← 研究入口</a>
<span class="ticker-box">测试公司 <span class="ticker-code">${code}</span></span>
<nav class="layer-tabs"><a class="layer-tab" href="index.html">引言</a><a class="layer-tab" href="business.html">生意</a></nav>
<section id="s1-1"><div class="badge-row"><span class="badge">价格时点 2026-11-20 收盘</span><span class="badge">终审价 <span class="num">44.85</span> 元</span><span class="badge">总市值 <span class="num">2,589</span> 亿元</span><span class="badge badge-crimson">看空</span></div>
<div class="thesis-banner">一句判断</div></section>
<a href="business.html#b1">跨页</a><a href="#s1-1">本页</a><a href="https://example.com/">外链</a><script src="assets/report.js"></script>
</body></html>`
const BUSINESS_HTML = `<!DOCTYPE html><html><body><a class="back-link" href="/投资/">← 研究入口</a><section id="b1"></section><img src="assets/a.png"></body></html>`

function reportFixture(mutate = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-report-'))
  const setDir = path.join(root, 'docs', 'public', 'html', 'report-000001-sz')
  const put = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), content)
  }
  const set = (rel, content) => put(`docs/public/html/report-000001-sz/${rel}`, content)
  put('docs/投资/index.md', '# 投研')
  set('index.html', INTRO_HTML('000001.SZ'))
  set('business.html', BUSINESS_HTML)
  set('assets/report.css', ':root { --bg: #fff; }')
  set('assets/report.js', '')
  set('assets/a.png', 'png')
  set('blog-meta.json', '{"industry":"测试行业"}')
  mutate({ root, setDir, put, set })
  return {
    root,
    setDir,
    run: () => checkReportSet(root, setDir, { titles: new Map(), links: new Set() }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

function runReportFixture(mutate) {
  const f = reportFixture(mutate)
  try {
    return f.run()
  } finally {
    f.cleanup()
  }
}

test('研报集：相对链接、跨页 hash、站内已知路径通过', () => {
  assert.deepEqual(runReportFixture(), [])
})

test('研报集：断链失败', () => {
  const failures = runReportFixture(({ set }) => set('business.html', BUSINESS_HTML.replace('assets/a.png', 'assets/missing.png')))
  assert.ok(failures.some((l) => l.includes('assets/missing.png')), failures.join('\n'))
})

test('研报集：跨页 hash 没有目标 id 失败', () => {
  const failures = runReportFixture(({ set }) => set('index.html', INTRO_HTML('000001.SZ').replace('business.html#b1', 'business.html#nope')))
  assert.ok(failures.some((l) => l.includes('#nope') && l.includes('business.html')), failures.join('\n'))
})

test('研报集：回链不是 /投资/ 失败', () => {
  const failures = runReportFixture(({ set }) => set('index.html', INTRO_HTML('000001.SZ', '/投资/投研/')))
  assert.ok(failures.some((l) => l.includes('.back-link')), failures.join('\n'))
})

test('研报集：私有痕迹失败', () => {
  const failures = runReportFixture(({ set }) => set('assets/report.js', 'fetch("http://127.0.0.1:18519/x")'))
  assert.ok(failures.some((l) => l.includes('report.js:1') && l.includes('私有痕迹')), failures.join('\n'))
})

test('研报集：与旧标的同代码不报错', () => {
  const oldPage = ['---', 'ticker: 0001.HK / 000001.SZ', '---', ''].join('\n')
  const failures = runReportFixture(({ put }) => put('docs/投资/投研/测试行业/测试公司/index.md', oldPage))
  assert.deepEqual(failures, [])
})

test('研报集：缺 blog-meta.json 失败', () => {
  const failures = runReportFixture(({ setDir }) => fs.rmSync(path.join(setDir, 'blog-meta.json')))
  assert.ok(failures.some((l) => l.includes('blog-meta.json')), failures.join('\n'))
})

test('研报集：入口元数据提取失败也算失败', () => {
  const failures = runReportFixture(({ set }) => set('index.html', INTRO_HTML('000001.SZ').replace('<div class="thesis-banner">一句判断</div>', '')))
  assert.ok(failures.some((l) => l.includes('report-000001-sz') && l.includes('一句判断')), failures.join('\n'))
})

test('研报集：嵌套页引 ../assets 通过，目标缺失失败', () => {
  const nested = (href) => `<!DOCTYPE html><html><head><link rel="stylesheet" href="${href}"></head><body><a class="back-link" href="/投资/">← 研究入口</a></body></html>`
  assert.deepEqual(runReportFixture(({ set }) => set('sub/a.html', nested('../assets/report.css'))), [])
  const failures = runReportFixture(({ set }) => set('sub/a.html', nested('../assets/nope.css')))
  assert.ok(failures.some((l) => l.includes('sub/a.html') && l.includes('../assets/nope.css')), failures.join('\n'))
})

test('研报集：根相对写法指向本集也校验文件与 hash', () => {
  const withLink = (href) => INTRO_HTML('000001.SZ').replace('</body>', `<a href="${href}">x</a></body>`)
  assert.deepEqual(runReportFixture(({ set }) => set('index.html', withLink('/html/report-000001-sz/business.html#b1'))), [])
  const bad = runReportFixture(({ set }) => set('index.html', withLink('/html/report-000001-sz/business.html#bad')))
  assert.ok(bad.some((l) => l.includes('#bad')), bad.join('\n'))
  const missing = runReportFixture(({ set }) => set('index.html', withLink('/html/report-000001-sz/ghost.html')))
  assert.ok(missing.some((l) => l.includes('ghost.html')), missing.join('\n'))
})

test('研报集：../ 越出集外按站内路径判', () => {
  const withLink = (href) => INTRO_HTML('000001.SZ').replace('</body>', `<a href="${href}">x</a></body>`)
  assert.deepEqual(runReportFixture(({ set }) => set('index.html', withLink('../../../投资/'))), [])
  const bad = runReportFixture(({ set }) => set('index.html', withLink('../../../不存在/')))
  assert.ok(bad.some((l) => l.includes('未知站内路径')), bad.join('\n'))
})

test('研报集：data-href 不当 href；真实 href 断链仍失败', () => {
  const html = INTRO_HTML('000001.SZ').replace('</body>', '<a data-href="business.html" href="ghost.html">x</a></body>')
  const failures = runReportFixture(({ set }) => set('index.html', html))
  assert.ok(failures.some((l) => l.includes('ghost.html')), failures.join('\n'))
})

test('研报集：目标只有 data-id、没有真实 id 时 hash 失败', () => {
  const failures = runReportFixture(({ set }) => {
    set('index.html', INTRO_HTML('000001.SZ').replace('business.html#b1', 'business.html#b2'))
    set('business.html', BUSINESS_HTML.replace('</section>', '</section><section data-id="b2"></section>'))
  })
  assert.ok(failures.some((l) => l.includes('#b2') && l.includes('business.html')), failures.join('\n'))
})

test('研报集：注释里的断链不报，只在注释里出现的 id 不能满足 hash', () => {
  const commented = INTRO_HTML('000001.SZ').replace('</body>', '<!-- <a href="ghost.html">x</a> --></body>')
  assert.deepEqual(runReportFixture(({ set }) => set('index.html', commented)), [])
  const failures = runReportFixture(({ set }) => {
    set('index.html', INTRO_HTML('000001.SZ').replace('business.html#b1', 'business.html#c1'))
    set('business.html', BUSINESS_HTML.replace('</section>', '</section><!-- <section id="c1"></section> -->'))
  })
  assert.ok(failures.some((l) => l.includes('#c1')), failures.join('\n'))
})
