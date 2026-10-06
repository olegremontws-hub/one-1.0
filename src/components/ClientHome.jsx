import { useMemo, useState } from 'react'
import { money, statusLabel } from '../domain/model.js'
import { readJSON, writeJSON } from '../lib/storage.js'

const ESTIMATOR_KEY='awhome.estimator.appointment'
const MESSENGER_KEY='awhome.client.messenger'
const CABINET_IMAGES={
  demolition:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=82',
  waste:'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1000&q=82',
  rough:'https://images.unsplash.com/photo-1590725121839-892b458a74fe?auto=format&fit=crop&w=1000&q=82',
  home:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=84',
  manager:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=82',
  profile:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=82',
}

function clientName(profile){
  if(!profile) return 'Клиент'
  return profile.fullName||profile.fio||profile.name||profile.displayName||profile.contactPerson||profile.companyName||'Клиент'
}

function firstName(value){
  const text=String(value||'').trim()
  return text?text.split(/\s+/).slice(0,2).join(' '):'Клиент'
}

function orderImage(order){
  if(order?.serviceType==='waste') return CABINET_IMAGES.waste
  if(order?.serviceType==='rough') return CABINET_IMAGES.rough
  if(order?.serviceType==='demolition'||!order?.serviceType) return CABINET_IMAGES.demolition
  return CABINET_IMAGES.home
}

function serviceTitle(order){
  if(order?.serviceType==='rough') return 'Черновой ремонт'
  if(order?.serviceType==='waste') return 'Вывоз строительного мусора'
  return 'Демонтаж'
}

function dateLabel(value){
  if(!value) return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU',{day:'2-digit',month:'short'})
}

function dateTimeLabel(value){
  if(!value) return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}

function orderProgress(order){
  const schedule=readJSON('bathdream.schedule.'+order?.id,null)
  const stages=schedule?.stages||[]
  if(stages.length){
    return Math.round(stages.reduce((sum,stage)=>sum+Number(stage.progress||0),0)/stages.length)
  }
  const fallback={draft:5,calculated:15,review:25,contract:35,work:55,acceptance:90,done:100}
  return fallback[order?.status]??10
}

function orderStage(order){
  const schedule=readJSON('bathdream.schedule.'+order?.id,null)
  const stages=schedule?.stages||[]
  const current=stages.find(stage=>stage.status==='in_progress')||stages.find(stage=>stage.status==='planned')
  if(current) return current.title
  if(order?.status==='done') return 'Работы завершены'
  if(order?.status==='acceptance') return 'Приёмка результата'
  if(order?.status==='contract') return 'Подготовка к выполнению'
  return statusLabel(order?.status)
}

function orderDocuments(order){
  return readJSON('bathdream.documents.'+order?.id,[])||[]
}

function orderPayments(order){
  return readJSON('bathdream.payments.'+order?.id,[])||[]
}

function nextAction(order){
  if(!order) return 'Создать первый проект'
  const docs=orderDocuments(order)
  const hasAcceptedOffer=docs.some(item=>item.kind==='offer'&&item.status==='signed')
  if(order.status==='calculated'&&!hasAcceptedOffer) return 'Проверить смету и оформить оферту'
  if(order.status==='review') return 'Подтвердить расчёт'
  if(order.status==='contract') return 'Подготовиться к старту работ'
  if(order.status==='work') return 'Следить за текущим этапом'
  if(order.status==='acceptance') return 'Принять результат работ'
  if(order.status==='done') return 'Заказ завершён'
  return 'Открыть карточку заказа'
}

function messageTime(value){
  const date=new Date(value)
  if(Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})
}

