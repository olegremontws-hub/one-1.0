import { db, nowIso, transaction, uid } from './db.mjs'

const DEFAULT_STAGES=[
  'Подготовка объекта',
  'Демонтажные работы',
  'Вынос и погрузка',
  'Вывоз и утилизация',
  'Финальная уборка и подготовка к приёмке',
]

function ownedOrder(accountId,publicNumber){
  const row=db.prepare(`
    SELECT o.id AS order_id,o.public_number,o.status,o.total
    FROM orders o
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND o.public_number=?
  `).get(accountId,Number(publicNumber))
  if(!row) throw Object.assign(new Error('Заказ не найден'),{status:404})
  return row
}

function ownedStage(accountId,id){
  const row=db.prepare(`
    SELECT ws.*,o.public_number
    FROM work_stages ws
    JOIN orders o ON o.id=ws.order_id
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND ws.id=?
  `).get(accountId,id)
  if(!row) throw Object.assign(new Error('Этап не найден'),{status:404})
  return row
}

function ownedAcceptance(accountId,id){
  const row=db.prepare(`
    SELECT ar.*,o.public_number
    FROM acceptance_records ar
    JOIN orders o ON o.id=ar.order_id
    JOIN projects p ON p.id=o.project_id
    JOIN client_profiles cp ON cp.id=p.client_id
    WHERE cp.account_id=? AND ar.id=?
  `).get(accountId,id)
  if(!row) throw Object.assign(new Error('Приёмка не найдена'),{status:404})
  return row
}

function serializeStage(row){
  return {
    id:row.id,
    orderNumber:String(row.public_number||''),
    sequence:Number(row.sequence),
    title:row.title,
    status:row.status,
    progress:Number(row.progress||0),
    plannedStart:row.planned_start,
    plannedEnd:row.planned_end,
    actualStart:row.actual_start,
    actualEnd:row.actual_end,
    note:row.note||'',
    createdAt:row.created_at,
    updatedAt:row.updated_at,
  }
}

function serializeAcceptance(row){
  return {
    id:row.id,
    orderNumber:String(row.public_number||''),
    status:row.status,
    note:row.note||'',
    createdAt:row.created_at,
    respondedAt:row.responded_at,
  }
}

function stageRows(orderId){
  return db.prepare(`
    SELECT ws.*,o.public_number
    FROM work_stages ws
    JOIN orders o ON o.id=ws.order_id
    WHERE ws.order_id=?
    ORDER BY ws.sequence
  `).all(orderId)
}

function acceptanceRows(orderId){
  return db.prepare(`
    SELECT ar.*,o.public_number
    FROM acceptance_records ar
    JOIN orders o ON o.id=ar.order_id
    WHERE ar.order_id=?
    ORDER BY ar.created_at DESC
  `).all(orderId)
}

function summary(order,rows){
  const count=rows.length
  const progress=count?Math.round(rows.reduce((sum,row)=>sum+Number(row.progress||0),0)/count):0
  const done=rows.filter(row=>row.status==='done').length
  const current=rows.find(row=>row.status==='in_progress')||rows.find(row=>row.status==='planned')||null
  return {
    orderStatus:order.status,
    progress,
    totalStages:count,
    completedStages:done,
    currentStage:current?serializeStage(current):null,
    canRequestAcceptance:count>0&&done===count,
  }
}

export function getSchedule(accountId,publicNumber){
  const order=ownedOrder(accountId,publicNumber)
  const rows=stageRows(order.order_id)
  const acceptances=acceptanceRows(order.order_id).map(serializeAcceptance)
  return {
    stages:rows.map(serializeStage),
    summary:summary(order,rows),
    acceptance:acceptances[0]||null,
    acceptanceHistory:acceptances,
  }
}

export function initializeSchedule(accountId,publicNumber,{plannedStart=null}={}){
  const order=ownedOrder(accountId,publicNumber)
  const existing=stageRows(order.order_id)
  if(existing.length) return getSchedule(accountId,publicNumber)

  const base=plannedStart?new Date(plannedStart+'T00:00:00'):new Date()
  if(Number.isNaN(base.getTime())) throw Object.assign(new Error('Некорректная дата начала'),{status:400})
  const now=nowIso()

  transaction(()=>{
    DEFAULT_STAGES.forEach((title,index)=>{
      const start=new Date(base)
      start.setDate(start.getDate()+index)
      const end=new Date(start)
      end.setDate(end.getDate()+1)
      db.prepare(`
        INSERT INTO work_stages(
          id,order_id,sequence,title,status,progress,planned_start,planned_end,created_at,updated_at
        ) VALUES(?,?,?,?, 'planned',0,?,?,?,?)
      `).run(
        uid('stage'),order.order_id,index+1,title,
        start.toISOString().slice(0,10),end.toISOString().slice(0,10),now,now
      )
    })
  })()

  return getSchedule(accountId,publicNumber)
}

