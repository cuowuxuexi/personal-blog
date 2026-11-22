import { defineConfig } from 'vitepress'
import { loadHermesDiaryPostsFromFs } from './hermes-diary-fs'
import { hermesSidebarItems } from './hermes-diary'
import {
  bigQuestionSidebarGroups,
  journeySidebarGroups,
  philosophySidebarGroups,
  researchIndustrySidebarGroups,
} from './managed-sidebar-fs.mjs'
import { normalizeDisplayMath } from './normalize-math.mjs'
import { normalizeWeeklyEntryHeadings } from './normalize-weekly-headings.mjs'
import { loadReports, siteTokenCss } from './research-reports.mjs'
import { loadVideos } from './videos.mjs'
import { emitStandaloneCoverPages, serveStandaloneHtmlPlugin, standaloneHtmlFile } from './standalone-html.mjs'

/**
 * 误君在脑海里放烟花 — VitePress 站点配置
 * 侧栏：静态壳手写；历程/投研/哲学/大问题受管组由构建期投影注入。
 * - 两类周记已冻结：不进 nav/recent/年份侧栏，页面仍保留直达 URL
 * - 历程具名篇章+日期年份组、投研行业树、哲学主题、大问题条目 → managed-sidebar-fs
 * - Wave C：生活侧栏只保留历程系列入口，不再枚举具名叶子
 * - 面板只写 Markdown（+引用图）；受管 posts/sidebar 由投影生成
 */
const hermesDiaryNav = hermesSidebarItems(loadHermesDiaryPostsFromFs())
const { cssVars } = loadReports()
const siteTokens = siteTokenCss(cssVars)
const hasVideos = loadVideos().length > 0
const themeColor = cssVars.find(([name]) => name === '--primary')?.[1] || '#2949a4'

function pageClassFor(relativePath: string): string {
  if (['index.md', '投资/index.md', '归档.md', '视频/index.md'].includes(relativePath)) return 'site-list'
  if (relativePath.startsWith('投资哲学/') || relativePath === '关于.md') return 'site-article'
  if (['投资/投研/', '投资/周记/', 'AI与生活/', '大问题/'].some((p) => relativePath.startsWith(p))) {
    return 'site-archive'
  }
  return ''
}

export default defineConfig({
  lang: 'zh-CN',
  title: '误君在脑海里放烟花',
  description: '一个人的投研笔记',
  base: process.env.VITEPRESS_BASE || '/',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [(url) => Boolean(standaloneHtmlFile(url))],
  // Agent/ADR docs live under docs/ for repo layout, but are not public site pages.
  // agents/adr 为仓库协议；目录 README 仅给作者/Agent，不进公开站点
  srcExclude: ['**/agents/**', '**/adr/**', '**/README.md'],

  vite: {
    plugins: [serveStandaloneHtmlPlugin()],
  },

  markdown: {
    // 周记正文按「一行一句」书写，软换行渲染为 <br> 而不是合并成一段
    breaks: true,
    math: true,
    config(md) {
      const parse = md.parse.bind(md)
      const render = md.render.bind(md)
      const normalize = (src) =>
        normalizeWeeklyEntryHeadings(normalizeDisplayMath(src))
      md.parse = (src, env) => parse(normalize(src), env)
      md.render = (src, env) => render(normalize(src), env)
    },
  },

  transformPageData(pageData) {
    if (pageData.frontmatter?.type === 'weekly') {
      pageData.frontmatter.outline = [2, 6]
      pageData.frontmatter.search = false
      pageData.frontmatter.prev = false
      pageData.frontmatter.next = false
    }
    const pageClass = pageClassFor(pageData.relativePath)
    if (pageClass) {
      pageData.frontmatter ??= {}
      const prev = pageData.frontmatter.pageClass
      pageData.frontmatter.pageClass = prev ? `${prev} ${pageClass}` : pageClass
    }
  },

  async buildEnd(siteConfig) {
    emitStandaloneCoverPages(siteConfig.outDir)
  },

  head: [
    ['meta', { name: 'theme-color', content: themeColor }],
    ...(siteTokens ? [['style', { id: 'site-tokens' }, siteTokens] as [string, Record<string, string>, string]] : []),
  ],

  themeConfig: {
    siteTitle: false,
    logo: undefined,

    nav: [
      { text: '研报', link: '/', activeMatch: '^/(投资/)?$' },
      ...(hasVideos ? [{ text: '视频', link: '/视频/', activeMatch: '^/视频/' }] : []),
      { text: '方法', link: '/投资哲学/', activeMatch: '^/投资哲学/' },
      { text: '归档', link: '/归档', activeMatch: '^/(归档$|投资/投研/|投资/周记/|AI与生活/|大问题/)' },
      { text: '关于', link: '/关于' },
    ],

    sidebar: {
      // 站名下拉进入的独立栏目：架构类似投研 hub，彼此不互链
      '/大问题/': [
        ...bigQuestionSidebarGroups,
      ],
      '/投资哲学/': [
        ...philosophySidebarGroups,
      ],
      // 投研侧栏：行业树由投影注入；静态壳只留投研三入口。
      '/投资/投研/': [
        {
          text: '旧版投研',
          items: [
            { text: '归档', link: '/归档' },
            { text: '旧版目录', link: '/投资/投研/' },
          ],
        },
        ...researchIndustrySidebarGroups,
      ],
      '/投资/周记/': [
        {
          text: '归档',
          items: [{ text: '归档', link: '/归档' }],
        },
      ],
      '/投资/': [
        {
          text: '研报',
          items: [
            { text: '研报', link: '/' },
            { text: '归档', link: '/归档' },
          ],
        },
      ],
      '/AI与生活/': [
        {
          text: 'AI与生活',
          items: [
            { text: '首页', link: '/AI与生活/' },
            {
              text: '我的AI历程',
              link: '/AI与生活/我的AI历程/',
            },
          ],
        },
        {
          text: '大事件记录区',
          collapsed: false,
          items: [
            { text: '2026年大事件', link: '/AI与生活/大事件/2026' },
          ],
        },
      ],
      '/AI与生活/我的AI历程/': [
        {
          text: 'AI与生活',
          items: [
            { text: '首页', link: '/AI与生活/' },
            {
              text: '我的AI历程',
              link: '/AI与生活/我的AI历程/',
            },
          ],
        },
        ...journeySidebarGroups,
      ],
      '/AI与生活/Hermes日记/': [
        {
          text: 'AI与生活',
          items: [
            { text: '首页', link: '/AI与生活/' },
            {
              text: '我的AI历程',
              link: '/AI与生活/我的AI历程/',
            },
          ],
        },
        {
          text: 'Hermes日记（协作本）',
          collapsed: false,
          items: hermesDiaryNav,
        },
      ],
    },

    outline: {
      level: [2, 3],
      label: '大纲',
    },

    search: {
      provider: 'local',
      options: {
        async _render(src, env, md) {
          if (env.frontmatter?.search === false || env.frontmatter?.type === 'weekly') return ''
          return md.render(src, env)
        },
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除查询',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    socialLinks: [],

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: undefined,
      },
    },

    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    outlineTitle: '大纲',
  },
})
