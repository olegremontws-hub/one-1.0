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

const DEMO_CATALOG = [
  {
    id: 'floor', title: 'Пол', icon: '▱',
    groups: [{ title: 'Покрытия и основание', items: [
      ['DEM-FL-001','Ламинат','м²'],['DEM-FL-002','Линолеум','м²'],['DEM-FL-004','Паркет','м²'],
      ['DEM-FL-006','Плитка','м²'],['DEM-FL-007','Керамогранит','м²'],['DEM-FL-008','Стяжка','м²'],
      ['DEM-FL-012','Плинтус','м.п.'],
    ]}],
  },
  {
    id: 'walls', title: 'Стены', icon: '▥',
    groups: [{ title: 'Отделка и конструкции', items: [
      ['DEM-WL-001','Обои','м²'],['DEM-WL-002','Штукатурка','м²'],['DEM-WL-003','Плитка','м²'],
      ['DEM-WL-005','Перегородка ГКЛ','м²'],['DEM-WL-006','Газоблок / ПГП','м²'],
      ['DEM-WL-008','Кирпичная перегородка','м²'],['DEM-WL-010','Железобетонная перегородка','м²'],
    ]}],
  },
  {
    id: 'ceiling', title: 'Потолок', icon: '═',
    groups: [{ title: 'Потолочные конструкции', items: [
      ['DEM-CL-001','Натяжной потолок','м²'],['DEM-CL-002','Потолок ГКЛ','м²'],
      ['DEM-CL-003','Armstrong','м²'],['DEM-CL-004','Штукатурка потолка','м²'],['DEM-CL-005','Краска / шпаклёвка','м²'],
    ]}],
  },
  {
    id: 'electric', title: 'Электрика', icon: 'ϟ',
    groups: [
      { title: 'Освещение', items: [
        ['DEM-EL-LGT-001','Лампа / лампочка','шт'],['DEM-EL-LGT-002','Точечный светильник','шт'],
        ['DEM-EL-LGT-003','Люстра','шт'],['DEM-EL-LGT-004','Бра','шт'],['DEM-EL-LGT-005','LED-лента','м.п.'],
        ['DEM-EL-LGT-006','LED-профиль','м.п.'],['DEM-EL-LGT-007','Трек','м.п.'],
        ['DEM-EL-LGT-008','Трековый светильник','шт'],['DEM-EL-LGT-009','Драйвер / трансформатор','шт'],
        ['DEM-EL-LGT-010','Датчик движения','шт'],
      ]},
      { title: 'Розетки и управление', items: [
        ['DEM-EL-001','Розетка','шт'],['DEM-EL-011','Выключатель','шт'],['DEM-EL-012','Рамка','шт'],
        ['DEM-EL-013','Подрозетник','шт'],['DEM-EL-014','Диммер / терморегулятор','шт'],
      ]},
      { title: 'Проводка и щит', items: [
        ['DEM-EL-004','Силовой кабель','м.п.'],['DEM-EL-005','Проводка','м.п.'],['DEM-EL-006','Кабель-канал','м.п.'],
        ['DEM-EL-003','Электрощит','шт'],['DEM-EL-015','Автомат','шт'],['DEM-EL-016','УЗО / дифавтомат','шт'],
      ]},
    ],
  },
  {
    id: 'plumbing', title: 'Сантехника', icon: '◉',
    groups: [{ title: 'Приборы и сети', items: [
      ['DEM-PL-003','Ванна','шт'],['DEM-PL-006','Унитаз','шт'],['DEM-PL-005','Раковина / мойка','шт'],
      ['DEM-PL-001','Смеситель','шт'],['DEM-PL-007','Инсталляция','шт'],['DEM-PL-010','Трубы водоснабжения / отопления','м.п.'],
      ['DEM-PL-011','Канализация','м.п.'],['DEM-PL-009','Полотенцесушитель','шт'],
    ]}],
  },
  {
    id: 'doors', title: 'Двери', icon: '▯',
    groups: [{ title: 'Двери и проёмы', items: [
      ['DEM-DR-001','Дверной блок','шт'],['DEM-DR-002','Полотно','шт'],['DEM-DR-003','Коробка / наличники','компл.'],
    ]}],
  },
  {
    id: 'windows', title: 'Окна', icon: '▦',
    groups: [{ title: 'Оконные элементы', items: [
      ['DEM-WN-001','Оконный блок','м²'],['DEM-WN-002','Подоконник','м.п.'],['DEM-WN-003','Откосы','м.п.'],
    ]}],
  },
  {
    id: 'furniture', title: 'Мебель', icon: '▤',
    groups: [{ title: 'Встроенная и корпусная мебель', items: [
      ['DEM-FU-001','Кухня','компл.'],['DEM-FU-002','Встроенный шкаф','шт'],['DEM-FU-003','Гардеробная','компл.'],
      ['DEM-FU-004','Столешница','м.п.'],
    ]}],
  },
  {
    id: 'other', title: 'Другое', icon: '+',
    groups: [{ title: 'Прочее', items: [['DEM-OTHER-001','Другая конструкция / элемент','шт']] }],
  },
]

