import fs from 'node:fs'
import path from 'node:path'
import { PANEL_DIR } from './paths.mjs'
import { shouldPersistDraft } from '../public/draft.mjs'

export const FORM_DRAFT_FILE = path.join(PANEL_DIR, '.local-backups', 'form-draft.json')

export function readFormDraft() {
  if (!fs.existsSync(FORM_DRAFT_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(FORM_DRAFT_FILE, 'utf8'))
  } catch {
    return null
  }
}

export function writeFormDraft(draft) {
  const existing = readFormDraft()
  if (!shouldPersistDraft(existing, draft)) return existing
  fs.mkdirSync(path.dirname(FORM_DRAFT_FILE), { recursive: true })
  fs.writeFileSync(FORM_DRAFT_FILE, `${JSON.stringify(draft, null, 2)}\n`, 'utf8')
  return draft
}

export function clearFormDraft() {
  if (fs.existsSync(FORM_DRAFT_FILE)) fs.unlinkSync(FORM_DRAFT_FILE)
}
