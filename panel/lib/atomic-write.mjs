import fs from 'node:fs'
import path from 'node:path'

export function writeUtf8(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const text = content.endsWith('\n') ? content : `${content}\n`
  fs.writeFileSync(file, text, 'utf8')
}

/**
 * Write every target or restore all of them.
 * Observable result: either every file matches the new content, or the tree
 * is back to the pre-call state.
 */
export function writeTargetsAtomic(targets, { writeFile = writeUtf8 } = {}) {
  const backups = targets.map((target) => {
    if (!fs.existsSync(target.abs)) {
      return { abs: target.abs, existed: false, bak: null }
    }
    const bak = `${target.abs}.panel-tx-bak`
    fs.copyFileSync(target.abs, bak)
    return { abs: target.abs, existed: true, bak }
  })
  try {
    for (const target of targets) writeFile(target.abs, target.content)
    for (const item of backups) {
      if (item.bak && fs.existsSync(item.bak)) fs.unlinkSync(item.bak)
    }
  } catch (error) {
    for (const item of backups) {
      if (item.existed && item.bak && fs.existsSync(item.bak)) {
        fs.copyFileSync(item.bak, item.abs)
        fs.unlinkSync(item.bak)
      } else if (!item.existed && fs.existsSync(item.abs)) {
        fs.unlinkSync(item.abs)
      }
    }
    throw error
  }
}
