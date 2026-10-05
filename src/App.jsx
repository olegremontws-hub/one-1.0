import { useEffect, useMemo, useRef, useState } from 'react'
import CreateOrder from './components/CreateOrder.jsx'
import CreateRoughOrder from './components/CreateRoughOrder.jsx'
import CreateWasteOrder from './components/CreateWasteOrder.jsx'
import ExecutionHierarchyMap from './components/ExecutionHierarchyMap.jsx'
import ClientHome from './components/ClientHome.jsx'
import MarketplaceHome from './components/MarketplaceHome.jsx'
import {
  CLIENT_TYPES, ORDER_STATUSES, PROFILE_FIELDS, WASTE_REMOVAL_TYPES, buildEstimateRows, buildRoughEstimateRows, cloneOrder, money,
  statusLabel, validateOrder, validateProfileField,
} from './domain/model.js'
import { makeBackup, downloadBackup, readBackupFile } from './lib/backup.js'
import {
  REMOTE_ENABLED, createOrderDocument, createOrderPayment, hasRemoteSession, initializeOrderSchedule,
  loadActivePricing, loadOrderDocuments, loadOrderHistory, loadOrderPayments, loadOrderSchedule,
  loadRemoteState, logoutRemote, requestOrderAcceptance, requestOrderApproval, requestRemoteOtp,
  respondOrderAcceptance, respondOrderApproval, saveRemoteProfile, saveRemoteState,
  updateRemoteDocumentStatus, updateRemotePaymentStatus, updateRemoteWorkStage, verifyRemoteOtp,
} from './lib/remote.js'
import { readJSON, removeKey, writeJSON } from './lib/storage.js'

const ACCOUNT_KEY='bathdream.account'
const ORDERS_KEY='bathdream.orders'

function Header({authenticated,onHome,onCabinet,onOrders,onCreateOrder,onLogout}) {
  return <header className="topbar">
    <div className="topbar__inner">
      <button className="brand brand-button" type="button" onClick={authenticated?onHome:undefined} aria-label="AW HOME">
        <img className="brand__logo" src={`${import.meta.env.BASE_URL}aw-home-logo.svg`} alt="AW HOME"/>
      </button>
      <div className="topbar__meta">
        <a className="phone" href="tel:88003338837">8 (800) 333 88 37</a>
        <button className="city" type="button">Москва⌄</button>
        {authenticated&&<button className="nav-link" type="button" onClick={onHome}>Маркетплейс</button>}
        {authenticated&&<button className="nav-link" type="button" onClick={onCabinet}>Кабинет</button>}
        {authenticated&&<button className="nav-link" type="button" onClick={onOrders}>Мои заказы</button>}
        {authenticated&&<button className="project-create-nav" type="button" onClick={onCreateOrder}>＋ Создать проект</button>}
        {authenticated&&<div className="header-balance"><span>Баланс</span><strong>— ₽</strong></div>}
        {authenticated&&<button className="header-utility" type="button" title="Уведомления">✉</button>}
        {authenticated?<button className="header-profile" type="button" onClick={onLogout} title="Выйти">◎</button>:<span className="text-button">Войти</span>}
      </div>
    </div>
  </header>
}

function StepMeta({current,total=4}) {
  return <div className="step-meta"><span>Регистрация: шаг {current} из {total}</span><div className="step-meta__track"><span style={{width:`${(current/total)*100}%`}}/></div></div>
}

function PrimaryButton({children,disabled=false,onClick}) {
  return <button className="button button--primary" disabled={disabled} onClick={onClick} type="button">{children}</button>
}

function Tabs({value,onChange}) {
  return <div className="tabs">
    <button className={value==='phone'?'tabs__item is-active':'tabs__item'} onClick={()=>onChange('phone')} type="button">Номер телефона</button>
    <button className={value==='email'?'tabs__item is-active':'tabs__item'} onClick={()=>onChange('email')} type="button">Электронная почта</button>
  </div>
}

function AuthStep({method,setMethod,contact,setContact,onNext,busy,error}) {
  const isPhone=method==='phone'
  const valid=isPhone?contact.replace(/\D/g,'').length>=11:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  return <>
    <StepMeta current={1}/>
    <div className="page-heading"><p className="eyebrow">Клиент AW HOME</p><h1>Создайте аккаунт</h1><p>Сохраняйте расчёты, создавайте заказы и возвращайтесь к ним с этого устройства.</p></div>
    <Tabs value={method} onChange={next=>{setMethod(next);setContact('')}}/>
    <label className="field"><span>{isPhone?'Номер телефона':'Электронная почта'}</span><input autoFocus inputMode={isPhone?'tel':'email'} placeholder={isPhone?'+7 999 123-45-67':'name@example.ru'} value={contact} onChange={e=>setContact(e.target.value)}/></label>
    {error&&<div className="notice notice--error">{error}</div>}
    <PrimaryButton disabled={!valid||busy} onClick={onNext}>{busy?'Отправляем…':isPhone?'Получить код':'Продолжить'}</PrimaryButton>
    <p className="legal">Продолжая, вы соглашаетесь с <a href="#">Лицензионным соглашением</a> и <a href="#">Положением о защите персональных данных</a>.</p>
  </>
}

function VerifyStep({contact,method,onBack,onNext,onResend,busy,error,devCode}) {
  const [digits,setDigits]=useState(['','','',''])
  const refs=[useRef(null),useRef(null),useRef(null),useRef(null)]
  const setDigit=(index,value)=>{
    const digit=value.replace(/\D/g,'').slice(-1)
    const next=[...digits]; next[index]=digit; setDigits(next)
    if(digit&&index<3) refs[index+1].current?.focus()
  }
  return <>
    <StepMeta current={2}/>
    <button className="back-link" type="button" onClick={onBack}>← Назад</button>
    <div className="page-heading"><p className="eyebrow">Подтверждение</p><h1>Введите полученный код</h1><p>{method==='phone'?'Мы отправили SMS на ':'Мы отправили письмо на '}<strong>{contact}</strong></p></div>
    <div className="otp">{digits.map((digit,index)=><input key={index} ref={refs[index]} value={digit} inputMode="numeric" maxLength={1} onChange={e=>setDigit(index,e.target.value)} onKeyDown={e=>{if(e.key==='Backspace'&&!digits[index]&&index>0) refs[index-1].current?.focus()}} aria-label={`Цифра ${index+1}`}/>)}</div>
    <div className="inline-row"><span className="muted">Не получили код?</span><button className="link-button" type="button" disabled={busy} onClick={onResend}>Запросить повторно</button></div>
    {devCode&&<p className="dev-code">Демо-код OTP: <strong>{devCode}</strong></p>}
    {error&&<div className="notice notice--error">{error}</div>}
    <PrimaryButton disabled={!digits.every(Boolean)||busy} onClick={()=>onNext(digits.join(''))}>{busy?'Проверяем…':'Подтвердить'}</PrimaryButton>
    {!REMOTE_ENABLED&&<p className="hint">В автономном режиме подходит любой четырёхзначный код.</p>}
  </>
}

