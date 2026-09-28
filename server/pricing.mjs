import { DEMO_RATES, LOGISTICS_RATES, WASTE_RULES } from '../src/domain/model.js'
import { db, nowIso, parseJSON, transaction, uid } from './db.mjs'

export const DEFAULT_PRICE_BOOK_CODE='MSK-DEMOLITION'

function rowToPriceBook(row) {
  if(!row) return null
  return {
    id:row.id,
    code:row.code,
    version:Number(row.version),
    title:row.title,
    currency:row.currency,
    status:row.status,
    rates:parseJSON(row.rates_json,{}),
    wasteRules:parseJSON(row.waste_rules_json,{}),
    logisticsRates:parseJSON(row.logistics_json,{}),
    createdAt:row.created_at,
    activatedAt:row.activated_at,
  }
}

export function ensureSeedPriceBook(code=DEFAULT_PRICE_BOOK_CODE) {
  const existing=db.prepare('SELECT * FROM price_books WHERE code=? ORDER BY version DESC LIMIT 1').get(code)
  if(existing) return rowToPriceBook(existing)

  const now=nowIso()
  const id=uid('pb')
  db.prepare(`INSERT INTO price_books(
    id,code,version,title,currency,status,rates_json,waste_rules_json,logistics_json,created_at,activated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,code,1,'Москва · Демонтаж v1','RUB','active',
    JSON.stringify(DEMO_RATES),
    JSON.stringify(WASTE_RULES),
    JSON.stringify(LOGISTICS_RATES),
    now,now,
  )
  return rowToPriceBook(db.prepare('SELECT * FROM price_books WHERE id=?').get(id))
}

export function getActivePriceBook(code=DEFAULT_PRICE_BOOK_CODE) {
  ensureSeedPriceBook(code)
  const row=db.prepare(`SELECT * FROM price_books WHERE code=? AND status='active'
                        ORDER BY version DESC LIMIT 1`).get(code)
  if(!row) throw Object.assign(new Error('Активный прайс не найден'),{status:404})
  return rowToPriceBook(row)
}

export function listPriceBooks(code=DEFAULT_PRICE_BOOK_CODE) {
  ensureSeedPriceBook(code)
  return db.prepare('SELECT * FROM price_books WHERE code=? ORDER BY version DESC')
    .all(code)
    .map(rowToPriceBook)
}

export function createPriceBookVersion({
  code=DEFAULT_PRICE_BOOK_CODE,
  title,
  rates,
  wasteRules,
  logisticsRates,
}={}) {
  const active=getActivePriceBook(code)
  const max=db.prepare('SELECT MAX(version) AS version FROM price_books WHERE code=?').get(code)
  const version=Number(max?.version||0)+1
  const now=nowIso()
  const id=uid('pb')

  db.prepare(`INSERT INTO price_books(
    id,code,version,title,currency,status,rates_json,waste_rules_json,logistics_json,created_at
  ) VALUES(?,?,?,?,?,'draft',?,?,?,?)`).run(
    id,code,version,title||`${active.title.replace(/ v\d+$/,'')} v${version}`,
    active.currency,
    JSON.stringify(rates||active.rates),
    JSON.stringify(wasteRules||active.wasteRules),
    JSON.stringify(logisticsRates||active.logisticsRates),
    now,
  )

  return rowToPriceBook(db.prepare('SELECT * FROM price_books WHERE id=?').get(id))
}

export function activatePriceBook(id) {
  const target=db.prepare('SELECT * FROM price_books WHERE id=?').get(id)
  if(!target) throw Object.assign(new Error('Прайс не найден'),{status:404})
  const now=nowIso()

  return transaction(()=>{
    db.prepare(`UPDATE price_books SET status='archived'
                WHERE code=? AND status='active' AND id<>?`).run(target.code,id)
    db.prepare(`UPDATE price_books SET status='active',activated_at=? WHERE id=?`).run(now,id)
    return rowToPriceBook(db.prepare('SELECT * FROM price_books WHERE id=?').get(id))
  })()
}

ensureSeedPriceBook()
