import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  mutateDatedJourneyMissingIssue,
  mutateDeleteNamedChapterEverywhere,
  mutateDuplicateIssue,
  mutateDuplicateLink,
  mutateHermesInManual,
  mutateIndexDuplicateChapter,
  mutateLifeSidebarNamedLeaves,
  mutateMarkdownIssueOnly,
  mutateMarkdownTitleOnly,
  mutateMisplaceJourneySidebarSpread,
  mutateMissingImage,
  mutateNamedChapterOneSided,
  mutateNamedChapterOrderSwap,
  mutateRemoveInvestSidebarSpread,
  mutateRemoveManagedSidebarImport,
  mutateSidebarDuplicateChapter,
  mutateSidebarFieldReorder,
  mutateSidebarUnparsed,
  mutateTripleWriteDrift,
  mutateUnregisteredHermes,
  mutateUnregisteredWeekly,
  mutateWeeklyLifeMissingCategory,
  mutateWeeklyLifeWrongCategory,
  mutateWeeklyLifeWrongType,
  mutateCommentOnlyManagedSidebarImport,
  mutateCommentOnlySidebarSpread,
  mutateDuplicateInvestSidebarSpread,
  writeGoodFixture,
  writeLiveShapedFixture,
} from './verify/fixture-repo.mjs'
import { checkContentParity } from './verify/parity.mjs'

