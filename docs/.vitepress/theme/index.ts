/**
 * 误君在脑海里放烟花 — 自定义主题入口
 * theme-without-fonts：系统中文栈 + 本地 FiraCode；无 Giscus / TDesign。
 */
import Theme from 'vitepress/theme-without-fonts'
import Layout from './Layout.vue'
import CategoryList from './components/CategoryList.vue'
import LatestWeeklyRedirect from './components/LatestWeeklyRedirect.vue'
import WeeklyEntry from './components/WeeklyEntry.vue'
import type { EnhanceAppContext } from 'vitepress'
import './style.css'

export default {
  extends: Theme,
  Layout,
  enhanceApp({ app }: EnhanceAppContext) {
    app.component('CategoryList', CategoryList)
    app.component('LatestWeeklyRedirect', LatestWeeklyRedirect)
    app.component('WeeklyEntry', WeeklyEntry)
  },
}
