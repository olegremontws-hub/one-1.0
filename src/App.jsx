import { useMemo, useRef, useState } from 'react'

const CLIENT_TYPES = [
  { id: 'fl', title: 'Физическое лицо', description: 'Личный ремонт квартиры, дома или апартаментов' },
  { id: 'ip', title: 'Индивидуальный предприниматель', description: 'Заказы от имени ИП с договором и счетами' },
  { id: 'ul', title: 'Юридическое лицо', description: 'Заказы компании с реквизитами и закрывающими документами' },
]

const PROFILE_FIELDS = {
  fl: [['firstName','Имя','Иван'],['lastName','Фамилия','Иванов'],['city','Город','Москва']],
  ip: [['ipName','ФИО / наименование ИП','ИП Иванов Иван Иванович'],['inn','ИНН','12 цифр'],['ogrnip','ОГРНИП','15 цифр'],['city','Город','Москва']],
  ul: [['companyName','Наименование организации','ООО «Компания»'],['inn','ИНН','10 цифр'],['kpp','КПП','9 цифр'],['ogrn','ОГРН','13 цифр'],['contactPerson','Контактное лицо','Иван Иванов'],['city','Город','Москва']],
}

const OBJECT_TYPES = [
  { id: 'new', title: 'Новостройка', text: 'Квартира без предыдущей отделки или с отделкой от застройщика' },
  { id: 'secondary', title: 'Вторичный рынок', text: 'Квартира с существующей отделкой и инженерными системами' },
  { id: 'house', title: 'Дом', text: 'Частный дом, таунхаус или коттедж' },
]

const ROOM_TYPES = ['Ванная','Санузел','Кухня','Гостиная','Спальня','Прихожая','Балкон / лоджия','Другое']

const toNum = value => Number.parseFloat(String(value ?? '').replace(',', '.')) || 0

function roomCalc(room) {
  const height = toNum(room.height)
  const floor = room.mode === 'exact'
    ? toNum(room.length) * toNum(room.width)
    : toNum(room.floorArea)
  const perimeter = room.mode === 'exact'
    ? 2 * (toNum(room.length) + toNum(room.width))
    : floor > 0 ? 4 * Math.sqrt(floor) : 0
  const grossWalls = perimeter * height
  const doorArea = (toNum(room.doorWidth) / 100) * (toNum(room.doorHeight) / 100) * Math.max(1, toNum(room.doorQty))
  const windowArea = (toNum(room.windowWidth) / 100) * (toNum(room.windowHeight) / 100) * Math.max(1, toNum(room.windowQty))
  const openings = doorArea + windowArea
  return {
    floor,
    ceiling: floor,
    perimeter,
    grossWalls,
    openings,
    netWalls: Math.max(0, grossWalls - openings),
  }
}

function newRoom(index = 0) {
  return {
    id: `room-${Date.now()}-${index}`,
    type: index === 0 ? 'Ванная' : '',
    mode: 'exact',
    length: '',
    width: '',
    floorArea: '',
    height: '',
    doorWidth: '',
    doorHeight: '',
    doorQty: '1',
    windowWidth: '',
    windowHeight: '',
    windowQty: '1',
  }
}

function Header({ authenticated, onOrders, onCreateOrder }) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <button className="brand brand-button" type="button" onClick={authenticated ? onOrders : undefined} aria-label="Bath Dream">
          <span className="brand__bath">BATH</span><span className="brand__dream">dream</span>
        </button>
        <div className="topbar__meta">
          {authenticated && <button className="nav-link" type="button" onClick={onOrders}>Мои заказы</button>}
          {authenticated && <button className="nav-link" type="button" onClick={onCreateOrder}>Создать заказ</button>}
          <button className="city" type="button"><span className="city__dot" />Москва</button>
          <a className="phone" href="tel:88003338837">8 (800) 333-88-37</a>
          <button className="text-button" type="button">{authenticated ? 'Профиль' : 'Войти'}</button>
        </div>
      </div>
    </header>
  )
}

function StepMeta({ current, total = 4, label = 'Регистрация' }) {
  return <div className="step-meta"><span>{label}: шаг {current} из {total}</span><div className="step-meta__track"><span style={{width:`${(current/total)*100}%`}} /></div></div>
}

function PrimaryButton({children, disabled=false, onClick, type='button'}) {
  return <button className="button button--primary" disabled={disabled} onClick={onClick} type={type}>{children}</button>
}

