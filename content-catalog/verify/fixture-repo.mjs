import fs from 'node:fs'
import path from 'node:path'
import { matchBracket } from './brackets.mjs'

function write(root, rel, text) {
  const abs = path.join(root, ...rel.split('/'))
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, text)
}

function weeklyMd({ title, date, category, type, issue, image }) {
  const issueLine = issue == null ? '' : `issue: ${issue}\n`
  const img = image
    ? `<img src="${image}" alt="x" />`
    : ''
  return `---
title: ${title}
date: ${date}
category: ${category}
type: ${type}
${issueLine}pageClass: weekly-post
---

# ${title}

${img}
`
}

function postsTsStub() {
  return `/**
 * Fixture stub: managed posts come from Markdown projection.
 * Do not reintroduce a non-empty manualPosts shadow.
 */
export {}
`
}

function itemLines(items) {
  return items.map((item) => `            { text: '${item.title}', link: '${item.link}' },`).join('\n')
}

function configMts({ invest, life, chapters, journeyChapters }) {
  const chapterSource = journeyChapters || chapters
  return `export default {
  themeConfig: {
    sidebar: {
      '/投资/周记/': [
        { text: '投研', items: [] },
        {
          text: '2026年',
          items: [
${itemLines(invest)}
          ],
        },
      ],
      '/AI与生活/': [
        {
          text: 'AI与生活',
          items: [
            { text: '最新周记', link: '/AI与生活/' },
            { text: '我的AI历程', link: '/AI与生活/我的AI历程/' },
          ],
        },
        {
          text: '周记 · 2026年',
          items: [
${itemLines(life)}
          ],
        },
      ],
      '/AI与生活/我的AI历程/': [
        {
          text: '我的AI历程',
          items: [
${itemLines(chapterSource)}
          ],
        },
      ],
      '/AI与生活/Hermes日记/': [
        { text: 'Hermes日记（协作本）', items: hermesDiaryNav },
      ],
    },
  },
}
`
}

/** Live-shaped：字面量为空，靠 managed-sidebar-fs spread 接线（与现网同构）。 */
function configMtsLiveShaped() {
  return `import {
  investYearSidebarGroups,
  journeySidebarGroups,
  lifeYearSidebarGroups,
} from './managed-sidebar-fs.mjs'

export default {
  themeConfig: {
    sidebar: {
      '/投资/周记/': [
        { text: '投研', items: [] },
        ...investYearSidebarGroups,
      ],
      '/AI与生活/': [
        {
          text: 'AI与生活',
          items: [
            { text: '最新周记', link: '/AI与生活/' },
            { text: '我的AI历程', link: '/AI与生活/我的AI历程/' },
          ],
        },
        ...lifeYearSidebarGroups,
      ],
      '/AI与生活/我的AI历程/': [
        {
          text: 'AI与生活',
          items: [
            { text: '我的AI历程', link: '/AI与生活/我的AI历程/' },
          ],
        },
        ...journeySidebarGroups,
      ],
      '/AI与生活/Hermes日记/': [
        { text: 'Hermes日记（协作本）', items: hermesDiaryNav },
      ],
    },
  },
}
`
}

const GOOD_INVEST = [
  { title: '第001期-主题', date: '2026-01-02', link: '/投资/周记/2026-01-02-主题', issue: 1 },
  { title: '写在投资笔记开始之前', date: '2026-08-08', link: '/投资/周记/2026-08-08-写在投资笔记开始之前' },
]
const GOOD_LIFE = [
  { title: '第001期-生活', date: '2026-01-03', link: '/AI与生活/2026-01-03', issue: 1 },
]
const GOOD_CHAPTERS = [
  { title: '基础设施篇', date: '2026-01-04', link: '/AI与生活/我的AI历程/基础设施篇' },
  { title: '工具篇', date: '2026-01-05', link: '/AI与生活/我的AI历程/工具篇' },
  { title: 'cli篇', date: '2026-01-07', link: '/AI与生活/我的AI历程/cli篇' },
  { title: 'AI开支记录与优化', date: '2026-01-06', link: '/AI与生活/我的AI历程/AI开支记录与优化' },
]

function replaceInSection(source, sectionNeedle, search, replacement) {
  const start = source.indexOf(sectionNeedle)
  if (start < 0) throw new Error(`missing section ${sectionNeedle}`)
  const open = start + sectionNeedle.length - 1
  const close = matchBracket(source, open)
  const section = source.slice(start, close + 1)
  if (!section.includes(search)) throw new Error(`missing ${search} in ${sectionNeedle}`)
  return source.slice(0, start) + section.replace(search, replacement) + source.slice(close + 1)
}

