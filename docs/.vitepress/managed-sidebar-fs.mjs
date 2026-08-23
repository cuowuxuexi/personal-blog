/**
 * Node-only：config.mts 受管 sidebar 投影。勿被 posts.ts / 主题客户端导入。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  projectInvestSidebarManagedParts,
  projectJourneySidebar,
  projectLifeSidebarManagedParts,
} from '../../content-catalog/index.mjs'
import { projectManagedPostsFromFs } from '../../content-catalog/project-fs.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const managedPosts = projectManagedPostsFromFs(REPO_ROOT)

/** `/投资/周记/` 年份组（含开篇无 issue 项） */
export const investYearSidebarGroups = projectInvestSidebarManagedParts(managedPosts)

/** `/AI与生活/` 周记年份组（不含具名历程叶子；历程仅经系列入口进入生活壳） */
export const lifeYearSidebarGroups = projectLifeSidebarManagedParts(managedPosts)

/** `/AI与生活/我的AI历程/` 具名篇章组 + 日期期数年份组 */
export const journeySidebarGroups = projectJourneySidebar(managedPosts)
