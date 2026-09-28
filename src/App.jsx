import { useEffect, useMemo, useRef, useState } from 'react'
import CreateOrder from './components/CreateOrder.jsx'
import {
  CLIENT_TYPES, ORDER_STATUSES, PROFILE_FIELDS, buildEstimateRows, cloneOrder, money,
  statusLabel, validateOrder, validateProfileField,
} from './domain/model.js'
import { makeBackup, downloadBackup, readBackupFile } from './lib/backup.js'
import {
  REMOTE_ENABLED, createOrderDocument, hasRemoteSession, loadActivePricing, loadOrderDocuments,
  loadRemoteState, logoutRemote, requestRemoteOtp, saveRemoteProfile, saveRemoteState,
  updateRemoteDocumentStatus, verifyRemoteOtp,
} from './lib/remote.js'
import { readJSON, removeKey, writeJSON } from './lib/storage.js'

const ACCOUNT_KEY='bathdream.account'
const ORDERS_KEY='bathdream.orders'

function Header({authenticated,onOrders,onCreateOrder,onLogout}) {
  return <header className="topbar">
    <div className="topbar__inner">
      <button className="brand brand-button" type="button" onClick={authenticated?onOrders:undefined} aria-label="Bath Dream">
        <span className="brand__bath">BATH</span><span className="brand__dream">dream</span>
      </button>
      <div className="topbar__meta">
        {authenticated&&<button className="nav-link" type="button" onClick={onOrders}>Мои заказы</button>}
        {authenticated&&<button className="nav-link" type="button" onClick={onCreateOrder}>Создать заказ</button>}
        <button className="city" type="button"><span className="city__dot"/>Москва</button>
        <a className="phone" href="tel:88003338837">8 (800) 333-88-37</a>
        {authenticated?<button className="text-button" type="button" onClick={onLogout}>Выйти</button>:<span className="text-button">Войти</span>}
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
    <div className="page-heading"><p className="eyebrow">Клиент Bath Dream</p><h1>Создайте аккаунт</h1><p>Сохраняйте расчёты, создавайте заказы и возвращайтесь к ним с этого устройства.</p></div>
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
    {devCode&&<p className="dev-code">Код локального OTP: <strong>{devCode}</strong></p>}
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

function SuccessStep({clientType,onOrders,onCreateOrder}) {
  return <div className="success">
    <div className="success__icon">✓</div><p className="eyebrow">Готово</p><h1>Аккаунт создан</h1>
    <p>Профиль «{CLIENT_TYPES.find(item=>item.id===clientType)?.title}» готов. Теперь создайте первый заказ.</p>
    <PrimaryButton onClick={onCreateOrder}>Создать заказ</PrimaryButton>
    <button className="secondary-button" type="button" onClick={onOrders}>Перейти в личный кабинет</button>
  </div>
}

function StatusBadge({status}) {
  return <span className={`status status--${status||'draft'}`}>{statusLabel(status)}</span>
}

function OrdersDashboard({orders,onCreateOrder,onOpenOrder,onEditOrder,onDuplicate,onDelete,onExport,onImport,notice,storageMode}) {
  const inputRef=useRef(null)

  return <section className="workspace">
    <div className="workspace__head">
      <div><p className="eyebrow">Кабинет клиента</p><h1>Мои заказы</h1><p className="workspace__subtitle">Черновики сохраняются автоматически. Данные можно выгрузить резервной копией.</p></div>
      <button className="button button--compact" type="button" onClick={onCreateOrder}>+ Создать заказ</button>
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

    {orders.length===0?<div className="empty-state"><div className="empty-state__icon">＋</div><h2>Заказов пока нет</h2><p>Создайте первый заказ: объект → помещения → геометрия → демонтаж → смета.</p><button className="button button--primary empty-state__button" type="button" onClick={onCreateOrder}>Создать заказ</button></div>:
    <div className="order-list">{orders.map(order=><article className="order-card" key={order.id}>
      <div className="order-card__top"><div><StatusBadge status={order.status}/><h2>Заказ №{order.id}</h2></div><strong>{money(order.total)} ₽</strong></div>
      <dl><div><dt>Объект</dt><dd>{order.objectLabel||'—'}</dd></div><div><dt>Адрес</dt><dd>{order.address||'—'}</dd></div><div><dt>Помещения</dt><dd>{order.rooms?.length||0}</dd></div></dl>
      <div className="order-card__actions">
        <button className="secondary-button secondary-button--inline" type="button" onClick={()=>onOpenOrder(order.id)}>Открыть</button>
        <button className="secondary-button secondary-button--inline" type="button" onClick={()=>onEditOrder(order.id)}>Редактировать</button>
        <button className="secondary-button secondary-button--inline" type="button" onClick={()=>onDuplicate(order.id)}>Дублировать</button>
        <button className="danger-link" type="button" onClick={()=>onDelete(order.id)}>Удалить</button>
      </div>
    </article>)}</div>}
  </section>
}


const DOCUMENT_KIND_META={
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

function DocumentsPanel({orderNumber}) {
  const [documents,setDocuments]=useState([])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')

  const refresh=async()=>{
    if(!REMOTE_ENABLED) return
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
      const created=await createOrderDocument(orderNumber,kind)
      setDocuments(current=>[created,...current])
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось создать документ')
    } finally {
      setBusy('')
    }
  }

  const changeStatus=async(doc,status)=>{
    setBusy(doc.id);setError('')
    try {
      const updated=await updateRemoteDocumentStatus(doc.id,status)
      setDocuments(current=>current.map(item=>item.id===doc.id?updated:item))
    } catch (err) {
      setError(err instanceof Error?err.message:'Не удалось изменить статус документа')
    } finally {
      setBusy('')
    }
  }

  if(!REMOTE_ENABLED) return <section className="detail-card detail-card--wide documents-block">
    <p className="eyebrow">Документы</p>
    <h2>КП · Договор · Акт</h2>
    <p className="muted">Документы доступны в full-stack режиме с серверной БД.</p>
  </section>

  return <section className="detail-card detail-card--wide documents-block">
    <div className="documents-head">
      <div><p className="eyebrow">Документы</p><h2>КП · Договор · Акт</h2><p className="muted">Каждое формирование создаёт новую неизменяемую версию со снимком клиента, заказа, сметы и прайса.</p></div>
      <button className="button button--soft" type="button" onClick={refresh}>Обновить</button>
    </div>

    <div className="document-create-row">
      {Object.entries(DOCUMENT_KIND_META).map(([kind,meta])=><button
        key={kind}
        className="button button--compact"
        type="button"
        disabled={Boolean(busy)}
        onClick={()=>create(kind)}
      >{busy==='create-'+kind?'Формируем…':'+ '+meta.short}</button>)}
    </div>

    {error&&<div className="notice notice--error">{error}</div>}

    {documents.length===0?<div className="document-empty">Документов по заказу пока нет.</div>:
    <div className="document-list">{documents.map(doc=>{
      const snapshot=doc.content||{}
      const order=snapshot.order||{}
      return <article className="document-card" key={doc.id}>
        <div className="document-card__head">
          <div><strong>{doc.title}</strong><span>{doc.number} · версия {doc.version}</span></div>
          <span className={'document-status document-status--'+doc.status}>{DOCUMENT_STATUS_LABELS[doc.status]||doc.status}</span>
        </div>

        <dl className="document-meta">
          <div><dt>Заказ</dt><dd>№{order.publicNumber||orderNumber}</dd></div>
          <div><dt>Сумма</dt><dd>{money(order.totals?.total||0)} ₽</dd></div>
          <div><dt>Создан</dt><dd>{new Date(doc.createdAt).toLocaleString('ru-RU')}</dd></div>
          <div><dt>Прайс</dt><dd>{order.priceBook?`${order.priceBook.code} v${order.priceBook.version}`:'—'}</dd></div>
        </dl>

        <details className="document-preview">
          <summary>Состав документа</summary>
          <div className="document-preview__body">
            <p><strong>Клиент:</strong> {snapshot.client?.displayName||'—'}</p>
            <p><strong>Объект:</strong> {order.objectLabel||'—'} · {order.address||'—'}</p>
            <p><strong>Назначение:</strong> {snapshot.purpose||'—'}</p>
            <div className="document-preview__sections">{(snapshot.sections||[]).map(section=><span key={section}>{section}</span>)}</div>
            <p className="document-disclaimer">{snapshot.disclaimer}</p>
          </div>
        </details>

        <div className="document-actions">
          {doc.status==='draft'&&<button type="button" disabled={busy===doc.id} onClick={()=>changeStatus(doc,'issued')}>Выпустить</button>}
          {doc.status==='issued'&&<button type="button" disabled={busy===doc.id} onClick={()=>changeStatus(doc,'signed')}>Отметить подписанным</button>}
          {(doc.status==='draft'||doc.status==='issued')&&<button className="danger-link" type="button" disabled={busy===doc.id} onClick={()=>changeStatus(doc,'cancelled')}>Отменить</button>}
          {doc.status==='signed'&&<span className="document-signed">✓ Документ зафиксирован как подписанный</span>}
        </div>
      </article>
    })}</div>}
  </section>
}

function OrderDetails({order,onBack,onEdit,onStatusChange,onDuplicate,onDelete}) {
  if(!order) return null
  const logistics=order.logistics||{}
  const estimateRows=buildEstimateRows(order.rooms||[],order.demolition||{},order.rates||{})

  return <section className="workspace order-details">
    <button className="back-link" type="button" onClick={onBack}>← Мои заказы</button>
    <div className="workspace__head">
      <div><p className="eyebrow">Заказ №{order.id}</p><h1>{order.objectLabel}</h1><p className="workspace__subtitle">{order.address}{order.priceBook&&<> · Прайс {order.priceBook.code} v{order.priceBook.version}</>}</p></div>
      <div className="detail-head-actions"><button className="button button--soft" type="button" onClick={()=>window.print()}>Печать сметы</button><button className="button button--compact" type="button" onClick={onEdit}>Редактировать</button></div>
    </div>

    <div className="order-control-bar">
      <div><span>Статус заказа</span><select value={order.status||'draft'} onChange={e=>onStatusChange(e.target.value)}>{ORDER_STATUSES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
      <div className="order-control-bar__actions"><button type="button" onClick={onDuplicate}>Дублировать</button><button className="danger-link" type="button" onClick={onDelete}>Удалить</button></div>
    </div>

    <div className="order-detail-kpis">
      <div><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
      <div><span>Работы</span><strong>{money(order.workTotal)} ₽</strong></div>
      <div><span>Мусор и логистика</span><strong>{money(logistics.total)} ₽</strong></div>
      <div><span>Помещений</span><strong>{order.rooms?.length||0}</strong></div>
    </div>

    <div className="detail-grid">
      <section className="detail-card"><p className="eyebrow">Объект</p><h2>{order.objectLabel}</h2><dl><div><dt>Адрес</dt><dd>{order.address}</dd></div><div><dt>Площадь</dt><dd>{order.area||'—'} м²</dd></div><div><dt>Этаж</dt><dd>{order.floor||'—'}</dd></div><div><dt>Лифт</dt><dd>{order.lift==='yes'?'Есть':'Нет'}</dd></div></dl></section>
      <section className="detail-card"><p className="eyebrow">Логистика</p><h2>{logistics.transportLabel||'Расчёт не выполнен'}</h2><dl><div><dt>Объём отходов</dt><dd>{Number(logistics.volume||0).toFixed(2)} м³</dd></div><div><dt>Масса</dt><dd>{Math.round(logistics.weight||0)} кг</dd></div><div><dt>Мешки</dt><dd>{logistics.bags||0} шт</dd></div><div><dt>Крупногабарит</dt><dd>{logistics.bulky||0} ед.</dd></div></dl></section>
    </div>

    <section className="detail-card detail-card--wide"><p className="eyebrow">Помещения</p><div className="saved-rooms">{(order.rooms||[]).map(room=><div key={room.id}><strong>{room.type}</strong><span>{Number(room.calc?.floor||0).toFixed(2)} м² пола</span><span>{Number(room.calc?.netWalls||0).toFixed(2)} м² стен</span></div>)}</div></section>

    <section className="detail-card detail-card--wide print-estimate">
      <p className="eyebrow">Предварительная смета</p>
      <h2>Демонтажные работы</h2>
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
      <div><span>Демонтажные работы</span><strong>{money(order.workTotal)} ₽</strong></div>
      <div><span>Мусор и логистика</span><strong>{money(logistics.total)} ₽</strong></div>
      <div className="estimate-summary__total"><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
    </div>

    <DocumentsPanel orderNumber={order.id}/>
  </section>
}

export default function App() {
  const initialRemoteSession=useMemo(()=>REMOTE_ENABLED&&hasRemoteSession(),[])
  const storedAccount=useMemo(()=>REMOTE_ENABLED&&!initialRemoteSession?null:readJSON(ACCOUNT_KEY,null),[initialRemoteSession])
  const [screen,setScreen]=useState(storedAccount?'orders':'auth')
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
          setScreen('orders')
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
        setScreen('orders')
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
      setScreen('success')
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
      setScreen('success')
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
  const editOrder=id=>{setEditingOrderId(id);setScreen('create-order')}
  const createOrder=()=>{
    setEditingOrderId(null)
    setScreen('create-order')
    if(REMOTE_ENABLED){
      loadActivePricing().then(setPricing).catch(()=>{})
    }
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
    <Header authenticated={authenticated} onOrders={()=>setScreen('orders')} onCreateOrder={createOrder} onLogout={logout}/>
    <main className={screen==='auth'||screen==='success'?'main':'main main--workspace'}>
      {screen==='auth'&&<section className="auth-card">{renderAuth()}</section>}
      {screen==='success'&&<section className="auth-card"><SuccessStep clientType={clientType} onOrders={()=>setScreen('orders')} onCreateOrder={createOrder}/></section>}
      {screen==='orders'&&<OrdersDashboard orders={orders} onCreateOrder={createOrder} onOpenOrder={openOrder} onEditOrder={editOrder} onDuplicate={duplicateOrder} onDelete={deleteOrder} onExport={exportData} onImport={importData} notice={notice} storageMode={remoteStatus}/>} 
      {screen==='create-order'&&<CreateOrder initialOrder={editingOrder} onCancel={()=>setScreen('orders')} onSave={saveOrder} pricing={pricing}/>}
      {screen==='order-detail'&&<OrderDetails order={selectedOrder} onBack={()=>setScreen('orders')} onEdit={()=>selectedOrder&&editOrder(selectedOrder.id)} onStatusChange={status=>selectedOrder&&changeStatus(selectedOrder.id,status)} onDuplicate={()=>selectedOrder&&duplicateOrder(selectedOrder.id)} onDelete={()=>selectedOrder&&deleteOrder(selectedOrder.id)}/>}
    </main>
    <footer className="footer"><span>© Bath Dream</span><span>{authenticated?'Клиентский кабинет · рабочая MVP':'Клиентский модуль · MVP'}</span></footer>
  </div>
}
