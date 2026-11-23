import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { getContentKind } from '../content-catalog/index.mjs'
import { validateWeeklySnapshot } from './lib/content-validation.mjs'

function repoJoin(root, posixDir, ...rest) {
  return path.join(root, ...posixDir.split('/'), ...rest)
}

function fixture(markdown, { withImage = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-validation-'))
  const life = getContentKind('weekly-life')
  fs.mkdirSync(repoJoin(root, life.contentDir), { recursive: true })
  fs.mkdirSync(repoJoin(root, life.assets.directory), { recursive: true })
  fs.writeFileSync(path.join(repoJoin(root, life.contentDir), '2026-08-12.md'), markdown)
  if (withImage) fs.writeFileSync(path.join(repoJoin(root, life.assets.directory), 'test.webp'), 'image')
  return root
}

function writeBrokenJourney(root, name = '工具篇.md') {
  const journey = getContentKind('journey')
  const chapterDir = repoJoin(root, journey.contentDir)
  fs.mkdirSync(chapterDir, { recursive: true })
  fs.writeFileSync(path.join(chapterDir, name), [
    '---',
    'type: journey',
    '---',
    '',
    `![图](${journey.assets.urlPrefix}missing.webp)`,
    '',
  ].join('\n'))
  return `${journey.contentDir}/${name}`
}

const weeklyUrlPrefix = getContentKind('weekly-life').assets.urlPrefix

const entry = `<div class="weekly-outline-only" aria-hidden="true">

### 测试

</div>

<WeeklyEntry title="测试">

正文 ![图](${weeklyUrlPrefix}test.webp)

</WeeklyEntry>`

const EMPTY_COUNT = { files: 0, entries: 0, images: 0 }

// 两类周记已冻结（creation.surfaces 为空），面板校验不再扫描、计数周记文件。
test('frozen weekly files are not scanned or counted by snapshot validation', () => {
  const root = fixture(entry)
  try {
    assert.deepEqual(validateWeeklySnapshot(root), EMPTY_COUNT)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('frozen weekly files are not validated: duplicate entries and missing images pass unnoticed', () => {
  const duplicated = fixture(`${entry}\n\n${entry}`)
  const missingImage = fixture(entry, { withImage: false })
  try {
    assert.deepEqual(validateWeeklySnapshot(duplicated), EMPTY_COUNT)
    assert.deepEqual(validateWeeklySnapshot(missingImage), EMPTY_COUNT)
  } finally {
    fs.rmSync(duplicated, { recursive: true, force: true })
    fs.rmSync(missingImage, { recursive: true, force: true })
  }
})

test('default validation ignores unrelated journey chapters with missing images', () => {
  const root = fixture(entry)
  writeBrokenJourney(root, '无关篇章.md')
  try {
    assert.deepEqual(validateWeeklySnapshot(root), EMPTY_COUNT)
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
  const journey = getContentKind('journey')
  const chapterDir = repoJoin(root, journey.contentDir)
  const images = repoJoin(root, journey.assets.directory)
  fs.mkdirSync(chapterDir, { recursive: true })
  fs.mkdirSync(images, { recursive: true })
  fs.writeFileSync(path.join(images, 'cover.webp'), 'image')
  fs.writeFileSync(path.join(chapterDir, '基础设施篇.md'), [
    '---',
    'type: journey',
    '---',
    '',
    `![图](${journey.assets.urlPrefix}cover.webp)`,
    '',
  ].join('\n'))
  writeBrokenJourney(root, '工具篇.md')
  try {
    // 只数章节引用的图片；同目录下冻结的周记文件不计入 files / entries / images。
    assert.deepEqual(validateWeeklySnapshot(root, {
      kindId: 'journey',
      contentFiles: [`${journey.contentDir}/基础设施篇.md`],
    }), { files: 0, entries: 0, images: 1 })
    assert.deepEqual(validateWeeklySnapshot(root, { kindId: 'life' }), EMPTY_COUNT)
    assert.deepEqual(validateWeeklySnapshot(root, {
      kindId: 'life',
      contentFiles: [`${journey.contentDir}/基础设施篇.md`],
    }), EMPTY_COUNT)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
