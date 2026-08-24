import {
  CONTENT_KIND_IDS,
  assertContentKind,
  assertUniqueKindIds,
} from './schema.mjs'

const DATED_MARKDOWN = '^\\d{4}-\\d{2}-\\d{2}.*\\.md$'
const HERMES_DAY_MARKDOWN = '^\\d{4}-\\d{2}-\\d{2}(?:-.*)?\\.md$'
const JOURNEY_MARKDOWN = '.+\\.md$'
const RESEARCH_MARKDOWN = '.+\\.md$'

const WEEKLY_LIFE_ASSETS = Object.freeze({
  directory: 'docs/public/images/weekly',
  urlPrefix: '/images/weekly/',
})

const JOURNEY_ASSETS = Object.freeze({
  directory: 'docs/public/images/journey',
  urlPrefix: '/images/journey/',
})

const NO_ASSETS = Object.freeze({
  directory: null,
  urlPrefix: null,
})

const INDEX_AND_README = Object.freeze(['index.md', 'README.md'])

function weeklyScan() {
  return Object.freeze({
    mode: 'direct-children',
    includePattern: DATED_MARKDOWN,
    excludeBasenames: INDEX_AND_README,
  })
}

const KINDS = Object.freeze([
  Object.freeze({
    id: 'weekly-life',
    label: 'AI与生活周记',
    category: 'AI与生活',
    postType: 'weekly',
    pageClass: 'weekly-post weekly-post--life',
    lifecycle: 'active',
    recentVisible: true,
    contentDir: 'docs/AI与生活',
    sidebarKey: '/AI与生活/',
    yearGroupTemplate: '周记 · {year}年',
    createFileName: 'date',
    scan: weeklyScan(),
    assets: WEEKLY_LIFE_ASSETS,
    creation: Object.freeze({
      allowCreate: true,
      surfaces: Object.freeze(['panel', 'blog-editor']),
      namedChapters: 'none',
      publicationProtocol: null,
    }),
    // Wave F：pairWithManualPosts = 与投影 posts 对账（文件权威 → 投影），不再读 manualPosts shadow。
    indexing: 'projected-posts',
    validation: Object.freeze({
      pairWithManualPosts: true,
      pairWithYearSidebar: true,
      pairNamedChapters: false,
      uniqueIssue: true,
      issueOptionalForOpening: false,
      uniqueLink: true,
      requireReferencedImages: true,
      forbidManualPosts: false,
      fileIsIndex: false,
    }),
  }),
  Object.freeze({
    id: 'weekly-investment',
    label: '投资周记',
    category: '投资',
    postType: 'weekly',
    pageClass: 'weekly-post weekly-post--invest',
    lifecycle: 'active',
    recentVisible: true,
    contentDir: 'docs/投资/周记',
    sidebarKey: '/投资/周记/',
    yearGroupTemplate: '{year}年',
    createFileName: 'date-theme',
    openingWithoutIssueLink: '/投资/周记/2026-08-08-写在投资笔记开始之前',
    scan: weeklyScan(),
    assets: WEEKLY_LIFE_ASSETS,
    creation: Object.freeze({
      allowCreate: true,
      surfaces: Object.freeze(['panel', 'blog-editor']),
      namedChapters: 'none',
      publicationProtocol: 'research-publishing',
    }),
    indexing: 'projected-posts',
    validation: Object.freeze({
      pairWithManualPosts: true,
      pairWithYearSidebar: true,
      pairNamedChapters: false,
      uniqueIssue: true,
      issueOptionalForOpening: true,
      uniqueLink: true,
      requireReferencedImages: true,
      forbidManualPosts: false,
      fileIsIndex: false,
    }),
  }),
  Object.freeze({
    id: 'journey',
    label: '我的AI历程',
    category: 'AI与生活',
    postType: 'journey',
    pageClass: 'weekly-post weekly-post--life',
    lifecycle: 'active',
    recentVisible: true,
    contentDir: 'docs/AI与生活/我的AI历程',
    sidebarKey: '/AI与生活/我的AI历程/',
    yearGroupTemplate: '历程 · {year}年',
    createFileName: 'date',
    namedChapterOrder: Object.freeze(['基础设施篇.md', '工具篇.md', 'cli篇.md', 'AI开支记录与优化.md']),
    namedChapterNesting: Object.freeze({
      '工具篇.md': Object.freeze(['cli篇.md']),
    }),
    namedChapterGroupText: '我的AI历程',
    seriesEntry: Object.freeze({
      text: '我的AI历程',
      link: '/AI与生活/我的AI历程/',
    }),
    // Wave C：生活侧栏只保留系列入口，不枚举具名叶子
    lifeSidebarEnumeratesNamedChapters: false,
    scan: Object.freeze({
      mode: 'direct-children',
      includePattern: JOURNEY_MARKDOWN,
      excludeBasenames: INDEX_AND_README,
    }),
    assets: JOURNEY_ASSETS,
    creation: Object.freeze({
      allowCreate: true,
      surfaces: Object.freeze(['panel', 'blog-editor']),
      namedChapters: 'blog-editor-only',
      publicationProtocol: null,
    }),
    indexing: 'projected-posts',
    validation: Object.freeze({
      pairWithManualPosts: true,
      pairWithYearSidebar: true,
      pairNamedChapters: true,
      uniqueIssue: true,
      issueOptionalForOpening: false,
      uniqueLink: true,
      requireReferencedImages: true,
      forbidManualPosts: false,
      fileIsIndex: false,
    }),
  }),
  Object.freeze({
    id: 'hermes',
    label: 'Hermes日记',
    category: 'AI与生活',
    postType: 'hermes',
    pageClass: 'weekly-post weekly-post--life hermes-diary-post',
    lifecycle: 'retired',
    recentVisible: true,
    contentDir: 'docs/AI与生活/Hermes日记',
    sidebarKey: '/AI与生活/Hermes日记/',
    yearGroupTemplate: null,
    createFileName: 'date-optional-slug',
    scan: Object.freeze({
      mode: 'direct-children',
      includePattern: HERMES_DAY_MARKDOWN,
      excludeBasenames: INDEX_AND_README,
    }),
    assets: NO_ASSETS,
    creation: Object.freeze({
      allowCreate: false,
      surfaces: Object.freeze([]),
      namedChapters: 'none',
      publicationProtocol: 'hermes-reopen',
    }),
    indexing: 'file-is-index',
    validation: Object.freeze({
      pairWithManualPosts: false,
      pairWithYearSidebar: false,
      pairNamedChapters: false,
      uniqueIssue: false,
      issueOptionalForOpening: false,
      uniqueLink: true,
      requireReferencedImages: false,
      forbidManualPosts: true,
      fileIsIndex: true,
    }),
  }),
  Object.freeze({
    id: 'research',
    label: '投研',
    category: '投资',
    postType: 'research',
    pageClass: Object.freeze([
      'research-index',
      'industry-index',
      'map-index',
      'subject-index',
    ]),
    lifecycle: 'active',
    recentVisible: false,
    contentDir: 'docs/投资/投研',
    sidebarKey: '/投资/投研/',
    yearGroupTemplate: null,
    createFileName: 'index-in-tree',
    scan: Object.freeze({
      mode: 'tree',
      includePattern: RESEARCH_MARKDOWN,
      excludeBasenames: Object.freeze(['README.md']),
    }),
    assets: NO_ASSETS,
    creation: Object.freeze({
      allowCreate: false,
      surfaces: Object.freeze(['blog-editor']),
      namedChapters: 'none',
      publicationProtocol: 'research-publishing',
    }),
    industryIndexText: '行业总览',
    mapsGroupText: '研究地图',
    mapsIndexText: '地图总览',
    subjectsGroupText: '标的档案',
    defaultIndustryCollapsed: true,
    indexing: 'not-in-posts',
    validation: Object.freeze({
      pairWithManualPosts: false,
      pairWithYearSidebar: false,
      pairNamedChapters: false,
      uniqueIssue: false,
      issueOptionalForOpening: false,
      uniqueLink: true,
      requireReferencedImages: false,
      forbidManualPosts: true,
      fileIsIndex: false,
    }),
  }),
  Object.freeze({
    id: 'philosophy',
    label: '投资哲学档',
    category: '投资哲学',
    postType: 'philosophy',
    pageClass: Object.freeze(['investment-hub', 'subject-index']),
    lifecycle: 'active',
    recentVisible: false,
    contentDir: 'docs/投资哲学',
    sidebarKey: '/投资哲学/',
    yearGroupTemplate: null,
    createFileName: 'index-in-tree',
    scan: Object.freeze({
      mode: 'tree',
      includePattern: RESEARCH_MARKDOWN,
      excludeBasenames: Object.freeze(['README.md']),
    }),
    assets: NO_ASSETS,
    creation: Object.freeze({
      allowCreate: false,
      surfaces: Object.freeze(['blog-editor']),
      namedChapters: 'none',
      publicationProtocol: null,
    }),
    hubSidebarText: '总览',
    indexing: 'not-in-posts',
    validation: Object.freeze({
      pairWithManualPosts: false,
      pairWithYearSidebar: false,
      pairNamedChapters: false,
      uniqueIssue: false,
      issueOptionalForOpening: false,
      uniqueLink: true,
      requireReferencedImages: false,
      forbidManualPosts: true,
      fileIsIndex: false,
    }),
  }),
  Object.freeze({
    id: 'big-question',
    label: '大问题的问与答',
    category: '大问题',
    postType: 'big-question',
    pageClass: Object.freeze(['investment-hub', 'subject-index']),
    lifecycle: 'active',
    recentVisible: false,
    contentDir: 'docs/大问题',
    sidebarKey: '/大问题/',
    yearGroupTemplate: null,
    createFileName: 'index-in-tree',
    scan: Object.freeze({
      mode: 'tree',
      includePattern: RESEARCH_MARKDOWN,
      excludeBasenames: Object.freeze(['README.md']),
    }),
    assets: NO_ASSETS,
    creation: Object.freeze({
      allowCreate: false,
      surfaces: Object.freeze(['blog-editor']),
      namedChapters: 'none',
      publicationProtocol: null,
    }),
    hubSidebarText: '总览',
    indexing: 'not-in-posts',
    validation: Object.freeze({
      pairWithManualPosts: false,
      pairWithYearSidebar: false,
      pairNamedChapters: false,
      uniqueIssue: false,
      issueOptionalForOpening: false,
      uniqueLink: true,
      requireReferencedImages: false,
      forbidManualPosts: true,
      fileIsIndex: false,
    }),
  }),
])

assertUniqueKindIds(KINDS)
for (const kind of KINDS) assertContentKind(kind)

const KIND_BY_ID = Object.freeze(Object.fromEntries(KINDS.map((kind) => [kind.id, kind])))

export function listContentKinds() {
  return KINDS.slice()
}

export function getContentKind(id) {
  const kind = KIND_BY_ID[id]
  if (!kind) throw new Error(`未知 ContentKind：${id || '?'}`)
  return kind
}

export function hasContentKind(id) {
  return Object.prototype.hasOwnProperty.call(KIND_BY_ID, id)
}

export { CONTENT_KIND_IDS }
