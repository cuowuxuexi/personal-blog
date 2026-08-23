import fs from 'node:fs'
import path from 'node:path'
import {
  contentSiteLink,
  getContentKind,
  kindIdForPost,
  listContentKinds,
  projectJourneySidebar,
  projectYearSidebarGroups,
  selectRecentPosts,
} from '../index.mjs'
import { projectManagedPostsFromFs } from '../project-fs.mjs'
import { exceptionFor } from './exceptions.mjs'
import {
  collectSidebarParseErrors,
  namedChapterSidebarItems,
  parseSidebar,
  readProjectionSources,
  seriesIndexLinks,
  tryParseShadowManualPosts,
  yearSidebarItems,
} from './projections.mjs'
import {
  referencedAssetRels,
  scanContentTree,
  scanHermesFsStyle,
  scanHermesGlobStyle,
} from './scan.mjs'
import { inspectManagedSidebarWiring } from './sidebar-wiring.mjs'

function fail(list, code, fields) {
  list.push({ code, ...fields })
}

/**
 * 字面量优先；仅在 spread 接线已断言通过时才用投影补侧栏。
 * 禁止「字面量为空 → 同源投影」假绿回退。
 */
function resolvedYearSidebarItems(repoRoot, configSource, kindId, wiring) {
  const fromConfig = yearSidebarItems(configSource, kindId)
  if (fromConfig.length) return fromConfig
  if (wiring.mode === 'spread' && wiring.okByKind[kindId]) {
    const posts = projectManagedPostsFromFs(repoRoot)
    return projectYearSidebarGroups(kindId, posts).flatMap((group) => group.items)
  }
  return []
}

function flattenNamedSidebarItems(items) {
  const out = []
  for (const item of items || []) {
    if (item?.link) out.push({ text: item.text, link: item.link })
    if (item?.items?.length) out.push(...flattenNamedSidebarItems(item.items))
  }
  return out
}

/** 历程具名组：字面量优先；spread 接线通过后才读投影。 */
function resolvedNamedJourneySidebarItems(repoRoot, configSource, wiring) {
  const fromConfig = namedChapterSidebarItems(configSource, '/AI与生活/我的AI历程/')
  if (fromConfig.length) return flattenNamedSidebarItems(fromConfig)
  if (wiring.mode === 'spread' && wiring.okByKind.journey) {
    const posts = projectManagedPostsFromFs(repoRoot)
    const named = projectJourneySidebar(posts).find((group) => group.text === '我的AI历程')
    return flattenNamedSidebarItems(named?.items || [])
  }
  return []
}

function byLink(items) {
  const map = new Map()
  for (const item of items) {
    if (!item?.link) continue
    if (!map.has(item.link)) map.set(item.link, [])
    map.get(item.link).push(item)
  }
  return map
}

function sameIssue(left, right) {
  return (left.issue ?? undefined) === (right.issue ?? undefined)
}

function isDatedLink(link) {
  return /\/\d{4}-\d{2}-\d{2}(?:-|$)/.test(String(link || ''))
}

function allowsMissingIssue(kind, item) {
  return Boolean(
    kind.validation.issueOptionalForOpening
    && kind.openingWithoutIssueLink
    && item.link === kind.openingWithoutIssueLink,
  )
}

function requiresIssue(kind, item) {
  if (!kind.validation.uniqueIssue) return false
  const dated = item.dated === true || isDatedLink(item.link)
  if (!dated) return false
  if (allowsMissingIssue(kind, item)) return false
  return true
}

function namedChapterLinks(kind) {
  return (kind.namedChapterOrder || []).map((name) => (
    contentSiteLink(kind.id, { name: name.replace(/\.md$/i, '') })
  ))
}

function checkCardinality(items, failures, kindId, source, code = 'duplicate-link') {
  const map = byLink(items)
  for (const [link, hits] of map) {
    if (hits.length !== 1) {
      fail(failures, code, {
        kindId,
        link,
        source,
        message: `${source} link 基数不是 1：${link}`,
        count: hits.length,
      })
    }
  }
  return map
}

