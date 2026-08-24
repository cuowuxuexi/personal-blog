/**
 * 站点侧树结构 adapter：投研 / 哲学 / 大问题（无 node:fs）。
 */
import { structureFromGlob } from '../../content-catalog/index.mjs'

export function siteStructureFromGlob(modulesByKind) {
  return structureFromGlob(modulesByKind)
}
