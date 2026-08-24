import { escapeHtml } from './escape.mjs'
import { jobKindId, selectRestorableJob } from './job-restore.mjs'

const VERIFYING_STATES = ['Pushed', 'Deploying', 'VerifyingProduction']

const WECHAT_STATUS_COPY = {
  NotGenerated: '公众号预览尚未生成。',
  CheckingAssets: '正在检查公众号图片是否已经上线…',
  WaitingForOnlineAssets: (missing) => `公众号预览已生成；${missing.length ? `还有 ${missing.length} 张图片未上线，` : ''}暂不能复制。`,
  AssetsOnline: '公众号预览已生成，所有图片已在线，可以复制。',
  ProductionVerified: '国内站已校验，公众号全文可以复制。',
}

export function shouldAutoContinueVerify(job) {
  return VERIFYING_STATES.includes(job?.state)
}

/** 问进度：只读状态，不推进核对。 */
export function publicationJobQuery(jobId) {
  return { method: 'GET', path: `/api/publish/jobs/${jobId}` }
}

/** 继续核对：核对未结束才由面板自动发。 */
export function publicationContinueVerify(jobId) {
  return { method: 'POST', path: `/api/publish/jobs/${jobId}/continue-verify`, body: '{}' }
}

export function pollTickRequest(job) {
  if (!job?.jobId || !shouldAutoContinueVerify(job)) return null
  return publicationContinueVerify(job.jobId)
}

export function publicationPreviewLabel(job) {
  return job.state === 'PreviewReady'
    ? '下面清单对应发布前预览，不是工作区预览。'
    : (job.failureReason || '')
}

export function wechatStatusCopy(wechat = {}) {
  const missing = wechat.missingAssets || []
  const copy = WECHAT_STATUS_COPY[wechat.status]
  if (typeof copy === 'function') return copy(missing)
  return copy || ''
}

export function jobBelongsToIssue(job, { kindId, issueLink }) {
  if (!job || jobKindId(job) !== kindId) return false
  return job.articleUrl === issueLink
    || (!job.articleUrl && String(job.releasePreviewUrl || '').includes(issueLink))
}

