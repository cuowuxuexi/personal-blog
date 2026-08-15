import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWeeklyEntryHeadings } from './normalize-weekly-headings.mjs'

test('demotes a standalone-style article under WeeklyEntry', () => {
  const src = `<WeeklyEntry title="梁子说">

# 一、核心结论

## 1. 第一优先级

### 条件一

</WeeklyEntry>
`
  const out = normalizeWeeklyEntryHeadings(src)
  assert.match(out, /#### 一、核心结论/)
  assert.match(out, /##### 1\. 第一优先级/)
  assert.match(out, /###### 条件一/)
  assert.doesNotMatch(out, /^# 一、核心结论/m)
})

test('leaves headings outside WeeklyEntry untouched', () => {
  const src = `## 看烟花！！！

### 梁子说

<WeeklyEntry title="梁子说">

# 一、核心结论

</WeeklyEntry>
`
  const out = normalizeWeeklyEntryHeadings(src)
  assert.match(out, /## 看烟花！！！/)
  assert.match(out, /### 梁子说/)
  assert.match(out, /#### 一、核心结论/)
})

test('does not demote headings already under the entry', () => {
  const src = `<WeeklyEntry title="x">

#### 一、核心结论

##### 1. 小节

</WeeklyEntry>
`
  const out = normalizeWeeklyEntryHeadings(src)
  assert.match(out, /#### 一、核心结论/)
  assert.match(out, /##### 1\. 小节/)
})

test('does not rewrite hashes inside fenced code', () => {
  const src = `<WeeklyEntry title="x">

# 正文标题

\`\`\`md
# 代码里的标题
\`\`\`

</WeeklyEntry>
`
  const out = normalizeWeeklyEntryHeadings(src)
  assert.match(out, /#### 正文标题/)
  assert.match(out, /```md\n# 代码里的标题\n```/)
})

test('turns prose-plus-dashes into a thematic break, not a heading', () => {
  const src = `<WeeklyEntry title="x">
下面是大致提炼的关于梁子关于硬件投入内容：
---

# 一、核心结论
</WeeklyEntry>
`
  const out = normalizeWeeklyEntryHeadings(src)
  assert.match(out, /内容：\n\n---\n/)
  assert.doesNotMatch(out, /## 下面是大致提炼/)
  assert.match(out, /#### 一、核心结论/)
})