const DEMO_RATES = {
  'DEM-FL-001':700, 'DEM-FL-002':600, 'DEM-FL-004':1000, 'DEM-FL-006':1500,
  'DEM-FL-007':2000, 'DEM-FL-008':1200, 'DEM-FL-012':250,
  'DEM-WL-001':500, 'DEM-WL-002':800, 'DEM-WL-003':1500, 'DEM-WL-005':1000,
  'DEM-WL-006':1300, 'DEM-WL-008':1600, 'DEM-WL-010':3500,
  'DEM-CL-001':500, 'DEM-CL-002':900, 'DEM-CL-003':700, 'DEM-CL-004':700, 'DEM-CL-005':400,
  'DEM-EL-LGT-001':100, 'DEM-EL-LGT-002':500, 'DEM-EL-LGT-003':1500, 'DEM-EL-LGT-004':800,
  'DEM-EL-LGT-005':400, 'DEM-EL-LGT-006':300, 'DEM-EL-LGT-007':600, 'DEM-EL-LGT-008':400,
  'DEM-EL-LGT-009':500, 'DEM-EL-LGT-010':500,
  'DEM-EL-001':500, 'DEM-EL-011':500, 'DEM-EL-012':200, 'DEM-EL-013':300, 'DEM-EL-014':500,
  'DEM-EL-004':1000, 'DEM-EL-005':750, 'DEM-EL-006':300, 'DEM-EL-003':7000, 'DEM-EL-015':400, 'DEM-EL-016':600,
  'DEM-PL-003':3000, 'DEM-PL-006':2500, 'DEM-PL-005':2000, 'DEM-PL-001':1000,
  'DEM-PL-007':3500, 'DEM-PL-010':1200, 'DEM-PL-011':1200, 'DEM-PL-009':2500,
  'DEM-DR-001':3500, 'DEM-DR-002':2000, 'DEM-DR-003':1000,
  'DEM-WN-001':3000, 'DEM-WN-002':700, 'DEM-WN-003':800,
  'DEM-FU-001':8000, 'DEM-FU-002':3000, 'DEM-FU-003':5000, 'DEM-FU-004':1000,
  'DEM-OTHER-001':1000,
}

const DEMO_AUTO_QTY = {
  'DEM-FL-001':'floor','DEM-FL-002':'floor','DEM-FL-004':'floor','DEM-FL-006':'floor','DEM-FL-007':'floor','DEM-FL-008':'floor',
  'DEM-FL-012':'perimeter',
  'DEM-WL-001':'netWalls','DEM-WL-002':'netWalls','DEM-WL-003':'netWalls',
  'DEM-CL-001':'ceiling','DEM-CL-002':'ceiling','DEM-CL-003':'ceiling','DEM-CL-004':'ceiling','DEM-CL-005':'ceiling',
  'DEM-DR-001':'doorQty','DEM-DR-002':'doorQty','DEM-DR-003':'doorQty',
  'DEM-WN-001':'windowArea',
}

const DEMO_RISKS = {
  'DEM-WL-010':'Перед демонтажем железобетонной конструкции требуется инженерная проверка. Если стена несущая или затрагивается проём — нужны проектные решения и согласование.',
}

const demoItemIndex = Object.fromEntries(
  DEMO_CATALOG.flatMap(category =>
    category.groups.flatMap(group =>
      group.items.map(([code,name,unit]) => [code,{code,name,unit,category:category.title,group:group.title}])
    )
  )
)

