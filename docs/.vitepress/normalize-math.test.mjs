import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeDisplayMath } from './normalize-math.mjs'

test('turns \\[ \\] into $$ so Vue never sees {cases}', () => {
  const src = `他的判断大概是：\n\n\\[\n\\text{现金} \\rightarrow\n\\begin{cases}\n\\text{训练更强模型}\\\\\n\\end{cases}\n\\]\n`
  const out = normalizeDisplayMath(src)
  assert.match(out, /\$\$/)
  assert.doesNotMatch(out, /\\\[/)
  assert.match(out, /begin\{cases\}/)
})

test('double-escaped \\\\[ \\\\] still becomes one closed $$ pair', () => {
  const src = `一般计算方式：\n\n\\\\[ \\text{应纳税额}=x\\times20\\\\% \\\\]\n\n后文还在。\n`
  const out = normalizeDisplayMath(src)
  const fences = [...out.matchAll(/\$\$/g)]
  assert.equal(fences.length, 2)
  assert.match(out, /应纳税额/)
  assert.match(out, /后文还在/)
  assert.doesNotMatch(out, /\\\[/)
})
