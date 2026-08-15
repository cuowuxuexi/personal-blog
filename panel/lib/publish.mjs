import fs from 'node:fs'
import path from 'node:path'
import { REPO_ROOT } from './paths.mjs'

export { assertPublishable } from './scope.mjs'

export function collectReferencedWeeklyImages(files, repoRoot = REPO_ROOT) {
  const extra = []
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const abs = path.join(repoRoot, file)
    if (!fs.existsSync(abs)) continue
    const text = fs.readFileSync(abs, 'utf8')
    for (const match of text.matchAll(/\/images\/weekly\/([^"'\)\s]+)/g)) {
      const rel = `docs/public/images/weekly/${match[1]}`
      if (fs.existsSync(path.join(repoRoot, rel))) extra.push(rel)
    }
  }
  return extra
}
