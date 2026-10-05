import { db, nowIso, parseJSON, transaction, uid } from './db.mjs'

function ownedOrder(accountId,publicNumber) {
  const row=db.prepare(`
    SELECT
      o.id AS order_id,o.public_number,o.status,o.work_total,o.logistics_total,o.total,o.payload_json,
      o.created_at AS order_created_at,o.updated_at AS order_updated_at,
      p.id AS project_id,p.object_type,p.object_label,p.address,p.area,p.floor,p.lift
    FROM orders o
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND o.public_number=?
  `).get(accountId,Number(publicNumber))

  if(!row) throw Object.assign(new Error('Заказ не найден'),{status:404})
  return row
}

function ownedApproval(accountId,id) {
  const row=db.prepare(`
    SELECT ar.*,o.public_number
    FROM approval_requests ar
    JOIN orders o ON o.id=ar.order_id
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND ar.id=?
  `).get(accountId,id)

  if(!row) throw Object.assign(new Error('Согласование не найдено'),{status:404})
  return row
}

function makeSnapshot(row) {
  const payload=parseJSON(row.payload_json,{})
  return {
    publicNumber:String(row.public_number),
    status:row.status,
    objectType:row.object_type,
    objectLabel:row.object_label,
    address:row.address,
    area:row.area,
    floor:row.floor,
    lift:row.lift,
    workTotal:Number(row.work_total||0),
    logisticsTotal:Number(row.logistics_total||0),
    total:Number(row.total||0),
    serviceType:payload.serviceType||'demolition',
    serviceLabel:payload.serviceLabel||'Демонтаж',
    priceBook:payload.priceBook||null,
    rooms:payload.rooms||[],
    demolition:payload.demolition||{},
    roughRepair:payload.roughRepair||{},
    rates:payload.rates||{},
    logistics:payload.logistics||{},
  }
}

function summarizeChange(prev,next) {
  if(!prev) return {created:true}
  const changes={}
  const fields=[
    ['status','Статус'],['address','Адрес'],['area','Площадь'],['floor','Этаж'],
    ['lift','Лифт'],['workTotal','Работы'],['logisticsTotal','Логистика'],['total','Итого'],
  ]

  for(const [key,label] of fields){
    if(JSON.stringify(prev[key])!==JSON.stringify(next[key])){
      changes[key]={label,from:prev[key]??null,to:next[key]??null}
    }
  }

  const prevRooms=Array.isArray(prev.rooms)?prev.rooms.length:0
  const nextRooms=Array.isArray(next.rooms)?next.rooms.length:0
  if(prevRooms!==nextRooms) changes.rooms={label:'Помещения',from:prevRooms,to:nextRooms}

  const prevDemolition=Object.keys(prev.demolition||{}).length
  const nextDemolition=Object.keys(next.demolition||{}).length
  if(prevDemolition!==nextDemolition) changes.demolition={label:'Позиции демонтажа',from:prevDemolition,to:nextDemolition}

  const prevRough=Object.keys(prev.roughRepair||{}).length
  const nextRough=Object.keys(next.roughRepair||{}).length
  if(prevRough!==nextRough) changes.roughRepair={label:'Позиции чернового ремонта',from:prevRough,to:nextRough}

  const prevPrice=prev.priceBook?`${prev.priceBook.code} v${prev.priceBook.version}`:null
  const nextPrice=next.priceBook?`${next.priceBook.code} v${next.priceBook.version}`:null
  if(prevPrice!==nextPrice) changes.priceBook={label:'Прайс',from:prevPrice,to:nextPrice}
  return changes
}

export function recordAudit(accountId,publicNumber,eventType,data={}) {
  const order=ownedOrder(accountId,publicNumber)
  const id=uid('aud')
  db.prepare(`
    INSERT INTO audit_events(id,order_id,actor_account_id,actor_role,event_type,data_json,created_at)
    VALUES(?,?,?,'client',?,?,?)
  `).run(id,order.order_id,accountId,eventType,JSON.stringify(data||{}),nowIso())
  return id
}

export function recordOrderRevision(accountId,publicNumber,eventType='order.updated') {
  const order=ownedOrder(accountId,publicNumber)
  const next=makeSnapshot(order)
  const latest=db.prepare('SELECT * FROM order_revisions WHERE order_id=? ORDER BY version DESC LIMIT 1').get(order.order_id)
  const previous=latest?parseJSON(latest.snapshot_json,null):null
  if(previous&&JSON.stringify(previous)===JSON.stringify(next)) return null

  const version=Number(latest?.version||0)+1
  const change=summarizeChange(previous,next)
  const createdAt=nowIso()
  const id=uid('rev')

  transaction(()=>{
    db.prepare(`
      INSERT INTO order_revisions(id,order_id,version,snapshot_json,change_json,created_at)
      VALUES(?,?,?,?,?,?)
    `).run(id,order.order_id,version,JSON.stringify(next),JSON.stringify(change),createdAt)

    db.prepare(`
      INSERT INTO audit_events(id,order_id,actor_account_id,actor_role,event_type,data_json,created_at)
      VALUES(?,?,?,'client',?,?,?)
    `).run(uid('aud'),order.order_id,accountId,eventType,JSON.stringify({revisionVersion:version,change}),createdAt)
  })()

  return {id,version,snapshot:next,change,createdAt}
}

