import fs from 'node:fs'
import path from 'node:path'
import {
  flattenStructureLinks,
  industrySubjectDirectory,
  researchHubRows,
  researchHubSummary,
  researchMaps,
  researchMapsHub,
  researchSubjectChapters,
  researchSubjects,
  topicCards,
  trackedSubjects,
} from '../index.mjs'

const GENERATED_OVERVIEWS = Object.freeze([
  { rel: 'docs/投资/投研/index.md', marker: 'ResearchDirectory' },
  { rel: 'docs/投资哲学/index.md', marker: 'HubTopicList' },
  { rel: 'docs/大问题/index.md', marker: 'HubTopicList' },
  { rel: 'docs/投资/index.md', marker: 'TrackedSubjectList' },
  { rel: 'docs/投资/投研/互联网/index.md', marker: 'IndustryDirectory' },
  { rel: 'docs/投资/投研/猪肉养殖/index.md', marker: 'IndustryDirectory' },
  { rel: 'docs/投资/投研/白酒/index.md', marker: 'IndustryDirectory' },
  { rel: 'docs/投资/投研/硬件制造/index.md', marker: 'IndustryDirectory' },
  { rel: 'docs/投资/投研/医药/index.md', marker: 'IndustryDirectory' },
  { rel: 'docs/投资/投研/医药/index.md', marker: 'ResearchCount' },
])

function readRepo(repoRoot, rel) {
  return fs.readFileSync(path.join(repoRoot, ...rel.split('/')), 'utf8')
}

function hrefsIn(markdown, prefixes) {
  const links = []
  const re = /href="([^"]+)"/g
  let match
  while ((match = re.exec(markdown || ''))) {
    const href = match[1]
    if (prefixes.some((prefix) => href.startsWith(prefix))) links.push(href)
  }
  return links
}

function fail(list, code, fields) {
  list.push({ code, ...fields })
}

export function checkOverviewLists(repoRoot, nodes) {
  const failures = []
  for (const entry of GENERATED_OVERVIEWS) {
    const abs = path.join(repoRoot, ...entry.rel.split('/'))
    if (!fs.existsSync(abs)) {
      fail(failures, 'overview-missing', {
        file: entry.rel,
        message: `总览页不存在：${entry.rel}`,
      })
      continue
    }
    const source = readRepo(repoRoot, entry.rel)
    if (!source.includes(entry.marker)) {
      fail(failures, 'overview-not-generated', {
        file: entry.rel,
        message: `${entry.rel} 必须接入 <${entry.marker}>`,
      })
    }
  }

  const hub = readRepo(repoRoot, 'docs/投资/投研/index.md')
  if (hub.includes('industry-row')) {
    fail(failures, 'overview-handwritten', {
      kindId: 'research',
      file: 'docs/投资/投研/index.md',
      message: '投研总览行业清单必须由 ResearchDirectory 生成，不得再手写 industry-row',
    })
  }
  const expectedHub = researchHubRows(nodes).map((row) => row.link)
  const summary = researchHubSummary(nodes)
  if (expectedHub.length !== summary.industryCount) {
    fail(failures, 'overview-count', {
      kindId: 'research',
      message: '行业目录行数与行业计数不一致',
    })
  }

  const philo = readRepo(repoRoot, 'docs/投资哲学/index.md')
  const philoCards = topicCards(nodes, 'philosophy')
  if (philo.includes('class="invest-path"')) {
    fail(failures, 'overview-handwritten', {
      kindId: 'philosophy',
      file: 'docs/投资哲学/index.md',
      message: '哲学总览主题清单必须由 HubTopicList 生成',
    })
  }
  if (philoCards.length < 1) {
    fail(failures, 'overview-empty', { kindId: 'philosophy', message: '哲学主题投影为空' })
  }

  const questions = topicCards(nodes, 'big-question')
  const qa = readRepo(repoRoot, 'docs/大问题/index.md')
  if (qa.includes('class="invest-path"')) {
    fail(failures, 'overview-handwritten', {
      kindId: 'big-question',
      file: 'docs/大问题/index.md',
      message: '大问题总览清单必须由 HubTopicList 生成',
    })
  }
  if (questions.length < 1) {
    fail(failures, 'overview-empty', { kindId: 'big-question', message: '大问题条目投影为空' })
  }

  const medical = readRepo(repoRoot, 'docs/投资/投研/医药/index.md')
  const medicalMaps = researchMaps(nodes, '医药')
  const medicalSubjects = researchSubjects(nodes, '医药')
  const medicalChapters = researchSubjectChapters(nodes, '医药')
  const medicalDirectory = industrySubjectDirectory(nodes, '医药')
  const medicalHrefs = hrefsIn(medical, ['/投资/投研/'])
  for (const href of medicalHrefs) {
    const known = flattenStructureLinks(nodes, 'research').some((item) => item.link === href)
    if (!known) {
      fail(failures, 'overview-unknown-link', {
        kindId: 'research',
        link: href,
        file: 'docs/投资/投研/医药/index.md',
        message: `医药总览手写链接不在结构声明中：${href}`,
      })
    }
  }
  if (medicalMaps.length && !researchMapsHub(nodes, '医药')) {
    fail(failures, 'overview-count', {
      kindId: 'research',
      message: '医药有详图时必须有地图总览',
    })
  }
  if (medicalDirectory.items.length !== medicalSubjects.length) {
    fail(failures, 'overview-count', {
      kindId: 'research',
      message: '医药行业清单与标的档案根不一致',
    })
  }
  const subjectKeys = new Set(medicalSubjects.map((item) => item.slug))
  for (const chapter of medicalChapters) {
    if (!subjectKeys.has(chapter.parentSlug)) {
      fail(failures, 'overview-unknown-link', {
        kindId: 'research',
        link: chapter.link,
        message: `章节没有对应档案根：${chapter.link}`,
      })
    }
    if (medicalDirectory.items.some((item) => item.link === chapter.link)) {
      fail(failures, 'overview-count', {
        kindId: 'research',
        link: chapter.link,
        message: `章节不得进入行业标的清单：${chapter.link}`,
      })
    }
  }

  const tracked = trackedSubjects(nodes).map((item) => item.link)
  const investHub = readRepo(repoRoot, 'docs/投资/index.md')
  if (investHub.includes('class="tracked-subject"')) {
    fail(failures, 'overview-handwritten', {
      kindId: 'research',
      file: 'docs/投资/index.md',
      message: '投资总览跟踪标的必须由 TrackedSubjectList 生成',
    })
  }
  if (tracked.length !== summary.subjectCount) {
    fail(failures, 'overview-count', {
      kindId: 'research',
      message: '跟踪标的清单与标的计数不一致',
    })
  }
  for (const chapter of researchSubjectChapters(nodes)) {
    if (tracked.includes(chapter.link)) {
      fail(failures, 'overview-count', {
        kindId: 'research',
        link: chapter.link,
        message: `章节不得进入跟踪标的：${chapter.link}`,
      })
    }
  }

  return { ok: failures.length === 0, failures }
}
