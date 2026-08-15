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
