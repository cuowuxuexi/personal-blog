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
  // Agent/ADR docs live under docs/ for repo layout, but are not public site pages.
  srcExclude: ['**/agents/**', '**/adr/**'],

  head: [
    ['meta', { name: 'theme-color', content: '#2949a4' }],
  ],

  themeConfig: {
    siteTitle: false,
    logo: undefined,

    nav: [
      {
        text: '投资哲学档',
        items: [
          { text: '总览', link: '/投资哲学/' },
          { text: '认识与证据', link: '/投资哲学/认识与证据/' },
          { text: '市场与价格', link: '/投资哲学/市场与价格/' },
          { text: '企业与回报', link: '/投资哲学/企业与回报/' },
          { text: '个人与研究边界', link: '/投资哲学/个人与研究边界/' },
        ],
      },
      {
        text: '大问题的问与答',
        items: [
          { text: '总览', link: '/大问题/' },
        ],
      },
      { text: '关于', link: '/关于' },
    ],

    sidebar: {
      // 站名下拉进入的独立栏目：架构类似投研 hub，彼此不互链
      '/大问题/': [
        {
          text: '大问题的问与答',
          items: [
            { text: '总览', link: '/大问题/' },
          ],
        },
      ],
      '/投资哲学/': [
        {
          text: '投资哲学档',
          items: [
            { text: '总览', link: '/投资哲学/' },
            { text: '认识与证据', link: '/投资哲学/认识与证据/' },
            { text: '市场与价格', link: '/投资哲学/市场与价格/' },
            { text: '企业与回报', link: '/投资哲学/企业与回报/' },
            { text: '个人与研究边界', link: '/投资哲学/个人与研究边界/' },
          ],
        },
      ],
      // 投研侧栏：行业为一级入口（默认展开）；其下「研究地图 / 标的档案」默认收起。
      '/投资/投研/': [
        {
          text: '投研',
          items: [
            { text: '投研首页', link: '/投资/' },
            { text: '周记', link: '/投资/周记/' },
            { text: '投研标的', link: '/投资/投研/' },
          ],
        },
        {
          text: '医药行业',
          collapsed: false,
          items: [
            { text: '行业总览', link: '/投资/投研/医药/' },
            {
              text: '研究地图',
              collapsed: true,
              items: [
                { text: '地图总览', link: '/投资/投研/医药/研究地图/' },
                { text: '创新药研发全流程', link: '/投资/投研/医药/研究地图/创新药研发全流程/' },
                { text: 'CXO 与 CRDMO', link: '/投资/投研/医药/研究地图/CXO与CRDMO/' },
              ],
            },
            {
              text: '标的档案',
              collapsed: true,
              items: [
                { text: '药明康德', link: '/投资/投研/医药/药明康德/' },
              ],
            },
          ],
        },
        {
          text: '互联网行业',
          collapsed: true,
          items: [
            { text: '行业总览', link: '/投资/投研/互联网/' },
            {
              text: '研究地图',
              collapsed: true,
              items: [
                { text: '地图总览', link: '/投资/投研/互联网/研究地图/' },
              ],
            },
            {
              text: '标的档案',
              collapsed: true,
              items: [],
            },
          ],
        },
        {
          text: '猪肉养殖行业',
          collapsed: true,
          items: [
            { text: '行业总览', link: '/投资/投研/猪肉养殖/' },
            {
              text: '研究地图',
              collapsed: true,
              items: [
                { text: '地图总览', link: '/投资/投研/猪肉养殖/研究地图/' },
              ],
            },
            {
              text: '标的档案',
              collapsed: true,
              items: [],
            },
          ],
        },
        {
          text: '白酒行业',
          collapsed: true,
          items: [
            { text: '行业总览', link: '/投资/投研/白酒/' },
            {
              text: '研究地图',
              collapsed: true,
              items: [
                { text: '地图总览', link: '/投资/投研/白酒/研究地图/' },
              ],
            },
            {
              text: '标的档案',
              collapsed: true,
              items: [],
            },
          ],
        },
        {
          text: '硬件制造行业',
          collapsed: true,
          items: [
            { text: '行业总览', link: '/投资/投研/硬件制造/' },
            {
              text: '研究地图',
              collapsed: true,
              items: [
                { text: '地图总览', link: '/投资/投研/硬件制造/研究地图/' },
              ],
            },
            {
              text: '标的档案',
              collapsed: true,
              items: [],
            },
          ],
        },
      ],
      '/投资/周记/': [
        {
          text: '投研',
          items: [
            { text: '投研首页', link: '/投资/' },
            { text: '投研标的', link: '/投资/投研/' },
          ],
        },
        {
          text: '2026年',
          collapsed: false,
          items: [
            { text: '第001期 · 写在投资笔记开始之前', link: '/投资/周记/2026-08-08-写在投资笔记开始之前' },
          ],
        },
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
            { text: '周记归档', link: '/AI与生活/' },
          ],
        },
        {
          text: '2026年',
          collapsed: false,
          items: [
            { text: '第001期 · 用 AI 整理日常的一周', link: '/AI与生活/2026-08-08-用AI整理日常的一周' },
          ],
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
    outlineTitle: '大纲',
  },
})
