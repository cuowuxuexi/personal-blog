import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  bigQuestionSidebarGroups,
  investYearSidebarGroups,
  journeySidebarGroups,
  lifeYearSidebarGroups,
  philosophySidebarGroups,
  researchIndustrySidebarGroups,
} from './managed-sidebar-fs.mjs'
import {
  postsByCategoryFromCatalog,
  siteManagedPostsFromGlob,
  toSitePostItem,
} from './content-catalog-adapter.mjs'
import { projectManagedPostsFromFs } from '../../content-catalog/project-fs.mjs'
import { normalizePostIdentity } from '../../content-catalog/index.mjs'
import { checkBrowserSafeImportGraph } from '../../content-catalog/verify/import-graph.mjs'
import { inspectManagedSidebarWiring } from '../../content-catalog/verify/sidebar-wiring.mjs'
import { publicGuideIndexPath, standaloneHtmlFile } from './standalone-html.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')

test('site posts.ts does not import node:fs or project-fs', () => {
  const source = fs.readFileSync(path.join(HERE, 'posts.ts'), 'utf8')
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/)
  assert.doesNotMatch(source, /project-fs/)
  assert.match(source, /siteManagedPostsFromGlob/)
  assert.match(source, /postsByCategoryFromCatalog/)
  assert.doesNotMatch(source, /const manualPosts/)
  assert.match(source, /\[\.\.\.managedPosts,\s*\.\.\.hermesPosts\]/)
})

test('content-catalog-adapter stays free of node:fs', () => {
  const source = fs.readFileSync(path.join(HERE, 'content-catalog-adapter.mjs'), 'utf8')
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/)
  assert.doesNotMatch(source, /project-fs/)
})

test('structure-catalog-adapter stays free of node:fs', () => {
  const source = fs.readFileSync(path.join(HERE, 'structure-catalog-adapter.mjs'), 'utf8')
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/)
  assert.doesNotMatch(source, /project-fs/)
})

test('browser reachable graph from posts/adapter/index excludes project-fs and node:fs', () => {
  const result = checkBrowserSafeImportGraph([
    path.join(HERE, 'posts.ts'),
    path.join(HERE, 'content-catalog-adapter.mjs'),
    path.join(REPO_ROOT, 'content-catalog', 'index.mjs'),
  ])
  assert.equal(result.ok, true, result.failures.map((item) => item.message).join('\n'))
})

test('Wave B sidebar fs adapter matches live managed year and journey groups', () => {
  assert.deepEqual(lifeYearSidebarGroups.map((g) => g.text), ['周记 · 2026年'])
  assert.deepEqual(lifeYearSidebarGroups[0].items.map((i) => i.link), [
    '/AI与生活/2026-08-17',
    '/AI与生活/2026-08-12',
  ])
  assert.deepEqual(investYearSidebarGroups.map((g) => g.text), ['2026年'])
  assert.deepEqual(investYearSidebarGroups[0].items.map((i) => i.link), [
    '/投资/周记/2026-08-17-那是抓不住的月亮',
    '/投资/周记/2026-08-13-看烟花',
    '/投资/周记/2026-08-08-写在投资笔记开始之前',
  ])
  assert.equal(journeySidebarGroups[0]?.text, '我的AI历程')
  assert.deepEqual(journeySidebarGroups[0].items.map((i) => i.link), [
    '/AI与生活/我的AI历程/基础设施篇',
    '/AI与生活/我的AI历程/工具篇',
    '/AI与生活/我的AI历程/AI开支记录与优化',
  ])
  assert.deepEqual(journeySidebarGroups[0].items[1].items.map((i) => i.link), [
    '/AI与生活/我的AI历程/cli篇',
  ])
  assert.ok(journeySidebarGroups.every((g) => g.text !== '周记 · 2026年'))
})

test('research / philosophy / big-question sidebars project from structure declaration', () => {
  assert.deepEqual(researchIndustrySidebarGroups.map((g) => g.text), [
    '医药行业',
    '互联网行业',
    '猪肉养殖行业',
    '白酒行业',
    '硬件制造行业',
  ])
  assert.equal(researchIndustrySidebarGroups[0].collapsed, false)
  assert.deepEqual(researchIndustrySidebarGroups[0].items[1].items.map((i) => i.link), [
    '/投资/投研/医药/研究地图/',
    '/投资/投研/医药/研究地图/创新药研发全流程/',
    '/投资/投研/医药/研究地图/CXO与CRDMO/',
    '/投资/投研/医药/研究地图/原研仿制与支付端/',
  ])
  assert.deepEqual(researchIndustrySidebarGroups[0].items[2].items.map((i) => i.link), [
    '/投资/投研/医药/药明康德/',
  ])
  assert.deepEqual(researchIndustrySidebarGroups[1].items[2].items.map((i) => i.link), [
    '/投资/投研/互联网/腾讯/',
  ])
  assert.deepEqual(philosophySidebarGroups[0].items.map((i) => i.link), [
    '/投资哲学/',
    '/投资哲学/认识与证据/',
    '/投资哲学/市场与价格/',
    '/投资哲学/企业与回报/',
    '/投资哲学/个人与研究边界/',
  ])
  assert.deepEqual(bigQuestionSidebarGroups[0].items.map((i) => i.link), [
    '/大问题/',
    '/大问题/开源与闭源/',
  ])
})

