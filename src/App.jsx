import { useEffect, useMemo, useRef, useState } from 'react'
import CreateOrder from './components/CreateOrder.jsx'
import {
  CLIENT_TYPES, ORDER_STATUSES, PROFILE_FIELDS, cloneOrder, money,
  statusLabel, validateProfileField,
} from './domain/model.js'
import { makeBackup, downloadBackup, readBackupFile } from './lib/backup.js'
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

function AuthStep({method,setMethod,contact,setContact,onNext}) {
  const isPhone=method==='phone'
  const valid=isPhone?contact.replace(/\D/g,'').length>=11:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  return <>
    <StepMeta current={1}/>
    <div className="page-heading"><p className="eyebrow">Клиент Bath Dream</p><h1>Создайте аккаунт</h1><p>Сохраняйте расчёты, создавайте заказы и возвращайтесь к ним с этого устройства.</p></div>
    <Tabs value={method} onChange={next=>{setMethod(next);setContact('')}}/>
    <label className="field"><span>{isPhone?'Номер телефона':'Электронная почта'}</span><input autoFocus inputMode={isPhone?'tel':'email'} placeholder={isPhone?'+7 999 123-45-67':'name@example.ru'} value={contact} onChange={e=>setContact(e.target.value)}/></label>
    <PrimaryButton disabled={!valid} onClick={onNext}>{isPhone?'Получить код':'Продолжить'}</PrimaryButton>
    <p className="legal">Продолжая, вы соглашаетесь с <a href="#">Лицензионным соглашением</a> и <a href="#">Положением о защите персональных данных</a>.</p>
  </>
}

function VerifyStep({contact,method,onBack,onNext}) {
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
    <div className="inline-row"><span className="muted">Не получили код?</span><button className="link-button" type="button">Запросить повторно</button></div>
    <PrimaryButton disabled={!digits.every(Boolean)} onClick={onNext}>Подтвердить</PrimaryButton>
    <p className="hint">В демо-версии подходит любой четырёхзначный код.</p>
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

function ProfileStep({type,contact,method,onBack,onNext}) {
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
    <PrimaryButton disabled={!valid} onClick={()=>onNext(values)}>Создать аккаунт</PrimaryButton>
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

function OrdersDashboard({orders,onCreateOrder,onOpenOrder,onEditOrder,onDuplicate,onDelete,onExport,onImport,notice}) {
  const inputRef=useRef(null)

  return <section className="workspace">
    <div className="workspace__head">
      <div><p className="eyebrow">Кабинет клиента</p><h1>Мои заказы</h1><p className="workspace__subtitle">Черновики сохраняются автоматически. Данные можно выгрузить резервной копией.</p></div>
      <button className="button button--compact" type="button" onClick={onCreateOrder}>+ Создать заказ</button>
    </div>

    <div className="data-toolbar">
      <div><strong>Данные MVP</strong><span>Локальное хранилище браузера</span></div>
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

function OrderDetails({order,onBack,onEdit,onStatusChange,onDuplicate,onDelete}) {
  if(!order) return null
  const logistics=order.logistics||{}

  return <section className="workspace order-details">
    <button className="back-link" type="button" onClick={onBack}>← Мои заказы</button>
    <div className="workspace__head">
      <div><p className="eyebrow">Заказ №{order.id}</p><h1>{order.objectLabel}</h1><p className="workspace__subtitle">{order.address}</p></div>
      <button className="button button--compact" type="button" onClick={onEdit}>Редактировать</button>
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

    <div className="estimate-summary detail-total">
      <div><span>Демонтажные работы</span><strong>{money(order.workTotal)} ₽</strong></div>
      <div><span>Мусор и логистика</span><strong>{money(logistics.total)} ₽</strong></div>
      <div className="estimate-summary__total"><span>Итого</span><strong>{money(order.total)} ₽</strong></div>
    </div>
  </section>
}

export default function App() {
  const storedAccount=useMemo(()=>readJSON(ACCOUNT_KEY,null),[])
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

  const authenticated=Boolean(profile)
  const account=profile?{profile,clientType,contact,method}:null

  useEffect(()=>writeJSON(ORDERS_KEY,orders),[orders])

  const completeRegistration=value=>{
    const nextAccount={profile:value,clientType,contact,method}
    setProfile(value)
    writeJSON(ACCOUNT_KEY,nextAccount)
    setScreen('success')
  }

  const logout=()=>{
    removeKey(ACCOUNT_KEY)
    setProfile(null);setClientType('');setContact('');setMethod('phone');setStep(1);setScreen('auth')
  }

  const nextId=()=>{
    const ids=orders.map(order=>Number(order.id)).filter(Number.isFinite)
    return String(Math.max(1922,...ids)+1)
  }

  const saveOrder=data=>{
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
  const createOrder=()=>{setEditingOrderId(null);setScreen('create-order')}

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
    if(step===1) return <AuthStep method={method} setMethod={setMethod} contact={contact} setContact={setContact} onNext={()=>setStep(2)}/>
    if(step===2) return <VerifyStep contact={contact} method={method} onBack={()=>setStep(1)} onNext={()=>setStep(3)}/>
    if(step===3) return <ClientTypeStep value={clientType} onChange={setClientType} onBack={()=>setStep(2)} onNext={()=>setStep(4)}/>
    return <ProfileStep type={clientType} contact={contact} method={method} onBack={()=>setStep(3)} onNext={completeRegistration}/>
  }

  const selectedOrder=orders.find(order=>order.id===selectedOrderId)
  const editingOrder=orders.find(order=>order.id===editingOrderId)

  return <div className="app-shell">
    <Header authenticated={authenticated} onOrders={()=>setScreen('orders')} onCreateOrder={createOrder} onLogout={logout}/>
    <main className={screen==='auth'||screen==='success'?'main':'main main--workspace'}>
      {screen==='auth'&&<section className="auth-card">{renderAuth()}</section>}
      {screen==='success'&&<section className="auth-card"><SuccessStep clientType={clientType} onOrders={()=>setScreen('orders')} onCreateOrder={createOrder}/></section>}
      {screen==='orders'&&<OrdersDashboard orders={orders} onCreateOrder={createOrder} onOpenOrder={openOrder} onEditOrder={editOrder} onDuplicate={duplicateOrder} onDelete={deleteOrder} onExport={exportData} onImport={importData} notice={notice}/>}
      {screen==='create-order'&&<CreateOrder initialOrder={editingOrder} onCancel={()=>setScreen('orders')} onSave={saveOrder}/>}
      {screen==='order-detail'&&<OrderDetails order={selectedOrder} onBack={()=>setScreen('orders')} onEdit={()=>selectedOrder&&editOrder(selectedOrder.id)} onStatusChange={status=>selectedOrder&&changeStatus(selectedOrder.id,status)} onDuplicate={()=>selectedOrder&&duplicateOrder(selectedOrder.id)} onDelete={()=>selectedOrder&&deleteOrder(selectedOrder.id)}/>}
    </main>
    <footer className="footer"><span>© Bath Dream</span><span>{authenticated?'Клиентский кабинет · рабочая MVP':'Клиентский модуль · MVP'}</span></footer>
  </div>
}
