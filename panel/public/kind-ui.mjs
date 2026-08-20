const WEEKLY_FALLBACK = {
  contentType: 'weekly',
  allowCreate: true,
  selectorLabel: '期数',
  emptyHint: '没有当期周记，请先开新一期。',
  appendHint: '这次会追加到所选期数末尾，已有条目不会动。',
  headingAnchor: 'kan-yanhua',
  wechatTheme: 'life',
}

const JOURNEY_FALLBACK = {
  contentType: 'journey',
  allowCreate: true,
  selectorLabel: '期数与篇章',
  emptyHint: '没有当期历程周记，请先开新一期。',
  appendHint: '这次会追加到所选期数或篇章末尾，已有条目不会动。',
  headingAnchor: '',
  wechatTheme: 'life',
}

function isJourneyKind(kind, live = {}) {
  return live.contentType === 'journey' || kind?.id === 'journey'
}

/** Live bootstrap 缺字段时按现行合同补齐。 */
export function resolveCapability(kind) {
  const live = kind?.capability && typeof kind.capability === 'object' ? kind.capability : {}
  if (isJourneyKind(kind, live)) {
    return {
      contentType: 'journey',
      allowCreate: live.allowCreate !== false,
      selectorLabel: live.selectorLabel || JOURNEY_FALLBACK.selectorLabel,
      emptyHint: live.emptyHint || JOURNEY_FALLBACK.emptyHint,
      appendHint: live.appendHint || JOURNEY_FALLBACK.appendHint,
      headingAnchor: '',
      wechatTheme: live.wechatTheme || JOURNEY_FALLBACK.wechatTheme,
    }
  }
  const weekly = {
    ...WEEKLY_FALLBACK,
    wechatTheme: kind?.id === 'invest' ? 'invest' : WEEKLY_FALLBACK.wechatTheme,
  }
  return {
    contentType: live.contentType || weekly.contentType,
    allowCreate: live.allowCreate !== false,
    selectorLabel: live.selectorLabel || weekly.selectorLabel,
    emptyHint: live.emptyHint || weekly.emptyHint,
    appendHint: live.appendHint || weekly.appendHint,
    headingAnchor: live.headingAnchor == null ? weekly.headingAnchor : String(live.headingAnchor),
    wechatTheme: live.wechatTheme || weekly.wechatTheme,
  }
}

export function allowsCreate(kind) {
  return resolveCapability(kind).allowCreate === true
}

export function chipTone(kind) {
  if (kind?.id === 'invest' || resolveCapability(kind).wechatTheme === 'invest') return 'invest'
  return 'life'
}

export function previewHeadingAnchor(kind) {
  return String(resolveCapability(kind).headingAnchor || '')
}