function serializeRevision(row) {
  return {id:row.id,version:Number(row.version),snapshot:parseJSON(row.snapshot_json,{}),change:parseJSON(row.change_json,{}),createdAt:row.created_at}
}
function serializeEvent(row) {
  return {id:row.id,actorRole:row.actor_role,eventType:row.event_type,data:parseJSON(row.data_json,{}),createdAt:row.created_at}
}
function serializeApproval(row) {
  return {id:row.id,orderNumber:String(row.public_number||''),revisionVersion:Number(row.revision_version),status:row.status,snapshot:parseJSON(row.snapshot_json,{}),note:row.note||'',createdAt:row.created_at,respondedAt:row.responded_at}
}

export function getOrderHistory(accountId,publicNumber) {
  const order=ownedOrder(accountId,publicNumber)
  const revisions=db.prepare('SELECT * FROM order_revisions WHERE order_id=? ORDER BY version DESC').all(order.order_id).map(serializeRevision)
  const events=db.prepare('SELECT * FROM audit_events WHERE order_id=? ORDER BY created_at DESC').all(order.order_id).map(serializeEvent)
  const approvals=db.prepare(`
    SELECT ar.*,o.public_number FROM approval_requests ar JOIN orders o ON o.id=ar.order_id
    WHERE ar.order_id=? ORDER BY ar.created_at DESC
  `).all(order.order_id).map(serializeApproval)
  return {revisions,events,approvals}
}

export function requestApproval(accountId,publicNumber) {
  const order=ownedOrder(accountId,publicNumber)
  let latest=db.prepare('SELECT * FROM order_revisions WHERE order_id=? ORDER BY version DESC LIMIT 1').get(order.order_id)
  if(!latest){
    recordOrderRevision(accountId,publicNumber,'order.created')
    latest=db.prepare('SELECT * FROM order_revisions WHERE order_id=? ORDER BY version DESC LIMIT 1').get(order.order_id)
  }

  const pending=db.prepare("SELECT * FROM approval_requests WHERE order_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").get(order.order_id)
  if(pending) throw Object.assign(new Error('По заказу уже есть активное согласование'),{status:409})

  const now=nowIso()
  const id=uid('apr')
  transaction(()=>{
    db.prepare(`
      INSERT INTO approval_requests(id,order_id,revision_version,status,snapshot_json,created_at)
      VALUES(?,?,?,'pending',?,?)
    `).run(id,order.order_id,latest.version,latest.snapshot_json,now)
    db.prepare("UPDATE orders SET status='review',updated_at=? WHERE id=?").run(now,order.order_id)
    db.prepare(`
      INSERT INTO audit_events(id,order_id,actor_account_id,actor_role,event_type,data_json,created_at)
      VALUES(?,?,?,'client','approval.requested',?,?)
    `).run(uid('aud'),order.order_id,accountId,JSON.stringify({revisionVersion:Number(latest.version)}),now)
  })()

  return serializeApproval(db.prepare(`
    SELECT ar.*,o.public_number FROM approval_requests ar JOIN orders o ON o.id=ar.order_id WHERE ar.id=?
  `).get(id))
}

export function respondApproval(accountId,id,status,note='') {
  if(!['approved','rejected','cancelled'].includes(status)) throw Object.assign(new Error('Некорректный статус согласования'),{status:400})
  const approval=ownedApproval(accountId,id)
  if(approval.status!=='pending') throw Object.assign(new Error('Согласование уже завершено'),{status:409})

  const now=nowIso()
  const nextOrderStatus=status==='approved'?'contract':'calculated'
  transaction(()=>{
    db.prepare('UPDATE approval_requests SET status=?,note=?,responded_at=? WHERE id=?').run(status,String(note||''),now,id)
    db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(nextOrderStatus,now,approval.order_id)
    db.prepare(`
      INSERT INTO audit_events(id,order_id,actor_account_id,actor_role,event_type,data_json,created_at)
      VALUES(?,?,?,'client',?,?,?)
    `).run(uid('aud'),approval.order_id,accountId,'approval.'+status,JSON.stringify({revisionVersion:Number(approval.revision_version),note:String(note||'')}),now)
  })()

  return serializeApproval(ownedApproval(accountId,id))
}
