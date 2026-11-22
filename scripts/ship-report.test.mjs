import assert from 'node:assert/strict'
import test from 'node:test'
import { onlyTimestampChanged, parseArgs, registerReportRow } from './ship-report.mjs'

const README = [
  '| 目录 | 说明 |',
  '| --- | --- |',
  '| `catl-canvas/` | 宁德时代研究画布 |',
  '| `report-002714-sz/` | 牧原股份研报（六页）；行业见 `blog-meta.json`；`/投资/` 研报段入口 |',
  '',
  '最后更新：2026-11-22',
].join('\n')

test('parseArgs 认 --upload 与 --industry', () => {
  assert.deepEqual(parseArgs(['d', '--upload', '--industry', '白酒']), { srcDir: 'd', industry: '白酒', upload: true })
  assert.throws(() => parseArgs([]), /用法/)
  assert.throws(() => parseArgs(['d', '--x']), /未知参数/)
})

test('登记行插在最后一条研报行之后', () => {
  const out = registerReportRow(README, { slug: 'report-600519-sh', company: '贵州茅台', pageCount: 6 })
  const lines = out.split('\n')
  assert.equal(lines[4], '| `report-600519-sh/` | 贵州茅台研报（六页）；行业见 `blog-meta.json`；`/投资/` 研报段入口 |')
  assert.equal(lines[5], '')
})

test('已登记时原样返回（幂等）', () => {
  assert.equal(registerReportRow(README, { slug: 'report-002714-sz', company: '牧原股份', pageCount: 6 }), README)
})

test('没有研报登记行时报错', () => {
  assert.throws(() => registerReportRow('| a |', { slug: 'report-x', company: 'X', pageCount: 1 }), /找不到研报登记行/)
})

test('只有 updatedAt 变了算没改动', () => {
  const head = '{"industry":"白酒","updatedAt":"2026-11-21T10:00:00+08:00"}'
  const now = '{"industry":"白酒","updatedAt":"2026-11-22T10:00:00+08:00"}'
  const line = [' M docs/public/html/report-600519-sh/blog-meta.json']
  assert.equal(onlyTimestampChanged(line, 'report-600519-sh', head, now), true)
  assert.equal(onlyTimestampChanged(line, 'report-600519-sh', head, '{"industry":"食品","updatedAt":"x"}'), false)
  assert.equal(onlyTimestampChanged([...line, ' M docs/public/html/report-600519-sh/index.html'], 'report-600519-sh', head, now), false)
  assert.equal(onlyTimestampChanged([], 'report-600519-sh', head, now), false)
})
