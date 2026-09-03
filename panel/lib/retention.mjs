import fs from 'node:fs'
import path from 'node:path'

const DAY_MS = 24 * 60 * 60 * 1000
const BACKUP_NAME = /^(.*)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.md$/
const SAFE_SNAPSHOT_NAME = /^j_[A-Za-z0-9_-]+$/
const TERMINAL_STATES = new Set(['Published', 'Failed', 'Cancelled', 'Superseded'])

export const DEFAULT_RETENTION = Object.freeze({
  markdownVersionsPerDocument: 10,
  markdownMaxAgeDays: 30,
  previewReadyMaxAgeDays: 7,
  previewReadyMaxCount: 10,
  publishedJobMaxAgeDays: 2,
  failedJobMaxAgeDays: 1,
  discardedJobMaxAgeDays: 1,
  actionableFailureMaxAgeDays: 7,
  preparingMaxAgeDays: 1,
  orphanSnapshotMaxAgeDays: 1,
})

function readJsonObject(file) {
  if (!fs.existsSync(file)) return {}
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

function writeJsonObject(file, value) {
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(tmp, file)
}

function ageMs(value, nowMs) {
  const timestamp = Date.parse(value || '')
  return Number.isFinite(timestamp) ? Math.max(0, nowMs - timestamp) : null
}

function backupTimestamp(stamp) {
  const match = stamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/)
  if (!match) return null
  const timestamp = Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`)
  return Number.isFinite(timestamp) ? timestamp : null
}

function removeMarkdownBackups(dataDir, nowMs, policy) {
  const groups = new Map()
  for (const entry of fs.readdirSync(dataDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const match = entry.name.match(BACKUP_NAME)
    if (!match) continue
    const timestamp = backupTimestamp(match[2])
    if (timestamp == null) continue
    const versions = groups.get(match[1]) || []
    versions.push({ name: entry.name, timestamp })
    groups.set(match[1], versions)
  }

  let removed = 0
  for (const versions of groups.values()) {
    versions.sort((a, b) => b.timestamp - a.timestamp)
    versions.forEach((version, index) => {
      const tooMany = index >= policy.markdownVersionsPerDocument
      const tooOld = index > 0
        && nowMs - version.timestamp > policy.markdownMaxAgeDays * DAY_MS
      if (!tooMany && !tooOld) return
      fs.rmSync(path.join(dataDir, version.name), { force: true })
      removed += 1
    })
  }
  return removed
}

function actionableFailure(job) {
  return Boolean(job.commitSha || job.pushed)
    || (job.retryActions || []).some((action) => ['retry-push', 'retry-verify'].includes(action))
}

function shouldRemoveJob(id, job, currentHead, previewRanks, nowMs, policy) {
  const age = ageMs(job.updatedAt || job.createdAt, nowMs)
  if (age == null) return false

  if (job.state === 'PreviewReady') {
    if (currentHead && job.baseSha && job.baseSha !== currentHead) return true
    if (age > policy.previewReadyMaxAgeDays * DAY_MS) return true
    return (previewRanks.get(id) ?? 0) >= policy.previewReadyMaxCount
  }
  if (job.state === 'Preparing') {
    return age > policy.preparingMaxAgeDays * DAY_MS
  }
  if (!TERMINAL_STATES.has(job.state)) return false
  if (job.state === 'Published') {
    return age > policy.publishedJobMaxAgeDays * DAY_MS
  }
  if (job.state === 'Failed' && actionableFailure(job)) {
    return age > policy.actionableFailureMaxAgeDays * DAY_MS
  }
  if (job.state === 'Failed') {
    return age > policy.failedJobMaxAgeDays * DAY_MS
  }
  return age > policy.discardedJobMaxAgeDays * DAY_MS
}

function removeSnapshot(snapshotRoot, id) {
  if (!SAFE_SNAPSHOT_NAME.test(id)) return false
  const dir = path.join(snapshotRoot, id)
  if (!fs.existsSync(dir)) return false
  fs.rmSync(dir, { recursive: true, force: true })
  return true
}

export function cleanupPanelStorage({
  dataDir,
  currentHead = '',
  now = new Date(),
  policy: overrides = {},
} = {}) {
  if (!dataDir) throw new Error('清理发布面板存储需要 dataDir')
  if (!fs.existsSync(dataDir)) {
    return {
      removedMarkdownBackups: 0,
      removedJobs: 0,
      removedSnapshots: 0,
      skippedSnapshots: false,
    }
  }

  const policy = { ...DEFAULT_RETENTION, ...overrides }
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  if (!Number.isFinite(nowMs)) throw new Error('清理发布面板存储需要有效时间')

  const result = {
    removedMarkdownBackups: removeMarkdownBackups(dataDir, nowMs, policy),
    removedJobs: 0,
    removedSnapshots: 0,
    skippedSnapshots: false,
  }
  const jobsFile = path.join(dataDir, 'publish-jobs.json')
  const jobs = readJsonObject(jobsFile)
  if (jobs == null) {
    result.skippedSnapshots = true
    return result
  }

  const snapshotRoot = path.join(dataDir, 'snapshots')
  const previewRanks = new Map(
    Object.entries(jobs)
      .filter(([, job]) => {
        if (job?.state !== 'PreviewReady') return false
        if (currentHead && job.baseSha && job.baseSha !== currentHead) return false
        const age = ageMs(job.updatedAt || job.createdAt, nowMs)
        return age != null && age <= policy.previewReadyMaxAgeDays * DAY_MS
      })
      .sort(([, left], [, right]) => Date.parse(right.updatedAt || right.createdAt || '')
        - Date.parse(left.updatedAt || left.createdAt || ''))
      .map(([id], index) => [id, index]),
  )
  const keptJobs = {}
  for (const [id, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object'
      || !shouldRemoveJob(id, job, currentHead, previewRanks, nowMs, policy)) {
      keptJobs[id] = job
      continue
    }
    result.removedJobs += 1
    if (removeSnapshot(snapshotRoot, id)) result.removedSnapshots += 1
  }

  if (fs.existsSync(snapshotRoot)) {
    for (const entry of fs.readdirSync(snapshotRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !SAFE_SNAPSHOT_NAME.test(entry.name) || Object.hasOwn(jobs, entry.name)) continue
      const stat = fs.statSync(path.join(snapshotRoot, entry.name))
      if (nowMs - stat.mtimeMs <= policy.orphanSnapshotMaxAgeDays * DAY_MS) continue
      if (removeSnapshot(snapshotRoot, entry.name)) result.removedSnapshots += 1
    }
  }

  if (result.removedJobs > 0) writeJsonObject(jobsFile, keptJobs)
  return result
}
