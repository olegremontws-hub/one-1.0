import { db, nowIso, uid } from './db.mjs'

function ownedOrder(accountId,publicNumber) {
  const row=db.prepare(`
    SELECT o.id AS order_id,o.public_number,o.total
    FROM orders o
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND o.public_number=?
  `).get(accountId,Number(publicNumber))

  if(!row) throw Object.assign(new Error('Заказ не найден'),{status:404})
  return row
}

function ownedPayment(accountId,id) {
  const row=db.prepare(`
    SELECT pay.*,o.public_number,o.total AS order_total
    FROM payments pay
    JOIN orders o ON o.id=pay.order_id
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND pay.id=?
  `).get(accountId,id)

  if(!row) throw Object.assign(new Error('Платёж не найден'),{status:404})
  return row
}

function serialize(row) {
  return {
    id:row.id,
    orderId:row.order_id,
    orderNumber:String(row.public_number||''),
    kind:row.kind,
    status:row.status,
    amount:Number(row.amount),
    currency:row.currency,
    dueAt:row.due_at,
    paidAt:row.paid_at,
    note:row.note||'',
    createdAt:row.created_at,
    updatedAt:row.updated_at,
  }
}

function rowsForOrder(orderId) {
  return db.prepare(`
    SELECT pay.*,o.public_number
    FROM payments pay
    JOIN orders o ON o.id=pay.order_id
    WHERE pay.order_id=?
    ORDER BY pay.created_at DESC
  `).all(orderId)
}

function summary(order,rows) {
  const paid=rows.filter(item=>item.status==='paid').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const planned=rows.filter(item=>item.status==='planned').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const total=Number(order.total||0)
  return {
    orderTotal:total,
    paid,
    planned,
    remaining:Math.max(0,total-paid),
    unplanned:Math.max(0,total-paid-planned),
    currency:'RUB',
  }
}

export function listPayments(accountId,publicNumber) {
  const order=ownedOrder(accountId,publicNumber)
  const rows=rowsForOrder(order.order_id)
  return {
    items:rows.map(serialize),
    summary:summary(order,rows),
  }
}

export function createPayment(accountId,publicNumber,{kind='advance',amount,dueAt=null,note=''}={}) {
  if(!['advance','final','other'].includes(kind)){
    throw Object.assign(new Error('Некорректный тип платежа'),{status:400})
  }

  const numeric=Number(amount)
  if(!Number.isFinite(numeric)||numeric<=0){
    throw Object.assign(new Error('Сумма платежа должна быть больше нуля'),{status:400})
  }

  const order=ownedOrder(accountId,publicNumber)
  const currentRows=rowsForOrder(order.order_id)
  const currentSummary=summary(order,currentRows)
  if(numeric>currentSummary.unplanned+0.01){
    throw Object.assign(new Error('Сумма превышает нераспределённый остаток заказа'),{status:409})
  }

  const now=nowIso()
  const id=uid('pay')
  db.prepare(`
    INSERT INTO payments(id,order_id,kind,status,amount,currency,due_at,note,created_at,updated_at)
    VALUES(?,? ,?,'planned',?,'RUB',?,?,?,?)
  `).run(id,order.order_id,kind,numeric,dueAt||null,String(note||''),now,now)

  const created=ownedPayment(accountId,id)
  return serialize(created)
}

const ALLOWED_TRANSITIONS={
  planned:new Set(['planned','paid','cancelled']),
  paid:new Set(['paid']),
  cancelled:new Set(['cancelled']),
}

export function updatePaymentStatus(accountId,id,status) {
  if(!['planned','paid','cancelled'].includes(status)){
    throw Object.assign(new Error('Некорректный статус платежа'),{status:400})
  }

  const current=ownedPayment(accountId,id)
  if(!ALLOWED_TRANSITIONS[current.status]?.has(status)){
    throw Object.assign(new Error('Недопустимый переход статуса платежа'),{status:409})
  }

  if(status==='paid'){
    const order=ownedOrder(accountId,current.public_number)
    const rows=rowsForOrder(order.order_id)
    const alreadyPaid=rows
      .filter(item=>item.status==='paid'&&item.id!==id)
      .reduce((sum,item)=>sum+Number(item.amount||0),0)
    if(alreadyPaid+Number(current.amount)>Number(order.total)+0.01){
      throw Object.assign(new Error('Оплата превышает сумму заказа'),{status:409})
    }
  }

  const now=nowIso()
  const paidAt=status==='paid'&&!current.paid_at?now:current.paid_at
  db.prepare('UPDATE payments SET status=?,paid_at=?,updated_at=? WHERE id=?')
    .run(status,paidAt,now,id)

  return serialize(ownedPayment(accountId,id))
}
