import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  hermesPostsFromFsNames,
  hermesPostsFromGlob,
  parseFrontmatter,
  postFromDayFile,
  sortHermes,
} from '../docs/.vitepress/hermes-diary-core.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const DAY_A = `---
title: 晚到的一天
date: 2026-01-03
description: 排后面
---
`
const DAY_B = `---
title: 较早的一天
date: 2026-01-01
description: 排前面
---
`

test('Hermes glob and fs adapters share parser/sort and ignore index/README/illegal names', () => {
  const modules = {
    '../AI与生活/Hermes日记/index.md': '---\ntitle: 索引\ndate: 2026-01-09\n---\n',
    '../AI与生活/Hermes日记/README.md': '---\ntitle: 说明\ndate: 2026-01-08\n---\n',
    '../AI与生活/Hermes日记/notes.md': '---\ntitle: 非法\ndate: 2026-01-07\n---\n',
    '../AI与生活/Hermes日记/2026-01-03.md': DAY_A,
    '../AI与生活/Hermes日记/2026-01-01.md': DAY_B,
  }
  const fromGlob = hermesPostsFromGlob(modules)
  const fromFs = hermesPostsFromFsNames(Object.keys(modules).map((key) => key.split('/').pop()), (name) => {
    const key = Object.keys(modules).find((item) => item.endsWith(`/${name}`))
    return modules[key]
  })

  assert.deepEqual(fromGlob.map((item) => item.link), [
    '/AI与生活/Hermes日记/2026-01-03',
    '/AI与生活/Hermes日记/2026-01-01',
  ])
  assert.deepEqual(fromGlob, fromFs)
  assert.equal(fromGlob[0].title, '晚到的一天')
  assert.equal(fromGlob[0].date, '2026-01-03')
  assert.equal(fromGlob[0].description, '排后面')
  assert.equal(fromGlob[1].title, '较早的一天')
  assert.equal(fromGlob[1].description, '排前面')
  assert.deepEqual(sortHermes(fromGlob.slice().reverse()).map((item) => item.date), ['2026-01-03', '2026-01-01'])
  assert.equal(postFromDayFile('notes', DAY_A), null)
  assert.equal(parseFrontmatter(DAY_A).fm.title, '晚到的一天')
})

test('verifier Hermes scans import the production core instead of a twin parser', () => {
  const scanSource = fs.readFileSync(path.join(HERE, 'verify', 'scan.mjs'), 'utf8')
  assert.match(scanSource, /hermes-diary-core\.mjs/)
  assert.doesNotMatch(scanSource, /function scanHermesByListing/)
  assert.doesNotMatch(scanSource, /function postFromDayFile/)
})

test('fs helper can read a temp diary dir the same way as glob', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-core-'))
  try {
    fs.writeFileSync(path.join(dir, 'index.md'), '---\ntitle: idx\ndate: 2026-02-01\n---\n')
    fs.writeFileSync(path.join(dir, 'README.md'), '---\ntitle: readme\ndate: 2026-02-02\n---\n')
    fs.writeFileSync(path.join(dir, 'notes.md'), '---\ntitle: notes\n---\n')
    fs.writeFileSync(path.join(dir, '2026-01-03.md'), DAY_A)
    fs.writeFileSync(path.join(dir, '2026-01-01.md'), DAY_B)
    const names = fs.readdirSync(dir)
    const posts = hermesPostsFromFsNames(names, (name) => fs.readFileSync(path.join(dir, name), 'utf8'))
    assert.deepEqual(posts.map((item) => item.title), ['晚到的一天', '较早的一天'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
