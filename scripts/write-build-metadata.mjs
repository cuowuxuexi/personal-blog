import fs from 'node:fs'
import path from 'node:path'

const distDir = process.argv[2] || path.join('docs', '.vitepress', 'dist')
const sha = process.env.GITHUB_SHA || process.env.PANEL_BUILD_SHA || ''
const builtAt = process.env.BUILD_TIME || new Date().toISOString()

if (!sha) {
  console.error('write-build-metadata: missing GITHUB_SHA or PANEL_BUILD_SHA')
  process.exit(1)
}

fs.mkdirSync(distDir, { recursive: true })
const payload = { sha, builtAt }
fs.writeFileSync(path.join(distDir, 'build.json'), `${JSON.stringify(payload)}\n`, 'utf8')
console.log(`wrote ${path.join(distDir, 'build.json')} sha=${sha}`)