function Messenger({current,onOpenOrder}){
  const threads=useMemo(()=>[
    {
      id:'manager',
      avatar:'AW',
      title:'Менеджер AW HOME',
      subtitle:'Подбор услуг и вопросы',
      defaultMessage:'Здравствуйте! Здесь можно вести переписку с менеджером AW HOME по услугам и заказам.',
    },
    ...(current?[{
      id:'order-'+current.id,
      avatar:'№',
      title:'Заказ №'+current.id,
      subtitle:serviceTitle(current)+' · '+orderStage(current),
      defaultMessage:'Чат проекта создан. Сообщения по заказу №'+current.id+' будут собраны здесь.',
    }]:[]),
  ],[current])
  const [active,setActive]=useState(current?'order-'+current.id:'manager')
  const [store,setStore]=useState(()=>readJSON(MESSENGER_KEY,{})||{})
  const [draft,setDraft]=useState('')
  const thread=threads.find(item=>item.id===active)||threads[0]
  const defaults=[{id:'system-'+thread.id,side:'them',text:thread.defaultMessage,at:new Date().toISOString()}]
  const messages=store[thread.id]?.length?store[thread.id]:defaults

  const send=()=>{
    const text=draft.trim()
    if(!text) return
    const nextMessages=[...messages,{id:'msg-'+Date.now(),side:'me',text,at:new Date().toISOString()}]
    const next={...store,[thread.id]:nextMessages}
    setStore(next)
    writeJSON(MESSENGER_KEY,next)
    setDraft('')
  }

  return <section className="cabinet-messenger">
    <div className="home-section__title messenger-title">
      <div><h2>Мессенджер</h2><p>Обсуждение услуг и текущих проектов в кабинете.</p></div>
      <span>● На связи</span>
    </div>
    <div className="messenger-shell">
      <aside className="messenger-threads">
        {threads.map(item=>{
          const saved=store[item.id]
          const last=saved?.[saved.length-1]
          return <button type="button" key={item.id} className={active===item.id?'is-active':''} onClick={()=>setActive(item.id)}>
            <span className="messenger-avatar">{item.avatar}</span>
            <span className="messenger-thread-copy">
              <strong>{item.title}</strong>
              <small>{last?.text||item.subtitle}</small>
            </span>
            <span className="messenger-thread-dot"/>
          </button>
        })}
      </aside>

      <div className="messenger-chat">
        <header className="messenger-chat__head">
          <div><strong>{thread.title}</strong><span>{thread.subtitle}</span></div>
          {current&&thread.id==='order-'+current.id&&<button type="button" onClick={()=>onOpenOrder(current.id)}>Открыть заказ →</button>}
        </header>
        <div className="messenger-messages">
          {messages.map(message=><div key={message.id} className={message.side==='me'?'messenger-message is-me':'messenger-message'}>
            <p>{message.text}</p><span>{messageTime(message.at)}</span>
          </div>)}
        </div>
        <div className="messenger-compose">
          <button type="button" title="Вложение" aria-label="Добавить вложение">＋</button>
          <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') send()}} placeholder="Напишите сообщение…"/>
          <button className="messenger-send" type="button" disabled={!draft.trim()} onClick={send}>Отправить</button>
        </div>
        <small className="messenger-demo-note">MVP: переписка пока сохраняется локально в этом браузере.</small>
      </div>
    </div>
  </section>
}

function QuickMetric({label,value,caption,onClick}){
  const Tag=onClick?'button':'div'
  return <Tag className="home-metric" type={onClick?'button':undefined} onClick={onClick}>
    <span>{label}</span>
    <strong>{value}</strong>
    {caption&&<small>{caption}</small>}
  </Tag>
}

function EstimatorPlanner({appointment,onChange,onClose}){
  const [date,setDate]=useState(appointment?.date||'')
  const [time,setTime]=useState(appointment?.time||'10:00–12:00')
  const save=()=>{
    if(!date) return
    const value={date,time,createdAt:new Date().toISOString()}
    writeJSON(ESTIMATOR_KEY,value)
    onChange(value)
    onClose()
  }
  return <div className="estimator-panel">
    <div className="estimator-panel__head">
      <div><strong>Выезд сметчика</strong><span>Выберите удобную дату и интервал</span></div>
      <button type="button" onClick={onClose}>×</button>
    </div>
    <label className="field"><span>Дата</span><input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
    <div className="estimator-times">
      {['10:00–12:00','12:00–15:00','15:00–18:00','18:00–20:00'].map(slot=><button key={slot} className={time===slot?'is-active':''} type="button" onClick={()=>setTime(slot)}>{slot}</button>)}
    </div>
    <button className="button button--primary" type="button" disabled={!date} onClick={save}>Запланировать выезд</button>
  </div>
}

