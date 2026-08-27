import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  projectBigQuestionSidebar,
  projectPhilosophySidebar,
  industrySubjectDirectory,
  projectResearchSidebar,
  researchHubRows,
  researchHubSummary,
  researchSubjects,
  trackedSubjects,
  structureNodeFromMarkdown,
  structureNodesFromSources,
  topicCards,
} from './index.mjs'
import { projectStructureFromFs } from './project-fs.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..')

function node(kindId, relativePath, raw) {
  return structureNodeFromMarkdown({ kindId, relativePath, raw })
}

test('structure node uses catalog frontmatter; path + pageClass decide role', () => {
  const industry = node('research', 'docs/投资/投研/医药/index.md', `---
title: 医药行业
description: 创新药、CXO、原研仿制与支付端的长期观察
pageClass: industry-index
order: 1
sidebarCollapsed: false
---
`)
  assert.equal(industry.role, 'industry')
  assert.equal(industry.link, '/投资/投研/医药/')
  assert.equal(industry.collapsed, false)
  assert.equal(industry.pageClassOk, true)

  const topic = node('big-question', 'docs/大问题/开源与闭源/index.md', `---
title: 在 AI 时代，开源和闭源谁能走得更远
pageClass: subject-index
order: 1
sidebarText: 开源与闭源
---
`)
  assert.equal(topic.role, 'topic')
  assert.equal(topic.sidebarText, '开源与闭源')
  assert.equal(topic.link, '/大问题/开源与闭源/')
})

test('wrong pageClass is fail-closed for sidebar; missing order still projects last', () => {
  const bad = node('research', 'docs/投资/投研/医药/index.md', `---
title: 医药行业
pageClass: subject-index
---
`)
  assert.equal(bad.pageClassOk, false)
  const nodes = structureNodesFromSources([
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/index.md',
      raw: `---
title: 医药行业
pageClass: subject-index
---
`,
    },
  ])
  assert.deepEqual(projectResearchSidebar(nodes), [])
})

test('adding a map only needs markdown + order; sidebar grows', () => {
  const sources = [
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/index.md',
      raw: `---
title: 医药行业
pageClass: industry-index
order: 1
---
`,
    },
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/研究地图/index.md',
      raw: `---
title: 研究地图
pageClass: map-index
order: 0
---
`,
    },
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/研究地图/新地图/index.md',
      raw: `---
title: 新地图
pageClass: map-index
order: 1
---
`,
    },
  ]
  const groups = projectResearchSidebar(structureNodesFromSources(sources))
  assert.deepEqual(groups[0].items[1].items.map((item) => item.link), [
    '/投资/投研/医药/研究地图/',
    '/投资/投研/医药/研究地图/新地图/',
  ])
})

test('live structure projection matches current public URLs and hub counts', () => {
  const nodes = projectStructureFromFs(REPO_ROOT)
  const research = projectResearchSidebar(nodes)
  assert.deepEqual(research.map((g) => g.text), [
    '医药行业',
    '互联网行业',
    '猪肉养殖行业',
    '白酒行业',
    '硬件制造行业',
  ])
  assert.equal(researchHubSummary(nodes).industryCount, 5)
  assert.equal(researchHubSummary(nodes).subjectCount, researchSubjects(nodes).length)
  assert.ok(researchSubjects(nodes).some((item) => item.link === '/投资/投研/医药/恒瑞医药/'))
  assert.deepEqual(researchHubRows(nodes).map((row) => row.link), [
    '/投资/投研/医药/',
    '/投资/投研/互联网/',
    '/投资/投研/猪肉养殖/',
    '/投资/投研/白酒/',
    '/投资/投研/硬件制造/',
  ])
  assert.deepEqual(projectPhilosophySidebar(nodes)[0].items.map((i) => i.link), [
    '/投资哲学/',
    '/投资哲学/认识与证据/',
    '/投资哲学/市场与价格/',
    '/投资哲学/企业与回报/',
    '/投资哲学/个人与研究边界/',
  ])
  assert.deepEqual(topicCards(nodes, 'big-question').map((item) => item.link), [
    '/大问题/开源与闭源/',
  ])
  assert.deepEqual(projectBigQuestionSidebar(nodes)[0].items.map((i) => i.text), [
    '总览',
    '开源与闭源',
  ])
})

test('subject chapter nests under the company; directory stays company-only', () => {
  const sources = [
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/index.md',
      raw: `---
title: 医药行业
pageClass: industry-index
order: 1
---
`,
    },
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/恒瑞医药/index.md',
      raw: `---
title: 恒瑞医药
pageClass: subject-index
order: 1
---
`,
    },
    {
      kindId: 'research',
      relativePath: 'docs/投资/投研/医药/恒瑞医药/四问收口/index.md',
      raw: `---
title: 四问收口
pageClass: subject-index
order: 1
---
`,
    },
  ]
  const nodes = structureNodesFromSources(sources)
  const groups = projectResearchSidebar(nodes)
  const hengrui = groups[0].items[2].items[0]
  assert.equal(hengrui.text, '恒瑞医药')
  assert.equal(hengrui.link, '/投资/投研/医药/恒瑞医药/')
  assert.deepEqual(hengrui.items.map((item) => item.link), [
    '/投资/投研/医药/恒瑞医药/四问收口/',
  ])
  assert.deepEqual(industrySubjectDirectory(nodes, '医药').items.map((item) => item.link), [
    '/投资/投研/医药/恒瑞医药/',
  ])
  assert.deepEqual(trackedSubjects(nodes).map((item) => item.link), [
    '/投资/投研/医药/恒瑞医药/',
  ])
})

test('structure core has no node:fs / VitePress / panel imports', () => {
  const source = fs.readFileSync(path.join(HERE, 'project-structure.mjs'), 'utf8')
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/)
  assert.doesNotMatch(source, /vitepress|from\s+['"]vue['"]|panel\//)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structure-core-'))
  fs.rmSync(tmp, { recursive: true, force: true })
})
