import { defineConfig } from 'vitepress'

/**
 * 误君在脑海里放烟花 — VitePress 站点配置
 * 侧栏按板块分路径、按日期倒序；新增文章后请同步：
 * 1) docs/.vitepress/posts.ts
 * 2) 下方 themeConfig.sidebar
 */
export default defineConfig({
  lang: 'zh-CN',
  title: '误君在脑海里放烟花',
  description: '投资观察与 AI 生活随笔',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#2949a4' }],
  ],

  themeConfig: {
    siteTitle: '误君在脑海里放烟花',
    logo: undefined,

    nav: [
      { text: '投资', link: '/投资/' },
      { text: 'AI与生活', link: '/AI与生活/' },
      { text: '关于', link: '/关于' },
    ],

    sidebar: {
      '/投资/': [
        {
          text: '2026年',
          collapsed: false,
          items: [
            { text: '2026-08-08 · 写在投资笔记开始之前', link: '/投资/2026-08-08-写在投资笔记开始之前' },
          ],
        },
        {
          text: '板块',
          items: [
            { text: '投资首页', link: '/投资/' },
          ],
        },
      ],
      '/AI与生活/': [
        {
          text: '2026年',
          collapsed: false,
          items: [
            { text: '2026-08-08 · 用 AI 整理日常的一周', link: '/AI与生活/2026-08-08-用AI整理日常的一周' },
          ],
        },
        {
          text: '板块',
          items: [
            { text: 'AI与生活首页', link: '/AI与生活/' },
          ],
        },
      ],
    },

    outline: {
      level: [2, 4],
      label: '本页指引',
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
      copyright: '© 2026 误君在脑海里放烟花',
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
    outlineTitle: '本页指引',
  },
})
