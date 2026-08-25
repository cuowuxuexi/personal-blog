#!/usr/bin/env node
/**
 * 探 VitePress 文档预览是否可连。同时试 127.0.0.1 / localhost / ::1:5173。
 * 标准输出一行：ready <url> 或 down
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PORT = 5173
const PROBE_MS = 800
const START_WAIT_MS = 60_000
const TARGETS = Object.freeze([
  { url: `http://127.0.0.1:${PORT}/`, prefer: 2 },
  { url: `http://localhost:${PORT}/`, prefer: 1 },
  { url: `http://[::1]:${PORT}/`, prefer: 3 },
])

export async function probeOne(url, timeoutMs = PROBE_MS) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ac.signal, redirect: 'manual' })
    return Number.isInteger(res.status)
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function findPreview(timeoutMs = PROBE_MS) {
  const hits = []
  for (const target of TARGETS) {
    if (await probeOne(target.url, timeoutMs)) hits.push(target)
  }
  if (hits.length === 0) return null
  hits.sort((a, b) => a.prefer - b.prefer)
  return hits[0].url.replace(/\/$/, '')
}

function printReady(url, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ok: true, url })}\n`)
    return
  }
  process.stdout.write(`ready ${url}\n`)
}

function printDown(asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ok: false })}\n`)
    return
  }
  process.stdout.write('down\n')
}

function startDocsDev(repoRoot) {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  return spawn(pnpm, ['docs:dev'], {
    cwd: repoRoot,
    stdio: 'ignore',
    detached: true,
    shell: false,
  })
}

export async function waitUntilReady(timeoutMs = START_WAIT_MS) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const url = await findPreview()
    if (url) return url
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return null
}

async function main(argv = process.argv.slice(2)) {
  const asJson = argv.includes('--json')
  const shouldStart = argv.includes('--start')
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

  let url = await findPreview()
  if (!url && shouldStart) {
    const child = startDocsDev(repoRoot)
    child.unref()
    url = await waitUntilReady()
  }

  if (url) {
    printReady(url, asJson)
    process.exitCode = 0
    return
  }
  printDown(asJson)
  process.exitCode = 1
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
