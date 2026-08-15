import path from 'node:path'

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
        fileName(date, theme) {
          return `${date}-${theme}.md`
        },
        siteLink(date, theme) {
          return `/投资/周记/${date}-${theme}`
        },
      },
    },
  }
}
