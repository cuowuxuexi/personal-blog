/**
 * ContentKind 字段合同。调用方只通过 index 的查询函数消费；不要依赖本文件路径。
 */

export const CONTENT_KIND_IDS = Object.freeze([
  'weekly-life',
  'weekly-investment',
  'journey',
  'hermes',
  'research',
  'philosophy',
  'big-question',
])

export const CATEGORIES = Object.freeze(['投资', 'AI与生活', '投资哲学', '大问题'])

export const POST_TYPES = Object.freeze([
  'weekly',
  'journey',
  'hermes',
  'research',
  'philosophy',
  'big-question',
])

export const LIFECYCLES = Object.freeze(['active', 'retired'])

export const INDEXING_MODES = Object.freeze([
  'manual-posts',
  'projected-posts',
  'file-is-index',
  'not-in-posts',
])

export const SCAN_MODES = Object.freeze(['direct-children', 'tree'])

export const CREATE_FILE_NAME_MODES = Object.freeze([
  'date',
  'date-theme',
  'date-optional-slug',
  'index-in-tree',
])

export const REQUIRED_KIND_FIELDS = Object.freeze([
  'id',
  'label',
  'category',
  'postType',
  'pageClass',
  'lifecycle',
  'recentVisible',
  'contentDir',
  'sidebarKey',
  'createFileName',
  'scan',
  'assets',
  'creation',
  'indexing',
  'validation',
])

export const REQUIRED_SCAN_FIELDS = Object.freeze([
  'mode',
  'includePattern',
  'excludeBasenames',
])

export const REQUIRED_ASSET_FIELDS = Object.freeze(['directory', 'urlPrefix'])

export const REQUIRED_CREATION_FIELDS = Object.freeze([
  'allowCreate',
  'surfaces',
  'namedChapters',
  'publicationProtocol',
])