const money = value => Math.round(value || 0).toLocaleString('ru-RU')

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
    doorArea,
    windowArea,
    doorQty: toNum(room.doorWidth) && toNum(room.doorHeight) ? Math.max(1, toNum(room.doorQty)) : 0,
    windowQty: toNum(room.windowWidth) && toNum(room.windowHeight) ? Math.max(1, toNum(room.windowQty)) : 0,
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
    <div className="order-list">{orders.map(order=><article className="order-card" key={order.id}><div className="order-card__top"><div><span className="status status--draft">Черновик</span><h2>Заказ №{order.id}</h2></div><strong>{money(order.total)} ₽</strong></div><dl><div><dt>Объект</dt><dd>{order.objectLabel}</dd></div><div><dt>Адрес</dt><dd>{order.address||'Не указан'}</dd></div><div><dt>Помещения</dt><dd>{order.rooms?.length || 0}</dd></div></dl><div className="order-card__actions"><button className="secondary-button secondary-button--inline" type="button">Продолжить расчёт</button></div></article>)}</div>}
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

function DemolitionStep({rooms, selections, setSelections, onBack, onNext}) {
  const [activeRoomId,setActiveRoomId] = useState(rooms[0]?.id || '')
  const [activeCategory,setActiveCategory] = useState('floor')
  const activeRoom = rooms.find(room=>room.id===activeRoomId) || rooms[0]
  const category = DEMO_CATALOG.find(item=>item.id===activeCategory) || DEMO_CATALOG[0]
  const calc = activeRoom ? roomCalc(activeRoom) : {}

  const qty = code => toNum(selections[`${activeRoomId}:${code}`])
  const suggestedQty = code => {
    const source = DEMO_AUTO_QTY[code]
    if(!source) return 0
    return toNum(calc[source])
  }
  const setQty = (code,next) => {
    const key=`${activeRoomId}:${code}`
    const numeric=Math.max(0,toNum(next))
    setSelections(current=>{
      const copy={...current}
      if(numeric<=0) delete copy[key]
      else copy[key]=Number(numeric.toFixed(2))
      return copy
    })
  }
  const selectedCount = Object.values(selections).filter(value=>toNum(value)>0).length

  return <section className="workspace workspace--services">
    <button className="back-link" type="button" onClick={onBack}>← Помещения и геометрия</button>
    <StepMeta current={3} total={4} label="Новый заказ"/>
    <div className="workspace__head service-head">
      <div><p className="eyebrow">Услуги</p><h1>Демонтажные работы</h1><p className="workspace__subtitle">Выберите конкретные элементы. Для площадных работ количество подхватывается из геометрии помещения и при необходимости редактируется вручную.</p></div>
      <div className="selected-counter"><span>Выбрано позиций</span><strong>{selectedCount}</strong></div>
    </div>

    <div className="room-tabs">
      {rooms.map((room,index)=><button key={room.id} className={activeRoomId===room.id?'is-active':''} type="button" onClick={()=>setActiveRoomId(room.id)}><span>{room.type || `Помещение ${index+1}`}</span><small>{roomCalc(room).floor.toFixed(2)} м²</small></button>)}
    </div>

    <div className="service-layout">
      <aside className="service-categories">
        {DEMO_CATALOG.map(item=><button key={item.id} className={activeCategory===item.id?'is-active':''} type="button" onClick={()=>setActiveCategory(item.id)}><span className="service-categories__icon">{item.icon}</span><span>{item.title}</span></button>)}
      </aside>

      <div className="service-content">
        <div className="service-content__title"><div><span className="eyebrow">Помещение: {activeRoom?.type}</span><h2>{category.title}</h2></div>{activeRoom && <small>{calc.floor.toFixed(2)} м² по полу</small>}</div>
        {category.groups.map(group=><section className="service-group" key={group.title}><h3>{group.title}</h3><div className="service-items">
          {group.items.map(([code,name,unit])=>{
            const value=qty(code)
            const suggested=suggestedQty(code)
            const step=unit==='шт'||unit==='компл.'?1:0.5
            return <article className={value>0?'service-item is-selected':'service-item'} key={code}>
              <div className="service-item__meta"><span className="service-code">{code}</span><strong>{name}</strong><small>Единица: {unit}</small>{suggested>0 && <small className="auto-qty">По геометрии: {suggested.toFixed(2)} {unit}</small>}{DEMO_RISKS[code] && value>0 && <small className="risk-note">{DEMO_RISKS[code]}</small>}</div>
              <div className="qty-wrap">
                {value<=0 ? <button className="add-service" type="button" onClick={()=>setQty(code,suggested||step)}>Добавить</button> :
                <div className="qty-control qty-control--editable"><button type="button" onClick={()=>setQty(code,value-step)}>−</button><input inputMode="decimal" value={String(value).replace('.',',')} onChange={e=>setQty(code,e.target.value)} aria-label={`Количество ${name}`}/><button type="button" onClick={()=>setQty(code,value+step)}>+</button></div>}
              </div>
            </article>
          })}
        </div></section>)}
        {activeCategory==='other' && <label className="field other-note"><span>Опишите, что нужно демонтировать</span><input placeholder="Например: декоративная ниша, металлическая конструкция..."/></label>}
      </div>
    </div>

    <div className="wizard-footer"><div><span>Следующий модуль</span><strong>Предварительная смета</strong></div><button className="button button--primary button--finish" type="button" onClick={onNext}>Рассчитать смету</button></div>
  </section>
}

