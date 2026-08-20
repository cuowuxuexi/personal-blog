import path from 'node:path'

function weeklyCapability(wechatTheme) {
  return {
    contentType: 'weekly',
    allowCreate: true,
    selectorLabel: '期数',
    emptyHint: '没有当期周记，请先开新一期。',
    appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
    headingAnchor: 'kan-yanhua',
    assetDirectory: 'docs/public/images/weekly',
    assetUrlPrefix: '/images/weekly/',
    wechatTheme,
    publishScope: 'weekly',
  }
}

const JOURNEY_CAPABILITY = {
  contentType: 'journey',
  allowCreate: true,
  selectorLabel: '期数与篇章',
  emptyHint: '没有当期历程周记，请先开新一期。',
  appendHint: '这次会追加到所选期数或篇章末尾，已有条目不会动。',
  headingAnchor: '',
  assetDirectory: 'docs/public/images/journey',
  assetUrlPrefix: '/images/journey/',
  wechatTheme: 'life',
  publishScope: 'journey',
}

const CAPABILITY_KEYS = [
  'contentType',
  'allowCreate',
  'selectorLabel',
  'emptyHint',
  'appendHint',
  'headingAnchor',
  'assetDirectory',
  'assetUrlPrefix',
  'wechatTheme',
  'publishScope',
]

export function kindCapability(kind) {
  if (!kind?.capability) {
    throw new Error(`栏目缺少 capability：${kind?.id || '?'}`)
  }
  return kind.capability
}

export function allowsCreate(kind) {
  return kindCapability(kind).allowCreate === true
}

export function publicKindCapability(kind) {
  const capability = kindCapability(kind)
  return Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, capability[key]]))
}

export function createRepoPaths(repoRoot) {
  return {
    REPO_ROOT: repoRoot,
    POSTS_TS: path.join(repoRoot, 'docs', '.vitepress', 'posts.ts'),
    CONFIG_MTS: path.join(repoRoot, 'docs', '.vitepress', 'config.mts'),
    WEEKLY_IMAGES: path.join(repoRoot, 'docs', 'public', 'images', 'weekly'),
    KINDS: {
      life: {
        id: 'life',
        label: 'AI与生活周记',
        category: 'AI与生活',
        pageClass: 'weekly-post weekly-post--life',
        dir: path.join(repoRoot, 'docs', 'AI与生活'),
        relDir: 'docs/AI与生活',
        sidebarKey: '/AI与生活/',
        yearText: (year) => `周记 · ${year}年`,
        defaultCover: '/images/hero-fireworks.png',
        defaultCoverAlt: '机械之手指向夜空烟花',
        defaultCaption: '烟花朵朵开，想法自然来。',
        capability: weeklyCapability('life'),
        fileName(date) {
          return `${date}.md`
        },
        siteLink(date) {
          return `/AI与生活/${date}`
        },
      },
      invest: {
        id: 'invest',
        label: '投资周记',
        category: '投资',
        pageClass: 'weekly-post weekly-post--invest',
        dir: path.join(repoRoot, 'docs', '投资', '周记'),
        relDir: 'docs/投资/周记',
        sidebarKey: '/投资/周记/',
        yearText: (year) => `${year}年`,
        defaultCover: '/images/hero-fireworks.png',
        defaultCoverAlt: '机械之手指向夜空烟花',
        defaultCaption: '烟花朵朵开，想法自然来。',
        capability: weeklyCapability('invest'),
        fileName(date, theme) {
          return `${date}-${theme}.md`
        },
        siteLink(date, theme) {
          return `/投资/周记/${date}-${theme}`
        },
      },
      journey: {
        id: 'journey',
        label: '我的AI历程',
        category: 'AI与生活',
        pageClass: 'weekly-post weekly-post--life',
        dir: path.join(repoRoot, 'docs', 'AI与生活', '我的AI历程'),
        relDir: 'docs/AI与生活/我的AI历程',
        sidebarKey: '/AI与生活/我的AI历程/',
        yearText: (year) => `周记 · ${year}年`,
        defaultCover: '/images/hero-fireworks.png',
        defaultCoverAlt: '机械之手指向夜空烟花',
        defaultCaption: '烟花朵朵开，想法自然来。',
        capability: JOURNEY_CAPABILITY,
        fileName(date) {
          return `${date}.md`
        },
        siteLink(date) {
          return `/AI与生活/我的AI历程/${date}`
        },
      },
    },
  }
}