export const REQUIRED_VALIDATION_FIELDS = Object.freeze([
  'pairWithManualPosts',
  'pairWithYearSidebar',
  'pairNamedChapters',
  'uniqueIssue',
  'issueOptionalForOpening',
  'uniqueLink',
  'requireReferencedImages',
  'forbidManualPosts',
  'fileIsIndex',
])

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function assertContentKind(kind) {
  assert(kind && typeof kind === 'object', 'ContentKind 必须是对象')
  for (const field of REQUIRED_KIND_FIELDS) {
    assert(kind[field] !== undefined && kind[field] !== null, `ContentKind 缺少字段：${field}`)
  }
  assert(CONTENT_KIND_IDS.includes(kind.id), `未知 ContentKind id：${kind.id}`)
  assert(isNonEmptyString(kind.label), `${kind.id}.label 必须是非空字符串`)
  assert(CATEGORIES.includes(kind.category), `${kind.id}.category 非法`)
  assert(POST_TYPES.includes(kind.postType), `${kind.id}.postType 非法`)
  assert(isNonEmptyString(kind.pageClass) || isStringArray(kind.pageClass), `${kind.id}.pageClass 非法`)
  assert(LIFECYCLES.includes(kind.lifecycle), `${kind.id}.lifecycle 非法`)
  assert(typeof kind.recentVisible === 'boolean', `${kind.id}.recentVisible 必须是布尔值`)
  assert(isNonEmptyString(kind.contentDir), `${kind.id}.contentDir 必须是非空字符串`)
  assert(!kind.contentDir.includes('\\'), `${kind.id}.contentDir 必须使用 posix 分隔符`)
  assert(isNonEmptyString(kind.sidebarKey), `${kind.id}.sidebarKey 必须是非空字符串`)
  assert(CREATE_FILE_NAME_MODES.includes(kind.createFileName), `${kind.id}.createFileName 非法`)
  if (kind.yearGroupTemplate != null) {
    assert(isNonEmptyString(kind.yearGroupTemplate), `${kind.id}.yearGroupTemplate 非法`)
  }
  if (kind.namedChapterOrder != null) {
    assert(isStringArray(kind.namedChapterOrder), `${kind.id}.namedChapterOrder 必须是字符串数组`)
  }
  if (kind.namedChapterGroupText != null) {
    assert(isNonEmptyString(kind.namedChapterGroupText), `${kind.id}.namedChapterGroupText 非法`)
  }
  if (kind.namedChapterNesting != null) {
    assert(kind.namedChapterNesting && typeof kind.namedChapterNesting === 'object', `${kind.id}.namedChapterNesting 必须是对象`)
    for (const [parent, children] of Object.entries(kind.namedChapterNesting)) {
      assert(isNonEmptyString(parent), `${kind.id}.namedChapterNesting 键必须是非空字符串`)
      assert(isStringArray(children), `${kind.id}.namedChapterNesting[${parent}] 必须是字符串数组`)
    }
  }
  if (kind.seriesEntry != null) {
    assert(kind.seriesEntry && typeof kind.seriesEntry === 'object', `${kind.id}.seriesEntry 必须是对象`)
    assert(isNonEmptyString(kind.seriesEntry.text), `${kind.id}.seriesEntry.text 非法`)
    assert(isNonEmptyString(kind.seriesEntry.link), `${kind.id}.seriesEntry.link 非法`)
  }
  if (kind.lifeSidebarEnumeratesNamedChapters != null) {
    assert(
      typeof kind.lifeSidebarEnumeratesNamedChapters === 'boolean',
      `${kind.id}.lifeSidebarEnumeratesNamedChapters 必须是布尔值`,
    )
  }
  if (kind.hubSidebarText != null) {
    assert(isNonEmptyString(kind.hubSidebarText), `${kind.id}.hubSidebarText 非法`)
  }
  if (kind.industryIndexText != null) {
    assert(isNonEmptyString(kind.industryIndexText), `${kind.id}.industryIndexText 非法`)
  }
  if (kind.mapsGroupText != null) {
    assert(isNonEmptyString(kind.mapsGroupText), `${kind.id}.mapsGroupText 非法`)
  }
  if (kind.mapsIndexText != null) {
    assert(isNonEmptyString(kind.mapsIndexText), `${kind.id}.mapsIndexText 非法`)
  }
  if (kind.subjectsGroupText != null) {
    assert(isNonEmptyString(kind.subjectsGroupText), `${kind.id}.subjectsGroupText 非法`)
  }
  if (kind.defaultIndustryCollapsed != null) {
    assert(
      typeof kind.defaultIndustryCollapsed === 'boolean',
      `${kind.id}.defaultIndustryCollapsed 必须是布尔值`,
    )
  }
  assert(INDEXING_MODES.includes(kind.indexing), `${kind.id}.indexing 非法`)

  const scan = kind.scan
  for (const field of REQUIRED_SCAN_FIELDS) {
    assert(scan[field] !== undefined && scan[field] !== null, `${kind.id}.scan 缺少字段：${field}`)
  }
  assert(SCAN_MODES.includes(scan.mode), `${kind.id}.scan.mode 非法`)
  assert(isNonEmptyString(scan.includePattern), `${kind.id}.scan.includePattern 必须是非空字符串`)
  assert(isStringArray(scan.excludeBasenames), `${kind.id}.scan.excludeBasenames 必须是字符串数组`)

  const assets = kind.assets
  for (const field of REQUIRED_ASSET_FIELDS) {
    assert(field in assets, `${kind.id}.assets 缺少字段：${field}`)
  }
  if (assets.directory != null) {
    assert(isNonEmptyString(assets.directory), `${kind.id}.assets.directory 非法`)
    assert(!assets.directory.includes('\\'), `${kind.id}.assets.directory 必须使用 posix 分隔符`)
    assert(isNonEmptyString(assets.urlPrefix), `${kind.id}.assets.urlPrefix 非法`)
  } else {
    assert(assets.urlPrefix == null, `${kind.id}.assets.urlPrefix 在无目录时必须为 null`)
  }

  const creation = kind.creation
  for (const field of REQUIRED_CREATION_FIELDS) {
    assert(creation[field] !== undefined, `${kind.id}.creation 缺少字段：${field}`)
  }
  assert(typeof creation.allowCreate === 'boolean', `${kind.id}.creation.allowCreate 必须是布尔值`)
  assert(isStringArray(creation.surfaces), `${kind.id}.creation.surfaces 必须是字符串数组`)
  assert(
    creation.namedChapters === 'none' || creation.namedChapters === 'blog-editor-only',
    `${kind.id}.creation.namedChapters 非法`,
  )
  assert(
    creation.publicationProtocol === null || isNonEmptyString(creation.publicationProtocol),
    `${kind.id}.creation.publicationProtocol 非法`,
  )

  const validation = kind.validation
  for (const field of REQUIRED_VALIDATION_FIELDS) {
    assert(typeof validation[field] === 'boolean', `${kind.id}.validation.${field} 必须是布尔值`)
  }
  if (validation.issueOptionalForOpening) {
    assert(isNonEmptyString(kind.openingWithoutIssueLink), `${kind.id} 允许缺 issue 时必须声明 openingWithoutIssueLink`)
  } else {
    assert(kind.openingWithoutIssueLink == null, `${kind.id} 未允许缺 issue 时不得声明 openingWithoutIssueLink`)
  }

  if (kind.id === 'research' || kind.id === 'philosophy' || kind.id === 'big-question') {
    assert(kind.recentVisible === false, `${kind.id} 最近更新可见性必须为 false`)
  }
}

export function assertUniqueKindIds(kinds) {
  const ids = kinds.map((kind) => kind.id)
  assert(ids.length === CONTENT_KIND_IDS.length, 'ContentKind 数量必须与声明的种类一致')
  assert(
    CONTENT_KIND_IDS.every((id, index) => ids[index] === id),
    'ContentKind 必须按声明顺序各出现一次',
  )
  assert(new Set(ids).size === ids.length, 'ContentKind id 必须唯一')
}
