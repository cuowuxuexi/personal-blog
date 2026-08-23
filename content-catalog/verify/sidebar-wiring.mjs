import { matchBracket } from './brackets.mjs'

/** Live / live-shaped config 受管 sidebar 接线：import + 三处 section 各自对应 spread。 */
export const MANAGED_SIDEBAR_SPREADS = Object.freeze([
  {
    kindId: 'weekly-investment',
    sidebarKey: '/投资/周记/',
    spread: 'investYearSidebarGroups',
  },
  {
    kindId: 'weekly-life',
    sidebarKey: '/AI与生活/',
    spread: 'lifeYearSidebarGroups',
  },
  {
    kindId: 'journey',
    sidebarKey: '/AI与生活/我的AI历程/',
    spread: 'journeySidebarGroups',
  },
])

const ALL_SPREADS = MANAGED_SIDEBAR_SPREADS.map((item) => item.spread)

/**
 * 移除 JS 行/块注释后的有效源码（保留字符串字面量内容）。
 * 不做完整 JS parser；够用 config.mts / fixture 形态。
 */
export function stripJsComments(source) {
  const s = String(source || '')
  let out = ''
  let i = 0
  let quote = ''
  while (i < s.length) {
    const ch = s[i]
    const next = s[i + 1]
    if (quote) {
      out += ch
      if (ch === '\\') {
        if (i + 1 < s.length) {
          out += s[i + 1]
          i += 2
          continue
        }
      } else if (ch === quote) {
        quote = ''
      }
      i += 1
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      i += 1
      continue
    }
    if (ch === '/' && next === '/') {
      i += 2
      while (i < s.length && s[i] !== '\n') i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i + 1 < s.length && !(s[i] === '*' && s[i + 1] === '/')) i += 1
      i += 2
      continue
    }
    out += ch
    i += 1
  }
  return out
}

function extractSidebarSection(source, sidebarKey) {
  const needle = `'${sidebarKey}': [`
  const start = source.indexOf(needle)
  if (start < 0) return null
  const open = start + needle.length - 1
  return source.slice(open, matchBracket(source, open) + 1)
}

export function hasManagedSidebarFsImport(source) {
  return /from\s+['"]\.\/managed-sidebar-fs(?:\.mjs)?['"]/.test(String(source || ''))
}

export function countSpreadOccurrences(section, spreadName) {
  if (!section) return 0
  const matches = String(section).match(new RegExp(`\\.\\.\\.${spreadName}\\b`, 'g'))
  return matches ? matches.length : 0
}

export function sectionHasSpread(section, spreadName) {
  return countSpreadOccurrences(section, spreadName) > 0
}

/**
 * @returns {'spread' | 'literal'}
 * spread：有效源码出现 managed-sidebar-fs import 或任一受管 spread（live / live-shaped）
 * literal：纯字面量金标 fixture（注释中的 spread/import 不计）
 */
export function detectSidebarWiringMode(configSource) {
  const source = stripJsComments(configSource)
  if (hasManagedSidebarFsImport(source)) return 'spread'
  for (const spread of ALL_SPREADS) {
    if (countSpreadOccurrences(source, spread) > 0) return 'spread'
  }
  return 'literal'
}

/**
 * 独立接线断言结果。literal 模式不要求 spread；spread 模式必须齐全且各 section own spread === 1、foreign === 0。
 */
export function inspectManagedSidebarWiring(configSource) {
  const raw = String(configSource || '')
  const source = stripJsComments(raw)
  const mode = detectSidebarWiringMode(raw)
  const failures = []
  const okByKind = {
    'weekly-investment': false,
    'weekly-life': false,
    journey: false,
  }

  if (mode === 'literal') {
    for (const key of Object.keys(okByKind)) okByKind[key] = true
    return { mode, ok: true, failures, okByKind, hasImport: false }
  }

  const hasImport = hasManagedSidebarFsImport(source)
  if (!hasImport) {
    failures.push({
      code: 'sidebar-wiring-import',
      kindId: 'weekly-life',
      message: 'live sidebar 必须 import ./managed-sidebar-fs.mjs',
    })
  }

  for (const entry of MANAGED_SIDEBAR_SPREADS) {
    const section = extractSidebarSection(source, entry.sidebarKey)
    if (!section) {
      failures.push({
        code: 'sidebar-wiring-spread',
        kindId: entry.kindId,
        sidebarKey: entry.sidebarKey,
        message: `缺少 sidebar section ${entry.sidebarKey}`,
      })
      continue
    }

    const ownCount = countSpreadOccurrences(section, entry.spread)
    const foreign = ALL_SPREADS.filter(
      (name) => name !== entry.spread && countSpreadOccurrences(section, name) > 0,
    )
    if (ownCount !== 1) {
      failures.push({
        code: 'sidebar-wiring-spread',
        kindId: entry.kindId,
        sidebarKey: entry.sidebarKey,
        spread: entry.spread,
        count: ownCount,
        message: ownCount === 0
          ? `${entry.sidebarKey} 必须接入 ...${entry.spread}`
          : `${entry.sidebarKey} 的 ...${entry.spread} 必须恰好一次（实际 ${ownCount}）`,
      })
    }
    if (foreign.length) {
      failures.push({
        code: 'sidebar-wiring-spread',
        kindId: entry.kindId,
        sidebarKey: entry.sidebarKey,
        message: `${entry.sidebarKey} 不得接入错放 spread：${foreign.join(', ')}`,
        foreign,
      })
    }
    okByKind[entry.kindId] = Boolean(hasImport && ownCount === 1 && foreign.length === 0)
  }

  return {
    mode,
    ok: failures.length === 0,
    failures,
    okByKind,
    hasImport,
  }
}