export function createPublication({
  state,
  api,
  setNotice,
  currentKind,
  selectedIssue,
  issueChrome,
}) {
  function currentIssueLink() {
    return selectedIssue()?.link || state.issueLink
  }

  function visibleJob() {
    const job = state.job
    return jobBelongsToIssue(job, { kindId: state.kind, issueLink: currentIssueLink() })
      ? job
      : null
  }

  function setPrepareRetryVisible(visible) {
    document.getElementById('btn-prepare').classList.toggle('hidden', !visible)
  }

  function stopPoll() {
    if (state.pollTimer) clearInterval(state.pollTimer)
    state.pollTimer = 0
  }

  async function queryJob(jobId) {
    const request = publicationJobQuery(jobId)
    return api(request.path)
  }

  async function continueVerify(jobId) {
    const request = publicationContinueVerify(jobId)
    return api(request.path, { method: request.method, body: request.body })
  }

  function startVerifyPoll() {
    stopPoll()
    state.pollTimer = setInterval(async () => {
      const request = pollTickRequest(state.job)
      if (!request) return
      try {
        const job = await api(request.path, { method: request.method, body: request.body })
        applyJob(job)
        if (job.state === 'Published') setNotice(`发布完成。${job.verifiedUrl || ''}`, 'ok')
        if (job.state === 'Failed' || job.state === 'Superseded') setNotice(job.failureReason || job.state, 'err')
      } catch (error) {
        setNotice(error.message, 'err')
      }
    }, 2000)
  }

  function renderJob() {
    const job = visibleJob()
    const box = document.getElementById('publish-job')
    const publishBtn = document.getElementById('btn-publish')
    if (!job) {
      box.classList.add('hidden')
      publishBtn.disabled = true
      return
    }
    box.classList.remove('hidden')
    document.getElementById('job-state').textContent = `状态 ${job.state}${job.commitSha ? ` · ${job.commitSha.slice(0, 8)}` : ''}`
    document.getElementById('job-preview-label').textContent = publicationPreviewLabel(job)
    document.getElementById('job-manifest').innerHTML = (job.manifest || []).map((item) => (
      `<li>${escapeHtml(item.action)} ${escapeHtml(item.path)}</li>`
    )).join('')
    const excluded = (job.excluded || []).map((item) => item.path).join('、')
    document.getElementById('job-excluded').textContent = excluded
      ? `未纳入本次发布：${excluded}`
      : '工作树里没有额外未纳入的改动。'
    const preview = document.getElementById('btn-release-preview')
    preview.classList.toggle('hidden', !job.releasePreviewUrl)
    preview.href = issueChrome.releasePreviewHref(job.releasePreviewUrl || '', job) || '#'
    const wechat = job.wechatPreview || {}
    const wechatPreview = document.getElementById('btn-wechat-preview')
    wechatPreview.classList.toggle('hidden', !wechat.url)
    wechatPreview.href = wechat.url || '#'
    const wechatStatus = document.getElementById('wechat-status')
    wechatStatus.textContent = wechatStatusCopy(wechat)
    wechatStatus.className = `wechat-status ${wechat.copyAllowed ? 'is-ready' : (wechat.url ? 'is-waiting' : '')}`
    const checkWechat = document.getElementById('btn-check-wechat-assets')
    checkWechat.classList.toggle('hidden', !wechat.url || wechat.status === 'CheckingAssets')
    const online = document.getElementById('btn-verified-online')
    online.classList.toggle('hidden', job.state !== 'Published' || !job.verifiedUrl)
    online.href = job.verifiedUrl || '#'
    document.getElementById('btn-retry-verify').classList.toggle('hidden', !(job.retryActions || []).includes('retry-verify'))
    document.getElementById('btn-retry-push').classList.toggle('hidden', !(job.retryActions || []).includes('retry-push'))
    publishBtn.disabled = job.state !== 'PreviewReady' && !(job.retryActions || []).includes('retry-push')
    document.getElementById('job-summary').textContent = job.summary
      ? [
        `文件：${(job.summary.files || []).join('、')}`,
        `SHA：${job.summary.commitSha || ''}`,
        `部署时间：${job.summary.deployedAt || ''}`,
        `已校验 URL：${job.summary.verifiedUrl || ''}`,
      ].join('\n')
      : ''
  }

  function applyJob(job) {
    state.job = job
    renderJob()
    if (shouldAutoContinueVerify(job)) startVerifyPoll()
    else stopPoll()
  }

  function clearJob() {
    state.job = null
    stopPoll()
  }

  function restoreForKind(kindId) {
    const active = selectRestorableJob(state.bootstrap.activeJobs, {
      kindId,
      issueLink: currentIssueLink(),
    })
    if (active) {
      state.draftId = active.draftId
      applyJob(active)
      setPrepareRetryVisible((active.retryActions || []).includes('prepare'))
      setNotice(
        active.failureReason || `已恢复发布任务 ${active.jobId}（${active.state}）。`,
        active.state === 'Failed' ? 'err' : 'ok',
      )
      return
    }
    state.draftId = ''
    clearJob()
    setPrepareRetryVisible(false)
    renderJob()
  }

  async function prepare() {
    if (!state.draftId) {
      setNotice('请先保存到文章，再准备发布。', 'err')
      return false
    }
    try {
      setNotice('正在准备隔离快照与发布前预览…')
      const job = await api('/api/publish/prepare', {
        method: 'POST',
        body: JSON.stringify({ draftId: state.draftId, headingAnchor: issueChrome.headingAnchor() }),
      })
      applyJob(job)
      setPrepareRetryVisible(false)
      setNotice('发布前预览已就绪。请核对清单后再确认发布。准备不是发布。', 'ok')
      return true
    } catch (error) {
      setNotice(error.message, 'err')
      if (state.draftId) setPrepareRetryVisible(true)
      return false
    }
  }

  async function confirm() {
    if (!state.job?.confirmationToken) {
      setNotice('请先准备发布并查看发布前预览。', 'err')
      return
    }
    if (!confirm('确认发布这一份快照？会推送到 Git，并把生产构建上传到 cuowo.cn。只有国内站对上该提交后才算发布完成。')) return
    try {
      setNotice('正在提交、推送并上传国内站…')
      const job = await api('/api/publish/confirm', {
        method: 'POST',
        body: JSON.stringify({
          jobId: state.job.jobId,
          confirmationToken: state.job.confirmationToken,
        }),
      })
      applyJob(job)
      if (job.state === 'Published') setNotice(`发布完成。${job.verifiedUrl || ''}`, 'ok')
      else if (job.commitSha) setNotice(`已推送 ${job.commitSha}，正在上传并校验国内站…`, 'ok')
      else setNotice(job.failureReason || job.state, 'err')
    } catch (error) {
      setNotice(error.message, 'err')
    }
  }

  async function retryPush() {
    if (!state.job?.jobId) return
    try {
      setNotice('正在重试推送…')
      const job = await api(`/api/publish/jobs/${state.job.jobId}/retry-push`, { method: 'POST', body: '{}' })
      applyJob(job)
      if (job.state === 'Published') setNotice(`发布完成。${job.verifiedUrl || ''}`, 'ok')
      else if (job.commitSha && (job.retryActions || []).includes('retry-verify')) setNotice(job.failureReason || '已推送，生产校验未完成。', 'err')
      else setNotice(job.failureReason || job.state, job.state === 'Published' ? 'ok' : 'err')
    } catch (error) {
      setNotice(error.message, 'err')
    }
  }

  async function retryVerify() {
    if (!state.job?.jobId) return
    try {
      setNotice('正在重新上传并校验国内站…')
      const job = await api(`/api/publish/jobs/${state.job.jobId}/retry-verify`, { method: 'POST', body: '{}' })
      applyJob(job)
      setNotice(job.state === 'Published' ? `发布完成。${job.verifiedUrl || ''}` : (job.failureReason || job.state), job.state === 'Published' ? 'ok' : 'err')
    } catch (error) {
      setNotice(error.message, 'err')
    }
  }

  async function checkWechatAssets() {
    if (!state.job?.jobId) return
    try {
      setNotice('正在重新检查公众号图片…')
      const job = await api(`/api/publish/jobs/${state.job.jobId}/check-wechat-assets`, { method: 'POST', body: '{}' })
      applyJob(job)
      const ready = job.wechatPreview?.copyAllowed
      setNotice(ready ? '公众号图片均已上线，可以复制全文。' : '仍有公众号图片尚未上线。', ready ? 'ok' : 'err')
    } catch (error) {
      setNotice(error.message, 'err')
    }
  }

  function bind() {
    document.getElementById('btn-prepare').addEventListener('click', () => { void prepare() })
    document.getElementById('btn-publish').addEventListener('click', () => { void confirm() })
    document.getElementById('btn-retry-verify').addEventListener('click', () => { void retryVerify() })
    document.getElementById('btn-retry-push').addEventListener('click', () => { void retryPush() })
    document.getElementById('btn-check-wechat-assets').addEventListener('click', () => { void checkWechatAssets() })
  }

  return {
    bind,
    render: renderJob,
    applyJob,
    clearJob,
    restoreForKind,
    prepare,
    confirm,
    queryJob,
    continueVerify,
    setPrepareRetryVisible,
  }
}