export default function ClientHome({
  profile,
  orders,
  onOpenOrder,
  onCreateProject,
  onDemolition,
  onWaste,
  onRough,
  onOrders,
}){
  const name=firstName(clientName(profile))
  const sorted=useMemo(()=>[...(orders||[])].sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)),[orders])
  const current=sorted.find(order=>order.status!=='done')||sorted[0]||null
  const activeOrders=sorted.filter(order=>order.status!=='done')
  const progress=current?orderProgress(current):0
  const currentDocs=current?orderDocuments(current):[]
  const currentPayments=current?orderPayments(current):[]
  const paid=currentPayments.filter(item=>item.status==='paid').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const favorites=(readJSON('awhome.marketplace.favorites',[])||[]).length
  const [appointment,setAppointment]=useState(()=>readJSON(ESTIMATOR_KEY,null))
  const [plannerOpen,setPlannerOpen]=useState(false)

  const documentSlots=[
    {kind:'offer',title:'Договор-оферта',ext:'PDF',tone:'red'},
    {kind:'estimate',title:'Смета',ext:'XLSX',tone:'green'},
    {kind:'ks2',title:'КС-2',ext:'PDF',tone:'red'},
    {kind:'act',title:'Акты работ',ext:'PDF',tone:'gold'},
  ]

  return <section className="client-home client-home--showcase">
    <section className="cabinet-profile-head">
      <div className="cabinet-profile-head__user">
        <span className="cabinet-profile-avatar" style={{backgroundImage:`url("${CABINET_IMAGES.profile}")`}}/>
        <div><small>Добро пожаловать,</small><h1>{name}</h1><span>Ваш личный кабинет AW HOME</span></div>
      </div>
      <div className="estimator-call estimator-call--cabinet">
        <span>Выезд сметчика: <b>{appointment?`${dateLabel(appointment.date)} · ${appointment.time}`:'не запланирован'}</b></span>
        <button type="button" onClick={()=>setPlannerOpen(value=>!value)}>{appointment?'Изменить':'Запланировать'}</button>
        {plannerOpen&&<EstimatorPlanner appointment={appointment} onChange={setAppointment} onClose={()=>setPlannerOpen(false)}/>}
      </div>
    </section>

    <section className="cabinet-current-project">
      <div className="cabinet-current-project__copy">
        <span>Текущий проект</span>
        <h2>{current?(current.objectLabel||serviceTitle(current)):'Создайте первый проект'}</h2>
        <p>{current?(current.address||'Адрес объекта пока не указан'):'Демонтаж, вывоз мусора и черновой ремонт доступны в калькуляторах AW HOME.'}</p>
        {current?<><div className="cabinet-stage-line"><span>{orderStage(current)}</span><b>{progress}%</b></div><div className="cabinet-stage-progress"><i style={{width:progress+'%'}}/></div></>:null}
        <button type="button" onClick={current?()=>onOpenOrder(current.id):onCreateProject}>{current?'Открыть проект →':'Создать проект →'}</button>
      </div>
      <div className="cabinet-current-project__image" style={{backgroundImage:`url("${current?orderImage(current):CABINET_IMAGES.home}")`}}/>
    </section>

    <section className="cabinet-shortcuts">
      <button type="button" onClick={onOrders}><span>▣</span><strong>Мои заказы</strong><small>{activeOrders.length} активных</small></button>
      <button type="button" onClick={current?()=>onOpenOrder(current.id):onCreateProject}><span>▤</span><strong>Документы</strong><small>{currentDocs.length} файлов</small></button>
      <button type="button"><span>♡</span><strong>Избранное</strong><small>{favorites} услуг</small></button>
      <button type="button" onClick={current?()=>onOpenOrder(current.id):onCreateProject}><span>▱</span><strong>Платежи</strong><small>{paid?money(paid)+' ₽ оплачено':'Нет оплат'}</small></button>
      <button type="button"><span>●</span><strong>Уведомления</strong><small>{activeOrders.length?'Есть активные проекты':'Новых нет'}</small></button>
    </section>

    <section className="cabinet-showcase-section">
      <div className="cabinet-section-head"><div><h2>Активные заказы</h2><p>Сроки, статус и готовность по текущим работам.</p></div><button type="button" onClick={onOrders}>Все заказы →</button></div>
      <div className="cabinet-order-list">
        {activeOrders.length?activeOrders.slice(0,3).map(order=>{
          const value=orderProgress(order)
          return <button className="cabinet-order-row" key={order.id} type="button" onClick={()=>onOpenOrder(order.id)}>
            <span className="cabinet-order-row__image" style={{backgroundImage:`url("${orderImage(order)}")`}}/>
            <span className="cabinet-order-row__copy"><small>{serviceTitle(order)}</small><strong>{order.objectLabel||'Заказ №'+order.id}</strong><i>⌖ {order.address||'Адрес не указан'}</i></span>
            <span className="cabinet-order-row__progress"><small>{orderStage(order)}</small><span><i style={{width:value+'%'}}/></span><b>{value}%</b></span>
            <span className="cabinet-order-row__price"><strong>{money(order.total||0)} ₽</strong><small>Заказ №{order.id}</small></span>
            <span className="cabinet-order-row__action">Детали →</span>
          </button>
        }):<div className="cabinet-empty-visual" style={{backgroundImage:`linear-gradient(90deg,rgba(7,23,46,.9),rgba(7,23,46,.35)),url("${CABINET_IMAGES.rough}")`}}><div><strong>Проектов пока нет</strong><span>Запустите первый расчёт — заказ появится здесь.</span><button type="button" onClick={onCreateProject}>Создать проект →</button></div></div>}
      </div>
    </section>

    <section className="cabinet-showcase-section">
      <div className="cabinet-section-head"><div><h2>Документы по проекту</h2><p>Договор, смета, КС-2 и акты собраны в одном месте.</p></div>{current&&<button type="button" onClick={()=>onOpenOrder(current.id)}>Все документы →</button>}</div>
      <div className="cabinet-document-grid">
        {documentSlots.map(slot=>{
          const doc=currentDocs.find(item=>item.kind===slot.kind)
          return <button className="cabinet-document-card" key={slot.kind} type="button" onClick={current?()=>onOpenOrder(current.id):onCreateProject}>
            <span className={'cabinet-document-icon cabinet-document-icon--'+slot.tone}>▤</span>
            <strong>{slot.title}</strong>
            <small>{doc?(doc.number||slot.ext):'Готов к формированию'}</small>
            <b>{doc?'Открыть':'Создать'} →</b>
          </button>
        })}
      </div>
    </section>

    <Messenger current={current} onOpenOrder={onOpenOrder}/>

    <section className="cabinet-showcase-section">
      <div className="cabinet-section-head"><div><h2>Быстрые услуги</h2><p>Продолжить работу по объекту без поиска по каталогу.</p></div></div>
      <div className="cabinet-service-tiles">
        <button type="button" onClick={onDemolition}><span style={{backgroundImage:`url("${CABINET_IMAGES.demolition}")`}}/><div><strong>Демонтаж</strong><small>Расчёт по помещениям</small></div></button>
        <button type="button" onClick={onWaste}><span style={{backgroundImage:`url("${CABINET_IMAGES.waste}")`}}/><div><strong>Вывоз мусора</strong><small>Объём, транспорт, утилизация</small></div></button>
        <button type="button" onClick={onRough}><span style={{backgroundImage:`url("${CABINET_IMAGES.rough}")`}}/><div><strong>Черновой ремонт</strong><small>Основания и инженерия</small></div></button>
      </div>
    </section>

    <section className="cabinet-support-banner">
      <div><small>Нужна помощь с выбором?</small><h2>Персональный менеджер разберёт проект и подберёт следующий шаг</h2><button type="button" onClick={()=>document.querySelector('.cabinet-messenger')?.scrollIntoView({behavior:'smooth'})}>Написать менеджеру →</button></div>
      <span style={{backgroundImage:`url("${CABINET_IMAGES.manager}")`}}/>
    </section>
  </section>
}
