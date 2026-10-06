import { useMemo, useState } from 'react'
import { money, statusLabel } from '../domain/model.js'
import { readJSON, writeJSON } from '../lib/storage.js'

const ESTIMATOR_KEY='awhome.estimator.appointment'
const MESSENGER_KEY='awhome.client.messenger'

function clientName(profile){
  if(!profile) return 'Клиент'
  return profile.fullName||profile.fio||profile.name||profile.displayName||profile.contactPerson||profile.companyName||'Клиент'
}

function firstName(value){
  const text=String(value||'').trim()
  return text?text.split(/\s+/).slice(0,2).join(' '):'Клиент'
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
  const totalEstimate=activeOrders.reduce((sum,order)=>sum+Number(order.total||0),0)
  const progress=current?orderProgress(current):0
  const currentDocs=current?orderDocuments(current):[]
  const currentPayments=current?orderPayments(current):[]
  const acceptedOffer=currentDocs.find(item=>item.kind==='offer'&&item.status==='signed')
  const ks2=currentDocs.find(item=>item.kind==='ks2')
  const paid=currentPayments.filter(item=>item.status==='paid').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const planned=currentPayments.filter(item=>item.status==='planned').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const recent=sorted.slice(0,4)
  const projects=sorted.slice(0,8)
  const [appointment,setAppointment]=useState(()=>readJSON(ESTIMATOR_KEY,null))
  const [plannerOpen,setPlannerOpen]=useState(false)

  return <section className="client-home">
    <div className="client-home__welcome">
      <div>
        <p className="eyebrow">Кабинет заказчика AW HOME</p>
        <h1>Доброе утро, {name}!</h1>
        <p>Здесь собраны проекты, сметы, документы и ход выполнения работ.</p>
      </div>
      <div className="estimator-call">
        <span>Вызов сметчика: <b>{appointment?`${dateLabel(appointment.date)} · ${appointment.time}`:'Не выбрано'}</b></span>
        <button className="secondary-button" type="button" onClick={()=>setPlannerOpen(value=>!value)}>
          {appointment?'Изменить время':'Время приезда сметчика'}
        </button>
        {plannerOpen&&<EstimatorPlanner appointment={appointment} onChange={setAppointment} onClose={()=>setPlannerOpen(false)}/>}
      </div>
    </div>

    <div className="home-metrics">
      <QuickMetric label="Активные заказы" value={activeOrders.length} caption={activeOrders.length?'Открыть список':'Заказов пока нет'} onClick={onOrders}/>
      <QuickMetric label="Сумма активных смет" value={totalEstimate?money(totalEstimate)+' ₽':'—'} caption="По текущим заказам"/>
      <QuickMetric label="Готовность текущего проекта" value={current?progress+'%':'—'} caption={current?orderStage(current):'Создайте проект'} onClick={current?()=>onOpenOrder(current.id):onCreateProject}/>
      <QuickMetric label="Следующее действие" value={current?nextAction(current):'Создать проект'} caption={current?'Заказ №'+current.id:'Выберите услугу'} onClick={current?()=>onOpenOrder(current.id):onCreateProject}/>
    </div>

    <Messenger current={current} onOpenOrder={onOpenOrder}/>

    <section className="home-section">
      <div className="home-section__title">
        <div>
          <h2>Недавние действия</h2>
          <p>Актуальная информация по проектам, документам и выполнению работ.</p>
        </div>
        <button className="home-text-action" type="button" onClick={onOrders}>Все заказы →</button>
      </div>

      <div className="recent-grid recent-grid--complete">
        <article className="recent-info-card recent-activity-card">
          <span className="recent-info-card__icon">↗</span>
          <div>
            <strong>Последние изменения</strong>
            <div className="activity-list">
              {recent.length?recent.map(order=><button type="button" key={order.id} onClick={()=>onOpenOrder(order.id)}>
                <span><b>№{order.id}</b> · {serviceTitle(order)}</span>
                <small>{dateTimeLabel(order.updatedAt||order.createdAt)}</small>
              </button>):<p>После создания заказа здесь появятся последние действия.</p>}
            </div>
          </div>
        </article>

        {current?<button className="current-order-card current-order-card--wide" type="button" onClick={()=>onOpenOrder(current.id)}>
          <div className="current-order-card__top">
            <span>Заказ № {current.id}</span>
            <small>{statusLabel(current.status)}</small>
          </div>
          <strong>{serviceTitle(current)}</strong>
          <p>{current.address||'Адрес не указан'}</p>
          <div className="home-order-progress"><span style={{width:progress+'%'}}/></div>
          <div className="current-order-card__stats">
            <span><small>Готовность</small><b>{progress}%</b></span>
            <span><small>Смета</small><b>{money(current.total||0)} ₽</b></span>
            <span><small>Этап</small><b>{orderStage(current)}</b></span>
          </div>
          <div className="current-order-card__bottom">
            <span>{dateLabel(current.createdAt)} → {dateLabel(current.updatedAt)}</span>
            <b>Перейти →</b>
          </div>
        </button>:<article className="current-order-card current-order-card--empty">
          <span>Текущий заказ</span>
          <strong>Пока нет активных заказов</strong>
          <p>Новый проект появится здесь после первого расчёта.</p>
        </article>}

        <button className="new-project-card" type="button" onClick={onCreateProject}>
          <span className="new-project-card__plus">＋</span>
          <strong>Создать новый заказ</strong>
          <small>Демонтаж · вывоз · черновой ремонт</small>
        </button>
      </div>
    </section>

    {current&&<section className="home-section project-control">
      <div className="home-section__title">
        <div><h2>Текущий проект</h2><p>Смета, договор, оплаты и выполнение в одном блоке.</p></div>
        <button className="home-text-action" type="button" onClick={()=>onOpenOrder(current.id)}>Открыть карточку →</button>
      </div>
      <div className="project-control__grid">
        <article className="project-control-card">
          <span className="project-control-card__icon">₽</span>
          <div><small>Смета</small><strong>{money(current.total||0)} ₽</strong><p>{current.priceBook?`${current.priceBook.code} v${current.priceBook.version}`:'Расчёт заказа'}</p></div>
        </article>
        <article className="project-control-card">
          <span className="project-control-card__icon">§</span>
          <div><small>Договор-оферта</small><strong>{acceptedOffer?'Принята':'Не принята'}</strong><p>{acceptedOffer?acceptedOffer.number:'Можно сформировать в документах заказа'}</p></div>
        </article>
        <article className="project-control-card">
          <span className="project-control-card__icon">✓</span>
          <div><small>КС-2</small><strong>{ks2?(ks2.status==='signed'?'Принят':'Сформирован'):'Нет документа'}</strong><p>{ks2?ks2.number:'Формируется после акцепта оферты'}</p></div>
        </article>
        <article className="project-control-card">
          <span className="project-control-card__icon">₽</span>
          <div><small>Оплата</small><strong>{paid?money(paid)+' ₽':'Нет оплат'}</strong><p>{planned?`Запланировано ещё ${money(planned)} ₽`:'План оплат появится в заказе'}</p></div>
        </article>
        <article className="project-control-card project-control-card--progress">
          <span className="project-control-card__icon">→</span>
          <div><small>Ход выполнения</small><strong>{progress}%</strong><p>{orderStage(current)}</p><div className="mini-progress"><span style={{width:progress+'%'}}/></div></div>
        </article>
        <button className="project-control-card project-control-card--action" type="button" onClick={()=>onOpenOrder(current.id)}>
          <span className="project-control-card__icon">↗</span>
          <div><small>Следующее действие</small><strong>{nextAction(current)}</strong><p>Перейти в заказ →</p></div>
        </button>
      </div>
    </section>}

    <section className="home-section">
      <div className="home-section__title">
        <div><h2>Основные услуги</h2><p>Быстрый запуск расчёта по вашему объекту.</p></div>
      </div>
      <div className="home-core-services">
        <button type="button" onClick={onDemolition}>
          <span>01</span><div><strong>Демонтаж</strong><p>Помещения → геометрия → работы → смета → мусор</p></div><b>Рассчитать →</b>
        </button>
        <button type="button" onClick={onWaste}>
          <span>02</span><div><strong>Вывоз строительного мусора</strong><p>Объём → условия → транспорт → утилизация → цена</p></div><b>Рассчитать →</b>
        </button>
        <button type="button" onClick={onRough}>
          <span>03</span><div><strong>Черновой ремонт</strong><p>Геометрия → инженерия → основания → смета</p></div><b>Рассчитать →</b>
        </button>
      </div>
    </section>

    <section className="home-section">
      <div className="home-section__title"><h2>Дополнительные услуги</h2><button className="home-text-action" type="button">Смотреть все →</button></div>
      <div className="extra-services">
        {[
          ['Клининг','CL','Скоро',null],
          ['Утилизация строймусора','UT','Заказать',onWaste],
          ['Видео-наблюдение','VD','Скоро',null],
          ['Установка сигнализации','SG','Скоро',null],
          ['Химчистка','HC','Скоро',null],
        ].map(([title,code,action,handler])=><button className="extra-service-card" key={title} type="button" onClick={handler||undefined}>
          <span className={'extra-service-card__visual extra-service-card__visual--'+code.toLowerCase()}>{code}</span>
          <span className="extra-service-card__content"><strong>{title}</strong><small>{action}</small></span>
        </button>)}
      </div>
    </section>

    <section className="home-section home-catalog">
      <div className="catalog-tabs">
        <button className="is-active" type="button">Проекты</button>
        <button type="button">Объекты</button>
        <button type="button">Отзывы</button>
        <button type="button">Товары</button>
      </div>
      <div className="catalog-toolbar">
        <div>
          <button type="button">Все категории ({Math.max(orders?.length||0,3)})⌄</button>
          <button type="button">Размеры⌄</button>
          <button type="button">Статус⌄</button>
        </div>
        <button className="catalog-see-all" type="button" onClick={onOrders}>Смотреть все →</button>
      </div>

      <div className="project-masonry">
        {projects.length?projects.map((order,index)=>{
          const tileProgress=orderProgress(order)
          return <button className={'project-tile project-tile--'+((index%4)+1)} key={order.id} type="button" onClick={()=>onOpenOrder(order.id)}>
            <div className="project-tile__image">
              <span>{serviceTitle(order)}</span>
              <b>№ {order.id}</b>
              <div className="project-tile__progress"><i style={{width:tileProgress+'%'}}/></div>
            </div>
            <strong>{order.objectLabel||serviceTitle(order)}</strong>
            <p>{order.address||'Адрес объекта'}</p>
            <div className="project-tile__footer"><span>{money(order.total||0)} ₽</span><small>{tileProgress}%</small></div>
          </button>
        }):[
          ['Санузел','Проект ванной комнаты'],
          ['Квартира','Черновой ремонт'],
          ['Объект','Демонтаж и подготовка'],
          ['Сервис','Вывоз строймусора'],
        ].map(([tag,title],index)=><article className={'project-tile project-tile--'+((index%4)+1)} key={title}>
          <div className="project-tile__image"><span>{tag}</span><b>AW HOME</b></div>
          <strong>{title}</strong>
          <p>Создайте заказ, чтобы здесь появился проект.</p>
          <span>— ₽</span>
        </article>)}
      </div>

      <button className="load-more" type="button" onClick={onOrders}>Загрузить ещё</button>
    </section>
  </section>
}
