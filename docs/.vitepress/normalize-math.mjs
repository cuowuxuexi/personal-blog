/** Markdown 会把 `\[` 吃成 `[`，公式进不了 MathJax，`{cases}` 还会被 Vue 当成插值。 */
export function normalizeDisplayMath(src) {
  return src.replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => `$$\n${body.trim()}\n$$`)
}
