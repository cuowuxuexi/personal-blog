import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detectSidebarWiringMode,
  inspectManagedSidebarWiring,
  stripJsComments,
} from './verify/sidebar-wiring.mjs'

const LIVE_SHAPED = `import {
  investYearSidebarGroups,
  journeySidebarGroups,
  lifeYearSidebarGroups,
} from './managed-sidebar-fs.mjs'

export default {
  themeConfig: {
    sidebar: {
      '/投资/周记/': [
        { text: '投研', items: [] },
        ...investYearSidebarGroups,
      ],
      '/AI与生活/': [
        ...lifeYearSidebarGroups,
      ],
      '/AI与生活/我的AI历程/': [
        ...journeySidebarGroups,
      ],
    },
  },
}
`

test('stripJsComments removes line and block comments but keeps string contents', () => {
  const source = [
    "const a = 'http://x.com'",
    '// ...lifeYearSidebarGroups',
    'const b = 1 /* ...investYearSidebarGroups */',
    'const c = 2',
  ].join('\n')
  const stripped = stripJsComments(source)
  assert.match(stripped, /http:\/\/x\.com/)
  assert.doesNotMatch(stripped, /lifeYearSidebarGroups/)
  assert.doesNotMatch(stripped, /investYearSidebarGroups/)
  assert.match(stripped, /const b = 1/)
  assert.match(stripped, /const c = 2/)
})

test('comment-only spread/import does not promote literal fixture to spread mode', () => {
  const literalWithComments = `export default {
  themeConfig: {
    sidebar: {
      // import { lifeYearSidebarGroups } from './managed-sidebar-fs.mjs'
      '/AI与生活/': [
        /* ...lifeYearSidebarGroups, */
        { text: '周记 · 2026年', items: [] },
      ],
    },
  },
}
`
  assert.equal(detectSidebarWiringMode(literalWithComments), 'literal')
  const wiring = inspectManagedSidebarWiring(literalWithComments)
  assert.equal(wiring.mode, 'literal')
  assert.equal(wiring.ok, true)
})

test('duplicate own spread fails; exact-once live-shaped passes', () => {
  const green = inspectManagedSidebarWiring(LIVE_SHAPED)
  assert.equal(green.ok, true, green.failures.map((f) => f.message).join('\n'))

  const dup = LIVE_SHAPED.replace(
    '...investYearSidebarGroups,',
    '...investYearSidebarGroups,\n        ...investYearSidebarGroups,',
  )
  const red = inspectManagedSidebarWiring(dup)
  assert.equal(red.ok, false)
  assert.ok(red.failures.some((f) => f.code === 'sidebar-wiring-spread' && f.count === 2))
})

test('comment-only live spreads/import go red', () => {
  const commentSpreads = LIVE_SHAPED
    .replace('...investYearSidebarGroups,', '// ...investYearSidebarGroups,')
    .replace('...lifeYearSidebarGroups,', '/* ...lifeYearSidebarGroups, */')
    .replace('...journeySidebarGroups,', '// ...journeySidebarGroups,')
  const redSpread = inspectManagedSidebarWiring(commentSpreads)
  assert.equal(redSpread.ok, false)
  assert.ok(redSpread.failures.some((f) => f.code === 'sidebar-wiring-spread'))

  const commentImport = LIVE_SHAPED.replace(
    /import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/managed-sidebar-fs(?:\.mjs)?['"];?/m,
    (block) => `/* ${block} */`,
  )
  const redImport = inspectManagedSidebarWiring(commentImport)
  assert.equal(redImport.ok, false)
  assert.ok(redImport.failures.some((f) => f.code === 'sidebar-wiring-import'))
})
