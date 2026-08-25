import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  buildCatalogTitleLinks,
  checkHtmlSource,
  checkStandaloneHtml,
} from './check-standalone-html.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('live standalone HTML passes the link contract', () => {
  const result = checkStandaloneHtml(REPO_ROOT)
  assert.equal(result.ok, true, result.failures.join('\n'))
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
