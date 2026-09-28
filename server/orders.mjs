import { db, nowIso, parseJSON, transaction, uid } from './db.mjs'

function clientForAccount(accountId) {
  const client=db.prepare('SELECT * FROM client_profiles WHERE account_id=?').get(accountId)
  if(!client) throw Object.assign(new Error('Сначала заполните профиль клиента'),{status:409})
  return client
}

function nextPublicNumber() {
  const row=db.prepare('SELECT MAX(public_number) AS n FROM orders').get()
  return Math.max(1922,Number(row?.n)||0)+1
}

function normalizeNumber(value) {
  const n=Number.parseInt(String(value||''),10)
  return Number.isFinite(n)&&n>0?n:null
}

function serializeOrder(row) {
  const payload=parseJSON(row.payload_json,{})
  return {
    ...payload,
    id:String(row.public_number),
    status:row.status,
    objectType:row.object_type,
    objectLabel:row.object_label,
    address:row.address,
    area:row.area ?? payload.area ?? '',
    floor:row.floor ?? payload.floor ?? '',
    lift:row.lift ?? payload.lift ?? 'yes',
    workTotal:Number(row.work_total||0),
    logistics:payload.logistics||{total:Number(row.logistics_total||0)},
    total:Number(row.total||0),
    createdAt:row.order_created_at,
    updatedAt:row.order_updated_at,
  }
}

const baseSelect=`
  SELECT
    o.id AS order_id,o.public_number,o.status,o.work_total,o.logistics_total,o.total,o.payload_json,
    o.created_at AS order_created_at,o.updated_at AS order_updated_at,
    p.id AS project_id,p.object_type,p.object_label,p.address,p.area,p.floor,p.lift
  FROM orders o
  JOIN projects p ON p.id=o.project_id
`

function rowByNumber(clientId,number) {
  return db.prepare(baseSelect+' WHERE p.client_id=? AND o.public_number=?').get(clientId,number)
}

function chooseNumber(clientId,requested) {
  const requestedNumber=normalizeNumber(requested)
  if(!requestedNumber) return nextPublicNumber()
  const owner=db.prepare(`SELECT p.client_id
                          FROM orders o JOIN projects p ON p.id=o.project_id
                          WHERE o.public_number=?`).get(requestedNumber)
  if(!owner||owner.client_id===clientId) return requestedNumber
  return nextPublicNumber()
}

function saveOne(clientId,order) {
  const now=nowIso()
  const publicNumber=chooseNumber(clientId,order?.id)
  const existing=rowByNumber(clientId,publicNumber)
  const logisticsTotal=Number(order?.logistics?.total||0)
  const payload={...order,id:String(publicNumber)}
  const area=Number.parseFloat(String(order?.area??'').replace(',','.'))
  const floor=Number.parseInt(String(order?.floor??''),10)

  if(existing){
    db.prepare(`UPDATE projects SET object_type=?,object_label=?,address=?,area=?,floor=?,lift=?,updated_at=? WHERE id=?`)
      .run(order.objectType||null,order.objectLabel||null,String(order.address||''),Number.isFinite(area)?area:null,Number.isFinite(floor)?floor:null,order.lift||null,now,existing.project_id)
    db.prepare(`UPDATE orders SET status=?,work_total=?,logistics_total=?,total=?,payload_json=?,updated_at=? WHERE id=?`)
      .run(order.status||'draft',Number(order.workTotal||0),logisticsTotal,Number(order.total||0),JSON.stringify(payload),now,existing.order_id)
  } else {
    const projectId=uid('prj')
    const orderId=uid('ord')
    db.prepare(`INSERT INTO projects(id,client_id,object_type,object_label,address,area,floor,lift,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(projectId,clientId,order.objectType||null,order.objectLabel||null,String(order.address||''),Number.isFinite(area)?area:null,Number.isFinite(floor)?floor:null,order.lift||null,now,now)
    db.prepare(`INSERT INTO orders(id,public_number,project_id,status,work_total,logistics_total,total,payload_json,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(orderId,publicNumber,projectId,order.status||'draft',Number(order.workTotal||0),logisticsTotal,Number(order.total||0),JSON.stringify(payload),order.createdAt||now,now)
  }

  return serializeOrder(rowByNumber(clientId,publicNumber))
}

export function listOrders(accountId) {
  const client=clientForAccount(accountId)
  return db.prepare(baseSelect+' WHERE p.client_id=? ORDER BY o.updated_at DESC')
    .all(client.id)
    .map(serializeOrder)
}

export function getOrder(accountId,number) {
  const client=clientForAccount(accountId)
  const row=rowByNumber(client.id,normalizeNumber(number))
  if(!row) throw Object.assign(new Error('Заказ не найден'),{status:404})
  return serializeOrder(row)
}

export function createOrder(accountId,order) {
  const client=clientForAccount(accountId)
  return transaction(()=>saveOne(client.id,{...order,id:chooseNumber(client.id,order?.id)}))()
}

export function updateOrder(accountId,number,patch) {
  const client=clientForAccount(accountId)
  const current=rowByNumber(client.id,normalizeNumber(number))
  if(!current) throw Object.assign(new Error('Заказ не найден'),{status:404})
  const merged={...serializeOrder(current),...patch,id:String(current.public_number)}
  return transaction(()=>saveOne(client.id,merged))()
}

export function deleteOrder(accountId,number) {
  const client=clientForAccount(accountId)
  const current=rowByNumber(client.id,normalizeNumber(number))
  if(!current) throw Object.assign(new Error('Заказ не найден'),{status:404})
  const serialized=serializeOrder(current)
  transaction(()=>{
    db.prepare('DELETE FROM projects WHERE id=? AND client_id=?').run(current.project_id,client.id)
  })()
  return serialized
}

export function syncOrders(accountId,incoming=[]) {
  const client=clientForAccount(accountId)
  const orders=Array.isArray(incoming)?incoming:[]
  return transaction(()=>{
    const saved=orders.map(order=>saveOne(client.id,order))
    const keep=new Set(saved.map(order=>Number(order.id)))
    const existing=db.prepare(`SELECT o.public_number,p.id AS project_id
                               FROM orders o JOIN projects p ON p.id=o.project_id
                               WHERE p.client_id=?`).all(client.id)
    existing.forEach(row=>{
      if(!keep.has(Number(row.public_number))) db.prepare('DELETE FROM projects WHERE id=?').run(row.project_id)
    })
    return db.prepare(baseSelect+' WHERE p.client_id=? ORDER BY o.updated_at DESC').all(client.id).map(serializeOrder)
  })()
}