export function writeGoodFixture(root) {
  write(root, 'docs/投资/周记/2026-01-02-主题.md', weeklyMd({
    title: '第001期-主题',
    date: '2026-01-02',
    category: '投资',
    type: 'weekly',
    issue: 1,
    image: '/images/weekly/ok.webp',
  }))
  write(root, 'docs/投资/周记/2026-08-08-写在投资笔记开始之前.md', weeklyMd({
    title: '写在投资笔记开始之前',
    date: '2026-08-08',
    category: '投资',
    type: 'weekly',
  }))
  write(root, 'docs/投资/周记/index.md', '---\ntitle: 投资周记\n---\n')
  write(root, 'docs/投资/周记/README.md', '# 周记\n')
  write(root, 'docs/AI与生活/2026-01-03.md', weeklyMd({
    title: '第001期-生活',
    date: '2026-01-03',
    category: 'AI与生活',
    type: 'weekly',
    issue: 1,
    image: '/images/weekly/ok.webp',
  }))
  write(root, 'docs/AI与生活/index.md', '---\ntitle: AI与生活\n---\n')
  write(root, 'docs/AI与生活/大事件/2026.md', `---
title: 2026年大事件
date: 2026-07-01
category: AI与生活
---
`)
  for (const chapter of GOOD_CHAPTERS) {
    const name = chapter.link.split('/').pop()
    write(root, `docs/AI与生活/我的AI历程/${name}.md`, weeklyMd({
      title: chapter.title,
      date: chapter.date,
      category: 'AI与生活',
      type: 'journey',
      image: '/images/journey/ok.webp',
    }))
  }
  write(root, 'docs/AI与生活/我的AI历程/index.md', `## 篇章

- [基础设施篇](/AI与生活/我的AI历程/基础设施篇) — 底座
- [工具篇](/AI与生活/我的AI历程/工具篇) — 工具
- [cli篇](/AI与生活/我的AI历程/cli篇) — 图解
- [AI开支记录与优化](/AI与生活/我的AI历程/AI开支记录与优化) — 开支
`)
  write(root, 'docs/AI与生活/Hermes日记/2026-01-05.md', weeklyMd({
    title: '日记',
    date: '2026-01-05',
    category: 'AI与生活',
    type: 'hermes',
  }))
  write(root, 'docs/AI与生活/Hermes日记/index.md', '---\ntitle: Hermes日记\n---\n')
  write(root, 'docs/AI与生活/Hermes日记/README.md', '# Hermes\n')
  write(root, 'docs/投资/投研/医药/药明康德/index.md', `---
title: 药明康德
pageClass: subject-index
---
`)
  write(root, 'docs/public/images/weekly/ok.webp', 'x')
  write(root, 'docs/public/images/journey/ok.webp', 'x')
  write(root, 'docs/.vitepress/posts.ts', postsTsStub())
  write(root, 'docs/.vitepress/config.mts', configMts({
    invest: GOOD_INVEST,
    life: GOOD_LIFE,
    chapters: GOOD_CHAPTERS,
  }))
}

/** 与 writeGoodFixture 相同 MD，但 config 为 live spread 接线形状。 */
export function writeLiveShapedFixture(root) {
  writeGoodFixture(root)
  write(root, 'docs/.vitepress/config.mts', configMtsLiveShaped())
}

export function mutateRemoveInvestSidebarSpread(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('...investYearSidebarGroups')) {
    throw new Error('expected investYearSidebarGroups spread')
  }
  fs.writeFileSync(file, source.replace('...investYearSidebarGroups,', ''))
}

export function mutateMisplaceJourneySidebarSpread(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('...lifeYearSidebarGroups') || !source.includes('...journeySidebarGroups')) {
    throw new Error('expected life and journey spreads')
  }
  // Strip from journey section first, then plant into life section.
  const journeyNeedle = "'/AI与生活/我的AI历程/': ["
  const start = source.indexOf(journeyNeedle)
  if (start < 0) throw new Error('missing journey sidebar section')
  const open = start + journeyNeedle.length - 1
  const close = matchBracket(source, open)
  const section = source.slice(start, close + 1).replace(/\s*\.\.\.journeySidebarGroups,?\n?/, '\n')
  source = source.slice(0, start) + section + source.slice(close + 1)
  source = source.replace('...lifeYearSidebarGroups,', '...journeySidebarGroups,')
  fs.writeFileSync(file, source)
}

