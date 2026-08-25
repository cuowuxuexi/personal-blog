import assert from 'node:assert/strict'
import test from 'node:test'
import { checkProduction } from './lib/production-check.mjs'

test('checkProduction forwards job.baseSha as expectedBaselineSha', async () => {
  const captured = []
  const job = {
    id: 'job-u03-wire',
    state: 'Pushed',
    commitSha: 'commitsha1',
    baseSha: 'basesha1',
    pushed: true,
    deployed: false,
    verifying: false,
    manifest: [],
    excluded: [],
    articleUrl: '/AI与生活/2026-08-17',
    headingAnchor: '',
    snapshotDir: '/tmp/snap',
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
  }
  const ctx = {
    repoRoot: '/tmp/repo',
    productionOrigin: 'https://cuowo.cn',
    verifyTimeoutMs: 50,
    pollIntervalMs: 5,
    jobs: new Map([[job.id, job]]),
    probes: {
      async deploy(args) {
        captured.push(args)
      },
      async deployStatus() {
        return { state: 'success' }
      },
      async productionVersion() {
        return { sha: 'commitsha1', builtAt: '2026-08-25T00:00:00.000Z' }
      },
    },
  }

  const result = await checkProduction(ctx, job)

  assert.equal(captured.length, 1)
  assert.equal(captured[0].sha, 'commitsha1')
  assert.equal(captured[0].expectedBaselineSha, 'basesha1')
  assert.equal(captured[0].snapshotDir, '/tmp/snap')
  assert.equal(result.state, 'Published')
  assert.equal(result.deployed, true)
})