function ClientTypeStep({value,onChange,onBack,onNext}) {
  return <>
    <StepMeta current={3}/>
    <button className="back-link" type="button" onClick={onBack}>← Назад</button>
    <div className="page-heading"><p className="eyebrow">Тип клиента</p><h1>Как оформить ваши заказы?</h1><p>Тип клиента определяет состав реквизитов для договора и документов.</p></div>
    <div className="choice-list">{CLIENT_TYPES.map(item=><button className={value===item.id?'choice-card is-selected':'choice-card'} key={item.id} onClick={()=>onChange(item.id)} type="button"><span className="choice-card__radio"/><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div>
    <PrimaryButton disabled={!value} onClick={onNext}>Продолжить</PrimaryButton>
  </>
}

function ProfileStep({type,contact,method,onBack,onNext,busy,error}) {
  const fields=PROFILE_FIELDS[type]||[]
  const initial=useMemo(()=>Object.fromEntries(fields.map(field=>[field.key,field.key==='city'?'Москва':''])),[type])
  const [values,setValues]=useState(initial)
  const errors=Object.fromEntries(fields.map(field=>[field.key,validateProfileField(field,values[field.key])]))
  const valid=fields.every(field=>!errors[field.key])

  return <>
    <StepMeta current={4}/>
    <button className="back-link" type="button" onClick={onBack}>← Назад</button>
    <div className="page-heading"><p className="eyebrow">{CLIENT_TYPES.find(item=>item.id===type)?.title}</p><h1>Данные клиента</h1><p>На регистрации собираем только минимальные данные. Расширенные реквизиты можно будет добавить перед договором.</p></div>
    <div className="form-grid">
      {fields.map(field=><label className="field" key={field.key}><span>{field.label}</span><input placeholder={field.placeholder} value={values[field.key]||''} onChange={e=>setValues(current=>({...current,[field.key]:e.target.value}))}/>{values[field.key]&&errors[field.key]&&<small className="field-error">{errors[field.key]}</small>}</label>)}
      <label className="field field--readonly"><span>{method==='phone'?'Подтверждённый телефон':'Подтверждённая почта'}</span><input value={contact} readOnly/></label>
    </div>
    {error&&<div className="notice notice--error">{error}</div>}
    <PrimaryButton disabled={!valid||busy} onClick={()=>onNext(values)}>{busy?'Сохраняем…':'Создать аккаунт'}</PrimaryButton>
  </>
}

function ServicesPage({onDemolition,onWaste,onRough}) {
  return <section className="services-page">
    <div className="services-hero">
      <p className="eyebrow">Услуги AW HOME</p>
      <h1>Что нужно сделать?</h1>
      <p>Выберите услугу. У каждой услуги свой расчёт и отдельный сценарий заказа.</p>
    </div>

    <div className="services-grid">
      <button className="service-card service-card--demolition" type="button" onClick={onDemolition}>
        <div className="service-card__top"><span className="service-card__number">01</span><span className="service-card__badge">Расчёт по помещениям</span></div>
        <div className="service-card__symbol">Д</div>
        <div className="service-card__content">
          <h2>Демонтаж</h2>
          <p>Расчёт демонтажных работ по помещениям: геометрия, объёмы, смета, мусор и логистика.</p>
          <span className="service-card__action">Перейти к услуге <b>→</b></span>
        </div>
      </button>

      <button className="service-card service-card--waste" type="button" onClick={onWaste}>
        <div className="service-card__top"><span className="service-card__number">02</span><span className="service-card__badge">Отдельная услуга</span></div>
        <div className="service-card__symbol">В</div>
        <div className="service-card__content">
          <h2>Вывоз строительного мусора</h2>
          <p>Отдельный заказ на вывоз: адрес, этаж, лифт, объём отходов, погрузка, транспорт и утилизация.</p>
          <span className="service-card__action">Перейти к услуге <b>→</b></span>
        </div>
      </button>

      <button className="service-card service-card--rough" type="button" onClick={onRough}>
        <div className="service-card__top"><span className="service-card__number">03</span><span className="service-card__badge">Расчёт по помещениям</span></div>
        <div className="service-card__symbol">Ч</div>
        <div className="service-card__content">
          <h2>Черновой ремонт</h2>
          <p>Черновые работы по полу, стенам, потолку, перегородкам, электрике и сантехнике с расчётом по помещениям.</p>
          <span className="service-card__action">Рассчитать ремонт <b>→</b></span>
        </div>
      </button>
    </div>
  </section>
}

function WasteRemovalService({onBack}) {
  return <section className="workspace service-workspace">
    <button className="back-link" type="button" onClick={onBack}>← Все услуги</button>
    <div className="workspace__head">
      <div>
        <p className="eyebrow">Услуга 02</p>
        <h1>Вывоз строительного мусора</h1>
        <p className="workspace__subtitle">Самостоятельная услуга без обязательного заказа на демонтаж.</p>
      </div>
    </div>

    <div className="waste-service-grid">
      <article className="detail-card">
        <p className="eyebrow">Для расчёта</p>
        <h2>Что нужно от клиента</h2>
        <div className="service-checklist">
          <span>01 · Адрес объекта</span>
          <span>02 · Этаж и наличие лифта</span>
          <span>03 · Примерный объём или количество мешков</span>
          <span>04 · Тип строительного мусора</span>
        </div>
      </article>
      <article className="detail-card">
        <p className="eyebrow">Состав услуги</p>
        <h2>Что считаем</h2>
        <div className="service-checklist">
          <span>Вынос с объекта</span>
          <span>Погрузку</span>
          <span>Транспорт</span>
          <span>Утилизацию</span>
        </div>
      </article>
    </div>

    <div className="service-next">
      <strong>Услуга выделена в отдельный контур</strong>
      <span>Следующим шагом добавим короткий калькулятор вывоза: объём → этаж → машина → стоимость.</span>
    </div>
  </section>
}

function StatusBadge({status}) {
  return <span className={`status status--${status||'draft'}`}>{statusLabel(status)}</span>
}

function OrdersDashboard({orders,onCreateOrder,onMarketplace,onOpenOrder,onEditOrder,onDuplicate,onDelete,onExport,onImport,notice,storageMode}) {
  const inputRef=useRef(null)
  const marketplaceOrders=(readJSON('awhome.marketplace.requests',[])||[])
    .slice()
    .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))
  const hasAny=orders.length>0||marketplaceOrders.length>0

  return <section className="workspace">
    <div className="workspace__head">
      <div><p className="eyebrow">Кабинет клиента</p><h1>Мои заказы</h1><p className="workspace__subtitle">Ремонтные проекты и заявки маркетплейса собраны в одном разделе.</p></div>
      <div className="orders-head-actions">
        <button className="secondary-button" type="button" onClick={onMarketplace}>Маркетплейс</button>
        <button className="button button--compact" type="button" onClick={onCreateOrder}>+ Создать проект</button>
      </div>
    </div>

    <div className="data-toolbar">
      <div><strong>Данные MVP</strong><span>{storageMode==='online'?'API подключён · серверное хранилище':storageMode==='connecting'?'Подключение к API…':storageMode==='error'?'API недоступен · локальный режим':storageMode==='api'?'API настроен · войдите для синхронизации':'Локальное хранилище браузера'}</span></div>
      <div className="data-toolbar__actions">
        <button type="button" onClick={onExport}>Экспорт JSON</button>
        <button type="button" onClick={()=>inputRef.current?.click()}>Импорт JSON</button>
        <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={e=>{const file=e.target.files?.[0]; if(file) onImport(file); e.target.value=''}}/>
      </div>
    </div>

    {notice&&<div className={`notice notice--${notice.type}`}>{notice.text}</div>}

    {!hasAny?<div className="empty-state"><div className="empty-state__icon">＋</div><h2>Заказов пока нет</h2><p>Выберите услугу в маркетплейсе или создайте ремонтный проект.</p><div className="empty-state-actions"><button className="button button--primary empty-state__button" type="button" onClick={onMarketplace}>Открыть маркетплейс</button><button className="secondary-button" type="button" onClick={onCreateOrder}>Создать проект</button></div></div>:<>
      {marketplaceOrders.length>0&&<section className="market-orders">
        <div className="market-orders__head"><div><p className="eyebrow">Маркетплейс</p><h2>Заявки на услуги</h2></div><span>{marketplaceOrders.length}</span></div>
        <div className="market-order-grid">
          {marketplaceOrders.map(request=><article className="market-order-card" key={request.id}>
            <div className="market-order-card__top">
              <div><span className="market-order-status">Новая заявка</span><small>{request.sectionTitle||'AW HOME'}</small><h3>{request.serviceTitle}</h3></div>
              <strong>{request.estimate?.total?money(request.estimate.total)+' ₽':'по запросу'}</strong>
            </div>
            <dl>
              <div><dt>Номер</dt><dd>{request.id}</dd></div>
              <div><dt>Адрес</dt><dd>{request.address||'—'}</dd></div>
              <div><dt>Дата</dt><dd>{request.date?request.date+' · '+(request.time||''):'—'}</dd></div>
              <div><dt>Объект</dt><dd>{request.objectType||'—'}{request.area?' · '+request.area+' м²':''}</dd></div>
            </dl>
            <div className="market-order-card__bottom">
              <span>Исполнитель: {request.performer==='choose'?'выберу сам':'подберёт AW HOME'}</span>
              <button type="button" onClick={onMarketplace}>К услуге →</button>
            </div>
          </article>)}
        </div>
      </section>}

      {orders.length>0&&<section className="project-orders">
        <div className="market-orders__head"><div><p className="eyebrow">Проекты</p><h2>Ремонт и стройка</h2></div><span>{orders.length}</span></div>
        <div className="order-list">{orders.map(order=><article className="order-card" key={order.id}>
          <div className="order-card__top"><div><StatusBadge status={order.status}/><small className="order-service-label">{order.serviceType==='rough'?'Черновой ремонт':order.serviceType==='waste'?'Вывоз мусора':'Демонтаж'}</small><h2>Заказ №{order.id}</h2></div><strong>{money(order.total)} ₽</strong></div>
          <dl>
            <div><dt>Объект</dt><dd>{order.objectLabel||'—'}</dd></div>
            <div><dt>Адрес</dt><dd>{order.address||'—'}</dd></div>
            {order.serviceType==='waste'
              ? <div><dt>Объём</dt><dd>{Number(order.wasteRemoval?.calculation?.volume||0).toFixed(2)} м³</dd></div>
              : <div><dt>Помещения</dt><dd>{order.rooms?.length||0}</dd></div>}
          </dl>
          <div className="order-card__actions">
            <button className="secondary-button secondary-button--inline" type="button" onClick={()=>onOpenOrder(order.id)}>Открыть</button>
            <button className="secondary-button secondary-button--inline" type="button" onClick={()=>onEditOrder(order.id)}>Редактировать</button>
            <button className="secondary-button secondary-button--inline" type="button" onClick={()=>onDuplicate(order.id)}>Дублировать</button>
            <button className="danger-link" type="button" onClick={()=>onDelete(order.id)}>Удалить</button>
          </div>
        </article>)}</div>
      </section>}
    </>}
  </section>
}

const DOCUMENT_KIND_META={
  offer:{label:'Договор-оферта / Смарт-смета',short:'Оферта'},
  ks2:{label:'Акт по форме КС-2',short:'КС-2'},
  quote:{label:'Коммерческое предложение',short:'КП'},
  contract:{label:'Договор',short:'Договор'},
  act:{label:'Акт выполненных работ',short:'Акт'},
}
const DOCUMENT_STATUS_LABELS={
  draft:'Черновик',
  issued:'Выпущен',
  signed:'Подписан',
  cancelled:'Отменён',
}

async function sha256Text(value){
  if(!globalThis.crypto?.subtle) return 'local-preview'
  const bytes=new TextEncoder().encode(value)
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes)
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('')
}

function localDocumentEstimate(order){
  if(order.serviceType==='waste'){
    const calc=order.wasteRemoval?.calculation||{}
    return [
      ['WST-CARRY','Вынос с объекта','услуга',1,Number(calc.carry||0)],
      ['WST-LOAD','Погрузка','услуга',1,Number(calc.loading||0)],
      ['WST-TRN','Транспорт','услуга',1,Number(calc.transport||0)],
      ['WST-DSP','Утилизация','услуга',1,Number(calc.disposal||0)],
      ['WST-DIST','Дальний пронос','услуга',1,Number(calc.distanceFee||0)],
    ].filter(([, , , ,sum])=>sum>0).map(([code,name,unit,quantity,sum])=>({code,name,roomName:'Объект',unit,quantity,rate:sum,sum}))
  }
  return order.serviceType==='rough'
    ? buildRoughEstimateRows(order.rooms||[],order.roughRepair||{},order.rates||{})
    : buildEstimateRows(order.rooms||[],order.demolition||{},order.rates||{})
}

