/**
 * Node fs adapter：扫仓后调用纯投影 core。
 * 仅供 config.mts、verifier 与 live 对账；不得进入浏览器 bundle。
 */

import fs from 'node:fs'
import path from 'node:path'
import { getContentKind } from './kinds.mjs'
import { matchesKindPath, posixRel } from './paths.mjs'
import { managedKindIds, managedPostsFromSources } from './project.mjs'

function discoverKindFiles(repoRoot, kind) {
  const abs = path.join(repoRoot, ...kind.contentDir.split('/'))
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => posixRel(`${kind.contentDir}/${entry.name}`))
    .filter((rel) => matchesKindPath(kind, rel))
}

/**
 * @param {string} repoRoot
 */
export function projectManagedPostsFromFs(repoRoot) {
  const sources = []
  for (const kindId of managedKindIds()) {
    const kind = getContentKind(kindId)
    for (const relativePath of discoverKindFiles(repoRoot, kind)) {
      const abs = path.join(repoRoot, ...relativePath.split('/'))
      const raw = fs.readFileSync(abs, 'utf8')
      sources.push({ kindId, relativePath, raw })
    }
  }
  return managedPostsFromSources(sources)
}
