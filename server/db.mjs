import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname=dirname(fileURLToPath(import.meta.url))
const DEFAULT_DB=join(__dirname,'bathdream.sqlite')
export const DB_FILE=process.env.DB_FILE||DEFAULT_DB

mkdirSync(dirname(DB_FILE),{recursive:true})

export const db=new Database(DB_FILE)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

const schema=readFileSync(join(__dirname,'schema.sql'),'utf8')
db.exec(schema)

export const nowIso=()=>new Date().toISOString()
export const uid=(prefix='id')=>`${prefix}_${randomUUID()}`

export function parseJSON(value,fallback={}) {
  try { return JSON.parse(value) } catch { return fallback }
}

export function transaction(fn) {
  return db.transaction(fn)
}
