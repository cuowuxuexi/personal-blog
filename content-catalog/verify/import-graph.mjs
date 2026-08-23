import fs from 'node:fs'
import path from 'node:path'

const IMPORT_RE = /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?['"](\.[^'"]+)['"]/g
const SIDE_EFFECT_RE = /\bimport\s+['"](\.[^'"]+)['"]/g
const EXPORT_ALL_RE = /\bexport\s+\*\s+from\s+['"](\.[^'"]+)['"]/g
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g

function collectSpecifiers(source) {
  const found = new Set()
  for (const re of [IMPORT_RE, SIDE_EFFECT_RE, EXPORT_ALL_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(source))) {
      found.add(match[1])
    }
  }
  return [...found]
}

function resolveRelativeModule(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    base,
    `${base}.mjs`,
    `${base}.js`,
    `${base}.ts`,
    `${base}.mts`,
    path.join(base, 'index.mjs'),
    path.join(base, 'index.js'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return null
}

/**
 * 递归静态扫描 relative ESM import/re-export/dynamic import() 可达图。
 * @returns {{ files: string[], edges: Array<{ from: string, to: string, specifier: string }> }}
 */
export function collectRelativeImportGraph(entryAbs) {
  const root = path.resolve(entryAbs)
  const files = []
  const edges = []
  const seen = new Set()
  const queue = [root]

  while (queue.length) {
    const current = queue.shift()
    if (!current || seen.has(current)) continue
    seen.add(current)
    if (!fs.existsSync(current) || !fs.statSync(current).isFile()) continue
    files.push(current)
    const source = fs.readFileSync(current, 'utf8')
    for (const specifier of collectSpecifiers(source)) {
      const resolved = resolveRelativeModule(current, specifier)
      edges.push({ from: current, to: resolved, specifier })
      if (resolved && !seen.has(resolved)) queue.push(resolved)
    }
  }

  return { files, edges }
}

const NODE_FS_SPEC = String.raw`(?:node:)?fs(?:\/promises)?`

function isNodeFsImport(source) {
  const text = String(source || '')
  return new RegExp(String.raw`from\s+['"]${NODE_FS_SPEC}['"]`).test(text)
    || new RegExp(String.raw`(?:^|[;\r\n])\s*import\s*['"]${NODE_FS_SPEC}['"]`, 'm').test(text)
    || new RegExp(String.raw`require\(\s*['"]${NODE_FS_SPEC}['"]\s*\)`).test(text)
    || new RegExp(String.raw`import\s*\(\s*['"]${NODE_FS_SPEC}['"]\s*\)`).test(text)
}

/**
 * posts / adapter / catalog index 可达图不得引入 project-fs 或 node:fs(/promises)。
 * @returns {{ ok: boolean, failures: Array<object> }}
 */
export function checkBrowserSafeImportGraph(entryPaths) {
  const failures = []
  const seenFiles = new Set()

  for (const entry of entryPaths) {
    const abs = path.resolve(entry)
    const { files } = collectRelativeImportGraph(abs)
    for (const file of files) {
      if (seenFiles.has(file)) continue
      seenFiles.add(file)
      const base = path.basename(file)
      if (base === 'project-fs.mjs' || base === 'project-fs.js') {
        failures.push({
          code: 'browser-fs-leak',
          file,
          entry: abs,
          message: `浏览器可达图引入 project-fs：${file}`,
        })
        continue
      }
      const source = fs.readFileSync(file, 'utf8')
      if (isNodeFsImport(source)) {
        failures.push({
          code: 'browser-fs-leak',
          file,
          entry: abs,
          message: `浏览器可达图引入 node:fs：${file}`,
        })
      }
    }
  }

  return { ok: failures.length === 0, failures }
}
