import path from 'node:path'
import { PANEL_DIR, REPO_ROOT, createRepoPaths } from './paths.mjs'
import { createJsonStore } from './json-store.mjs'
import { createDefaultProbes } from './probes.mjs'
import { DEFAULT_PRODUCTION_ORIGIN } from './guonei.mjs'

export function createPanelContext(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT
  const paths = options.paths || createRepoPaths(repoRoot)
  const dataDir = options.dataDir || path.join(PANEL_DIR, '.local-backups')
  const productionOrigin = options.productionOrigin
    || process.env.PANEL_PRODUCTION_ORIGIN
    || DEFAULT_PRODUCTION_ORIGIN
  return {
    repoRoot,
    paths,
    dataDir,
    drafts: options.drafts || createJsonStore(path.join(dataDir, 'drafts.json')),
    jobs: options.jobs || createJsonStore(path.join(dataDir, 'publish-jobs.json')),
    probes: { ...createDefaultProbes({ repoRoot, productionOrigin }), ...options.probes },
    productionOrigin,
    publicationBranch: options.publicationBranch || 'main',
    verifyTimeoutMs: options.verifyTimeoutMs ?? 180000,
    pollIntervalMs: options.pollIntervalMs ?? 3000,
    maxJsonBytes: options.maxJsonBytes ?? 2 * 1024 * 1024,
    maxUploadBytes: options.maxUploadBytes ?? 25 * 1024 * 1024,
    bodyTimeoutMs: options.bodyTimeoutMs ?? 60000,
    lock: { committingJobId: null },
  }
}