function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-parity-'))
  try {
    writeGoodFixture(dir)
    return fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function codes(result) {
  return result.failures.map((item) => item.code)
}

function assertRedThenGreen(dir, apply, expectedCode) {
  apply(dir)
  const red = checkContentParity(dir)
  assert.equal(red.ok, false, `${expectedCode} should fail`)
  assert.ok(codes(red).includes(expectedCode), `${expectedCode} missing in ${codes(red).join(',')}`)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  writeGoodFixture(dir)
  const green = checkContentParity(dir)
  assert.equal(green.ok, true, `${expectedCode} should return to green: ${green.failures.map((item) => item.message).join('\n')}`)
}

test('good fixture is green', () => {
  withFixture((dir) => {
    const result = checkContentParity(dir)
    assert.equal(result.ok, true, result.failures.map((item) => item.message).join('\n'))
  })
})

test('one fixture goes red then green for the six contract violations', () => {
  withFixture((dir) => {
    const mutations = [
      { name: 'triple-write-drift', apply: mutateTripleWriteDrift, code: 'triple-write-drift' },
      { name: 'duplicate-issue', apply: mutateDuplicateIssue, code: 'duplicate-issue' },
      { name: 'duplicate-link', apply: mutateDuplicateLink, code: 'duplicate-link' },
      { name: 'deprecated-shadow', apply: mutateHermesInManual, code: 'deprecated-shadow-manual-posts' },
      { name: 'missing-image', apply: mutateMissingImage, code: 'missing-image' },
      { name: 'unregistered-file', apply: mutateUnregisteredWeekly, code: 'unregistered-file' },
    ]

    for (const mutation of mutations) {
      mutation.apply(dir)
      const red = checkContentParity(dir)
      assert.equal(red.ok, false, `${mutation.name} should fail`)
      assert.ok(codes(red).includes(mutation.code), `${mutation.name} missing ${mutation.code}: ${codes(red)}`)
      fs.rmSync(dir, { recursive: true, force: true })
      fs.mkdirSync(dir, { recursive: true })
      writeGoodFixture(dir)
      const green = checkContentParity(dir)
      assert.equal(green.ok, true, `${mutation.name} should return to green: ${green.failures.map((item) => item.message).join('\n')}`)
    }
  })
})

test('R1 markdown title drift goes red; markdown-only issue stays green under projection authority', () => {
  withFixture((dir) => {
    assertRedThenGreen(dir, mutateMarkdownTitleOnly, 'triple-write-drift')
    mutateMarkdownIssueOnly(dir)
    const stillGreen = checkContentParity(dir)
    assert.equal(
      stillGreen.ok,
      true,
      stillGreen.failures.map((item) => item.message).join('\n'),
    )
  })
})

test('R1 dated journey cannot omit issue', () => {
  withFixture((dir) => {
    assertRedThenGreen(dir, mutateDatedJourneyMissingIssue, 'missing-issue')
  })
})

test('R2 unregistered weekly/Hermes go red; 大事件 stays outside weekly', () => {
  withFixture((dir) => {
    const before = checkContentParity(dir)
    assert.equal(before.ok, true, before.failures.map((item) => item.message).join('\n'))
    assert.ok(fs.existsSync(path.join(dir, 'docs', 'AI与生活', '大事件', '2026.md')))
    assertRedThenGreen(dir, mutateUnregisteredWeekly, 'unregistered-file')
    assertRedThenGreen(dir, mutateUnregisteredHermes, 'unregistered-file')
  })
})

test('R3 named chapters lock set, cardinality, order, and Wave C life sidebar IA', () => {
  withFixture((dir) => {
    assertRedThenGreen(dir, mutateDeleteNamedChapterEverywhere, 'named-chapter-set')
    assertRedThenGreen(dir, mutateSidebarDuplicateChapter, 'duplicate-link')
    assertRedThenGreen(dir, mutateIndexDuplicateChapter, 'duplicate-link')
    assertRedThenGreen(dir, mutateNamedChapterOrderSwap, 'named-chapter-order')
    assertRedThenGreen(dir, mutateNamedChapterOneSided, 'named-chapter-set')
    assertRedThenGreen(dir, mutateLifeSidebarNamedLeaves, 'life-sidebar-named-leaves')
  })
})

test('R5 sidebar parser fail-closed on unknown objects and accepts field reorder', () => {
  withFixture((dir) => {
    mutateSidebarFieldReorder(dir)
    const stillGreen = checkContentParity(dir)
    assert.equal(stillGreen.ok, true, stillGreen.failures.map((item) => item.message).join('\n'))
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    writeGoodFixture(dir)
    assertRedThenGreen(dir, mutateSidebarUnparsed, 'sidebar-unparsed')
  })
})

test('R1 live-shaped fixture is green; delete/misplace/remove-import spreads go red', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-parity-live-'))
  try {
    writeLiveShapedFixture(dir)
    const green = checkContentParity(dir)
    assert.equal(green.ok, true, green.failures.map((item) => item.message).join('\n'))

    const cases = [
      { name: 'remove-invest-spread', apply: mutateRemoveInvestSidebarSpread, code: 'sidebar-wiring-spread' },
      { name: 'misplace-journey-spread', apply: mutateMisplaceJourneySidebarSpread, code: 'sidebar-wiring-spread' },
      { name: 'remove-managed-import', apply: mutateRemoveManagedSidebarImport, code: 'sidebar-wiring-import' },
      { name: 'duplicate-invest-spread', apply: mutateDuplicateInvestSidebarSpread, code: 'sidebar-wiring-spread' },
      { name: 'comment-only-spread', apply: mutateCommentOnlySidebarSpread, code: 'sidebar-wiring-spread' },
      { name: 'comment-only-import', apply: mutateCommentOnlyManagedSidebarImport, code: 'sidebar-wiring-import' },
    ]
    for (const mutation of cases) {
      fs.rmSync(dir, { recursive: true, force: true })
      fs.mkdirSync(dir, { recursive: true })
      writeLiveShapedFixture(dir)
      mutation.apply(dir)
      const red = checkContentParity(dir)
      assert.equal(red.ok, false, `${mutation.name} should fail`)
      assert.ok(
        codes(red).includes(mutation.code),
        `${mutation.name} missing ${mutation.code}: ${codes(red).join(',')}`,
      )
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('R2-1 weekly-life wrong/missing category or type goes red; good fixture stays green', () => {
  withFixture((dir) => {
    assertRedThenGreen(dir, mutateWeeklyLifeWrongCategory, 'triple-write-drift')
    assertRedThenGreen(dir, mutateWeeklyLifeWrongType, 'triple-write-drift')
    assertRedThenGreen(dir, mutateWeeklyLifeMissingCategory, 'triple-write-drift')
  })
})