export function updateStage(accountId,id,patch={}){
  const current=ownedStage(accountId,id)
  const allowed=['planned','in_progress','done','blocked']
  const status=patch.status??current.status
  if(!allowed.includes(status)) throw Object.assign(new Error('Некорректный статус этапа'),{status:400})

  let progress=patch.progress===undefined?Number(current.progress):Number(patch.progress)
  if(!Number.isFinite(progress)||progress<0||progress>100) throw Object.assign(new Error('Прогресс должен быть от 0 до 100'),{status:400})
  if(status==='done') progress=100
  if(status==='planned'&&patch.progress===undefined) progress=0

  const now=nowIso()
  let actualStart=current.actual_start
  let actualEnd=current.actual_end
  if(status==='in_progress'&&!actualStart) actualStart=now
  if(status==='done'&&!actualStart) actualStart=now
  if(status==='done'&&!actualEnd) actualEnd=now
  if(status!=='done'&&current.status==='done'&&status!=='done') actualEnd=null

  db.prepare(`
    UPDATE work_stages
    SET status=?,progress=?,planned_start=?,planned_end=?,actual_start=?,actual_end=?,note=?,updated_at=?
    WHERE id=?
  `).run(
    status,Math.round(progress),
    patch.plannedStart===undefined?current.planned_start:(patch.plannedStart||null),
    patch.plannedEnd===undefined?current.planned_end:(patch.plannedEnd||null),
    actualStart,actualEnd,
    patch.note===undefined?current.note:String(patch.note||''),
    now,id
  )

  const order=ownedOrder(accountId,current.public_number)
  const rows=stageRows(order.order_id)
  const allDone=rows.length>0&&rows.every(row=>row.status==='done')
  const anyStarted=rows.some(row=>row.status==='in_progress'||row.status==='done')
  const nextOrderStatus=allDone?'acceptance':anyStarted?'work':order.status
  db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(nextOrderStatus,now,order.order_id)

  return getSchedule(accountId,current.public_number)
}

export function requestAcceptance(accountId,publicNumber,note=''){
  const order=ownedOrder(accountId,publicNumber)
  const rows=stageRows(order.order_id)
  if(!rows.length||!rows.every(row=>row.status==='done')){
    throw Object.assign(new Error('Сначала завершите все этапы работ'),{status:409})
  }
  const pending=db.prepare("SELECT * FROM acceptance_records WHERE order_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").get(order.order_id)
  if(pending) throw Object.assign(new Error('Приёмка уже ожидает ответа'),{status:409})

  const now=nowIso()
  const id=uid('accept')
  transaction(()=>{
    db.prepare(`
      INSERT INTO acceptance_records(id,order_id,status,note,created_at)
      VALUES(?,?,'pending',?,?)
    `).run(id,order.order_id,String(note||''),now)
    db.prepare("UPDATE orders SET status='acceptance',updated_at=? WHERE id=?").run(now,order.order_id)
  })()

  return getSchedule(accountId,publicNumber)
}

export function respondAcceptance(accountId,id,status,note=''){
  if(!['accepted','changes_requested','cancelled'].includes(status)){
    throw Object.assign(new Error('Некорректный статус приёмки'),{status:400})
  }
  const current=ownedAcceptance(accountId,id)
  if(current.status!=='pending') throw Object.assign(new Error('Приёмка уже завершена'),{status:409})

  const now=nowIso()
  const nextOrderStatus=status==='accepted'?'done':'work'
  transaction(()=>{
    db.prepare('UPDATE acceptance_records SET status=?,note=?,responded_at=? WHERE id=?')
      .run(status,String(note||''),now,id)
    db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?')
      .run(nextOrderStatus,now,current.order_id)
  })()

  return getSchedule(accountId,current.public_number)
}