test('siteManagedPostsFromGlob identity matches fs projection', () => {
  const fromFs = projectManagedPostsFromFs(REPO_ROOT).map((post) => toSitePostItem(post))
  const modulesByKind = {
    'weekly-life': {},
    'weekly-investment': {},
    journey: {},
  }
  const dirs = {
    'weekly-life': path.join(REPO_ROOT, 'docs', 'AI与生活'),
    'weekly-investment': path.join(REPO_ROOT, 'docs', '投资', '周记'),
    journey: path.join(REPO_ROOT, 'docs', 'AI与生活', '我的AI历程'),
  }
  for (const [kindId, dir] of Object.entries(dirs)) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name)
      if (!fs.statSync(abs).isFile() || !name.toLowerCase().endsWith('.md')) continue
      modulesByKind[kindId][`x/${name}`] = fs.readFileSync(abs, 'utf8')
    }
  }
  const fromGlob = siteManagedPostsFromGlob(modulesByKind)
  assert.deepEqual(
    fromGlob.map((p) => normalizePostIdentity(p)),
    fromFs.map((p) => normalizePostIdentity(p)),
  )
})

test('standalone HTML URLs resolve to on-disk files', () => {
  for (const url of [
    '/journey-guides/pi-shortcuts',
    '/journey-guides/pi-shortcuts/',
    '/journey-guides/grok-shortcuts?x=1',
  ]) {
    const found = standaloneHtmlFile(url)
    assert.ok(found && fs.existsSync(found.file), url)
    assert.match(fs.readFileSync(found.file, 'utf8'), /<!DOCTYPE html>/)
  }
  assert.equal(publicGuideIndexPath('/journey-guides/missing'), null)
  assert.equal(standaloneHtmlFile('/html'), null)
  assert.equal(standaloneHtmlFile('/AI与生活/我的AI历程/cli篇'), null)
})

test('config.mts Wave C + live sidebar wiring: import and three section spreads', () => {
  const source = fs.readFileSync(path.join(HERE, 'config.mts'), 'utf8')
  const wiring = inspectManagedSidebarWiring(source)
  assert.equal(wiring.mode, 'spread')
  assert.equal(wiring.ok, true, wiring.failures.map((item) => item.message).join('\n'))
  assert.match(source, /\.\.\.investYearSidebarGroups/)
  assert.match(source, /\.\.\.lifeYearSidebarGroups/)
  assert.match(source, /\.\.\.journeySidebarGroups/)
  assert.match(source, /\.\.\.researchIndustrySidebarGroups/)
  assert.match(source, /\.\.\.philosophySidebarGroups/)
  assert.match(source, /\.\.\.bigQuestionSidebarGroups/)
  assert.match(source, /managed-sidebar-fs\.mjs/)
  assert.match(source, /serveStandaloneHtmlPlugin/)
  assert.match(source, /link: '\/AI与生活\/我的AI历程\/'/)
  assert.doesNotMatch(source, /基础设施篇/)
  assert.doesNotMatch(source, /工具篇/)
  assert.doesNotMatch(source, /AI开支记录与优化/)
  assert.doesNotMatch(source, /药明康德/)
  assert.doesNotMatch(source, /开源与闭源/)
  assert.doesNotMatch(source, /认识与证据/)
  assert.doesNotMatch(source, /text: '2026年'/)
  assert.doesNotMatch(source, /text: '周记 · 2026年'/)
})

test('postsByCategoryFromCatalog uses shared stable sort; revisionDate ignored for latest', () => {
  const items = [
    {
      title: 'revised-older',
      date: '2026-08-10',
      revisionDate: '2026-08-22',
      category: '投资',
      type: 'weekly',
      issue: 1,
      link: '/投资/周记/2026-08-10-a',
    },
    {
      title: 'same-day-higher-issue',
      date: '2026-08-17',
      category: '投资',
      type: 'weekly',
      issue: 2,
      link: '/投资/周记/2026-08-17-b',
    },
    {
      title: 'same-day-lower-issue',
      date: '2026-08-17',
      category: '投资',
      type: 'weekly',
      issue: 1,
      link: '/投资/周记/2026-08-17-a',
    },
  ]
  const ranked = postsByCategoryFromCatalog(items, '投资', 'weekly')
  assert.deepEqual(ranked.map((item) => item.title), [
    'same-day-higher-issue',
    'same-day-lower-issue',
    'revised-older',
  ])
  assert.equal(ranked[0].title, 'same-day-higher-issue')
})