function EstimateStep({rooms,selections,onBack,onSave}) {
  const [rates,setRates] = useState(DEMO_RATES)
  const rows = Object.entries(selections).map(([key,quantity])=>{
    const split=key.indexOf(':')
    const roomId=key.slice(0,split)
    const code=key.slice(split+1)
    const room=rooms.find(item=>item.id===roomId)
    const item=demoItemIndex[code] || {code,name:code,unit:'шт',category:'Другое'}
    const rate=toNum(rates[code])
    return {...item,roomId,roomName:room?.type||'Помещение',quantity:toNum(quantity),rate,sum:toNum(quantity)*rate}
  }).filter(row=>row.quantity>0)

  const workTotal=rows.reduce((sum,row)=>sum+row.sum,0)
  const grouped=rooms.map(room=>({
    room,
    rows:rows.filter(row=>row.roomId===room.id),
  })).filter(group=>group.rows.length)

  const updateRate=(code,value)=>setRates(current=>({...current,[code]:Math.max(0,toNum(value))}))

  return <section className="workspace workspace--estimate">
    <button className="back-link" type="button" onClick={onBack}>← Демонтажные работы</button>
    <StepMeta current={4} total={4} label="Новый заказ"/>
    <div className="workspace__head estimate-head">
      <div><p className="eyebrow">Предварительная смета</p><h1>Расчёт демонтажа</h1><p className="workspace__subtitle">Расчётные верхние ставки v1 можно корректировать прямо в смете. Вынос, транспорт и утилизация показаны отдельно и пока не включены в стоимость работ.</p></div>
      <div className="estimate-total"><span>Работы</span><strong>{money(workTotal)} ₽</strong></div>
    </div>

    {grouped.length===0 ? <div className="empty-state estimate-empty"><h2>Демонтаж не выбран</h2><p>Можно вернуться и добавить позиции либо сохранить заказ без демонтажных работ.</p></div> :
      <div className="estimate-groups">{grouped.map(({room,rows:roomRows})=><section className="estimate-room" key={room.id}>
        <div className="estimate-room__head"><div><span className="room-index">✓</span><h2>{room.type}</h2></div><strong>{money(roomRows.reduce((s,r)=>s+r.sum,0))} ₽</strong></div>
        <div className="estimate-table">
          <div className="estimate-row estimate-row--head"><span>Работа</span><span>Количество</span><span>Ставка</span><span>Сумма</span></div>
          {roomRows.map(row=><div className="estimate-row" key={row.roomId+row.code}>
            <div><strong>{row.name}</strong><small>{row.code} · {row.category}</small>{DEMO_RISKS[row.code] && <small className="risk-note risk-note--table">Инженерная проверка</small>}</div>
            <span>{row.quantity.toFixed(2)} {row.unit}</span>
            <label className="rate-input"><input inputMode="numeric" value={rates[row.code] ?? 0} onChange={e=>updateRate(row.code,e.target.value)}/><span>₽/{row.unit}</span></label>
            <strong>{money(row.sum)} ₽</strong>
          </div>)}
        </div>
      </section>)}</div>
    }

    <section className="logistics-block">
      <div className="logistics-block__head"><div><p className="eyebrow">Отдельно от работ</p><h2>Мусор и логистика</h2></div><span className="status status--draft">Следующий слой расчёта</span></div>
      <div className="logistics-grid">
        <div><span>Упаковка и мешки</span><strong>Не рассчитано</strong><small>Будет зависеть от состава и объёма отходов.</small></div>
        <div><span>Вынос и погрузка</span><strong>Не рассчитано</strong><small>Учитываем этаж, лифт, расстояние до машины.</small></div>
        <div><span>Транспорт и утилизация</span><strong>Не рассчитано</strong><small>Контейнер / машина / полигон считаются отдельными строками.</small></div>
      </div>
    </section>

    <div className="estimate-summary">
      <div><span>Демонтажные работы</span><strong>{money(workTotal)} ₽</strong></div>
      <div><span>Мусор и логистика</span><strong>отдельно</strong></div>
      <div className="estimate-summary__total"><span>Текущий итог</span><strong>{money(workTotal)} ₽</strong></div>
    </div>

    <p className="estimate-disclaimer">Это расчётная модель прототипа, а не публичная оферта. Перед коммерческим предложением ставки и технологические коэффициенты должны пройти актуализацию.</p>
    <div className="wizard-footer"><div><span>Статус</span><strong>Черновик заказа готов</strong></div><button className="button button--primary button--finish" type="button" onClick={()=>onSave({rates,workTotal})}>Сохранить заказ</button></div>
  </section>
}