async function makeLocalDocument(kind,order,existing=[]){
  const meta=DOCUMENT_KIND_META[kind]
  const version=existing.filter(item=>item.kind===kind).length+1
  const prefix=kind==='offer'?'ОФ':kind==='ks2'?'КС2':kind==='quote'?'КП':kind==='contract'?'ДОГ':'АКТ'
  const number=`${prefix}-${order.id}-${String(version).padStart(2,'0')}`
  const estimate=localDocumentEstimate(order).map(item=>({
    code:item.code,name:item.name,room:item.roomName||'Объект',unit:item.unit,
    quantity:Number(item.quantity||0),rate:Number(item.rate||0),sum:Number(item.sum||0),
  }))
  const canonical=JSON.stringify({
    publicNumber:String(order.id),serviceType:order.serviceType||'demolition',
    address:order.address||'',estimate,total:Number(order.total||0),priceBook:order.priceBook||null,
  })
  const hash=await sha256Text(canonical)
  const now=new Date().toISOString()
  const baseOrder={
    publicNumber:String(order.id),
    serviceType:order.serviceType||'demolition',
    serviceLabel:order.serviceLabel||'Демонтаж',
    objectLabel:order.objectLabel||order.serviceLabel||'Объект',
    address:order.address||'',
    floor:order.floor||'',
    lift:order.lift||'yes',
    estimate,
    totals:{work:Number(order.workTotal||0),logistics:Number(order.logistics?.total||0),total:Number(order.total||0)},
    priceBook:order.priceBook||null,
  }
  const common={
    generatedAt:now,
    client:{displayName:'Клиент AW HOME'},
    order:baseOrder,
    smartContract:{
      estimateHash:hash,algorithm:'SHA-256',immutableSnapshot:true,
      acceptanceRule:'Принятие оферты фиксирует эту версию сметы. Изменения оформляются новой версией.',
    },
    disclaimer:'Черновик Bath Dream. Перед коммерческим использованием договор-оферта и печатная форма должны быть проверены юристом и бухгалтером.',
  }

  let extra={}
  if(kind==='offer'){
    extra={
      purpose:'Договор-оферта на выполнение услуг по зафиксированной смете Bath Dream.',
      offer:{
        subject:`Услуга «${baseOrder.serviceLabel}» на объекте ${baseOrder.address||'из заказа'} в составе зафиксированной сметы.`,
        price:baseOrder.totals.total,
        acceptance:'Акцепт выполняется кнопкой «Принять оферту». Фиксируются версия документа, смета, сумма и время принятия.',
        changeRule:'Любое изменение состава, количества, ставки или суммы требует новой версии сметы и оферты.',
      },
      sections:['Стороны и реквизиты','Предмет оферты','Зафиксированная смета','Цена и расчёты','Акцепт','Приёмка результата'],
    }
  } else if(kind==='ks2'){
    const signedOffer=existing.find(item=>item.kind==='offer'&&item.status==='signed')
    if(!signedOffer) throw new Error('Сначала примите договор-оферту по этой смете')
    const rows=estimate.map((item,index)=>({
      number:index+1,estimatePosition:index+1,name:item.name,rateCode:item.code,
      unit:item.unit,quantity:item.quantity,unitPrice:item.rate,amount:item.sum,
    }))
    extra={
      purpose:'Акт о приёмке выполненных работ, сформированный по структуре формы КС-2.',
      ks2:{
        form:'КС-2',okud:'0322005',documentNumber:number,date:now.slice(0,10),
        customer:'Клиент AW HOME',contractor:'Bath Dream',
        object:`${baseOrder.objectLabel} · ${baseOrder.address||'—'}`,
        contractReference:signedOffer?.number||null,
        estimatedContractValue:baseOrder.totals.total,
        reportingPeriod:{from:(order.createdAt||now).slice(0,10),to:now.slice(0,10)},
        rows,total:rows.reduce((sum,row)=>sum+row.amount,0),
      },
      sections:['Заказчик и подрядчик','Объект','Договорная стоимость','Отчётный период','Таблица выполненных работ','Итого','Сдал / Принял'],
    }
  } else {
    extra={
      purpose:kind==='quote'?'Предварительное коммерческое предложение по заказу Bath Dream':kind==='contract'?'Договор на выполнение согласованного объёма работ':'Акт выполненных работ по заказу Bath Dream.',
      sections:['Клиент и объект','Состав работ','Стоимость','Итог'],
    }
  }

  return {
    id:`local-doc-${Date.now()}-${kind}`,kind,number,version,status:'draft',
    title:meta.label,content:{...common,...extra},createdAt:now,updatedAt:now,issuedAt:null,signedAt:null,
  }
}

function Ks2Preview({data}){
  if(!data) return null
  return <div className="ks2-sheet">
    <div className="ks2-sheet__head">
      <div><strong>АКТ О ПРИЁМКЕ ВЫПОЛНЕННЫХ РАБОТ</strong><span>Форма № КС-2 · ОКУД {data.okud}</span></div>
      <div><span>№ {data.documentNumber||'—'}</span><span>{data.date||'—'}</span></div>
    </div>
    <div className="ks2-sheet__meta">
      <p><b>Заказчик:</b> {data.customer||'—'}</p>
      <p><b>Подрядчик:</b> {data.contractor||'—'}</p>
      <p><b>Объект:</b> {data.object||'—'}</p>
      <p><b>Основание:</b> {data.contractReference||'договор / оферта не указаны'}</p>
      <p><b>Договорная стоимость:</b> {money(data.estimatedContractValue||0)} ₽</p>
      <p><b>Отчётный период:</b> {data.reportingPeriod?.from||'—'} — {data.reportingPeriod?.to||'—'}</p>
    </div>
    <div className="ks2-table">
      <div className="ks2-row ks2-row--head"><span>№</span><span>Поз. сметы</span><span>Наименование работ</span><span>Расценка</span><span>Ед.</span><span>Кол-во</span><span>Цена</span><span>Стоимость</span></div>
      {(data.rows||[]).map(row=><div className="ks2-row" key={row.number}>
        <span>{row.number}</span><span>{row.estimatePosition||row.number}</span><span>{row.name}</span><span>{row.rateCode||'—'}</span><span>{row.unit}</span>
        <span>{Number(row.quantity||0).toFixed(2)}</span><span>{money(row.unitPrice||0)}</span><strong>{money(row.amount||0)} ₽</strong>
      </div>)}
    </div>
    <div className="ks2-sheet__total"><span>Всего по акту</span><strong>{money(data.total||0)} ₽</strong></div>
    <div className="ks2-signatures"><span>Сдал ____________________</span><span>Принял ____________________</span></div>
  </div>
}

function DocumentsPanel({order,onStatusChange}) {
  const orderNumber=order.id
  const localKey='bathdream.documents.'+orderNumber
  const [documents,setDocuments]=useState(()=>REMOTE_ENABLED?[]:readJSON(localKey,[]))
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')

  const persistLocal=next=>{
    setDocuments(next)
    writeJSON(localKey,next)
  }

  const refresh=async()=>{
    if(!REMOTE_ENABLED){
      setDocuments(readJSON(localKey,[]))
      return
    }
    setError('')
    try {
      const list=await loadOrderDocuments(orderNumber)
      setDocuments(Array.isArray(list)?list:[])
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось загрузить документы')
    }
  }

  useEffect(()=>{refresh()},[orderNumber])

  const create=async kind=>{
    setBusy('create-'+kind);setError('')
    try {
      if(REMOTE_ENABLED){
        const created=await createOrderDocument(orderNumber,kind)
        setDocuments(current=>[created,...current])
      } else {
        const created=await makeLocalDocument(kind,order,documents)
        persistLocal([created,...documents])
      }
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось создать документ')
    } finally {
      setBusy('')
    }
  }

  const changeStatus=async(doc,status)=>{
    setBusy(doc.id);setError('')
    try {
      if(REMOTE_ENABLED){
        const updated=await updateRemoteDocumentStatus(doc.id,status)
        setDocuments(current=>current.map(item=>item.id===doc.id?updated:item))
      } else {
        const now=new Date().toISOString()
        const updated={...doc,status,updatedAt:now,issuedAt:status==='issued'?(doc.issuedAt||now):doc.issuedAt,signedAt:status==='signed'?(doc.signedAt||now):doc.signedAt}
        persistLocal(documents.map(item=>item.id===doc.id?updated:item))
      }
      if(doc.kind==='offer'&&status==='signed') onStatusChange?.('contract')
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось изменить статус документа')
    } finally {
      setBusy('')
    }
  }

  return <section className="detail-card detail-card--wide documents-block">
    <div className="documents-head">
      <div>
        <p className="eyebrow">Документы и смарт-смета</p>
        <h2>Оферта · КС-2 · Документы заказа</h2>
        <p className="muted">Оферта фиксирует снимок сметы и её SHA-256. После акцепта изменения оформляются только новой версией.</p>
      </div>
      <button className="button button--soft" type="button" onClick={refresh}>Обновить</button>
    </div>

    <div className="smart-contract-strip">
      <div><span>Сценарий</span><strong>Смета → Оферта → Акцепт → Выполнение → КС-2</strong></div>
      <small>{REMOTE_ENABLED?'Серверная фиксация документов':'Preview: документы сохраняются локально в браузере'}</small>
    </div>

    <div className="document-create-row">
      {['offer','ks2'].map(kind=>{
        const meta=DOCUMENT_KIND_META[kind]
        const acceptedOffer=documents.some(item=>item.kind==='offer'&&item.status==='signed')
        const disabled=Boolean(busy)||(kind==='ks2'&&!acceptedOffer)
        return <button
          key={kind}
          className="button button--compact document-create-primary"
          type="button"
          disabled={disabled}
          title={kind==='ks2'&&!acceptedOffer?'Сначала примите договор-оферту':''}
          onClick={()=>create(kind)}
        >{busy==='create-'+kind?'Формируем…':kind==='offer'?'+ Договор-оферта':'+ КС-2'}</button>
      })}
    </div>

    {error&&<div className="notice notice--error">{error}</div>}

    {documents.length===0?<div className="document-empty">Сформируйте договор-оферту, чтобы зафиксировать текущую смету.</div>:
    <div className="document-list">{documents.map(doc=>{
      const snapshot=doc.content||{}
      const snapshotOrder=snapshot.order||{}
      const isOffer=doc.kind==='offer'
      const isKs2=doc.kind==='ks2'
      return <article className="document-card" key={doc.id}>
        <div className="document-card__head">
          <div><strong>{doc.title}</strong><span>{doc.number} · версия {doc.version}</span></div>
          <span className={'document-status document-status--'+doc.status}>{isOffer&&doc.status==='signed'?'Акцептована':DOCUMENT_STATUS_LABELS[doc.status]||doc.status}</span>
        </div>

        <dl className="document-meta">
          <div><dt>Заказ</dt><dd>№{snapshotOrder.publicNumber||orderNumber}</dd></div>
          <div><dt>Сумма</dt><dd>{money(snapshotOrder.totals?.total||0)} ₽</dd></div>
          <div><dt>Создан</dt><dd>{new Date(doc.createdAt).toLocaleString('ru-RU')}</dd></div>
          <div><dt>Прайс</dt><dd>{snapshotOrder.priceBook?`${snapshotOrder.priceBook.code} v${snapshotOrder.priceBook.version}`:'—'}</dd></div>
        </dl>

        {snapshot.smartContract?.estimateHash&&<div className="smart-hash">
          <span>SHA-256 сметы</span>
          <code>{snapshot.smartContract.estimateHash}</code>
          <small>{snapshot.smartContract.acceptanceRule}</small>
        </div>}

        {isOffer&&snapshot.offer&&<div className="offer-preview">
          <h3>Договор-оферта</h3>
          <p><b>Предмет:</b> {snapshot.offer.subject}</p>
          <p><b>Цена:</b> {money(snapshot.offer.price||0)} ₽</p>
          <p><b>Акцепт:</b> {snapshot.offer.acceptance}</p>
          <p><b>Изменения:</b> {snapshot.offer.changeRule}</p>
        </div>}

        {isKs2&&<Ks2Preview data={snapshot.ks2}/>}

        {!isOffer&&!isKs2&&<details className="document-preview">
          <summary>Состав документа</summary>
          <div className="document-preview__body">
            <p><strong>Клиент:</strong> {snapshot.client?.displayName||'—'}</p>
            <p><strong>Объект:</strong> {snapshotOrder.objectLabel||'—'} · {snapshotOrder.address||'—'}</p>
            <p><strong>Назначение:</strong> {snapshot.purpose||'—'}</p>
            <div className="document-preview__sections">{(snapshot.sections||[]).map(section=><span key={section}>{section}</span>)}</div>
          </div>
        </details>}

        <p className="document-disclaimer">{snapshot.disclaimer}</p>

        <div className="document-actions">
          {doc.status==='draft'&&<button type="button" disabled={busy===doc.id} onClick={()=>changeStatus(doc,'issued')}>Выпустить</button>}
          {doc.status==='issued'&&<button type="button" disabled={busy===doc.id} onClick={()=>changeStatus(doc,'signed')}>
            {isOffer?'Принять оферту':isKs2?'Принять КС-2':'Отметить подписанным'}
          </button>}
          {(doc.status==='draft'||doc.status==='issued')&&<button className="danger-link" type="button" disabled={busy===doc.id} onClick={()=>changeStatus(doc,'cancelled')}>Отменить</button>}
          {doc.status==='signed'&&<span className="document-signed">{isOffer?'✓ Оферта акцептована · смета зафиксирована':isKs2?'✓ КС-2 принят':'✓ Документ зафиксирован как подписанный'}</span>}
        </div>
      </article>
    })}</div>}
  </section>
}