export function releasePreviewHref(url, kind, job = {}) {
  if (!url || url === '#') return url || ''
  const heading = previewHeadingAnchor(kind)
  if (!heading) return String(url).replace(/#.*$/, '') || url
  if (String(url).includes('#')) return url
  const fromJob = String(job.headingAnchor || heading).replace(/^#/, '')
  return fromJob ? `${url}#${fromJob}` : url
}

export function selectableIssues(kind) {
  const issues = kind?.issues || []
  if (resolveCapability(kind).contentType === 'journey') return issues
  if (allowsCreate(kind)) return issues.filter((item) => item.issue != null)
  return issues
}

export function themeFromIssueTitle(title = '', issue = null) {
  const text = String(title || '')
  const match = text.match(/^第(\d+)期-(.+)$/)
  if (!match) return ''
  if (issue != null && Number(match[1]) !== Number(issue)) return match[2].trim()
  return match[2].trim()
}

export function isNamedJourneyChapter(kind, issue) {
  return resolveCapability(kind).contentType === 'journey' && issue != null && issue.issue == null
}

export function chromeThemeFromIssue(issue) {
  return themeFromIssueTitle(issue?.title, issue?.issue)
}

export function chromeEditorView({ kind, mode, issue } = {}) {
  const resolved = normalizeEditorMode(mode, kind)
  const namedChapter = isNamedJourneyChapter(kind, issue) && resolved !== 'newIssue'
  const isNew = resolved === 'newIssue' && allowsCreate(kind)
  return {
    showThemeField: !namedChapter,
    themeLabel: isNew ? '新期主题' : '当期主题',
    themeHint: isNew
      ? `第${String(kind?.nextIssue ?? '').padStart(3, '0')}期 · 创建前可随时修改`
      : '改的是这一期标题、封面和说明，不是下面的条目',
    captionHint: namedChapter ? '改的是封面和说明，篇章名和下面的条目不动' : '',
  }
}

/** 切到开新一期时的期头表单；其它模式返回 null，由界面回填当前期。 */
export function chromeFormForMode(mode, { today = '', defaultCaption = '烟花朵朵开，想法自然来。' } = {}) {
  if (mode !== 'newIssue') return null
  return {
    theme: '',
    issueDate: today,
    caption: defaultCaption,
    description: '',
    cover: '',
  }
}

export function normalizeEditorMode(mode, kind) {
  if (mode === 'newIssue' && !allowsCreate(kind)) return 'append'
  if (mode === 'editChrome') {
    const type = resolveCapability(kind).contentType
    return type === 'weekly' || type === 'journey' ? 'editChrome' : 'append'
  }
  if (mode === 'edit' || mode === 'newIssue' || mode === 'delete') return mode
  return 'append'
}

export function writeHint({ kind, mode, issue, entryTitle } = {}) {
  const capability = resolveCapability(kind)
  const resolved = normalizeEditorMode(mode, kind)
  if (resolved === 'newIssue') {
    return capability.contentType === 'journey'
      ? '这次会开一篇新的历程周记，不会改已有篇章。'
      : '这次会开一篇新的周记，不会改已有期数。'
  }
  if (resolved === 'editChrome') {
    return isNamedJourneyChapter(kind, issue)
      ? '这次会改封面和说明，篇章名和下面的条目不动。'
      : '这次会改当期主题、封面和说明，下面的条目不动。'
  }
  if (resolved === 'edit') {
    return `这次会改已有条目「${entryTitle || '该条'}」，其它条目不动。`
  }
  if (!issue) return capability.emptyHint
  return capability.appendHint
}

export function issueBarView({
  kind,
  mode,
  issue,
  theme = '',
  issueDate = '',
  today = '',
  entryTitle = '',
} = {}) {
  const capability = resolveCapability(kind)
  const resolved = normalizeEditorMode(mode, kind)
  const canCreate = allowsCreate(kind)
  const options = selectableIssues(kind)
  const date = issueDate || today
  let heading
  let meta
  if (resolved === 'newIssue' && canCreate) {
    heading = `第${String(kind?.nextIssue ?? '').padStart(3, '0')}期${theme ? `-${theme}` : ''}`
    meta = `${date} · 新一期`
  } else {
    heading = issue?.title || (canCreate ? '还没有编号周记' : '还没有篇章')
    if (issue) {
      const parts = []
      if (issue.date) parts.push(issue.date)
      parts.push(`${issue.entryCount ?? 0} 条`)
      meta = parts.join(' · ')
    } else {
      meta = canCreate ? '先开新一期' : capability.emptyHint
    }
  }
  return {
    heading,
    meta,
    hint: writeHint({ kind, mode: resolved, issue, entryTitle }),
    showCreate: canCreate,
    showIssueFields: resolved === 'newIssue' && canCreate,
    showChromeFields: (capability.contentType === 'weekly' || capability.contentType === 'journey') && (
      resolved === 'newIssue' ? canCreate : Boolean(issue)
    ),
    selectorLabel: capability.selectorLabel,
    selectorIssues: options,
    showSelector: options.length > 0,
    entriesHeading: capability.contentType === 'journey' && issue?.issue == null
      ? '篇章条目 · 点开可改'
      : '当期条目 · 点开可改',
    emptyEntries: capability.contentType === 'journey' && issue?.issue == null
      ? '还没有条目，可以追加第一条'
      : '还没有条目',
  }
}

/** /api/images 必须带显式 kindId；目录由后端按 capability 选择，不由客户端指定。 */
export function imageUploadRequestBody({ kindId, date, files }) {
  if (!kindId) throw new Error('上传图片必须携带有效的栏目 kindId')
  return { kindId, date, files }
}