function pairTitleLink(files, posts, sidebars, kindId, failures, label) {
  const fileMap = checkCardinality(files, failures, kindId, `${label}/file`)
  const postMap = checkCardinality(posts, failures, kindId, `${label}/posts`)
  const sideMap = checkCardinality(sidebars, failures, kindId, `${label}/sidebar`)
  const links = new Set([...fileMap.keys(), ...postMap.keys(), ...sideMap.keys()])
  for (const link of links) {
    const fileHits = fileMap.get(link) || []
    const postHits = postMap.get(link) || []
    const sideHits = sideMap.get(link) || []
    if (fileHits.length !== 1 || postHits.length !== 1 || sideHits.length !== 1) {
      fail(failures, 'triple-write-drift', {
        kindId,
        link,
        message: `${label} 文件/投影/侧栏不对等`,
        file: fileHits[0]?.rel,
        hasFile: fileHits.length === 1,
        hasPost: postHits.length === 1,
        hasSidebar: sideHits.length === 1,
        fileCount: fileHits.length,
        postCount: postHits.length,
        sidebarCount: sideHits.length,
      })
      continue
    }
    const file = fileHits[0]
    const post = postHits[0]
    const side = sideHits[0]
    if (file.title !== post.title || post.title !== side.text) {
      fail(failures, 'triple-write-drift', {
        kindId,
        link,
        message: `${label} title 不一致`,
        fileTitle: file.title,
        postTitle: post.title,
        sidebarTitle: side.text,
      })
    }
    if (
      file.date !== post.date
      || !sameIssue(file, post)
      || file.category !== post.category
      || file.type !== post.type
    ) {
      fail(failures, 'triple-write-drift', {
        kindId,
        link,
        message: `${label} date/issue/category/type 不一致`,
        fileDate: file.date,
        postDate: post.date,
        fileIssue: file.issue,
        postIssue: post.issue,
        fileCategory: file.category,
        postCategory: post.category,
        fileType: file.type,
        postType: post.type,
      })
    }
  }
}

function checkUniqueIssues(items, kind, source, failures) {
  const seen = new Map()
  for (const item of items) {
    if (item.issue == null) {
      if (requiresIssue(kind, item)) {
        fail(failures, 'missing-issue', {
          kindId: kind.id,
          link: item.link,
          source,
          message: `${kind.id} ${source} 缺少 issue`,
        })
      }
      continue
    }
    const list = seen.get(item.issue) || []
    list.push(item)
    seen.set(item.issue, list)
  }
  for (const [issue, hits] of seen) {
    if (hits.length > 1) {
      fail(failures, 'duplicate-issue', {
        kindId: kind.id,
        source,
        message: `${kind.id} ${source} issue ${issue} 重复`,
        issue,
      })
    }
  }
}

function lockNamedChapters(kind, namedFiles, namedPosts, journeyChapters, indexLinks, failures) {
  const expectedNames = kind.namedChapterOrder || []
  const expectedLinks = namedChapterLinks(kind)
  const fileNames = namedFiles.map((item) => item.name).slice().sort()
  const expectedSorted = expectedNames.slice().sort()
  if (JSON.stringify(fileNames) !== JSON.stringify(expectedSorted)) {
    fail(failures, 'named-chapter-set', {
      kindId: kind.id,
      message: '具名历程篇章文件集合与 namedChapterOrder 不一致',
      expected: expectedNames,
      actual: namedFiles.map((item) => item.name),
    })
  }

  // Wave C：生活侧栏不再枚举具名叶子；权威面 = 文件 / posts / 历程侧栏 / 系列 index
  const sources = [
    ['file', namedFiles],
    ['posts', namedPosts],
    ['journey-sidebar', journeyChapters],
    ['series-index', indexLinks],
  ]
  for (const [source, items] of sources) {
    checkCardinality(items, failures, kind.id, `named/${source}`)
    const actual = [...new Set(items.map((item) => item.link))]
    const missing = expectedLinks.filter((link) => !actual.includes(link))
    const extra = actual.filter((link) => !expectedLinks.includes(link))
    if (missing.length || extra.length) {
      fail(failures, 'named-chapter-set', {
        kindId: kind.id,
        source,
        message: `具名历程 ${source} 与 namedChapterOrder 不是一一对应`,
        missing,
        extra,
      })
    }
  }

  for (const [source, items] of [
    ['journey-sidebar', journeyChapters],
    ['series-index', indexLinks],
  ]) {
    const actual = items.map((item) => item.link)
    if (JSON.stringify(actual) !== JSON.stringify(expectedLinks)) {
      fail(failures, 'named-chapter-order', {
        kindId: kind.id,
        source,
        message: `具名历程 ${source} 顺序与 namedChapterOrder 不一致`,
        expected: expectedLinks,
        actual,
      })
    }
  }
}

function lifeSeriesEntryItems(configSource) {
  const { groups } = parseSidebar(configSource, '/AI与生活/')
  const items = []
  for (const group of groups) {
    for (const item of group.items || []) {
      if (item.link === '/AI与生活/我的AI历程/') items.push(item)
    }
  }
  return items
}