const PAYMENT_KIND_LABELS={
  advance:'Аванс',
  final:'Финальный платёж',
  other:'Другой платёж',
}
const PAYMENT_STATUS_LABELS={
  planned:'Запланирован',
  paid:'Оплачен',
  cancelled:'Отменён',
}

function PaymentsPanel({orderNumber}) {
  const [data,setData]=useState({items:[],summary:{}})
  const [amount,setAmount]=useState('')
  const [kind,setKind]=useState('advance')
  const [dueAt,setDueAt]=useState('')
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')

  const refresh=async()=>{
    if(!REMOTE_ENABLED) return
    setError('')
    try {
      const next=await loadOrderPayments(orderNumber)
      setData(next||{items:[],summary:{}})
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось загрузить оплаты')
    }
  }

  useEffect(()=>{refresh()},[orderNumber])

  const create=async()=>{
    const numeric=Number(String(amount).replace(',','.'))
    if(!numeric||numeric<=0){
      setError('Введите сумму платежа')
      return
    }
    setBusy('create');setError('')
    try {
      await createOrderPayment(orderNumber,{kind,amount:numeric,dueAt:dueAt||null})
      setAmount('')
      setDueAt('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось создать платёж')
    } finally {
      setBusy('')
    }
  }

  const changeStatus=async(payment,status)=>{
    setBusy(payment.id);setError('')
    try {
      await updateRemotePaymentStatus(payment.id,status)
      await refresh()
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось изменить платёж')
    } finally {
      setBusy('')
    }
  }

  if(!REMOTE_ENABLED) return <section className="detail-card detail-card--wide payments-block">
    <p className="eyebrow">Оплата</p>
    <h2>План платежей</h2>
    <p className="muted">Оплаты доступны в full-stack режиме с серверной БД.</p>
  </section>

  const summary=data.summary||{}
  return <section className="detail-card detail-card--wide payments-block">
    <div className="payments-head">
      <div><p className="eyebrow">Оплата</p><h2>План платежей</h2><p className="muted">Планируем аванс и финальный платёж, затем фиксируем фактическую оплату.</p></div>
      <button className="button button--soft" type="button" onClick={refresh}>Обновить</button>
    </div>

    <div className="payment-kpis">
      <div><span>Заказ</span><strong>{money(summary.orderTotal||0)} ₽</strong></div>
      <div><span>Оплачено</span><strong>{money(summary.paid||0)} ₽</strong></div>
      <div><span>Запланировано</span><strong>{money(summary.planned||0)} ₽</strong></div>
      <div><span>Остаток</span><strong>{money(summary.remaining||0)} ₽</strong></div>
    </div>

    <div className="payment-create">
      <label className="field"><span>Тип</span><select value={kind} onChange={e=>setKind(e.target.value)}>
        {Object.entries(PAYMENT_KIND_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="field"><span>Сумма, ₽</span><input inputMode="decimal" placeholder="50 000" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.,]/g,''))}/></label>
      <label className="field"><span>Плановая дата</span><input type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></label>
      <button className="button button--compact payment-create__button" type="button" disabled={Boolean(busy)||Number(summary.unplanned||0)<=0} onClick={create}>{busy==='create'?'Сохраняем…':'+ Добавить платёж'}</button>
    </div>

    {error&&<div className="notice notice--error">{error}</div>}

    {(data.items||[]).length===0?<div className="document-empty">Платежей пока нет.</div>:
    <div className="payment-list">{data.items.map(payment=><article className="payment-row" key={payment.id}>
      <div><strong>{PAYMENT_KIND_LABELS[payment.kind]||payment.kind}</strong><span>{payment.dueAt?'до '+new Date(payment.dueAt+'T00:00:00').toLocaleDateString('ru-RU'):'без даты'}</span></div>
      <strong>{money(payment.amount)} ₽</strong>
      <span className={'payment-status payment-status--'+payment.status}>{PAYMENT_STATUS_LABELS[payment.status]||payment.status}</span>
      <div className="payment-row__actions">
        {payment.status==='planned'&&<button type="button" disabled={busy===payment.id} onClick={()=>changeStatus(payment,'paid')}>Отметить оплаченным</button>}
        {payment.status==='planned'&&<button className="danger-link" type="button" disabled={busy===payment.id} onClick={()=>changeStatus(payment,'cancelled')}>Отменить</button>}
        {payment.status==='paid'&&<span className="document-signed">✓ {payment.paidAt?new Date(payment.paidAt).toLocaleDateString('ru-RU'):'Оплачено'}</span>}
      </div>
    </article>)}</div>}
  </section>
}


const APPROVAL_STATUS_LABELS={
  pending:'Ожидает подтверждения',
  approved:'Согласовано',
  rejected:'Нужны изменения',
  cancelled:'Отменено',
}

