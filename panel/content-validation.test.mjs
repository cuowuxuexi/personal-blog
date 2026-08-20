import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { validateWeeklySnapshot } from './lib/content-validation.mjs'

function fixture(markdown, { withImage = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-validation-'))
  const weekly = path.join(root, 'docs', 'AI与生活')
  const images = path.join(root, 'docs', 'public', 'images', 'weekly')
  fs.mkdirSync(weekly, { recursive: true })
  fs.mkdirSync(images, { recursive: true })
  fs.writeFileSync(path.join(weekly, '2026-08-12.md'), markdown)
  if (withImage) fs.writeFileSync(path.join(images, 'test.webp'), 'image')
  return root
}

function writeBrokenJourney(root, name = '工具篇.md') {
  const chapterDir = path.join(root, 'docs', 'AI与生活', '我的AI历程')
  fs.mkdirSync(chapterDir, { recursive: true })
  fs.writeFileSync(path.join(chapterDir, name), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/missing.webp)',
    '',
  ].join('\n'))
  return `docs/AI与生活/我的AI历程/${name}`
}

const entry = `<div class="weekly-outline-only" aria-hidden="true">

### 测试

</div>

<WeeklyEntry title="测试">

正文 ![图](/images/weekly/test.webp)

</WeeklyEntry>`

test('fast snapshot validation accepts unique entries with existing images', () => {
  const root = fixture(entry)
  try {
    assert.deepEqual(validateWeeklySnapshot(root), { files: 1, entries: 1, images: 1 })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('fast snapshot validation rejects duplicate entries', () => {
  const root = fixture(`${entry}\n\n${entry}`)
  try {
    assert.throws(() => validateWeeklySnapshot(root), /重复条目.*测试/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('fast snapshot validation rejects missing weekly images', () => {
  const root = fixture(entry, { withImage: false })
  try {
    assert.throws(() => validateWeeklySnapshot(root), /缺少周记图片.*test\.webp/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('default weekly validation ignores unrelated journey chapters with missing images', () => {
  const root = fixture(entry)
  writeBrokenJourney(root, '无关篇章.md')
  try {
    assert.deepEqual(validateWeeklySnapshot(root), { files: 1, entries: 1, images: 1 })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('journey validation rejects only the scoped chapter when its image is missing', () => {
  const root = fixture(entry)
  const target = writeBrokenJourney(root, '基础设施篇.md')
  writeBrokenJourney(root, '工具篇.md')
  try {
    assert.throws(
      () => validateWeeklySnapshot(root, {
        kindId: 'journey',
        contentFiles: [target],
      }),
      /缺少图片.*missing\.webp/,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('journey validation accepts the scoped chapter when its image exists and ignores another broken chapter', () => {
  const root = fixture(entry)
  const chapterDir = path.join(root, 'docs', 'AI与生活', '我的AI历程')
  const images = path.join(root, 'docs', 'public', 'images', 'journey')
  fs.mkdirSync(chapterDir, { recursive: true })
  fs.mkdirSync(images, { recursive: true })
  fs.writeFileSync(path.join(images, 'cover.webp'), 'image')
  fs.writeFileSync(path.join(chapterDir, '基础设施篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    '![图](/images/journey/cover.webp)',
    '',
  ].join('\n'))
  writeBrokenJourney(root, '工具篇.md')
  try {
    assert.deepEqual(validateWeeklySnapshot(root, {
      kindId: 'journey',
      contentFiles: ['docs/AI与生活/我的AI历程/基础设施篇.md'],
    }), { files: 1, entries: 1, images: 2 })
    assert.deepEqual(validateWeeklySnapshot(root, { kindId: 'life' }), {
      files: 1,
      entries: 1,
      images: 1,
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
