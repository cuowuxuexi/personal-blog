/** Markdown 会把 `\[` 吃成 `[`，公式进不了 MathJax，`{cases}` 还会被 Vue 当成插值。
 *  双反斜杠 `\\[` 也收口，避免留下半个 `$$` 把后文整段喂给 MathJax。 */
export function normalizeDisplayMath(src) {
  return src.replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, body) => `$$\n${body.trim()}\n$$`)
}
