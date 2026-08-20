const ACTIVE_STATES = new Set([
  'PreviewReady',
  'Pushed',
  'Deploying',
  'VerifyingProduction',
])

const RESTORABLE_RETRIES = new Set(['prepare', 'retry-verify', 'retry-push'])

export function jobKindId(job) {
  const url = job?.articleUrl || job?.releasePreviewUrl || ''
  if (job?.kindId) return job.kindId
  if (url.includes('/投资/')) return 'invest'
  if (url.includes('/AI与生活/我的AI历程/')) return 'journey'
  if (url.includes('/AI与生活')) return 'life'
  return ''
}

function targetsIssue(job, issueLink) {
  if (!issueLink) return false
  if (job?.articleUrl) return job.articleUrl === issueLink
  return String(job?.releasePreviewUrl || '').includes(issueLink)
}

function isRestorable(job) {
  return ACTIVE_STATES.has(job?.state)
    || (job?.retryActions || []).some((action) => RESTORABLE_RETRIES.has(action))
}

export function selectRestorableJob(jobs, { kindId, issueLink }) {
  return [...(jobs || [])]
    .filter((job) => (
      jobKindId(job) === kindId
      && targetsIssue(job, issueLink)
      && isRestorable(job)
    ))
    .sort((left, right) => String(right.updatedAt || right.createdAt || '')
      .localeCompare(String(left.updatedAt || left.createdAt || '')))[0] || null
}
