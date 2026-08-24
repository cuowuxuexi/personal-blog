import { defineConfig } from 'vitepress'
import { loadHermesDiaryPostsFromFs } from './hermes-diary-fs'
import { hermesSidebarItems } from './hermes-diary'
import {
  bigQuestionNavItems,
  bigQuestionSidebarGroups,
  investYearSidebarGroups,
  journeySidebarGroups,
  lifeYearSidebarGroups,
  philosophyNavItems,
  philosophySidebarGroups,
  researchIndustrySidebarGroups,
} from './managed-sidebar-fs.mjs'
import { normalizeDisplayMath } from './normalize-math.mjs'
import { normalizeWeeklyEntryHeadings } from './normalize-weekly-headings.mjs'
import { serveStandaloneHtmlPlugin, standaloneHtmlFile } from './standalone-html.mjs'

/**
 * 误君在脑海里放烟花 — VitePress 站点配置
 * 侧栏：静态壳手写；周记/历程/投研/哲学/大问题受管组由构建期投影注入。
 * - 投资周记年份组、生活周记年份组、历程具名篇章+日期年份组 → managed-sidebar-fs
 * - 投研行业树、投资哲学、大问题 → managed-sidebar-fs
 * - Wave C：生活侧栏只保留历程系列入口，不再枚举具名叶子
 * - 面板只写 Markdown（+引用图）；受管 posts/sidebar 由投影生成
 */
const hermesDiaryNav = hermesSidebarItems(loadHermesDiaryPostsFromFs())

export default defineConfig({
  lang: 'zh-CN',
  title: '误君在脑海里放烟花',
  description: '投资观察与 AI 生活随笔',
  base: process.env.VITEPRESS_BASE || '/',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: (url) => Boolean(standaloneHtmlFile(url)),
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
    }
  },

  head: [
    ['meta', { name: 'theme-color', content: '#2949a4' }],
  ],

  themeConfig: {
    siteTitle: false,
    logo: undefined,

    nav: [
      {
        text: '投资哲学档',
        items: philosophyNavItems,
      },
      {
        text: '大问题的问与答',
        items: bigQuestionNavItems,
      },
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
      // 投研侧栏：静态壳手写；行业树由构建期投影。
      '/投资/投研/': [
        {
          text: '投研',
          items: [
            { text: '投研首页', link: '/投资/' },
            { text: '周记', link: '/投资/周记/' },
            { text: '投研标的', link: '/投资/投研/' },
          ],
        },
        ...researchIndustrySidebarGroups,
      ],
      '/投资/周记/': [
        {
          text: '投研',
          items: [
            { text: '投研首页', link: '/投资/' },
            { text: '周记', link: '/投资/周记/' },
            { text: '投研标的', link: '/投资/投研/' },
          ],
        },
        ...investYearSidebarGroups,
      ],
      '/投资/': [
        {
          text: '投研',
          items: [
            { text: '投研首页', link: '/投资/' },
            { text: '周记', link: '/投资/周记/' },
            { text: '投研标的', link: '/投资/投研/' },
          ],
        },
      ],
      '/AI与生活/': [
        {
          text: 'AI与生活',
          items: [
            { text: '最新周记', link: '/AI与生活/' },
            {
              text: '我的AI历程',
              link: '/AI与生活/我的AI历程/',
            },
          ],
        },
        ...lifeYearSidebarGroups,
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
            { text: '最新周记', link: '/AI与生活/' },
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
            { text: '最新周记', link: '/AI与生活/' },
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

    footer: {
      message: '个人笔记分享 · <strong>非投资建议</strong>，据此决策风险自负',
      copyright:
        '© 2026 误君在脑海里放烟花 · <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">闽ICP备2026032381号-1</a> · <a class="beian-mps" href="https://beian.mps.gov.cn/#/query/webSearch?code=35018302000421" target="_blank" rel="noopener noreferrer"><img class="beian-mps__icon" src="/images/beian-mps.png" width="14" height="16" alt="" />闽公网安备35018302000421号</a>',
    },

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
