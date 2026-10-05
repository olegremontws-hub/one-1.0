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

function migrateDocumentsKindConstraint(){
  const row=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get()
  const sql=String(row?.sql||'')
  if(!sql||sql.includes("'offer'")&&sql.includes("'ks2'")) return

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      BEGIN;
      ALTER TABLE documents RENAME TO documents_legacy_v6;

      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('quote','offer','contract','act','ks2')),
        number TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','signed','cancelled')),
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        issued_at TEXT,
        signed_at TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        UNIQUE(order_id, kind, version),
        UNIQUE(number)
      );

      INSERT INTO documents(
        id,order_id,kind,number,version,status,title,content_json,created_at,updated_at,issued_at,signed_at
      )
      SELECT
        id,order_id,kind,number,version,status,title,content_json,created_at,updated_at,issued_at,signed_at
      FROM documents_legacy_v6;

      DROP TABLE documents_legacy_v6;
      CREATE INDEX IF NOT EXISTS idx_documents_order ON documents(order_id, created_at DESC);

      INSERT INTO schema_meta(key,value)
      VALUES ('schema_version','7')
      ON CONFLICT(key) DO UPDATE SET value=excluded.value;
      COMMIT;
    `)
  } catch (error) {
    try { db.exec('ROLLBACK') } catch {}
    throw error
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

migrateDocumentsKindConstraint()

export const nowIso=()=>new Date().toISOString()
export const uid=(prefix='id')=>`${prefix}_${randomUUID()}`

export function parseJSON(value,fallback={}) {
  try { return JSON.parse(value) } catch { return fallback }
}

export function transaction(fn) {
  return db.transaction(fn)
}