function ApprovalAuditPanel({order,onStatusChange}) {
  const [history,setHistory]=useState({revisions:[],events:[],approvals:[]})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [note,setNote]=useState('')

  const refresh=async()=>{
    if(!REMOTE_ENABLED) return
    setError('')
    try {
      const data=await loadOrderHistory(order.id)
      setHistory(data||{revisions:[],events:[],approvals:[]})
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось загрузить историю заказа')
    }
  }

  useEffect(()=>{refresh()},[order.id])

  const request=async()=>{
    setBusy('request');setError('')
    try {
      await requestOrderApproval(order.id)
      onStatusChange('review')
      await refresh()
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось зафиксировать версию на согласование')
    } finally {
      setBusy('')
    }
  }

  const respond=async(approval,status)=>{
    setBusy(approval.id);setError('')
    try {
      await respondOrderApproval(approval.id,status,note)
      onStatusChange(status==='approved'?'contract':'calculated')
      setNote('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось завершить согласование')
    } finally {
      setBusy('')
    }
  }

  if(!REMOTE_ENABLED){
    return <section className="detail-card detail-card--wide approval-block">
      <p className="eyebrow">Согласование и история</p>
      <h2>Текущая локальная версия</h2>
      <p className="muted">Заказ сохранён {order.updatedAt?new Date(order.updatedAt).toLocaleString('ru-RU'):'в этом браузере'}. Полная история версий и подтверждение клиента доступны в full-stack режиме.</p>
    </section>
  }

  const pending=(history.approvals||[]).find(item=>item.status==='pending')
  const latestRevision=history.revisions?.[0]
  const recentRevisions=(history.revisions||[]).slice(0,6)

  return <section className="detail-card detail-card--wide approval-block">
    <div className="approval-head">
      <div>
        <p className="eyebrow">Согласование и история</p>
        <h2>{pending?'Версия ожидает подтверждения':'История заказа'}</h2>
        <p className="muted">Каждое содержательное изменение создаёт серверную версию. На согласование уходит неизменяемый снимок конкретной версии.</p>
      </div>
      <button className="button button--soft" type="button" onClick={refresh}>Обновить</button>
    </div>

    <div className="approval-kpis">
      <div><span>Текущая версия</span><strong>v{latestRevision?.version||1}</strong></div>
      <div><span>Изменений</span><strong>{history.revisions?.length||0}</strong></div>
      <div><span>Согласований</span><strong>{history.approvals?.length||0}</strong></div>
      <div><span>Статус</span><strong>{pending?'На согласовании':statusLabel(order.status)}</strong></div>
    </div>

    {error&&<div className="notice notice--error">{error}</div>}

    {pending?<div className="approval-current">
      <div>
        <span className="approval-badge">Версия v{pending.revisionVersion}</span>
        <strong>{APPROVAL_STATUS_LABELS[pending.status]}</strong>
        <small>Зафиксирована {new Date(pending.createdAt).toLocaleString('ru-RU')} · сумма {money(pending.snapshot?.total||0)} ₽</small>
      </div>
      <label className="field approval-note"><span>Комментарий, если нужны изменения</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Например: изменить объём демонтажа"/></label>
      <div className="approval-actions">
        <button className="button button--primary button--compact" type="button" disabled={Boolean(busy)} onClick={()=>respond(pending,'approved')}>Подтвердить расчёт</button>
        <button className="button button--soft" type="button" disabled={Boolean(busy)} onClick={()=>respond(pending,'rejected')}>Нужны изменения</button>
      </div>
    </div>:<div className="approval-start">
      <div><strong>Расчёт готов к фиксации</strong><span>Создадим снимок текущей версии сметы. Последующие изменения пойдут уже в новую версию.</span></div>
      <button className="button button--compact" type="button" disabled={Boolean(busy)||!latestRevision} onClick={request}>{busy==='request'?'Фиксируем…':'Зафиксировать на согласование'}</button>
    </div>}

    <div className="revision-list">
      <h3>Последние версии</h3>
      {recentRevisions.length===0?<p className="muted">История появится после первой серверной синхронизации заказа.</p>:recentRevisions.map(revision=>{
        const changes=Object.values(revision.change||{})
        return <article className="revision-row" key={revision.id}>
          <div className="revision-row__version">v{revision.version}</div>
          <div className="revision-row__body">
            <strong>{revision.version===1?'Создан заказ':changes.length?changes.map(item=>item.label).join(' · '):'Сохранена версия'}</strong>
            <span>{new Date(revision.createdAt).toLocaleString('ru-RU')}</span>
            {changes.length>0&&revision.version>1&&<div className="revision-changes">{changes.slice(0,5).map((item,index)=><small key={index}>{item.label}: {String(item.from??'—')} → {String(item.to??'—')}</small>)}</div>}
          </div>
          <strong>{money(revision.snapshot?.total||0)} ₽</strong>
        </article>
      })}
    </div>

    {(history.approvals||[]).length>0&&<div className="approval-history">
      <h3>Согласования</h3>
      {(history.approvals||[]).slice(0,5).map(item=><div className="approval-history__row" key={item.id}>
        <span>v{item.revisionVersion}</span>
        <strong>{APPROVAL_STATUS_LABELS[item.status]||item.status}</strong>
        <small>{new Date(item.respondedAt||item.createdAt).toLocaleString('ru-RU')}</small>
        {item.note&&<em>{item.note}</em>}
      </div>)}
    </div>}
  </section>
}


const STAGE_STATUS_LABELS={
  planned:'Запланирован',
  in_progress:'В работе',
  done:'Завершён',
  blocked:'Пауза',
}
const ACCEPTANCE_LABELS={
  pending:'Ожидает приёмки',
  accepted:'Принято',
  changes_requested:'Нужны исправления',
  cancelled:'Отменено',
}
const LOCAL_STAGE_TITLES=[
  'Подготовка объекта',
  'Демонтажные работы',
  'Вынос и погрузка',
  'Вывоз и утилизация',
  'Финальная уборка и подготовка к приёмке',
]
const ROUGH_STAGE_TITLES=[
  'Подготовка и разметка',
  'Черновая электрика и сантехника',
  'Перегородки и основания',
  'Полы, стены и потолки',
  'Контроль качества и подготовка к приёмке',
]
const WASTE_STAGE_TITLES=[
  'Подтверждение заказа и подачи',
  'Вынос с объекта',
  'Погрузка',
  'Вывоз и утилизация',
  'Подтверждение завершения',
]

function makeLocalSchedule(orderNumber,serviceType='demolition'){
  const today=new Date()
  const titles=serviceType==='rough'?ROUGH_STAGE_TITLES:serviceType==='waste'?WASTE_STAGE_TITLES:LOCAL_STAGE_TITLES
  const stages=titles.map((title,index)=>{
    const start=new Date(today); start.setDate(start.getDate()+index)
    const end=new Date(start); end.setDate(end.getDate()+1)
    return {
      id:'local-stage-'+orderNumber+'-'+(index+1),
      sequence:index+1,title,status:'planned',progress:0,
      plannedStart:start.toISOString().slice(0,10),
      plannedEnd:end.toISOString().slice(0,10),
      actualStart:null,actualEnd:null,note:'',
    }
  })
  return {stages,acceptance:null,acceptanceHistory:[]}
}

function localScheduleSummary(schedule,orderStatus){
  const stages=schedule?.stages||[]
  const completed=stages.filter(stage=>stage.status==='done').length
  const progress=stages.length?Math.round(stages.reduce((sum,stage)=>sum+Number(stage.progress||0),0)/stages.length):0
  const current=stages.find(stage=>stage.status==='in_progress')||stages.find(stage=>stage.status==='planned')||null
  return {
    orderStatus,
    progress,
    totalStages:stages.length,
    completedStages:completed,
    currentStage:current,
    canRequestAcceptance:stages.length>0&&completed===stages.length,
  }
}