function Tabs({value,onChange}) {
  return <div className="tabs">
    <button className={value==='phone'?'tabs__item is-active':'tabs__item'} onClick={()=>onChange('phone')} type="button">Номер телефона</button>
    <button className={value==='email'?'tabs__item is-active':'tabs__item'} onClick={()=>onChange('email')} type="button">Электронная почта</button>
  </div>
}

function AuthStep({method,setMethod,contact,setContact,onNext}) {
  const isPhone = method === 'phone'
  const valid = isPhone ? contact.replace(/\D/g,'').length >= 11 : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  return <>
    <StepMeta current={1}/>
    <div className="page-heading"><p className="eyebrow">Клиент Bath Dream</p><h1>Создайте аккаунт</h1><p>Сохраните расчёт, создавайте заказы и получайте документы в одном кабинете.</p></div>
    <Tabs value={method} onChange={(v)=>{setMethod(v);setContact('')}}/>
    <label className="field"><span>{isPhone?'Номер телефона':'Электронная почта'}</span><input autoFocus inputMode={isPhone?'tel':'email'} placeholder={isPhone?'+7 999 123-45-67':'name@example.ru'} value={contact} onChange={e=>setContact(e.target.value)}/></label>
    <PrimaryButton disabled={!valid} onClick={onNext}>{isPhone?'Получить код':'Продолжить'}</PrimaryButton>
    <p className="legal">Продолжая, вы соглашаетесь с <a href="#">Лицензионным соглашением</a> и <a href="#">Положением о защите персональных данных</a>.</p>
  </>
}

function VerifyStep({contact,method,onBack,onNext}) {
  const [digits,setDigits] = useState(['','','',''])
  const refs = [useRef(null),useRef(null),useRef(null),useRef(null)]
  const setDigit = (i,value) => {
    const digit = value.replace(/\D/g,'').slice(-1)
    const next=[...digits]; next[i]=digit; setDigits(next)
    if(digit && i<3) refs[i+1].current?.focus()
  }
  return <>
    <StepMeta current={2}/>
    <button className="back-link" type="button" onClick={onBack}>← Назад</button>
    <div className="page-heading"><p className="eyebrow">Подтверждение</p><h1>Введите полученный код</h1><p>{method==='phone'?'Мы отправили SMS на ':'Мы отправили письмо на '}<strong>{contact}</strong></p></div>
    <div className="otp">{digits.map((d,i)=><input key={i} ref={refs[i]} value={d} inputMode="numeric" maxLength={1} onChange={e=>setDigit(i,e.target.value)} onKeyDown={e=>{if(e.key==='Backspace'&&!digits[i]&&i>0) refs[i-1].current?.focus()}} aria-label={`Цифра ${i+1}`}/>)}</div>
    <div className="inline-row"><span className="muted">Не получили код?</span><button className="link-button" type="button">Запросить повторно</button></div>
    <PrimaryButton disabled={!digits.every(Boolean)} onClick={onNext}>Подтвердить</PrimaryButton>
    <p className="hint">В прототипе подходит любой четырёхзначный код.</p>
  </>
}