function CreateOrder({onCancel,onSave}) {
  const [orderStep,setOrderStep]=useState(1)
  const [objectType,setObjectType]=useState('')
  const [address,setAddress]=useState('')
  const [area,setArea]=useState('')
  const [floor,setFloor]=useState('')
  const [lift,setLift]=useState('yes')
  const [rooms,setRooms]=useState([newRoom(0)])
  const [demoSelections,setDemoSelections]=useState({})
  const selected=OBJECT_TYPES.find(x=>x.id===objectType)

  const objectValid=objectType && address.trim()
  const roomsValid=rooms.length>0 && rooms.every(room=>{
    const calc=roomCalc(room)
    return room.type && calc.floor>0 && toNum(room.height)>0
  })

  const baseOrder=()=>({
    objectType,
    objectLabel:selected?.title,
    address,
    area,
    floor,
    lift,
    rooms:rooms.map(room=>({...room,calc:roomCalc(room)})),
    demolition:demoSelections,
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

  if(orderStep===2) return <section className="workspace workspace--rooms">
    <button className="back-link" type="button" onClick={()=>setOrderStep(1)}>← Данные объекта</button>
    <StepMeta current={2} total={4} label="Новый заказ"/>
    <div className="workspace__head room-page-head"><div><p className="eyebrow">Помещения и геометрия</p><h1>Добавьте помещения</h1><p className="workspace__subtitle">Размеры вводятся один раз и дальше автоматически используются в расчёте демонтажа и отделки.</p></div><button className="button button--compact" type="button" onClick={()=>setRooms(current=>[...current,newRoom(current.length)])}>+ Добавить помещение</button></div>
    <div className="rooms-list">{rooms.map((room,index)=><RoomCard key={room.id} room={room} index={index} canRemove={rooms.length>1} onChange={next=>setRooms(current=>current.map(r=>r.id===room.id?next:r))} onRemove={()=>setRooms(current=>current.filter(r=>r.id!==room.id))}/>)}</div>
    <div className="wizard-footer"><div><span>Следующий модуль</span><strong>Услуги → Демонтажные работы</strong></div><button className="button button--primary button--finish" disabled={!roomsValid} type="button" onClick={()=>setOrderStep(3)}>Продолжить</button></div>
  </section>

  if(orderStep===3) return <DemolitionStep rooms={rooms} selections={demoSelections} setSelections={setDemoSelections} onBack={()=>setOrderStep(2)} onNext={()=>setOrderStep(4)}/>

  return <EstimateStep rooms={rooms} selections={demoSelections} onBack={()=>setOrderStep(3)} onSave={({rates,workTotal})=>onSave({...baseOrder(),rates,total:workTotal})}/>
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
    const next={id:String(1923+orders.length),...data,total:toNum(data.total)}
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