export function mutateRemoveManagedSidebarImport(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(
    file,
    source.replace(
      /import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/managed-sidebar-fs(?:\.mjs)?['"];?\s*/m,
      '',
    ),
  )
}

/** R2-3：同一 section 重复 own spread → wiring 必须红。 */
export function mutateDuplicateInvestSidebarSpread(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('...investYearSidebarGroups')) {
    throw new Error('expected investYearSidebarGroups spread')
  }
  fs.writeFileSync(
    file,
    source.replace(
      '...investYearSidebarGroups,',
      '...investYearSidebarGroups,\n        ...investYearSidebarGroups,',
    ),
  )
}

/** R2-3：仅注释里有 spread（有效源码缺失）→ 必须红。 */
export function mutateCommentOnlySidebarSpread(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  let source = fs.readFileSync(file, 'utf8')
  source = source.replace('...investYearSidebarGroups,', '// ...investYearSidebarGroups,')
  source = source.replace('...lifeYearSidebarGroups,', '/* ...lifeYearSidebarGroups, */')
  source = source.replace('...journeySidebarGroups,', '// ...journeySidebarGroups,')
  fs.writeFileSync(file, source)
}

/** R2-3：仅注释里有 managed-sidebar-fs import → 必须红。 */
export function mutateCommentOnlyManagedSidebarImport(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(
    file,
    source.replace(
      /import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/managed-sidebar-fs(?:\.mjs)?['"];?/m,
      (block) => `/* ${block.replace(/\*\//g, '* /')} */`,
    ),
  )
}

/** R2-1：weekly-life 写错 category → 投影 fail-closed，parity 红。 */
export function mutateWeeklyLifeWrongCategory(root) {
  const file = path.join(root, 'docs', 'AI与生活', '2026-01-03.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace('category: AI与生活', 'category: 投资'))
}

/** R2-1：weekly-life 写错 type → 投影 fail-closed，parity 红。 */
export function mutateWeeklyLifeWrongType(root) {
  const file = path.join(root, 'docs', 'AI与生活', '2026-01-03.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace('type: weekly', 'type: journey'))
}

/** R2-1：weekly-life 缺 category → 投影 fail-closed，parity 红。 */
export function mutateWeeklyLifeMissingCategory(root) {
  const file = path.join(root, 'docs', 'AI与生活', '2026-01-03.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace(/category: AI与生活\r?\n/, ''))
}

export function mutateTripleWriteDrift(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace('第001期-生活', '侧栏漂了'))
}

export function mutateDuplicateIssue(root) {
  const file = path.join(root, 'docs', '投资', '周记', '2026-08-08-写在投资笔记开始之前.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace(
    'type: weekly\n',
    'type: weekly\nissue: 1\n',
  ))
}

export function mutateDuplicateLink(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  const line = "            { text: '第001期-生活', link: '/AI与生活/2026-01-03' },"
  fs.writeFileSync(file, replaceInSection(
    source,
    "'/AI与生活/': [",
    line,
    `${line}\n${line}`,
  ))
}

export function mutateHermesInManual(root) {
  const file = path.join(root, 'docs', '.vitepress', 'posts.ts')
  fs.writeFileSync(file, `const manualPosts: PostItem[] = [
  {
    title: "日记",
    date: "2026-01-05",
    category: "AI与生活",
    type: "hermes",
    link: "/AI与生活/Hermes日记/2026-01-05",
  },
]
`)
}

export function mutateMissingImage(root) {
  const file = path.join(root, 'docs', 'AI与生活', '2026-01-03.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace('/images/weekly/ok.webp', '/images/weekly/missing.webp'))
}

export function mutateResearchVisibility(root) {
  const file = path.join(root, 'docs', '.vitepress', 'posts.ts')
  fs.writeFileSync(file, `const manualPosts: PostItem[] = [
  {
    title: "药明康德",
    date: "2026-01-06",
    category: "投资",
    type: "research",
    link: "/投资/投研/医药/药明康德/",
  },
]
`)
}

export function mutateMarkdownIssueOnly(root) {
  const file = path.join(root, 'docs', '投资', '周记', '2026-01-02-主题.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace('issue: 1', 'issue: 9'))
}

/** Wave F：正文 title 漂移而侧栏未改 → 文件/投影/侧栏红。 */
export function mutateMarkdownTitleOnly(root) {
  const file = path.join(root, 'docs', 'AI与生活', '2026-01-03.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source
    .replace('title: 第001期-生活', 'title: 第001期-改了标题')
    .replace('# 第001期-生活', '# 第001期-改了标题'))
}

/** @deprecated posts.ts 不再是权威；保留空实现以免旧 import 崩。 */
export function mutatePostsDateIssueOnly(root) {
  mutateMarkdownTitleOnly(root)
}

export function mutateDatedJourneyMissingIssue(root) {
  write(root, 'docs/AI与生活/我的AI历程/2026-02-01.md', weeklyMd({
    title: '历程第001期',
    date: '2026-02-01',
    category: 'AI与生活',
    type: 'journey',
  }))
  const configFile = path.join(root, 'docs', '.vitepress', 'config.mts')
  const config = fs.readFileSync(configFile, 'utf8')
  fs.writeFileSync(configFile, config.replace(
    "      '/AI与生活/我的AI历程/': [",
    `      '/AI与生活/我的AI历程/': [
        {
          text: '历程 · 2026年',
          items: [
            { text: '历程第001期', link: '/AI与生活/我的AI历程/2026-02-01' },
          ],
        },`,
  ))
}

export function mutateUnregisteredWeekly(root) {
  write(root, 'docs/投资/周记/草稿.md', '---\ntitle: 草稿\n---\n')
}

export function mutateUnregisteredHermes(root) {
  write(root, 'docs/AI与生活/Hermes日记/notes.md', '---\ntitle: notes\n---\n')
}

export function mutateDeleteNamedChapterEverywhere(root) {
  fs.unlinkSync(path.join(root, 'docs', 'AI与生活', '我的AI历程', '工具篇.md'))
  const configFile = path.join(root, 'docs', '.vitepress', 'config.mts')
  fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf8').replaceAll(
    "            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },\n",
    '',
  ))
  const indexFile = path.join(root, 'docs', 'AI与生活', '我的AI历程', 'index.md')
  fs.writeFileSync(indexFile, fs.readFileSync(indexFile, 'utf8').replace(
    '- [工具篇](/AI与生活/我的AI历程/工具篇) — 工具\n',
    '',
  ))
}

export function mutateSidebarDuplicateChapter(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  const line = "            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },"
  fs.writeFileSync(file, replaceInSection(
    source,
    "'/AI与生活/我的AI历程/': [",
    line,
    `${line}\n${line}`,
  ))
}

export function mutateIndexDuplicateChapter(root) {
  const file = path.join(root, 'docs', 'AI与生活', '我的AI历程', 'index.md')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, source.replace(
    '- [工具篇](/AI与生活/我的AI历程/工具篇) — 工具',
    '- [工具篇](/AI与生活/我的AI历程/工具篇) — 工具\n- [工具篇](/AI与生活/我的AI历程/工具篇) — 又一篇',
  ))
}

export function mutateNamedChapterOrderSwap(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, replaceInSection(
    source,
    "'/AI与生活/我的AI历程/': [",
    `            { text: '基础设施篇', link: '/AI与生活/我的AI历程/基础设施篇' },
            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },`,
    `            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },
            { text: '基础设施篇', link: '/AI与生活/我的AI历程/基础设施篇' },`,
  ))
}

