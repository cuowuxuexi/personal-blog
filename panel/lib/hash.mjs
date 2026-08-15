import crypto from 'node:crypto'
import fs from 'node:fs'

export function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex')
}

export function sha256File(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

export function newToken() {
  return crypto.randomBytes(24).toString('hex')
}
