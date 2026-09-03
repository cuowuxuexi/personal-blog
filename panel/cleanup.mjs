import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPO_ROOT } from './lib/paths.mjs'
import { cleanupPanelStorage } from './lib/retention.mjs'

export function currentHead(repoRoot = REPO_ROOT) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
    }).trim()
  } catch {
    return ''
  }
}

export function cleanupDefaultPanelStorage({ repoRoot = REPO_ROOT, now = new Date() } = {}) {
  return cleanupPanelStorage({
    dataDir: path.join(repoRoot, 'panel', '.local-backups'),
    currentHead: currentHead(repoRoot),
    now,
  })
}

export function formatCleanupSummary(result) {
  if (result.skippedSnapshots) {
    return `本地备份清理：正文备份 ${result.removedMarkdownBackups} 个；任务记录损坏，已跳过发布快照以避免误删。`
  }
  return `本地备份清理：正文备份 ${result.removedMarkdownBackups} 个，任务记录 ${result.removedJobs} 条，发布快照 ${result.removedSnapshots} 个。`
}

const invoked = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invoked) {
  const result = cleanupDefaultPanelStorage()
  console.log(formatCleanupSummary(result))
}
