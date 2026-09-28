import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const temp=await mkdtemp(join(tmpdir(),'bathdream-pricing-'))
process.env.DB_FILE=join(temp,'pricing.sqlite')

try {
  const pricing=await import('../server/pricing.mjs')

  const v1=pricing.getActivePriceBook()
  assert.equal(v1.version,1)
  assert.equal(v1.status,'active')
  assert.ok(v1.rates['DEM-FL-006']>0)

  const draft=pricing.createPriceBookVersion({title:'Москва · Демонтаж test v2'})
  assert.equal(draft.version,2)
  assert.equal(draft.status,'draft')

  const updated=pricing.updateDraftRate(draft.id,'DEM-FL-006',1777)
  assert.equal(updated.rates['DEM-FL-006'],1777)

  const active=pricing.activatePriceBook(draft.id)
  assert.equal(active.version,2)
  assert.equal(active.status,'active')
  assert.equal(active.rates['DEM-FL-006'],1777)

  const history=pricing.listPriceBooks()
  assert.equal(history.length,2)
  assert.equal(history.find(item=>item.version===1).status,'archived')
  assert.equal(history.find(item=>item.version===2).status,'active')

  console.log('Bath Dream versioned pricing smoke test passed')
} finally {
  await rm(temp,{recursive:true,force:true})
}
