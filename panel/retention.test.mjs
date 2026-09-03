import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { cleanupPanelStorage } from './lib/retention.mjs'

const NOW = new Date('2026-08-25T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

function isoDaysAgo(days) {
  return new Date(NOW.getTime() - days * DAY).toISOString()
}

function writeSnapshot(root, id, daysAgo = 0) {
  const dir = path.join(root, 'snapshots', id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'marker.txt'), id)
  const timestamp = new Date(NOW.getTime() - daysAgo * DAY)
  fs.utimesSync(dir, timestamp, timestamp)
  return dir
}

function writeJobs(root, jobs) {
  fs.writeFileSync(
    path.join(root, 'publish-jobs.json'),
    `${JSON.stringify(Object.fromEntries(jobs.map((job) => [job.id, job])), null, 2)}\n`,
  )
}

function readJobs(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'publish-jobs.json'), 'utf8'))
}

function makeJob(id, state, { daysAgo = 0, baseSha = 'head-current' } = {}) {
  return {
    id,
    state,
    baseSha,
    createdAt: isoDaysAgo(daysAgo),
    updatedAt: isoDaysAgo(daysAgo),
    snapshotDir: '',
  }
}

test('cleanupPanelStorage keeps actionable jobs and removes stale publication snapshots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-retention-jobs-'))
  try {
    const jobs = [
      makeJob('j_ready_current', 'PreviewReady', { daysAgo: 1 }),
      makeJob('j_ready_stale_head', 'PreviewReady', { daysAgo: 0, baseSha: 'head-old' }),
      makeJob('j_ready_expired', 'PreviewReady', { daysAgo: 8 }),
      makeJob('j_published_recent', 'Published', { daysAgo: 1 }),
      makeJob('j_published_old', 'Published', { daysAgo: 3 }),
      makeJob('j_failed_recent', 'Failed', { daysAgo: 1 }),
      makeJob('j_failed_old', 'Failed', { daysAgo: 3 }),
      { ...makeJob('j_retry_recent', 'Failed', { daysAgo: 5 }), commitSha: 'commit-retry' },
      { ...makeJob('j_retry_expired', 'Failed', { daysAgo: 8 }), commitSha: 'commit-expired' },
      makeJob('j_committing', 'Committing', { daysAgo: 30, baseSha: 'head-old' }),
    ]
    writeJobs(root, jobs)
    for (const job of jobs) writeSnapshot(root, job.id, 10)
    writeSnapshot(root, 'j_orphan_old', 2)

    const result = cleanupPanelStorage({
      dataDir: root,
      currentHead: 'head-current',
      now: NOW,
    })

    assert.deepEqual(Object.keys(readJobs(root)).sort(), [
      'j_committing',
      'j_failed_recent',
      'j_published_recent',
      'j_ready_current',
      'j_retry_recent',
    ])
    assert.deepEqual(
      fs.readdirSync(path.join(root, 'snapshots')).sort(),
      ['j_committing', 'j_failed_recent', 'j_published_recent', 'j_ready_current', 'j_retry_recent'],
    )
    assert.equal(result.removedJobs, 5)
    assert.equal(result.removedSnapshots, 6)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('cleanupPanelStorage caps current-head previews at ten snapshots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-retention-preview-cap-'))
  try {
    const jobs = Array.from({ length: 12 }, (_, index) => makeJob(
      `j_ready_${String(index).padStart(2, '0')}`,
      'PreviewReady',
      { daysAgo: index / 24 },
    ))
    writeJobs(root, jobs)
    for (const job of jobs) writeSnapshot(root, job.id)

    const result = cleanupPanelStorage({ dataDir: root, currentHead: 'head-current', now: NOW })

    assert.equal(Object.keys(readJobs(root)).length, 10)
    assert.equal(fs.readdirSync(path.join(root, 'snapshots')).length, 10)
    assert.equal(result.removedJobs, 2)
    assert.equal(result.removedSnapshots, 2)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('cleanupPanelStorage skips snapshots when the job store is invalid', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-retention-invalid-'))
  try {
    fs.writeFileSync(path.join(root, 'publish-jobs.json'), '{invalid')
    writeSnapshot(root, 'j_orphan_old', 10)

    const result = cleanupPanelStorage({ dataDir: root, currentHead: 'head-current', now: NOW })

    assert.equal(result.skippedSnapshots, true)
    assert.equal(fs.existsSync(path.join(root, 'snapshots', 'j_orphan_old')), true)
    assert.equal(fs.readFileSync(path.join(root, 'publish-jobs.json'), 'utf8'), '{invalid')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('cleanupPanelStorage keeps ten recent versions per document and one old fallback', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-retention-markdown-'))
  try {
    fs.writeFileSync(path.join(root, 'publish-jobs.json'), '{}\n')
    for (let day = 1; day <= 12; day += 1) {
      const stamp = new Date(NOW.getTime() - day * DAY).toISOString().replace(/[:.]/g, '-')
      fs.writeFileSync(path.join(root, `周记-${stamp}.md`), `version ${day}`)
    }
    for (const day of [40, 45]) {
      const stamp = new Date(NOW.getTime() - day * DAY).toISOString().replace(/[:.]/g, '-')
      fs.writeFileSync(path.join(root, `旧篇-${stamp}.md`), `old ${day}`)
    }
    fs.writeFileSync(path.join(root, 'drafts.json'), '{"keep":true}\n')

    const result = cleanupPanelStorage({
      dataDir: root,
      currentHead: 'head-current',
      now: NOW,
    })

    const markdown = fs.readdirSync(root).filter((name) => name.endsWith('.md'))
    assert.equal(markdown.filter((name) => name.startsWith('周记-')).length, 10)
    assert.equal(markdown.filter((name) => name.startsWith('旧篇-')).length, 1)
    assert.equal(fs.existsSync(path.join(root, 'drafts.json')), true)
    assert.equal(result.removedMarkdownBackups, 3)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
