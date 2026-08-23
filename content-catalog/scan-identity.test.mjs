import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  managedIdentityFromMarkdown,
  postFromManagedMarkdown,
} from './index.mjs'
import { scanContentTree } from './verify/scan.mjs'
import { writeGoodFixture } from './verify/fixture-repo.mjs'

test('managed scan identity delegates to shared core; hermes/research stay on specialty path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-identity-'))
  try {
    writeGoodFixture(dir)
    const scanned = scanContentTree(dir)
    const managed = scanned.files.filter((item) => (
      item.kindId === 'weekly-life'
      || item.kindId === 'weekly-investment'
      || item.kindId === 'journey'
    ))
    assert.ok(managed.length >= 5)

    for (const file of managed) {
      const raw = fs.readFileSync(path.join(dir, ...file.rel.split('/')), 'utf8')
      const identity = managedIdentityFromMarkdown({
        kindId: file.kindId,
        relativePath: file.rel,
        raw,
      })
      assert.ok(identity, file.rel)
      assert.equal(file.title, identity.title)
      assert.equal(file.date, identity.date)
      assert.equal(file.issue, identity.issue)
      assert.equal(file.category, identity.category)
      assert.equal(file.type, identity.type)
      assert.equal(file.link, identity.link)
      assert.equal(file.dated, identity.dated)
      assert.ok(typeof file.body === 'string')
      assert.ok(file.rel)

      const post = postFromManagedMarkdown({
        kindId: file.kindId,
        relativePath: file.rel,
        raw,
      })
      if (post) {
        assert.equal(file.title, post.title)
        assert.equal(file.date, post.date)
        assert.equal(file.issue, post.issue)
        assert.equal(file.category, post.category)
        assert.equal(file.type, post.type)
        assert.equal(file.link, post.link)
      }
    }

    const hermes = scanned.files.filter((item) => item.kindId === 'hermes')
    assert.ok(hermes.length >= 1)
    for (const file of hermes) {
      const raw = fs.readFileSync(path.join(dir, ...file.rel.split('/')), 'utf8')
      assert.equal(
        managedIdentityFromMarkdown({ kindId: 'hermes', relativePath: file.rel, raw }),
        null,
      )
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('R2-1 scan shares wrong/missing category/type from identity (no kind overwrite)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-id-wrong-'))
  try {
    writeGoodFixture(dir)
    const file = path.join(dir, 'docs', 'AI与生活', '2026-01-03.md')
    fs.writeFileSync(
      file,
      fs.readFileSync(file, 'utf8').replace('category: AI与生活', 'category: 投资'),
    )
    const scanned = scanContentTree(dir)
    const life = scanned.files.find((item) => item.rel.endsWith('AI与生活/2026-01-03.md'))
    assert.ok(life)
    assert.equal(life.category, '投资')
    assert.equal(life.type, 'weekly')
    const identity = managedIdentityFromMarkdown({
      kindId: 'weekly-life',
      relativePath: life.rel,
      raw: fs.readFileSync(file, 'utf8'),
    })
    assert.equal(identity.category, '投资')
    assert.equal(postFromManagedMarkdown({
      kindId: 'weekly-life',
      relativePath: life.rel,
      raw: fs.readFileSync(file, 'utf8'),
    }), null)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