function ClientTypeStep({value,onChange,onBack,onNext}) {
  return <>
    <StepMeta current={3}/>
    <button className="back-link" type="button" onClick={onBack}>← Назад</button>
    <div className="page-heading"><p className="eyebrow">Тип клиента</p><h1>Как оформить ваши заказы?</h1><p>Выбор определяет реквизиты договора, счетов и закрывающих документов.</p></div>
    <div className="choice-list">{CLIENT_TYPES.map(item=><button key={item.id} className={value===item.id?'choice-card is-selected':'choice-card'} onClick={()=>onChange(item.id)} type="button"><span className="choice-card__radio"/><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div>
    <PrimaryButton disabled={!value} onClick={onNext}>Продолжить</PrimaryButton>
  </>
}

function ProfileStep({type,contact,method,onBack,onNext}) {
  const initial = useMemo(()=>Object.fromEntries((PROFILE_FIELDS[type]||[]).map(([k])=>[k,''])),[type])
  const [values,setValues]=useState(initial)
  const fields=PROFILE_FIELDS[type]||[]
  const valid=fields.every(([k])=>String(values[k]||'').trim())
  const title=CLIENT_TYPES.find(x=>x.id===type)?.title
  return <>
    <StepMeta current={4}/>
    <button className="back-link" type="button" onClick={onBack}>← Назад</button>
    <div className="page-heading"><p className="eyebrow">{title}</p><h1>Данные клиента</h1><p>Эти сведения будут использоваться в заказах и документах.</p></div>
    <div className="form-grid">{fields.map(([k,l,p])=><label className="field" key={k}><span>{l}</span><input placeholder={p} value={values[k]||''} onChange={e=>setValues(v=>({...v,[k]:e.target.value}))}/></label>)}
      <label className="field field--readonly"><span>{method==='phone'?'Подтверждённый телефон':'Подтверждённая почта'}</span><input value={contact} readOnly/></label>
    </div>
    <PrimaryButton disabled={!valid} onClick={()=>onNext(values)}>Создать аккаунт</PrimaryButton>
  </>
}

function SuccessStep({clientType,onOrders,onCreateOrder}) {
  const typeLabel=CLIENT_TYPES.find(x=>x.id===clientType)?.title
  return <div className="success"><div className="success__icon">✓</div><p className="eyebrow">Готово</p><h1>Аккаунт создан</h1><p>Профиль «{typeLabel}» готов. Теперь можно создать первый заказ и перейти к расчёту ремонта.</p><PrimaryButton onClick={onCreateOrder}>Создать заказ</PrimaryButton><button className="secondary-button" type="button" onClick={onOrders}>Перейти в личный кабинет</button></div>
}

function OrdersDashboard({orders,onCreateOrder}) {
  return <section className="workspace">
    <div className="workspace__head"><div><p className="eyebrow">Кабинет клиента</p><h1>Мои заказы</h1><p className="workspace__subtitle">Здесь хранятся расчёты, сметы и текущие заказы.</p></div><button className="button button--compact" type="button" onClick={onCreateOrder}>+ Создать заказ</button></div>
    {orders.length===0 ? <div className="empty-state"><div className="empty-state__icon">＋</div><h2>Заказов пока нет</h2><p>Создайте первый заказ: выберите объект, добавьте помещения и перейдите к расчёту работ.</p><button className="button button--primary empty-state__button" type="button" onClick={onCreateOrder}>Создать заказ</button></div> :
    <div className="order-list">{orders.map(order=><article className="order-card" key={order.id}><div className="order-card__top"><div><span className="status status--draft">Черновик</span><h2>Заказ №{order.id}</h2></div><strong>{order.total.toLocaleString('ru-RU')} ₽</strong></div><dl><div><dt>Объект</dt><dd>{order.objectLabel}</dd></div><div><dt>Адрес</dt><dd>{order.address||'Не указан'}</dd></div><div><dt>Помещения</dt><dd>{order.rooms?.length || 0}</dd></div></dl><div className="order-card__actions"><button className="secondary-button secondary-button--inline" type="button">Продолжить расчёт</button></div></article>)}</div>}
  </section>
}

function RoomCard({room,index,onChange,onRemove,canRemove}) {
  const calc = roomCalc(room)
  const set = (key,value) => onChange({...room,[key]:value})
  return <article className="room-card">
    <div className="room-card__head"><div><span className="room-index">{index+1}</span><strong>Помещение {index+1}</strong></div>{canRemove && <button className="danger-link" type="button" onClick={onRemove}>Удалить</button>}</div>

    <label className="field"><span>Тип помещения</span><select value={room.type} onChange={e=>set('type',e.target.value)}><option value="">Выберите</option>{ROOM_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>

    <div className="mode-switch">
      <button type="button" className={room.mode==='exact'?'is-active':''} onClick={()=>set('mode','exact')}>По размерам</button>
      <button type="button" className={room.mode==='quick'?'is-active':''} onClick={()=>set('mode','quick')}>По площади</button>
    </div>

    {room.mode==='exact' ? <div className="form-grid room-dimensions">
      <label className="field"><span>Длина, м</span><input inputMode="decimal" placeholder="5,00" value={room.length} onChange={e=>set('length',e.target.value)}/></label>
      <label className="field"><span>Ширина, м</span><input inputMode="decimal" placeholder="4,00" value={room.width} onChange={e=>set('width',e.target.value)}/></label>
      <label className="field field--wide"><span>Высота потолка, м</span><input inputMode="decimal" placeholder="3,00" value={room.height} onChange={e=>set('height',e.target.value)}/></label>
    </div> : <div className="form-grid room-dimensions">
      <label className="field"><span>Площадь по полу, м²</span><input inputMode="decimal" placeholder="20,00" value={room.floorArea} onChange={e=>set('floorArea',e.target.value)}/></label>
      <label className="field"><span>Высота потолка, м</span><input inputMode="decimal" placeholder="3,00" value={room.height} onChange={e=>set('height',e.target.value)}/></label>
      <p className="quick-note">В быстром режиме периметр рассчитывается как для условно квадратного помещения. Итог помечается как предварительный.</p>
    </div>}

    <details className="openings">
      <summary>Окна и двери</summary>
      <div className="opening-grid">
        <div><h3>Дверь</h3><div className="mini-fields"><label><span>Ширина, см</span><input inputMode="numeric" value={room.doorWidth} onChange={e=>set('doorWidth',e.target.value)}/></label><label><span>Высота, см</span><input inputMode="numeric" value={room.doorHeight} onChange={e=>set('doorHeight',e.target.value)}/></label><label><span>Кол-во</span><input inputMode="numeric" value={room.doorQty} onChange={e=>set('doorQty',e.target.value)}/></label></div></div>
        <div><h3>Окно</h3><div className="mini-fields"><label><span>Ширина, см</span><input inputMode="numeric" value={room.windowWidth} onChange={e=>set('windowWidth',e.target.value)}/></label><label><span>Высота, см</span><input inputMode="numeric" value={room.windowHeight} onChange={e=>set('windowHeight',e.target.value)}/></label><label><span>Кол-во</span><input inputMode="numeric" value={room.windowQty} onChange={e=>set('windowQty',e.target.value)}/></label></div></div>
      </div>
    </details>

    <div className="geometry-results">
      <div><span>Площадь помещения</span><strong>{calc.floor.toFixed(2)} м²</strong></div>
      <div><span>Потолок</span><strong>{calc.ceiling.toFixed(2)} м²</strong></div>
      <div><span>Периметр</span><strong>{calc.perimeter.toFixed(2)} м</strong></div>
      <div><span>Стены брутто</span><strong>{calc.grossWalls.toFixed(2)} м²</strong></div>
      <div><span>Проёмы</span><strong>− {calc.openings.toFixed(2)} м²</strong></div>
      <div className="result-main"><span>Чистая площадь стен</span><strong>{calc.netWalls.toFixed(2)} м²</strong></div>
    </div>
  </article>
}

function CreateOrder({onCancel,onSave}) {
  const [orderStep,setOrderStep]=useState(1)
  const [objectType,setObjectType]=useState('')
  const [address,setAddress]=useState('')
  const [area,setArea]=useState('')
  const [floor,setFloor]=useState('')
  const [lift,setLift]=useState('yes')
  const [rooms,setRooms]=useState([newRoom(0)])
  const selected=OBJECT_TYPES.find(x=>x.id===objectType)

  const objectValid=objectType && address.trim()
  const roomsValid=rooms.length>0 && rooms.every(room=>{
    const calc=roomCalc(room)
    return room.type && calc.floor>0 && toNum(room.height)>0
  })

  if(orderStep===1) return <section className="workspace workspace--narrow">
    <button className="back-link" type="button" onClick={onCancel}>← Мои заказы</button>
    <StepMeta current={1} total={4} label="Новый заказ"/>
    <div className="page-heading"><p className="eyebrow">Создание заказа</p><h1>Расскажите об объекте</h1><p>На следующем шаге добавим помещения и геометрию.</p></div>
    <div className="object-grid">{OBJECT_TYPES.map(item=><button key={item.id} className={objectType===item.id?'object-card is-selected':'object-card'} type="button" onClick={()=>setObjectType(item.id)}><span className="object-card__icon">{item.id==='new'?'▦':item.id==='secondary'?'⌂':'△'}</span><strong>{item.title}</strong><small>{item.text}</small></button>)}</div>
    <div className="form-grid form-grid--order">
      <label className="field field--wide"><span>Адрес объекта</span><input placeholder="Москва, улица, дом, квартира" value={address} onChange={e=>setAddress(e.target.value)}/></label>
      <label className="field"><span>Общая площадь по полу, м²</span><input inputMode="decimal" placeholder="72" value={area} onChange={e=>setArea(e.target.value.replace(/[^0-9.,]/g,''))}/></label>
      <label className="field"><span>Этаж</span><input inputMode="numeric" placeholder="8" value={floor} onChange={e=>setFloor(e.target.value.replace(/\D/g,''))}/></label>
    </div>
    <div className="segmented"><span>Есть лифт?</span><div><button className={lift==='yes'?'is-active':''} onClick={()=>setLift('yes')} type="button">Да</button><button className={lift==='no'?'is-active':''} onClick={()=>setLift('no')} type="button">Нет</button></div></div>
    <div className="order-summary"><div><span>Тип объекта</span><strong>{selected?.title||'Не выбран'}</strong></div><div><span>Следующий шаг</span><strong>Помещения и геометрия</strong></div></div>
    <PrimaryButton disabled={!objectValid} onClick={()=>setOrderStep(2)}>Продолжить</PrimaryButton>
  </section>

  return <section className="workspace workspace--rooms">
    <button className="back-link" type="button" onClick={()=>setOrderStep(1)}>← Данные объекта</button>
    <StepMeta current={2} total={4} label="Новый заказ"/>
    <div className="workspace__head room-page-head"><div><p className="eyebrow">Помещения и геометрия</p><h1>Добавьте помещения</h1><p className="workspace__subtitle">Размеры вводятся один раз и дальше автоматически используются в расчёте демонтажа и отделки.</p></div><button className="button button--compact" type="button" onClick={()=>setRooms(current=>[...current,newRoom(current.length)])}>+ Добавить помещение</button></div>
    <div className="rooms-list">{rooms.map((room,index)=><RoomCard key={room.id} room={room} index={index} canRemove={rooms.length>1} onChange={next=>setRooms(current=>current.map(r=>r.id===room.id?next:r))} onRemove={()=>setRooms(current=>current.filter(r=>r.id!==room.id))}/>)}</div>
    <div className="wizard-footer"><div><span>Следующий модуль</span><strong>Услуги → Демонтажные работы</strong></div><button className="button button--primary button--finish" disabled={!roomsValid} type="button" onClick={()=>onSave({objectType,objectLabel:selected?.title,address,area,floor,lift,rooms:rooms.map(room=>({...room,calc:roomCalc(room)}))})}>Сохранить черновик</button></div>
  </section>
}

export default function App() {
  const [screen,setScreen]=useState('auth')
  const [step,setStep]=useState(1)
  const [method,setMethod]=useState('phone')
  const [contact,setContact]=useState('')
  const [clientType,setClientType]=useState('')
  const [profile,setProfile]=useState(null)
  const [orders,setOrders]=useState([])

  const authenticated = screen !== 'auth'

  const finishOrderStart = data => {
    const next={id:String(1923+orders.length),...data,total:0}
    setOrders(current=>[next,...current])
    setScreen('orders')
  }

  const renderAuth=()=>{
    if(step===1) return <AuthStep method={method} setMethod={setMethod} contact={contact} setContact={setContact} onNext={()=>setStep(2)}/>
    if(step===2) return <VerifyStep contact={contact} method={method} onBack={()=>setStep(1)} onNext={()=>setStep(3)}/>
    if(step===3) return <ClientTypeStep value={clientType} onChange={setClientType} onBack={()=>setStep(2)} onNext={()=>setStep(4)}/>
    return <ProfileStep type={clientType} contact={contact} method={method} onBack={()=>setStep(3)} onNext={value=>{setProfile(value);setScreen('success')}}/>
  }

  return <div className="app-shell">
    <Header authenticated={authenticated} onOrders={()=>setScreen('orders')} onCreateOrder={()=>setScreen('create-order')}/>
    <main className={screen==='auth'||screen==='success'?'main':'main main--workspace'}>
      {screen==='auth' && <section className="auth-card">{renderAuth()}</section>}
      {screen==='success' && <section className="auth-card"><SuccessStep clientType={clientType} onOrders={()=>setScreen('orders')} onCreateOrder={()=>setScreen('create-order')}/></section>}
      {screen==='orders' && <OrdersDashboard orders={orders} onCreateOrder={()=>setScreen('create-order')}/>}
      {screen==='create-order' && <CreateOrder onCancel={()=>setScreen('orders')} onSave={finishOrderStart}/>}
    </main>
    <footer className="footer"><span>© Bath Dream</span><span>{profile ? 'Клиентский кабинет · прототип' : 'Клиентский модуль · прототип'}</span></footer>
  </div>
}
