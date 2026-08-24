import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter as catalogParse } from './frontmatter.mjs'
import { parseFrontmatter as hermesParse } from '../docs/.vitepress/hermes-diary-core.mjs'
import { parseFrontmatter as weeklyParse } from '../panel/lib/weekly.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..')

const QUOTED = `---
title: "带双引号的标题"
date: "2026-08-12"
revisionDate: "2026-08-20"
issue: 3
---
正文从这里开始
`

const WEEKLY = path.join(REPO_ROOT, 'docs', 'AI与生活', '2026-08-12.md')
const JOURNEY = path.join(REPO_ROOT, 'docs', 'AI与生活', '我的AI历程', '基础设施篇.md')
const HERMES = path.join(REPO_ROOT, 'docs', 'AI与生活', 'Hermes日记', '2026-08-11.md')

function fields(raw) {
  const { fm } = catalogParse(raw)
  return {
    title: fm.title,
    date: fm.date,
    revisionDate: fm.revisionDate,
  }
}

test('quoted titles strip pairing quotes; digits become Number', () => {
  const { fm, body } = catalogParse(QUOTED)
  assert.equal(fm.title, '带双引号的标题')
  assert.equal(fm.date, '2026-08-12')
  assert.equal(fm.revisionDate, '2026-08-20')
  assert.equal(fm.issue, 3)
  assert.equal(body, '正文从这里开始\n')
})

test('panel and Hermes re-export the catalog parser; they do not keep a twin implementation', () => {
  assert.equal(weeklyParse, catalogParse)
  assert.equal(hermesParse, catalogParse)

  const weeklySource = fs.readFileSync(path.join(REPO_ROOT, 'panel', 'lib', 'weekly.mjs'), 'utf8')
  const hermesSource = fs.readFileSync(path.join(REPO_ROOT, 'docs', '.vitepress', 'hermes-diary-core.mjs'), 'utf8')
  const hermesTs = fs.readFileSync(path.join(REPO_ROOT, 'docs', '.vitepress', 'hermes-diary.ts'), 'utf8')

  assert.match(weeklySource, /from ['"]\.\.\/\.\.\/content-catalog\/frontmatter\.mjs['"]/)
  assert.match(hermesSource, /from ['"]\.\.\/\.\.\/content-catalog\/frontmatter\.mjs['"]/)
  assert.doesNotMatch(weeklySource, /export function parseFrontmatter/)
  assert.doesNotMatch(hermesSource, /export function parseFrontmatter/)
  assert.doesNotMatch(weeklySource, /JSON\.parse\(value\)/)
  assert.doesNotMatch(hermesSource, /startsWith\(['"]["']['"]\)/)
  assert.doesNotMatch(hermesTs, /indexOf\(['"]:['"]\)/)
  assert.doesNotMatch(hermesTs, /JSON\.parse\(/)
})

test('one weekly, one journey, one Hermes day share title / date / revisionDate', () => {
  for (const abs of [WEEKLY, JOURNEY, HERMES]) {
    const raw = fs.readFileSync(abs, 'utf8')
    const catalog = fields(raw)
    const weekly = weeklyParse(raw).fm
    const hermes = hermesParse(raw).fm
    assert.equal(weekly.title, catalog.title)
    assert.equal(weekly.date, catalog.date)
    assert.equal(weekly.revisionDate, catalog.revisionDate)
    assert.equal(hermes.title, catalog.title)
    assert.equal(hermes.date, catalog.date)
    assert.equal(hermes.revisionDate, catalog.revisionDate)
  }
  assert.equal(fields(fs.readFileSync(WEEKLY, 'utf8')).title, '第001期-看烟花')
  assert.equal(fields(fs.readFileSync(JOURNEY, 'utf8')).title, '基础设施篇')
  assert.equal(fields(fs.readFileSync(HERMES, 'utf8')).title, '建档日')
})
