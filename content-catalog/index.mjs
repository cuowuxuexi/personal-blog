/**
 * 共享 ContentKind 公共入口。站点、面板与验证器只从这里导入。
 */

export {
  CONTENT_KIND_IDS,
  CATEGORIES,
  POST_TYPES,
  LIFECYCLES,
  INDEXING_MODES,
  CREATE_FILE_NAME_MODES,
  REQUIRED_KIND_FIELDS,
  REQUIRED_SCAN_FIELDS,
  REQUIRED_ASSET_FIELDS,
  REQUIRED_CREATION_FIELDS,
  REQUIRED_VALIDATION_FIELDS,
  assertContentKind,
} from './schema.mjs'

export {
  listContentKinds,
  getContentKind,
  hasContentKind,
} from './kinds.mjs'

export {
  isRecentVisible,
  recentVisibleKindIds,
  kindIdForPost,
  isRecentVisiblePost,
  freshnessDate,
  postsByCategory,
  selectRecentPosts,
  filterRecentVisible,
} from './query.mjs'

export {
  posixRel,
  isValidIsoDate,
  normalizePosixPath,
  isSafePathFragment,
  matchesKindPath,
  kindIdForPath,
  isManagedContentPath,
  matchesKindAssetPath,
  kindContentPrefix,
  kindAssetPrefix,
  isUnderKindContentDir,
  isKindAssetFile,
  yearGroupTitle,
  contentFileName,
  contentSiteLink,
  assetRulesFor,
} from './paths.mjs'

export { parseFrontmatter } from './frontmatter.mjs'

export {
  isDatedJourneyName,
  managedKindIds,
  managedIdentityFromMarkdown,
  postFromManagedMarkdown,
  sortManagedPosts,
  managedPostsFromSources,
  managedPostsFromGlob,
  projectYearSidebarGroups,
  projectJourneySidebar,
  projectLifeSidebarManagedParts,
  projectInvestSidebarManagedParts,
  normalizePostIdentity,
  listProjectedManagedKinds,
} from './project.mjs'