export function mutateNamedChapterOneSided(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  // Wave C：生活侧栏不再枚举具名叶子；单边缺失改为只删历程侧栏叶子
  fs.writeFileSync(file, replaceInSection(
    source,
    "'/AI与生活/我的AI历程/': [",
    "            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },\n",
    '',
  ))
}

/** Wave C 回归锁：生活侧栏重新枚举具名叶子必须红。 */
export function mutateLifeSidebarNamedLeaves(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  const needle = "          text: '周记 · 2026年',"
  const idx = source.indexOf(needle)
  if (idx < 0) throw new Error('missing life year group in fixture config')
  const insert = `
        {
          text: '我的AI历程',
          items: [
            { text: '基础设施篇', link: '/AI与生活/我的AI历程/基础设施篇' },
            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },
            { text: 'AI开支记录与优化', link: '/AI与生活/我的AI历程/AI开支记录与优化' },
          ],
        },`
  fs.writeFileSync(file, source.slice(0, idx) + insert + '\n        ' + source.slice(idx))
}

export function mutateSidebarUnparsed(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, replaceInSection(
    source,
    "'/AI与生活/我的AI历程/': [",
    "            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },",
    "            { unknown: true },",
  ))
}

export function mutateSidebarFieldReorder(root) {
  const file = path.join(root, 'docs', '.vitepress', 'config.mts')
  const source = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, replaceInSection(
    source,
    "'/AI与生活/我的AI历程/': [",
    "            { text: '工具篇', link: '/AI与生活/我的AI历程/工具篇' },",
    "            { link: '/AI与生活/我的AI历程/工具篇', extra: 'keep', text: '工具篇' },",
  ))
}
