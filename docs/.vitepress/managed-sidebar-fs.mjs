/**
 * Node-only：config.mts 受管 sidebar 投影。勿被 posts.ts / 主题客户端导入。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  projectBigQuestionSidebar,
  projectInvestSidebarManagedParts,
  projectJourneySidebar,
  projectLifeSidebarManagedParts,
  projectPhilosophySidebar,
  projectResearchSidebar,
  projectTopicNavItems,
} from '../../content-catalog/index.mjs'
import { projectManagedPostsFromFs, projectStructureFromFs } from '../../content-catalog/project-fs.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const managedPosts = projectManagedPostsFromFs(REPO_ROOT)
const structureNodes = projectStructureFromFs(REPO_ROOT)

/** `/投资/周记/` 年份组（含开篇无 issue 项） */
export const investYearSidebarGroups = projectInvestSidebarManagedParts(managedPosts)

/** `/AI与生活/` 周记年份组（不含具名历程叶子；历程仅经系列入口进入生活壳） */
export const lifeYearSidebarGroups = projectLifeSidebarManagedParts(managedPosts)

/** `/AI与生活/我的AI历程/` 具名篇章组 + 日期期数年份组 */
export const journeySidebarGroups = projectJourneySidebar(managedPosts)

/** `/投资/投研/` 行业树（公司下章节挂在该公司下面） */
export const researchIndustrySidebarGroups = projectResearchSidebar(structureNodes)

/** `/投资哲学/` 总览 + 主题 */
export const philosophySidebarGroups = projectPhilosophySidebar(structureNodes)

/** `/大问题/` 总览 + 条目 */
export const bigQuestionSidebarGroups = projectBigQuestionSidebar(structureNodes)

export const philosophyNavItems = projectTopicNavItems('philosophy', structureNodes)
export const bigQuestionNavItems = projectTopicNavItems('big-question', structureNodes)