function WorkProgressPanel({order,onStatusChange}){
  const localKey='bathdream.schedule.'+order.id
  const [data,setData]=useState(()=>{
    if(REMOTE_ENABLED) return {stages:[],summary:{},acceptance:null,acceptanceHistory:[]}
    const saved=readJSON(localKey,null)
    const base=saved||{stages:[],acceptance:null,acceptanceHistory:[]}
    return {...base,summary:localScheduleSummary(base,order.status)}
  })
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [acceptNote,setAcceptNote]=useState('')

  const saveLocal=next=>{
    const withSummary={...next,summary:localScheduleSummary(next,next.acceptance?.status==='accepted'?'done':next.acceptance?.status==='pending'?'acceptance':order.status)}
    setData(withSummary)
    writeJSON(localKey,{stages:withSummary.stages,acceptance:withSummary.acceptance,acceptanceHistory:withSummary.acceptanceHistory||[]})
    return withSummary
  }

  const refresh=async()=>{
    if(!REMOTE_ENABLED) return
    setError('')
    try {
      const next=await loadOrderSchedule(order.id)
      setData(next)
      if(next?.summary?.orderStatus) onStatusChange(next.summary.orderStatus)
    } catch(err) {
      setError(err instanceof Error?err.message:'Не удалось загрузить график работ')
    }
  }

  useEffect(()=>{ if(REMOTE_ENABLED) refresh() },[order.id])

  const initialize=async()=>{
    setBusy('init');setError('')
    try {
      if(REMOTE_ENABLED){
        const next=await initializeOrderSchedule(order.id,{})
        setData(next)
      } else {
        saveLocal(makeLocalSchedule(order.id,order.serviceType))
      }
    } catch(err) {
      setError(err instanceof Error?err.message:'Не удалось создать график')
    } finally {
      setBusy('')
    }
  }

  const updateStage=async(stage,patch)=>{
    setBusy(stage.id);setError('')
    try {
      if(REMOTE_ENABLED){
        const next=await updateRemoteWorkStage(stage.id,patch)
        setData(next)
        if(next?.summary?.orderStatus) onStatusChange(next.summary.orderStatus)
      } else {
        const now=new Date().toISOString()
        const nextStages=data.stages.map(item=>{
          if(item.id!==stage.id) return item
          const status=patch.status??item.status
          let progress=patch.progress??item.progress
          if(status==='done') progress=100
          if(status==='planned'&&patch.progress===undefined) progress=0
          return {
            ...item,...patch,status,progress,
            actualStart:(status==='in_progress'||status==='done')&&!item.actualStart?now:item.actualStart,
            actualEnd:status==='done'&&!item.actualEnd?now:(status!=='done'?null:item.actualEnd),
          }
        })
        const allDone=nextStages.length>0&&nextStages.every(item=>item.status==='done')
        const anyStarted=nextStages.some(item=>item.status==='in_progress'||item.status==='done')
        const nextStatus=allDone?'acceptance':anyStarted?'work':order.status
        saveLocal({...data,stages:nextStages})
        onStatusChange(nextStatus)
      }
    } catch(err) {
      setError(err instanceof Error?err.message:'Не удалось обновить этап')
    } finally {
      setBusy('')
    }
  }

  const requestAcceptance=async()=>{
    setBusy('acceptance');setError('')
    try {
      if(REMOTE_ENABLED){
        const next=await requestOrderAcceptance(order.id,acceptNote)
        setData(next);onStatusChange('acceptance')
      } else {
        const acceptance={
          id:'local-accept-'+Date.now(),status:'pending',note:acceptNote,
          createdAt:new Date().toISOString(),respondedAt:null,
        }
        saveLocal({...data,acceptance,acceptanceHistory:[acceptance,...(data.acceptanceHistory||[])]})
        onStatusChange('acceptance')
      }
      setAcceptNote('')
    } catch(err) {
      setError(err instanceof Error?err.message:'Не удалось начать приёмку')
    } finally {
      setBusy('')
    }
  }

  const respondAcceptance=async status=>{
    const current=data.acceptance
    if(!current) return
    setBusy('acceptance');setError('')
    try {
      if(REMOTE_ENABLED){
        const next=await respondOrderAcceptance(current.id,status,acceptNote)
        setData(next)
        onStatusChange(status==='accepted'?'done':'work')
      } else {
        const updated={...current,status,note:acceptNote||current.note,respondedAt:new Date().toISOString()}
        saveLocal({...data,acceptance:updated,acceptanceHistory:(data.acceptanceHistory||[]).map(item=>item.id===updated.id?updated:item)})
        onStatusChange(status==='accepted'?'done':'work')
      }
      setAcceptNote('')
    } catch(err) {
      setError(err instanceof Error?err.message:'Не удалось завершить приёмку')
    } finally {
      setBusy('')
    }
  }

  const summary=data.summary||localScheduleSummary(data,order.status)
  const stages=data.stages||[]
  const acceptance=data.acceptance

  return <section className="detail-card detail-card--wide progress-block">
    <div className="progress-head">
      <div><p className="eyebrow">Ход выполнения</p><h2>График работ</h2><p className="muted">План, фактический прогресс и приёмка результата в одном месте.</p></div>
      {stages.length>0&&<button className="button button--soft" type="button" onClick={REMOTE_ENABLED?refresh:()=>{}}>Прогресс {summary.progress||0}%</button>}
    </div>

    {error&&<div className="notice notice--error">{error}</div>}

    <ExecutionHierarchyMap order={order} stages={stages} acceptance={acceptance}/>

    {stages.length===0?<div className="progress-empty">
      <div><strong>График ещё не создан</strong><span>Создадим базовые этапы выбранной услуги. Даты и ход можно менять по мере выполнения.</span></div>
      <button className="button button--compact" type="button" disabled={busy==='init'} onClick={initialize}>{busy==='init'?'Создаём…':'Создать график работ'}</button>
    </div>:<>
      <div className="progress-summary">
        <div className="progress-ring"><strong>{summary.progress||0}%</strong><span>готово</span></div>
        <div className="progress-summary__body">
          <div className="progress-bar"><span style={{width:(summary.progress||0)+'%'}}/></div>
          <div className="progress-stats">
            <span>Завершено: <strong>{summary.completedStages||0} из {summary.totalStages||stages.length}</strong></span>
            <span>Текущий этап: <strong>{summary.currentStage?.title||'Все этапы завершены'}</strong></span>
          </div>
        </div>
      </div>

      <div className="stage-list">{stages.map(stage=><article className={'stage-card stage-card--'+stage.status} key={stage.id}>
        <div className="stage-card__seq">{stage.sequence}</div>
        <div className="stage-card__body">
          <div className="stage-card__head"><strong>{stage.title}</strong><span>{STAGE_STATUS_LABELS[stage.status]||stage.status}</span></div>
          <div className="stage-card__dates">
            <span>План: {stage.plannedStart?new Date(stage.plannedStart+'T00:00:00').toLocaleDateString('ru-RU'):'—'} — {stage.plannedEnd?new Date(stage.plannedEnd+'T00:00:00').toLocaleDateString('ru-RU'):'—'}</span>
            {stage.actualStart&&<span>Старт: {new Date(stage.actualStart).toLocaleDateString('ru-RU')}</span>}
          </div>
          <div className="stage-progress"><span style={{width:(stage.progress||0)+'%'}}/></div>
        </div>
        <div className="stage-card__actions">
          {stage.status==='planned'&&<button type="button" disabled={busy===stage.id} onClick={()=>updateStage(stage,{status:'in_progress',progress:10})}>Начать</button>}
          {stage.status==='in_progress'&&<button type="button" disabled={busy===stage.id} onClick={()=>updateStage(stage,{progress:Math.min(90,(stage.progress||0)+25)})}>+25%</button>}
          {(stage.status==='in_progress'||stage.status==='blocked')&&<button type="button" disabled={busy===stage.id} onClick={()=>updateStage(stage,{status:'done'})}>Завершить</button>}
          {stage.status==='in_progress'&&<button className="stage-pause" type="button" disabled={busy===stage.id} onClick={()=>updateStage(stage,{status:'blocked'})}>Пауза</button>}
          {stage.status==='blocked'&&<button type="button" disabled={busy===stage.id} onClick={()=>updateStage(stage,{status:'in_progress'})}>Продолжить</button>}
          {stage.status==='done'&&acceptance?.status==='changes_requested'
            ? <button type="button" disabled={busy===stage.id} onClick={()=>updateStage(stage,{status:'in_progress',progress:75})}>Возобновить</button>
            : stage.status==='done'&&<span className="stage-done">✓ Готово</span>}
        </div>
      </article>)}</div>

      {summary.canRequestAcceptance&&(!acceptance||acceptance.status==='changes_requested'||acceptance.status==='cancelled')&&<div className="acceptance-box">
        <div><strong>Все этапы завершены</strong><span>Зафиксируйте результат и перейдите к приёмке.</span></div>
        <label className="field"><span>Комментарий к приёмке</span><input value={acceptNote} onChange={e=>setAcceptNote(e.target.value)} placeholder="Например: объект готов к осмотру"/></label>
        <button className="button button--compact" type="button" disabled={busy==='acceptance'} onClick={requestAcceptance}>Передать на приёмку</button>
      </div>}

      {acceptance&&<div className={'acceptance-box acceptance-box--'+acceptance.status}>
        <div><span className="approval-badge">{ACCEPTANCE_LABELS[acceptance.status]||acceptance.status}</span><strong>Приёмка результата</strong><span>{acceptance.note||'Проверьте результат выполнения заказа.'}</span></div>
        {acceptance.status==='pending'&&<>
          <label className="field"><span>Комментарий</span><input value={acceptNote} onChange={e=>setAcceptNote(e.target.value)} placeholder="Комментарий по результату"/></label>
          <div className="acceptance-actions">
            <button className="button button--primary button--compact" type="button" disabled={busy==='acceptance'} onClick={()=>respondAcceptance('accepted')}>Принять работы</button>
            <button className="button button--soft" type="button" disabled={busy==='acceptance'} onClick={()=>respondAcceptance('changes_requested')}>Нужны исправления</button>
          </div>
        </>}
        {acceptance.status==='accepted'&&<span className="document-signed">✓ Работы приняты, заказ завершён</span>}
        {acceptance.status==='changes_requested'&&<span className="muted">Возобновите нужный этап, внесите исправления и после завершения отправьте результат на повторную приёмку.</span>}
      </div>}
    </>}
  </section>
}

