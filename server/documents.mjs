import { buildEstimateRows, buildRoughEstimateRows } from '../src/domain/model.js'
import { db, nowIso, parseJSON, uid } from './db.mjs'

export const DOCUMENT_KINDS={
  quote:{prefix:'КП',title:'Коммерческое предложение'},
  contract:{prefix:'ДОГ',title:'Договор на выполнение работ'},
  act:{prefix:'АКТ',title:'Акт выполненных работ'},
}

function ownedOrder(accountId,publicNumber) {
  const row=db.prepare(`
    SELECT
      o.id AS order_id,o.public_number,o.status,o.work_total,o.logistics_total,o.total,o.payload_json,
      o.created_at AS order_created_at,o.updated_at AS order_updated_at,
      p.object_type,p.object_label,p.address,p.area,p.floor,p.lift,
      cp.id AS client_id,cp.client_type,cp.display_name,cp.city,cp.profile_json,
      a.phone,a.email
    FROM orders o
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    JOIN auth_accounts a ON a.id=cp.account_id
    WHERE cp.account_id=? AND o.public_number=?
  `).get(accountId,Number(publicNumber))

  if(!row) throw Object.assign(new Error('Заказ не найден'),{status:404})
  return row
}

function ownedDocument(accountId,id) {
  const row=db.prepare(`
    SELECT d.*
    FROM documents d
    JOIN orders o ON o.id=d.order_id
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND d.id=?
  `).get(accountId,id)

  if(!row) throw Object.assign(new Error('Документ не найден'),{status:404})
  return row
}

function serialize(row) {
  return {
    id:row.id,
    orderId:row.order_id,
    kind:row.kind,
    number:row.number,
    version:Number(row.version),
    status:row.status,
    title:row.title,
    content:parseJSON(row.content_json,{}),
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    issuedAt:row.issued_at,
    signedAt:row.signed_at,
  }
}

function profileSnapshot(row) {
  const details=parseJSON(row.profile_json,{})
  return {
    type:row.client_type,
    displayName:row.display_name||'',
    city:row.city||'',
    phone:row.phone||'',
    email:row.email||'',
    details,
  }
}

function orderSnapshot(row) {
  const payload=parseJSON(row.payload_json,{})
  const estimate=(payload.serviceType==='rough'
    ? buildRoughEstimateRows(payload.rooms||[],payload.roughRepair||{},payload.rates||{})
    : buildEstimateRows(payload.rooms||[],payload.demolition||{},payload.rates||{}))
    .map(item=>({
      code:item.code,
      name:item.name,
      room:item.roomName,
      unit:item.unit,
      quantity:Number(item.quantity),
      rate:Number(item.rate),
      sum:Number(item.sum),
    }))

  return {
    publicNumber:String(row.public_number),
    serviceType:payload.serviceType||'demolition',
    serviceLabel:payload.serviceLabel||'Демонтаж',
    status:row.status,
    objectType:row.object_type,
    objectLabel:row.object_label,
    address:row.address,
    area:row.area,
    floor:row.floor,
    lift:row.lift,
    rooms:(payload.rooms||[]).map(room=>({
      type:room.type,
      floor:Number(room.calc?.floor||0),
      netWalls:Number(room.calc?.netWalls||0),
    })),
    estimate,
    totals:{
      work:Number(row.work_total||0),
      logistics:Number(row.logistics_total||0),
      total:Number(row.total||0),
    },
    priceBook:payload.priceBook||null,
    orderCreatedAt:row.order_created_at,
    orderUpdatedAt:row.order_updated_at,
  }
}

function documentBody(kind,client,order) {
  const common={
    generatedAt:nowIso(),
    client,
    order,
    disclaimer:'Черновик документа Bath Dream. Юридическая форма и реквизиты подлежат утверждению перед коммерческим использованием.',
  }

  if(kind==='quote'){
    return {
      ...common,
      purpose:order.serviceType==='rough'
        ? 'Предварительное коммерческое предложение по выбранному объёму черновых ремонтных работ.'
        : 'Предварительное коммерческое предложение по выбранному объёму демонтажных работ и логистике.',
      sections:['Клиент и объект','Состав работ','Стоимость работ','Отходы и логистика','Итоговая стоимость'],
    }
  }

  if(kind==='contract'){
    return {
      ...common,
      purpose:'Черновик договора на выполнение согласованного объёма работ по заказу Bath Dream.',
      sections:['Стороны','Предмет договора','Стоимость','Порядок выполнения','Приёмка','Документы и расчёты'],
    }
  }

  return {
    ...common,
    purpose:'Черновик акта приёмки выполненных работ по заказу Bath Dream.',
    sections:['Стороны','Объект','Выполненные работы','Стоимость','Результат приёмки'],
  }
}

export function listDocuments(accountId,publicNumber) {
  const order=ownedOrder(accountId,publicNumber)
  return db.prepare('SELECT * FROM documents WHERE order_id=? ORDER BY created_at DESC')
    .all(order.order_id)
    .map(serialize)
}

export function getDocument(accountId,id) {
  return serialize(ownedDocument(accountId,id))
}

export function createDocument(accountId,publicNumber,kind) {
  const meta=DOCUMENT_KINDS[kind]
  if(!meta) throw Object.assign(new Error('Неизвестный тип документа'),{status:400})

  const order=ownedOrder(accountId,publicNumber)
  const versionRow=db.prepare('SELECT MAX(version) AS v FROM documents WHERE order_id=? AND kind=?')
    .get(order.order_id,kind)
  const version=Number(versionRow?.v||0)+1
  const number=`${meta.prefix}-${order.public_number}-${String(version).padStart(2,'0')}`
  const now=nowIso()
  const id=uid('doc')
  const content=documentBody(kind,profileSnapshot(order),orderSnapshot(order))

  db.prepare(`
    INSERT INTO documents(id,order_id,kind,number,version,status,title,content_json,created_at,updated_at)
    VALUES(?,?,?,?,?,'draft',?,?,?,?)
  `).run(id,order.order_id,kind,number,version,meta.title,JSON.stringify(content),now,now)

  return serialize(db.prepare('SELECT * FROM documents WHERE id=?').get(id))
}

const ALLOWED_TRANSITIONS={
  draft:new Set(['draft','issued','cancelled']),
  issued:new Set(['issued','signed','cancelled']),
  signed:new Set(['signed']),
  cancelled:new Set(['cancelled']),
}

export function updateDocumentStatus(accountId,id,status) {
  if(!['draft','issued','signed','cancelled'].includes(status)){
    throw Object.assign(new Error('Некорректный статус документа'),{status:400})
  }

  const current=ownedDocument(accountId,id)
  if(!ALLOWED_TRANSITIONS[current.status]?.has(status)){
    throw Object.assign(new Error('Недопустимый переход статуса документа'),{status:409})
  }

  const now=nowIso()
  const issuedAt=status==='issued'&&!current.issued_at?now:current.issued_at
  const signedAt=status==='signed'&&!current.signed_at?now:current.signed_at

  db.prepare(`
    UPDATE documents
    SET status=?,updated_at=?,issued_at=?,signed_at=?
    WHERE id=?
  `).run(status,now,issuedAt,signedAt,id)

  return serialize(ownedDocument(accountId,id))
}