export function collectParityFindings(repoRoot) {
  const failures = []
  const { postsSource, configSource } = readProjectionSources(repoRoot)
  const wiring = inspectManagedSidebarWiring(configSource)
  for (const finding of wiring.failures) {
    fail(failures, finding.code, finding)
  }
  const projectedPosts = projectManagedPostsFromFs(repoRoot)
  const shadowPosts = tryParseShadowManualPosts(postsSource)
  const scanned = scanContentTree(repoRoot)
  const files = scanned.files
  const hermesGlob = scanHermesGlobStyle(repoRoot)
  const hermesFs = scanHermesFsStyle(repoRoot)

  for (const item of scanned.unregistered) {
    fail(failures, 'unregistered-file', {
      kindId: item.kindId,
      file: item.rel,
      message: `未登记活跃文件：${item.rel}`,
    })
  }

  for (const error of collectSidebarParseErrors(configSource)) {
    fail(failures, error.code || 'sidebar-unparsed', {
      kindId: 'journey',
      ...error,
    })
  }

  if (shadowPosts.length > 0) {
    fail(failures, 'deprecated-shadow-manual-posts', {
      kindId: 'weekly-life',
      message: 'posts.ts 不得再保留非空 manualPosts shadow；周记/历程以 Markdown → 投影为准',
      count: shadowPosts.length,
    })
  }

  for (const post of projectedPosts) {
    if (post.type === 'hermes') {
      fail(failures, 'hermes-in-manual', {
        kindId: 'hermes',
        link: post.link,
        message: '受管投影不得包含 hermes',
      })
    }
    if (post.type === 'research') {
      fail(failures, 'research-visibility', {
        kindId: 'research',
        link: post.link,
        message: '受管投影不得包含 research',
      })
    }
  }

  const recent = selectRecentPosts([
    ...projectedPosts,
    ...hermesFs,
    ...files
      .filter((item) => item.kindId === 'research')
      .map((item) => ({
        title: item.title,
        date: item.date || '1970-01-01',
        category: '投资',
        type: 'research',
        link: item.link,
      })),
  ], 50)
  if (recent.some((item) => item.type === 'research' || String(item.link || '').startsWith('/投资/投研/'))) {
    fail(failures, 'research-visibility', {
      kindId: 'research',
      message: 'research 不得进入最近更新',
    })
  }

  if (JSON.stringify(hermesGlob) !== JSON.stringify(hermesFs)) {
    fail(failures, 'hermes-adapter-mismatch', {
      kindId: 'hermes',
      message: 'Hermes glob/fs 扫描结果不一致',
    })
  }
  for (const item of hermesFs) {
    if (!item.title || !item.date || !item.link) {
      fail(failures, 'hermes-unparsed', { kindId: 'hermes', link: item.link, message: 'Hermes 文件无法解析' })
    }
  }

  const filesByKind = new Map(listContentKinds().map((kind) => [kind.id, []]))
  for (const file of files) filesByKind.get(file.kindId).push(file)

  const namedLife = namedChapterSidebarItems(configSource, '/AI与生活/')
  const namedJourney = resolvedNamedJourneySidebarItems(repoRoot, configSource, wiring)
  const lifeSeriesEntries = lifeSeriesEntryItems(configSource)
  const journeyKind = getContentKind('journey')
  const indexPath = path.join(repoRoot, ...journeyKind.contentDir.split('/'), 'index.md')
  const indexLinks = fs.existsSync(indexPath)
    ? seriesIndexLinks(fs.readFileSync(indexPath, 'utf8'))
    : []

  if (namedLife.length) {
    fail(failures, 'life-sidebar-named-leaves', {
      kindId: 'journey',
      message: '生活侧栏不得枚举具名历程叶子（Wave C：仅系列入口）',
      links: namedLife.map((item) => item.link),
    })
  }
  if (lifeSeriesEntries.length !== 1) {
    fail(failures, 'life-series-entry', {
      kindId: 'journey',
      message: '生活侧栏必须恰好保留一处历程系列入口',
      count: lifeSeriesEntries.length,
      links: lifeSeriesEntries.map((item) => item.link),
    })
  } else if (lifeSeriesEntries[0].text !== (journeyKind.seriesEntry?.text || '我的AI历程')) {
    fail(failures, 'life-series-entry', {
      kindId: 'journey',
      message: '生活侧栏历程系列入口文案与 typed IA 不一致',
      expected: journeyKind.seriesEntry?.text || '我的AI历程',
      actual: lifeSeriesEntries[0].text,
    })
  }

  for (const kind of listContentKinds()) {
    const kindFiles = filesByKind.get(kind.id) || []
    const kindPosts = projectedPosts.filter((post) => kindIdForPost(post) === kind.id)

    if (kind.validation.forbidManualPosts && kindPosts.length) {
      fail(failures, kind.id === 'hermes' ? 'hermes-in-manual' : 'research-visibility', {
        kindId: kind.id,
        message: `${kind.id} 不得出现在受管投影`,
      })
    }

    if (kind.validation.pairWithManualPosts && kind.validation.pairWithYearSidebar) {
      const datedFiles = kind.id === 'journey'
        ? kindFiles.filter((item) => item.dated)
        : kindFiles
      const datedPosts = kind.id === 'journey'
        ? kindPosts.filter((post) => /\/\d{4}-\d{2}-\d{2}$/.test(post.link))
        : kindPosts.filter((post) => post.type !== 'journey' || /\/\d{4}-\d{2}-\d{2}$/.test(post.link))
      const yearItems = resolvedYearSidebarItems(repoRoot, configSource, kind.id, wiring)
      pairTitleLink(datedFiles, datedPosts, yearItems, kind.id, failures, `${kind.id} 日期条目`)
    }

    if (kind.validation.pairNamedChapters) {
      const namedFiles = kindFiles.filter((item) => !item.dated)
      const namedPosts = kindPosts.filter((post) => !/\/\d{4}-\d{2}-\d{2}$/.test(post.link))
      pairTitleLink(namedFiles, namedPosts, namedJourney, kind.id, failures, '历程具名篇章 / 历程侧栏')
      pairTitleLink(namedFiles, namedPosts, indexLinks, kind.id, failures, '历程具名篇章 / 系列 index')
      lockNamedChapters(kind, namedFiles, namedPosts, namedJourney, indexLinks, failures)
    }

    if (kind.validation.uniqueIssue) {
      checkUniqueIssues(kindFiles, kind, 'markdown', failures)
      checkUniqueIssues(kindPosts, kind, 'projected-posts', failures)
    }

    if (kind.validation.requireReferencedImages) {
      for (const file of kindFiles) {
        for (const rel of referencedAssetRels(file.body, kind)) {
          if (!fs.existsSync(path.join(repoRoot, ...rel.split('/')))) {
            fail(failures, 'missing-image', {
              kindId: kind.id,
              file: file.rel,
              link: file.link,
              message: `缺图：${rel}`,
            })
          }
        }
      }
    }
  }

  const uniqueLinkKinds = new Set(
    listContentKinds().filter((kind) => kind.validation.uniqueLink).map((kind) => kind.id),
  )
  const linkBuckets = [
    ['projected-posts', projectedPosts.map((item) => item.link)],
    ['hermes', hermesFs.map((item) => item.link)],
    ['files', files.filter((item) => uniqueLinkKinds.has(item.kindId)).map((item) => item.link)],
    ['year-sidebar-life', resolvedYearSidebarItems(repoRoot, configSource, 'weekly-life', wiring).map((item) => item.link)],
    ['year-sidebar-invest', resolvedYearSidebarItems(repoRoot, configSource, 'weekly-investment', wiring).map((item) => item.link)],
    ['year-sidebar-journey', resolvedYearSidebarItems(repoRoot, configSource, 'journey', wiring).map((item) => item.link)],
    ['named-journey-sidebar', namedJourney.map((item) => item.link)],
    ['series-index', indexLinks.map((item) => item.link)],
    ['life-series-entry', lifeSeriesEntries.map((item) => item.link)],
  ]
  for (const [source, bucket] of linkBuckets) {
    const linkCounts = new Map()
    for (const link of bucket) {
      if (!link) continue
      linkCounts.set(link, (linkCounts.get(link) || 0) + 1)
    }
    for (const [link, count] of linkCounts) {
      if (count > 1) {
        fail(failures, 'duplicate-link', { link, source, message: `${source} link 重复：${link}` })
      }
    }
  }

  return { failures, projectedPosts, files, hermesFs, hermesGlob, unregistered: scanned.unregistered }
}

export function checkContentParity(repoRoot) {
  const collected = collectParityFindings(repoRoot)
  const failures = []
  const warnings = []
  for (const finding of collected.failures) {
    const exception = exceptionFor(finding)
    if (exception) {
      warnings.push({ ...finding, exception: exception.reason || 'listed exception' })
    } else {
      failures.push(finding)
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    warnings,
    counts: {
      projectedPosts: collected.projectedPosts.length,
      files: collected.files.length,
      hermes: collected.hermesFs.length,
    },
  }
}