function WasteOrderDetails({order,onBack,onEdit,onStatusChange,onDuplicate,onDelete}) {
  const waste=order.wasteRemoval||{}
  const calc=waste.calculation||{}
  const logistics=order.logistics||{}
  const typeLabels=(waste.types||[]).map(id=>WASTE_REMOVAL_TYPES.find(item=>item.id===id)?.title).filter(Boolean)

  return <section className="workspace order-details">
    <button className="back-link" type="button" onClick={onBack}>← Мои заказы</button>
    <div className="workspace__head">
      <div>
        <p className="eyebrow">Вывоз строительного мусора · заказ №{order.id}</p>
        <h1>{order.address}</h1>
        <p className="workspace__subtitle">{waste.date||'Дата не указана'} · {waste.timeSlot||'Интервал не указан'}</p>
      </div>
      <div className="detail-head-actions"><button className="button button--soft" type="button" onClick={()=>window.print()}>Печать расчёта</button><button className="button button--compact" type="button" onClick={onEdit}>Редактировать</button></div>
    </div>

    <div className="order-control-bar">
      <div><span>Статус заказа</span><select value={order.status||'draft'} onChange={e=>onStatusChange(e.target.value)}>{ORDER_STATUSES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      <div className="order-control-bar__actions"><button type="button" onClick={onDuplicate}>Дублировать</button><button className="danger-link" type="button" onClick={onDelete}>Удалить</button></div>
    </div>

    <div className="order-detail-kpis">
      <div><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
      <div><span>Объём</span><strong>{Number(calc.volume||0).toFixed(2)} м³</strong></div>
      <div><span>Мешки</span><strong>{calc.bags||0}</strong></div>
      <div><span>Транспорт</span><strong>{calc.transportLabel||logistics.transportLabel||'—'}</strong></div>
    </div>

    <div className="detail-grid">
      <section className="detail-card"><p className="eyebrow">Условия объекта</p><h2>{order.address}</h2><dl>
        <div><dt>Этаж</dt><dd>{order.floor||'—'}</dd></div>
        <div><dt>Лифт</dt><dd>{order.lift==='yes'?'Есть':'Нет'}</dd></div>
        <div><dt>До машины</dt><dd>{waste.distance||0} м</dd></div>
        <div><dt>Вынос</dt><dd>{waste.carryMode==='team'?'Бригада Bath Dream':'Мусор уже вынесен'}</dd></div>
      </dl></section>
      <section className="detail-card"><p className="eyebrow">Что вывозим</p><h2>{typeLabels.join(', ')||'Строительный мусор'}</h2><dl>
        <div><dt>Дата</dt><dd>{waste.date?new Date(waste.date+'T00:00:00').toLocaleDateString('ru-RU'):'—'}</dd></div>
        <div><dt>Интервал</dt><dd>{waste.timeSlot||'—'}</dd></div>
        <div><dt>Оценка</dt><dd>{waste.amountMode==='bags'?'По мешкам':waste.amountMode==='m3'?'По м³':'Визуально'}</dd></div>
        <div><dt>Фото</dt><dd>{waste.photoName||'Не добавлено'}</dd></div>
      </dl></section>
    </div>

    <section className="detail-card detail-card--wide waste-price-breakdown print-estimate">
      <p className="eyebrow">Расчёт стоимости</p>
      <div><span>Вынос с объекта</span><strong>{money(calc.carry)} ₽</strong></div>
      <div><span>Погрузка</span><strong>{money(calc.loading)} ₽</strong></div>
      <div><span>Транспорт · {calc.transportLabel||'—'}</span><strong>{money(calc.transport)} ₽</strong></div>
      <div><span>Утилизация</span><strong>{money(calc.disposal)} ₽</strong></div>
      {Number(calc.distanceFee||0)>0&&<div><span>Дальний пронос · {calc.distanceLabel}</span><strong>{money(calc.distanceFee)} ₽</strong></div>}
      <div className="waste-price-breakdown__total"><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
    </section>

    <WorkProgressPanel order={order} onStatusChange={onStatusChange}/>
    <ApprovalAuditPanel order={order} onStatusChange={onStatusChange}/>
    <PaymentsPanel orderNumber={order.id}/>
    <DocumentsPanel order={order} onStatusChange={onStatusChange}/>
  </section>
}

function OrderDetails({order,onBack,onEdit,onStatusChange,onDuplicate,onDelete}) {
  if(!order) return null
  if(order.serviceType==='waste') return <WasteOrderDetails order={order} onBack={onBack} onEdit={onEdit} onStatusChange={onStatusChange} onDuplicate={onDuplicate} onDelete={onDelete}/>
  const isRough=order.serviceType==='rough'
  const logistics=order.logistics||{}
  const estimateRows=isRough
    ? buildRoughEstimateRows(order.rooms||[],order.roughRepair||{},order.rates||{})
    : buildEstimateRows(order.rooms||[],order.demolition||{},order.rates||{})
  const serviceLabel=isRough?'Черновой ремонт':'Демонтаж'

  return <section className="workspace order-details">
    <button className="back-link" type="button" onClick={onBack}>← Мои заказы</button>
    <div className="workspace__head">
      <div>
        <p className="eyebrow">{serviceLabel} · заказ №{order.id}</p>
        <h1>{order.objectLabel}</h1>
        <p className="workspace__subtitle">{order.address}{order.priceBook&&<> · Прайс {order.priceBook.code} v{order.priceBook.version}</>}</p>
      </div>
      <div className="detail-head-actions"><button className="button button--soft" type="button" onClick={()=>window.print()}>Печать сметы</button><button className="button button--compact" type="button" onClick={onEdit}>Редактировать</button></div>
    </div>

    <div className="order-control-bar">
      <div><span>Статус заказа</span><select value={order.status||'draft'} onChange={e=>onStatusChange(e.target.value)}>{ORDER_STATUSES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      <div className="order-control-bar__actions"><button type="button" onClick={onDuplicate}>Дублировать</button><button className="danger-link" type="button" onClick={onDelete}>Удалить</button></div>
    </div>

    <div className="order-detail-kpis">
      <div><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
      <div><span>Работы</span><strong>{money(order.workTotal)} ₽</strong></div>
      {isRough
        ? <div><span>Услуга</span><strong>Черновой ремонт</strong></div>
        : <div><span>Мусор и логистика</span><strong>{money(logistics.total)} ₽</strong></div>}
      <div><span>Помещений</span><strong>{order.rooms?.length||0}</strong></div>
    </div>

    <div className="detail-grid">
      <section className="detail-card"><p className="eyebrow">Объект</p><h2>{order.objectLabel}</h2><dl><div><dt>Адрес</dt><dd>{order.address}</dd></div><div><dt>Площадь</dt><dd>{order.area||'—'} м²</dd></div><div><dt>Этаж</dt><dd>{order.floor||'—'}</dd></div><div><dt>Лифт</dt><dd>{order.lift==='yes'?'Есть':'Нет'}</dd></div></dl></section>
      {isRough
        ? <section className="detail-card"><p className="eyebrow">Черновой ремонт</p><h2>Состав расчёта</h2><dl><div><dt>Выбрано работ</dt><dd>{estimateRows.length}</dd></div><div><dt>Пол</dt><dd>Основания и гидроизоляция</dd></div><div><dt>Стены / потолок</dt><dd>Подготовка и выравнивание</dd></div><div><dt>Инженерия</dt><dd>Электрика и сантехника</dd></div></dl></section>
        : <section className="detail-card"><p className="eyebrow">Логистика</p><h2>{logistics.transportLabel||'Расчёт не выполнен'}</h2><dl><div><dt>Объём отходов</dt><dd>{Number(logistics.volume||0).toFixed(2)} м³</dd></div><div><dt>Масса</dt><dd>{Math.round(logistics.weight||0)} кг</dd></div><div><dt>Мешки</dt><dd>{logistics.bags||0} шт</dd></div><div><dt>Крупногабарит</dt><dd>{logistics.bulky||0} ед.</dd></div></dl></section>}
    </div>

    <section className="detail-card detail-card--wide"><p className="eyebrow">Помещения</p><div className="saved-rooms">{(order.rooms||[]).map(room=><div key={room.id}><strong>{room.type}</strong><span>{Number(room.calc?.floor||0).toFixed(2)} м² пола</span><span>{Number(room.calc?.netWalls||0).toFixed(2)} м² стен</span></div>)}</div></section>

    <section className="detail-card detail-card--wide print-estimate">
      <p className="eyebrow">Предварительная смета</p>
      <h2>{isRough?'Черновые работы':'Демонтажные работы'}</h2>
      <div className="detail-estimate">
        <div className="detail-estimate__row detail-estimate__row--head"><span>Работа</span><span>Помещение</span><span>Кол-во</span><span>Цена</span><span>Сумма</span></div>
        {estimateRows.length===0?<p className="muted">Работы не выбраны.</p>:estimateRows.map(row=><div className="detail-estimate__row" key={row.roomId+row.code}>
          <div><strong>{row.name}</strong><small>{row.code}</small></div>
          <span>{row.roomName}</span>
          <span>{row.quantity.toFixed(2)} {row.unit}</span>
          <span>{money(row.rate)} ₽</span>
          <strong>{money(row.sum)} ₽</strong>
        </div>)}
      </div>
    </section>

    <div className="estimate-summary detail-total">
      <div><span>{isRough?'Черновые работы':'Демонтажные работы'}</span><strong>{money(order.workTotal)} ₽</strong></div>
      {isRough
        ? <div><span>Материалы</span><strong>По отдельному расчёту</strong></div>
        : <div><span>Мусор и логистика</span><strong>{money(logistics.total)} ₽</strong></div>}
      <div className="estimate-summary__total"><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
    </div>

    <WorkProgressPanel order={order} onStatusChange={onStatusChange}/>
    <ApprovalAuditPanel order={order} onStatusChange={onStatusChange}/>
    <PaymentsPanel orderNumber={order.id}/>
    <DocumentsPanel order={order} onStatusChange={onStatusChange}/>
  </section>
}

export default function App() {
  const initialRemoteSession=useMemo(()=>REMOTE_ENABLED&&hasRemoteSession(),[])
  const storedAccount=useMemo(()=>REMOTE_ENABLED&&!initialRemoteSession?null:readJSON(ACCOUNT_KEY,null),[initialRemoteSession])
  const [screen,setScreen]=useState(storedAccount?'home':'auth')
  const [step,setStep]=useState(1)
  const [method,setMethod]=useState(storedAccount?.method||'phone')
  const [contact,setContact]=useState(storedAccount?.contact||'')
  const [clientType,setClientType]=useState(storedAccount?.clientType||'')
  const [profile,setProfile]=useState(storedAccount?.profile||null)
  const [orders,setOrders]=useState(()=>readJSON(ORDERS_KEY,[]))
  const [selectedOrderId,setSelectedOrderId]=useState(null)
  const [editingOrderId,setEditingOrderId]=useState(null)
  const [notice,setNotice]=useState(null)
  const [authBusy,setAuthBusy]=useState(false)
  const [authError,setAuthError]=useState('')
  const [otpRequestId,setOtpRequestId]=useState('')
  const [otpDevCode,setOtpDevCode]=useState('')
  const [remoteStatus,setRemoteStatus]=useState(REMOTE_ENABLED?(initialRemoteSession?'connecting':'api'):'local')
  const [remoteReady,setRemoteReady]=useState(!REMOTE_ENABLED)
  const [pricing,setPricing]=useState(null)

  const authenticated=Boolean(profile)
  const account=useMemo(()=>profile?{profile,clientType,contact,method}:null,[profile,clientType,contact,method])

  useEffect(()=>writeJSON(ORDERS_KEY,orders),[orders])

  useEffect(()=>{
    if(!REMOTE_ENABLED) return
    let cancelled=false
    loadActivePricing()
      .then(value=>{if(!cancelled) setPricing(value)})
      .catch(()=>{if(!cancelled) setPricing(null)})
    return ()=>{cancelled=true}
  },[])

  useEffect(()=>{
    if(!REMOTE_ENABLED) return
    if(!hasRemoteSession()){
      setRemoteStatus('api')
      setRemoteReady(false)
      return
    }

    let cancelled=false
    ;(async()=>{
      try {
        const remote=await loadRemoteState()
        if(cancelled) return
        const nextOrders=Array.isArray(remote.orders)?remote.orders:[]
        setOrders(nextOrders)
        writeJSON(ORDERS_KEY,nextOrders)

        if(remote.account?.profile){
          setProfile(remote.account.profile)
          setClientType(remote.account.clientType||'')
          setContact(remote.account.contact||'')
          setMethod(remote.account.method||'phone')
          writeJSON(ACCOUNT_KEY,remote.account)
          setScreen('home')
          setRemoteReady(true)
        } else {
          setProfile(null)
          setContact(remote.account?.contact||'')
          setMethod(remote.account?.method||'phone')
          setStep(3)
          setScreen('auth')
          setRemoteReady(false)
        }
        setRemoteStatus('online')
      } catch (error) {
        if(!cancelled){
          setRemoteStatus(error?.status===401?'api':'error')
          setRemoteReady(false)
          if(error?.status===401){
            setProfile(null)
            removeKey(ACCOUNT_KEY)
            setScreen('auth')
          }
        }
      }
    })()

    return ()=>{cancelled=true}
  },[])

  useEffect(()=>{
    if(!REMOTE_ENABLED||!remoteReady||!account) return
    const timer=setTimeout(()=>{
      setRemoteStatus('connecting')
      saveRemoteState({account,orders})
        .then(()=>setRemoteStatus('online'))
        .catch(error=>{
          setRemoteStatus(error?.status===401?'api':'error')
          if(error?.status===401) setRemoteReady(false)
        })
    },350)
    return ()=>clearTimeout(timer)
  },[account,orders,remoteReady])

  const beginAuth=async()=>{
    setAuthError('')
    if(!REMOTE_ENABLED){
      setStep(2)
      return
    }
    setAuthBusy(true)
    try {
      const challenge=await requestRemoteOtp(method,contact)
      setOtpRequestId(challenge.requestId)
      setOtpDevCode(challenge.devCode||'')
      setStep(2)
      setRemoteStatus('online')
    } catch (error) {
      setAuthError(error instanceof Error?error.message:'Не удалось отправить код')
    } finally {
      setAuthBusy(false)
    }
  }

  const verifyAuth=async code=>{
    setAuthError('')
    if(!REMOTE_ENABLED){
      setStep(3)
      return
    }
    if(!otpRequestId){
      setAuthError('Запросите новый код подтверждения')
      return
    }
    setAuthBusy(true)
    try {
      const verified=await verifyRemoteOtp(otpRequestId,code)
      setContact(verified.account.contact||contact)
      setMethod(verified.account.method||method)
      setClientType(verified.account.clientType||'')
      setOtpDevCode('')
      setRemoteStatus('online')

      if(verified.account.profile){
        const remote=await loadRemoteState()
        const nextOrders=Array.isArray(remote.orders)?remote.orders:[]
        setProfile(remote.account.profile)
        setClientType(remote.account.clientType||'')
        setOrders(nextOrders)
        writeJSON(ACCOUNT_KEY,remote.account)
        writeJSON(ORDERS_KEY,nextOrders)
        setRemoteReady(true)
        setScreen('home')
      } else {
        setProfile(null)
        setOrders([])
        writeJSON(ORDERS_KEY,[])
        setRemoteReady(false)
        setStep(3)
      }
    } catch (error) {
      setAuthError(error instanceof Error?error.message:'Не удалось подтвердить код')
    } finally {
      setAuthBusy(false)
    }
  }

  const completeRegistration=async value=>{
    setAuthError('')
    if(!REMOTE_ENABLED){
      const nextAccount={profile:value,clientType,contact,method}
      setProfile(value)
      writeJSON(ACCOUNT_KEY,nextAccount)
      setScreen('home')
      return
    }

    setAuthBusy(true)
    try {
      const nextAccount=await saveRemoteProfile(clientType,value)
      const remote=await loadRemoteState()
      const nextOrders=Array.isArray(remote.orders)?remote.orders:[]
      setProfile(nextAccount.profile)
      setClientType(nextAccount.clientType||clientType)
      setContact(nextAccount.contact||contact)
      setMethod(nextAccount.method||method)
      setOrders(nextOrders)
      writeJSON(ACCOUNT_KEY,nextAccount)
      writeJSON(ORDERS_KEY,nextOrders)
      setRemoteReady(true)
      setRemoteStatus('online')
      setScreen('home')
    } catch (error) {
      setAuthError(error instanceof Error?error.message:'Не удалось сохранить профиль')
    } finally {
      setAuthBusy(false)
    }
  }

  const logout=()=>{
    setRemoteReady(false)
    if(REMOTE_ENABLED) logoutRemote().catch(()=>{})
    removeKey(ACCOUNT_KEY)
    if(REMOTE_ENABLED) removeKey(ORDERS_KEY)
    setProfile(null);setClientType('');setContact('');setMethod('phone');setOrders([]);setStep(1);setScreen('auth')
    setOtpRequestId('');setOtpDevCode('');setAuthError('')
    setRemoteStatus(REMOTE_ENABLED?'api':'local')
  }

  const nextId=()=>{
    const ids=orders.map(order=>Number(order.id)).filter(Number.isFinite)
    return String(Math.max(1922,...ids)+1)
  }

  const saveOrder=data=>{
    const validationErrors=validateOrder(data)
    if(validationErrors.length){
      window.alert(`Не удалось сохранить заказ:\n\n${validationErrors.join('\n')}`)
      return
    }
    const now=new Date().toISOString()
    if(editingOrderId){
      setOrders(current=>current.map(order=>order.id===editingOrderId?{...order,...data,id:order.id,status:order.status||'calculated',updatedAt:now}:order))
      setSelectedOrderId(editingOrderId)
    } else {
      const id=nextId()
      setOrders(current=>[{...data,id,status:'calculated',createdAt:now,updatedAt:now},...current])
      setSelectedOrderId(id)
    }
    setEditingOrderId(null)
    setScreen('order-detail')
  }

  const openOrder=id=>{setSelectedOrderId(id);setScreen('order-detail')}
  const editOrder=id=>{const order=orders.find(item=>item.id===id);setEditingOrderId(id);setScreen(order?.serviceType==='rough'?'create-rough-order':order?.serviceType==='waste'?'create-waste-order':'create-order')}
  const createOrder=()=>{
    setEditingOrderId(null)
    setScreen('create-order')
    if(REMOTE_ENABLED){
      loadActivePricing().then(setPricing).catch(()=>{})
    }
  }

  const createRoughOrder=()=>{
    setEditingOrderId(null)
    setScreen('create-rough-order')
  }

  const createWasteOrder=()=>{
    setEditingOrderId(null)
    setScreen('create-waste-order')
  }

  const duplicateOrder=id=>{
    const order=orders.find(item=>item.id===id)
    if(!order) return
    const copy=cloneOrder(order,nextId())
    setOrders(current=>[copy,...current])
    setNotice({type:'success',text:`Заказ №${id} продублирован как №${copy.id}`})
    setScreen('orders')
  }

  const deleteOrder=id=>{
    const order=orders.find(item=>item.id===id)
    if(!order) return
    if(!window.confirm(`Удалить заказ №${id}? Это действие нельзя отменить.`)) return
    setOrders(current=>current.filter(item=>item.id!==id))
    if(selectedOrderId===id) setSelectedOrderId(null)
    setNotice({type:'success',text:`Заказ №${id} удалён`})
    setScreen('orders')
  }

  const changeStatus=(id,status)=>{
    const now=new Date().toISOString()
    setOrders(current=>current.map(order=>order.id===id?{...order,status,updatedAt:now}:order))
  }

  const exportData=()=>{
    downloadBackup(makeBackup({account,orders}))
    setNotice({type:'success',text:'Резервная копия сформирована'})
  }

  const importData=async file=>{
    try {
      const data=await readBackupFile(file)
      setOrders(data.orders)
      writeJSON(ORDERS_KEY,data.orders)
      if(data.account?.profile){
        setProfile(data.account.profile)
        setClientType(data.account.clientType||'')
        setContact(data.account.contact||'')
        setMethod(data.account.method||'phone')
        writeJSON(ACCOUNT_KEY,data.account)
      }
      setNotice({type:'success',text:`Импортировано заказов: ${data.orders.length}`})
    } catch (error) {
      setNotice({type:'error',text:error instanceof Error?error.message:'Не удалось импортировать резервную копию'})
    }
  }

  const renderAuth=()=>{
    if(step===1) return <AuthStep method={method} setMethod={setMethod} contact={contact} setContact={setContact} onNext={beginAuth} busy={authBusy} error={authError}/>
    if(step===2) return <VerifyStep contact={contact} method={method} onBack={()=>{setAuthError('');setStep(1)}} onNext={verifyAuth} onResend={beginAuth} busy={authBusy} error={authError} devCode={otpDevCode}/>
    if(step===3) return <ClientTypeStep value={clientType} onChange={setClientType} onBack={()=>setStep(2)} onNext={()=>{setAuthError('');setStep(4)}}/>
    return <ProfileStep type={clientType} contact={contact} method={method} onBack={()=>setStep(3)} onNext={completeRegistration} busy={authBusy} error={authError}/>
  }

  const selectedOrder=orders.find(order=>order.id===selectedOrderId)
  const editingOrder=orders.find(order=>order.id===editingOrderId)

  return <div className="app-shell">
    <Header authenticated={authenticated} onHome={()=>setScreen('home')} onCabinet={()=>setScreen('cabinet')} onOrders={()=>setScreen('orders')} onCreateOrder={()=>setScreen('services')} onLogout={logout}/>
    <main className={screen==='auth'?'main':'main main--workspace'}>
      {screen==='auth'&&<section className="auth-card">{renderAuth()}</section>}
      {screen==='home'&&<MarketplaceHome onDemolition={createOrder} onWaste={createWasteOrder} onRough={createRoughOrder} onOrders={()=>setScreen('orders')} onCabinet={()=>setScreen('cabinet')}/>}
      {screen==='cabinet'&&<ClientHome profile={profile} orders={orders} onOpenOrder={openOrder} onCreateProject={()=>setScreen('services')} onDemolition={createOrder} onWaste={createWasteOrder} onRough={createRoughOrder} onOrders={()=>setScreen('orders')}/>}
      {screen==='services'&&<ServicesPage onDemolition={createOrder} onWaste={createWasteOrder} onRough={createRoughOrder}/>}
      {screen==='orders'&&<OrdersDashboard orders={orders} onCreateOrder={()=>setScreen('services')} onMarketplace={()=>setScreen('home')} onOpenOrder={openOrder} onEditOrder={editOrder} onDuplicate={duplicateOrder} onDelete={deleteOrder} onExport={exportData} onImport={importData} notice={notice} storageMode={remoteStatus}/>} 
      {screen==='create-order'&&<CreateOrder initialOrder={editingOrder} onCancel={()=>setScreen('orders')} onSave={saveOrder} pricing={pricing}/>}
      {screen==='create-rough-order'&&<CreateRoughOrder initialOrder={editingOrder} onCancel={()=>setScreen('services')} onSave={saveOrder}/>}
      {screen==='create-waste-order'&&<CreateWasteOrder initialOrder={editingOrder} onCancel={()=>setScreen('home')} onSave={saveOrder}/>}
      {screen==='order-detail'&&<OrderDetails order={selectedOrder} onBack={()=>setScreen('orders')} onEdit={()=>selectedOrder&&editOrder(selectedOrder.id)} onStatusChange={status=>selectedOrder&&changeStatus(selectedOrder.id,status)} onDuplicate={()=>selectedOrder&&duplicateOrder(selectedOrder.id)} onDelete={()=>selectedOrder&&deleteOrder(selectedOrder.id)}/>}
    </main>
    <footer className="footer">
      <div className="footer__brand">
        <img src={`${import.meta.env.BASE_URL}aw-home-logo.svg`} alt="AW HOME"/>
        <span>© AW HOME · клиентский сервис</span>
      </div>
      <div className="footer__contacts">
        <span>8 (800) 333 88 37</span>
        <span>Ежедневно 09:00–21:00</span>
        <span>info@bath-dream.ru</span>
      </div>
    </footer>
  </div>
}
