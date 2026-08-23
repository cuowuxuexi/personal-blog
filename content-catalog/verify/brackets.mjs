export function matchBracket(source, openIndex) {
  const open = source[openIndex]
  const close = open === '[' ? ']' : open === '{' ? '}' : null
  if (!close) throw new Error(`not a bracket: ${open}`)
  let depth = 0
  let quote = ''
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]
    if (quote) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return i
    }
  }
  throw new Error('unbalanced brackets')
}

export function readQuoted(source, key) {
  const double = new RegExp(`${key}:\\s*"((?:\\\\.|[^"\\\\])*)"`).exec(source)
  if (double) return double[1].replace(/\\"/g, '"')
  const single = new RegExp(`${key}:\\s*'((?:\\\\.|[^'\\\\])*)'`).exec(source)
  if (single) return single[1].replace(/\\'/g, "'")
  return undefined
}

export function readNumber(source, key) {
  const match = new RegExp(`${key}:\\s*(\\d+)`).exec(source)
  return match ? Number(match[1]) : undefined
}
