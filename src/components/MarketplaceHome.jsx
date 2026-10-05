import { useEffect, useMemo, useState } from 'react'
import { readJSON, writeJSON } from '../lib/storage.js'

const REQUESTS_KEY='awhome.marketplace.requests'
const FAVORITES_KEY='awhome.marketplace.favorites'

const ADDRESS_DIRECTORY=[
  'Москва, ул. Тверская, 12',
  'Москва, ул. Большая Дмитровка, 9',
  'Москва, ул. Новый Арбат, 15',
  'Москва, Ленинградский проспект, 36',
  'Москва, Кутузовский проспект, 30',
  'Москва, ул. Профсоюзная, 64',
  'Москва, ул. Мосфильмовская, 8',
  'Москва, ул. Усачёва, 11',
  'Москва, ул. Шаболовка, 23',
  'Москва, ул. Красная Пресня, 24',
  'Москва, ул. Большая Ордынка, 17',
  'Москва, ул. Садовая-Каретная, 20',
  'Москва, ул. Маршала Жукова, 41',
  'Москва, ул. Академика Королёва, 10',
]

const IMG={
  home:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
  keys:'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80',
  building:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
  inspection:'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80',
  move:'https://images.unsplash.com/photo-1600518464441-9306b9a2a1ff?auto=format&fit=crop&w=900&q=80',
  interior:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80',
  bathroom:'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80',
  plans:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
  materials:'https://images.unsplash.com/photo-1531835551805-16d864c8d311?auto=format&fit=crop&w=900&q=80',
  demolition:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
  truck:'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=80',
  rough:'https://images.unsplash.com/photo-1590725121839-892b458a74fe?auto=format&fit=crop&w=900&q=80',
  electric:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80',
  plumbing:'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80',
  renovation:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
  management:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
  engineer:'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80',
  meter:'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=900&q=80',
  cleaning:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
  window:'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&q=80',
  sofa:'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80',
  floor:'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80',
}

export const MARKETPLACE_SECTIONS=[
  {id:'realty',number:'01',title:'Недвижимость',icon:'⌂',services:[
    {id:'realty-search',title:'Подбор недвижимости',price:'от 0 ₽',action:'Подробнее',image:IMG.home,description:'Подбор квартиры, апартаментов или дома под задачу клиента.'},
    {id:'realty-buy',title:'Покупка квартиры',price:'по запросу',action:'Подробнее',image:IMG.keys,description:'Сопровождение сделки и проверка объекта перед покупкой.'},
    {id:'realty-sell',title:'Продажа недвижимости',price:'по запросу',action:'Подробнее',image:IMG.building,description:'Подготовка объекта, позиционирование и сопровождение продажи.'},
    {id:'realty-accept',title:'Приёмка квартиры',price:'от 5 000 ₽',action:'Заказать',image:IMG.inspection,description:'Проверка отделки, инженерии и фиксация замечаний.'},
    {id:'realty-value',title:'Оценка недвижимости',price:'от 4 000 ₽',action:'Заказать',image:IMG.building,description:'Предварительная оценка рыночной стоимости объекта.'},
    {id:'realty-move',title:'Переезд',price:'от 3 000 ₽',action:'Заказать',image:IMG.move,description:'Упаковка, погрузка, перевозка и разгрузка имущества.'},
  ]},
  {id:'design',number:'02',title:'Архитектура и Дизайн',icon:'▱',services:[
    {id:'design-project',title:'Дизайн-проект квартиры',price:'от 1 500 ₽/м²',action:'Заказать',image:IMG.interior,description:'Концепция, планировка, визуализации и рабочие чертежи.'},
    {id:'design-bath',title:'Дизайн ванной комнаты',price:'от 20 000 ₽',action:'Подробнее',image:IMG.bathroom,description:'Планировка санузла, подбор отделки и сантехники.'},
    {id:'design-layout',title:'Планировочное решение',price:'от 10 000 ₽',action:'Заказать',image:IMG.plans,description:'Несколько вариантов функциональной планировки объекта.'},
    {id:'design-3d',title:'3D-визуализация',price:'от 500 ₽/м²',action:'Заказать',image:IMG.interior,description:'Фотореалистичная визуализация будущего интерьера.'},
    {id:'design-materials',title:'Подбор материалов',price:'от 3 000 ₽',action:'Подробнее',image:IMG.materials,description:'Подбор отделочных материалов под бюджет и концепцию.'},
    {id:'design-supply',title:'Комплектация интерьера',price:'от 5 000 ₽',action:'Заказать',image:IMG.interior,description:'Мебель, свет, сантехника, декор и контроль поставок.'},
  ]},
  {id:'build',number:'03',title:'Стройка и Ремонт',icon:'△',services:[
    {id:'demolition',title:'Демонтаж',price:'от 300 ₽/м²',action:'Рассчитать',image:IMG.demolition,description:'Демонтаж отделки, конструкций, сантехники и инженерии.',live:'demolition'},
    {id:'waste',title:'Вывоз строительного мусора',price:'от 5 000 ₽',action:'Рассчитать',image:IMG.truck,description:'Вынос, погрузка, транспорт и утилизация строительных отходов.',live:'waste'},
    {id:'rough',title:'Черновой ремонт',price:'от 3 000 ₽/м²',action:'Рассчитать',image:IMG.rough,description:'Стены, пол, потолок, инженерия и подготовка оснований.',live:'rough'},
    {id:'electric',title:'Электромонтажные работы',price:'от 1 500 ₽/точка',action:'Заказать',image:IMG.electric,description:'Разводка, щит, кабельные линии и установочные точки.'},
    {id:'plumbing',title:'Сантехнические работы',price:'от 1 500 ₽/точка',action:'Заказать',image:IMG.plumbing,description:'Водоснабжение, канализация, инсталляции и подключения.'},
    {id:'turnkey',title:'Ремонт под ключ',price:'от 12 000 ₽/м²',action:'Подробнее',image:IMG.renovation,description:'Полный цикл ремонта с управлением сроками и сметой.'},
  ]},
  {id:'manage',number:'04',title:'УправКом',icon:'▥',services:[
    {id:'manage-flat',title:'Управление квартирой',price:'от 1 000 ₽/мес',action:'Заказать',image:IMG.management,description:'Контроль объекта, подрядчиков, счетов и сервисных задач.'},
    {id:'manage-tech',title:'Техническое обслуживание',price:'от 2 000 ₽',action:'Заказать',image:IMG.engineer,description:'Плановые проверки инженерных систем и оборудования.'},
    {id:'manage-emergency',title:'Аварийный мастер',price:'от 3 000 ₽',action:'Вызвать',image:IMG.engineer,description:'Срочный выезд специалиста при бытовой аварии.'},
    {id:'manage-meters',title:'Контроль счётчиков',price:'от 500 ₽',action:'Заказать',image:IMG.meter,description:'Снятие показаний и контроль приборов учёта.'},
    {id:'manage-bills',title:'Оплата коммунальных услуг',price:'по запросу',action:'Подробнее',image:IMG.management,description:'Организация учёта начислений и регулярных платежей.'},
    {id:'manage-contractors',title:'Контроль подрядчиков',price:'от 2 000 ₽',action:'Заказать',image:IMG.inspection,description:'Приём исполнителей, фотоотчёт и контроль результата.'},
  ]},
  {id:'care',number:'05',title:'Уход за домом',icon:'◒',services:[
    {id:'care-general',title:'Генеральная уборка',price:'от 3 000 ₽',action:'Заказать',image:IMG.cleaning,description:'Комплексная уборка квартиры или дома.'},
    {id:'care-after',title:'Уборка после ремонта',price:'от 4 000 ₽',action:'Заказать',image:IMG.cleaning,description:'Удаление строительной пыли и подготовка к заселению.'},
    {id:'care-window',title:'Мытьё окон',price:'от 500 ₽/окно',action:'Заказать',image:IMG.window,description:'Окна, рамы, откосы и стеклянные поверхности.'},
    {id:'care-sofa',title:'Химчистка мебели',price:'от 1 500 ₽',action:'Заказать',image:IMG.sofa,description:'Диваны, кресла, матрасы и мягкая мебель.'},
    {id:'care-floor',title:'Уход за паркетом',price:'от 1 000 ₽/м²',action:'Подробнее',image:IMG.floor,description:'Очистка, восстановление и защитный уход за полом.'},
    {id:'care-handyman',title:'Домашний мастер',price:'от 1 500 ₽/час',action:'Заказать',image:IMG.engineer,description:'Мелкий ремонт, монтаж и бытовые задачи по дому.'},
  ]},
]

const allServices=MARKETPLACE_SECTIONS.flatMap(section=>section.services.map(service=>({...service,sectionId:section.id,sectionTitle:section.title})))

function parseBasePrice(price){
  const match=String(price||'').replace(/\s/g,'').match(/(\d+)/)
  if(!match||/по запросу|от 0/.test(String(price).toLowerCase())) return 0
  const digits=String(price).replace(/[^\d]/g,'')
  return Number(digits)||0
}

function serviceIncludes(service){
  if(service.live==='demolition') return ['Обмер и фиксация объёмов','Расчёт демонтажных работ','Оценка строительного мусора','Смета по выбранным работам']
  if(service.live==='waste') return ['Оценка объёма отходов','Вынос и погрузка по выбранным условиям','Подбор транспорта','Вывоз и утилизация']
  if(service.live==='rough') return ['Обмер помещений','Подготовка оснований','Черновые инженерные работы','Расчёт сметы и последовательности работ']
  const bySection={
    realty:['Предварительная консультация','Фиксация задачи клиента','Согласование состава услуги','Итоговый отчёт или сопровождение'],
    design:['Бриф по объекту','Проработка решения','Согласование результата','Передача материалов клиенту'],
    manage:['Регистрация заявки','Назначение специалиста','Выполнение и контроль','Отчёт о результате'],
    care:['Подтверждение состава работ','Согласование времени','Выполнение услуги','Контроль результата'],
    build:['Проверка исходных данных','Согласование состава работ','Выполнение услуги','Фиксация результата'],
  }
  return bySection[service.sectionId]||bySection.build
}

function YandexMap({address}){
  const text=address.trim()||'Москва'
  const src=`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(text)}&z=14`
  return <div className="checkout-map">
    <iframe title="Яндекс Карта" src={src} loading="lazy" allowFullScreen/>
    <a href={`https://yandex.ru/maps/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Открыть в Яндекс Картах ↗</a>
  </div>
}

function AddressField({value,onChange}){
  const [remote,setRemote]=useState([])
  const [loading,setLoading]=useState(false)
  const suggestKey=import.meta.env.VITE_YANDEX_SUGGEST_API_KEY||import.meta.env.VITE_YANDEX_MAPS_API_KEY||''

  useEffect(()=>{
    const text=value.trim()
    if(!suggestKey||text.length<3){
      setRemote([])
      setLoading(false)
      return undefined
    }
    const controller=new AbortController()
    const timer=setTimeout(async()=>{
      setLoading(true)
      try{
        const params=new URLSearchParams({
          apikey:suggestKey,
          text,
          lang:'ru',
          results:'7',
          types:'geo',
          countries:'ru',
          print_address:'1',
        })
        const response=await fetch('https://suggest-maps.yandex.ru/v1/suggest?'+params.toString(),{signal:controller.signal})
        if(response.ok){
          const data=await response.json()
          setRemote((data.results||[]).map(item=>item.address?.formatted_address||item.title?.text).filter(Boolean))
        } else {
          setRemote([])
        }
      }catch(error){
        if(error.name!=='AbortError') setRemote([])
      }finally{
        if(!controller.signal.aborted) setLoading(false)
      }
    },280)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[value,suggestKey])

  const local=ADDRESS_DIRECTORY.filter(item=>item.toLowerCase().includes(value.trim().toLowerCase())).slice(0,6)
  const suggestions=(remote.length?remote:local).filter((item,index,array)=>array.indexOf(item)===index)

  return <div className="address-suggest">
    <label className="checkout-field">
      <span>Адрес объекта</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Начните вводить улицу и дом" autoComplete="street-address"/>
      <small>{suggestKey
        ? loading?'Ищем адрес в справочнике Яндекса…':'Подсказки адреса: Yandex Geosuggest.'
        :'Preview: встроенный справочник. Для полного поиска адресов нужен VITE_YANDEX_SUGGEST_API_KEY.'}</small>
    </label>
    {value.trim().length>=2&&suggestions.length>0&&<div className="address-suggest__list">
      {suggestions.map(item=><button key={item} type="button" onClick={()=>onChange(item)}>⌖ <span>{item}</span></button>)}
    </div>}
  </div>
}

function ServiceCard({service,favorite,onToggleFavorite,onOpen}){
  return <article className="market-service-card">
    <button className="market-service-card__image" type="button" onClick={()=>onOpen(service)} style={{backgroundImage:`linear-gradient(180deg,rgba(7,23,46,0) 45%,rgba(7,23,46,.18)),url("${service.image}")`}}>
      <span className="sr-only">Открыть {service.title}</span>
    </button>
    <button type="button" className={favorite?'market-heart is-active':'market-heart'} onClick={()=>onToggleFavorite(service.id)} aria-label="В избранное">{favorite?'♥':'♡'}</button>
    <div className="market-service-card__body">
      <button className="market-service-card__title" type="button" onClick={()=>onOpen(service)}>{service.title}</button>
      <p>{service.description}</p>
      <div className="market-service-card__meta">
        <span>{service.price}</span>
        <button type="button" onClick={()=>onOpen(service)}>{service.action} <b>→</b></button>
      </div>
    </div>
  </article>
}

function ServiceDetail({service,onBack,onOrder,onCalculator}){
  const includes=serviceIncludes(service)
  return <section className="service-detail-page">
    <button className="market-back" type="button" onClick={onBack}>← Все услуги</button>
    <div className="service-detail-hero">
      <div className="service-detail-hero__image" style={{backgroundImage:`linear-gradient(180deg,rgba(7,23,46,.02),rgba(7,23,46,.30)),url("${service.image}")`}}/>
      <div className="service-detail-hero__content">
        <span className="service-detail-chip">{service.sectionTitle}</span>
        <h1>{service.title}</h1>
        <p>{service.description}</p>
        <div className="service-detail-price"><small>Ориентир</small><strong>{service.price}</strong></div>
        <div className="service-detail-actions">
          {service.live&&<button className="market-cta" type="button" onClick={onCalculator}>Рассчитать в калькуляторе →</button>}
          <button className={service.live?'market-ghost':'market-cta'} type="button" onClick={onOrder}>{service.live?'Быстрая заявка':'Заказать услугу →'}</button>
        </div>
      </div>
    </div>

    <div className="service-detail-grid">
      <section className="service-detail-card">
        <span className="eyebrow">Что входит</span>
        <h2>Состав услуги</h2>
        <div className="service-includes">{includes.map((item,index)=><div key={item}><span>0{index+1}</span><strong>{item}</strong></div>)}</div>
      </section>
      <section className="service-detail-card">
        <span className="eyebrow">Как это работает</span>
        <h2>От заявки до результата</h2>
        <ol className="service-process">
          <li><span>1</span><div><strong>Заполняете параметры</strong><small>Объект, адрес и задача.</small></div></li>
          <li><span>2</span><div><strong>Выбираете дату</strong><small>Удобный день и интервал времени.</small></div></li>
          <li><span>3</span><div><strong>Подтверждаем заказ</strong><small>Стоимость и исполнитель фиксируются перед стартом.</small></div></li>
          <li><span>4</span><div><strong>Контролируем результат</strong><small>Статус заказа остаётся в кабинете AW HOME.</small></div></li>
        </ol>
      </section>
    </div>

    <div className="service-detail-note">
      <strong>Цена на карточке — ориентир.</strong>
      <span>Точная стоимость зависит от параметров объекта, адреса, объёма и выбранных условий.</span>
    </div>
  </section>
}

function Checkout({service,onBack,onDone}){
  const [step,setStep]=useState(1)
  const [form,setForm]=useState({
    objectType:'Квартира',
    area:'45',
    address:'',
    floor:'1',
    elevator:'yes',
    performer:'auto',
    urgency:'standard',
    comment:'',
    date:'',
    time:'10:00–12:00',
    name:'',
    phone:'',
  })

  const set=(key,value)=>setForm(current=>({...current,[key]:value}))
  const base=parseBasePrice(service.price)
  const area=Number(form.area)||0
  const unit=/м²/.test(service.price)
  const subtotal=base?(unit?Math.max(area,1)*base:base):0
  const extras=(form.urgency==='urgent'?Math.max(1500,subtotal*.15):0)+(form.elevator==='no'&&Number(form.floor)>2?1200:0)
  const total=Math.round(subtotal+extras)
  const steps=['Объект','Адрес','Параметры','Дата и время','Итог']
  const canNext=step===1?area>0:step===2?form.address.trim().length>5:step===3?true:step===4?Boolean(form.date):true
  const complete=form.name.trim()&&form.phone.replace(/\D/g,'').length>=10

  const save=()=>{
    if(!complete) return
    const request={
      id:'REQ-'+Date.now(),
      serviceId:service.id,
      serviceTitle:service.title,
      sectionTitle:service.sectionTitle,
      ...form,
      estimate:{base:subtotal,extras,total},
      createdAt:new Date().toISOString(),
      status:'new',
    }
    const current=readJSON(REQUESTS_KEY,[])||[]
    writeJSON(REQUESTS_KEY,[request,...current])
    onDone(request)
  }

  return <section className="market-checkout">
    <div className="checkout-head">
      <button className="market-back" type="button" onClick={onBack}>← Назад к услуге</button>
      <div><span className="eyebrow">Оформление заказа</span><h1>{service.title}</h1></div>
    </div>

    <div className="checkout-progress">
      {steps.map((title,index)=>{
        const number=index+1
        return <button key={title} type="button" className={step===number?'is-active':step>number?'is-done':''} onClick={()=>step>number&&setStep(number)}>
          <span>{step>number?'✓':number}</span><b>{title}</b>
        </button>
      })}
    </div>

    <div className="checkout-shell">
      <div className="checkout-main">
        {step===1&&<section className="checkout-step">
          <span className="eyebrow">Шаг 1 из 5</span>
          <h2>Какой у вас объект?</h2>
          <div className="checkout-choice-grid">
            {['Квартира','Апартаменты','Частный дом','Коммерческое помещение'].map(item=><button type="button" key={item} className={form.objectType===item?'is-active':''} onClick={()=>set('objectType',item)}><strong>{item}</strong><small>Выбрать тип объекта</small></button>)}
          </div>
          <label className="checkout-field checkout-field--short"><span>Площадь объекта, м²</span><input type="number" min="1" value={form.area} onChange={e=>set('area',e.target.value)}/></label>
        </section>}

        {step===2&&<section className="checkout-step">
          <span className="eyebrow">Шаг 2 из 5</span>
          <h2>Где находится объект?</h2>
          <p>Выберите адрес из подсказок. Карта обновляется по введённому адресу.</p>
          <div className="checkout-address-layout">
            <AddressField value={form.address} onChange={value=>set('address',value)}/>
            <YandexMap address={form.address}/>
          </div>
        </section>}

        {step===3&&<section className="checkout-step">
          <span className="eyebrow">Шаг 3 из 5</span>
          <h2>Параметры выполнения</h2>
          <div className="checkout-form-grid">
            <label className="checkout-field"><span>Этаж</span><input type="number" min="0" value={form.floor} onChange={e=>set('floor',e.target.value)}/></label>
            <label className="checkout-field"><span>Лифт</span><select value={form.elevator} onChange={e=>set('elevator',e.target.value)}><option value="yes">Есть</option><option value="no">Нет</option><option value="unknown">Не знаю</option></select></label>
            <label className="checkout-field"><span>Исполнитель</span><select value={form.performer} onChange={e=>set('performer',e.target.value)}><option value="auto">AW HOME подберёт</option><option value="choose">Хочу выбрать сам</option></select></label>
            <label className="checkout-field"><span>Срочность</span><select value={form.urgency} onChange={e=>set('urgency',e.target.value)}><option value="standard">Обычный заказ</option><option value="urgent">Срочно</option></select></label>
          </div>
          <label className="checkout-field"><span>Комментарий</span><textarea value={form.comment} onChange={e=>set('comment',e.target.value)} placeholder="Что важно знать исполнителю?"/></label>
        </section>}

        {step===4&&<section className="checkout-step">
          <span className="eyebrow">Шаг 4 из 5</span>
          <h2>Когда выполнить услугу?</h2>
          <div className="checkout-date-layout">
            <label className="checkout-field"><span>Дата</span><input type="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={e=>set('date',e.target.value)}/></label>
            <div className="checkout-times"><span>Интервал времени</span>{['09:00–12:00','12:00–15:00','15:00–18:00','18:00–21:00'].map(item=><button key={item} type="button" className={form.time===item?'is-active':''} onClick={()=>set('time',item)}>{item}</button>)}</div>
          </div>
        </section>}

        {step===5&&<section className="checkout-step">
          <span className="eyebrow">Шаг 5 из 5</span>
          <h2>Проверьте заказ</h2>
          <div className="checkout-summary">
            <div><span>Услуга</span><strong>{service.title}</strong></div>
            <div><span>Объект</span><strong>{form.objectType} · {form.area} м²</strong></div>
            <div><span>Адрес</span><strong>{form.address}</strong></div>
            <div><span>Дата</span><strong>{form.date||'—'} · {form.time}</strong></div>
            <div><span>Исполнитель</span><strong>{form.performer==='auto'?'Подберёт AW HOME':'Выберу самостоятельно'}</strong></div>
          </div>
          <div className="checkout-contact">
            <label className="checkout-field"><span>Имя</span><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Как к вам обращаться"/></label>
            <label className="checkout-field"><span>Телефон</span><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+7 999 123-45-67" inputMode="tel"/></label>
          </div>
        </section>}

        <div className="checkout-nav">
          <button className="market-ghost" type="button" onClick={()=>step===1?onBack():setStep(step-1)}>{step===1?'Назад к услуге':'← Назад'}</button>
          {step<5?<button className="market-cta" type="button" disabled={!canNext} onClick={()=>setStep(step+1)}>Продолжить →</button>:<button className="market-cta" type="button" disabled={!complete} onClick={save}>Оформить заказ →</button>}
        </div>
      </div>

      <aside className="checkout-aside">
        <div className="checkout-service-mini">
          <span className="checkout-service-mini__image" style={{backgroundImage:`url("${service.image}")`}}/>
          <div><small>{service.sectionTitle}</small><strong>{service.title}</strong><span>{service.price}</span></div>
        </div>
        <div className="checkout-price">
          <div><span>Базовый расчёт</span><strong>{subtotal?subtotal.toLocaleString('ru-RU')+' ₽':'после подтверждения'}</strong></div>
          {extras>0&&<div><span>Доп. условия</span><strong>{Math.round(extras).toLocaleString('ru-RU')} ₽</strong></div>}
          <div className="checkout-price__total"><span>Ориентир</span><strong>{total?total.toLocaleString('ru-RU')+' ₽':'по запросу'}</strong></div>
          <small>Финальная стоимость подтверждается до начала выполнения.</small>
        </div>
      </aside>
    </div>
  </section>
}

function Success({request,onCatalog,onOrders}){
  return <section className="market-success">
    <div className="market-success__mark">✓</div>
    <span className="eyebrow">Заявка создана</span>
    <h1>{request.id}</h1>
    <p>Заказ на услугу «{request.serviceTitle}» сохранён в разделе «Мои заказы». Следующий этап — серверная отправка заявки и назначение исполнителя.</p>
    <div className="market-success__summary">
      <div><span>Адрес</span><strong>{request.address}</strong></div>
      <div><span>Дата</span><strong>{request.date} · {request.time}</strong></div>
      <div><span>Стоимость</span><strong>{request.estimate.total?request.estimate.total.toLocaleString('ru-RU')+' ₽':'после подтверждения'}</strong></div>
    </div>
    <div className="marketplace-hero__actions">
      <button className="market-cta" type="button" onClick={onOrders}>Мои заказы</button>
      <button className="market-ghost" type="button" onClick={onCatalog}>Вернуться в каталог</button>
    </div>
  </section>
}

export default function MarketplaceHome({onDemolition,onWaste,onRough,onOrders,onCabinet}){
  const [query,setQuery]=useState('')
  const [activeSection,setActiveSection]=useState('all')
  const [view,setView]=useState('catalog')
  const [selected,setSelected]=useState(null)
  const [success,setSuccess]=useState(null)
  const [favorites,setFavorites]=useState(()=>readJSON(FAVORITES_KEY,[])||[])

  const shownSections=useMemo(()=>{
    const needle=query.trim().toLowerCase()
    return MARKETPLACE_SECTIONS.map(section=>({
      ...section,
      services:section.services.filter(service=>{
        const inSection=activeSection==='all'||activeSection===section.id
        const match=!needle||[service.title,service.description,section.title].join(' ').toLowerCase().includes(needle)
        return inSection&&match
      })
    })).filter(section=>section.services.length)
  },[query,activeSection])

  const openService=service=>{
    const rich=allServices.find(item=>item.id===service.id)||service
    setSelected(rich)
    setView('detail')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const calculator=service=>{
    if(service.live==='demolition') return onDemolition()
    if(service.live==='waste') return onWaste()
    if(service.live==='rough') return onRough()
  }

  const toggleFavorite=id=>{
    const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id]
    setFavorites(next)
    writeJSON(FAVORITES_KEY,next)
  }

  if(view==='detail'&&selected) return <ServiceDetail service={selected} onBack={()=>setView('catalog')} onOrder={()=>setView('checkout')} onCalculator={()=>calculator(selected)}/>
  if(view==='checkout'&&selected) return <Checkout service={selected} onBack={()=>setView('detail')} onDone={request=>{setSuccess(request);setView('success')}}/>
  if(view==='success'&&success) return <Success request={success} onOrders={onOrders} onCatalog={()=>{setView('catalog');setSuccess(null);setSelected(null)}}/>

  const popular=['demolition','waste','rough'].map(id=>allServices.find(service=>service.id===id)).filter(Boolean)

  return <section className="marketplace-home">
    <div className="marketplace-topline">
      <button className="marketplace-location" type="button">● Москва <span>⌄</span></button>
      <label className="marketplace-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти услугу: ремонт квартиры, дизайн, клининг…"/></label>
      <button type="button" className="marketplace-mini-link" onClick={()=>setActiveSection('all')}>♡ Избранное <b>{favorites.length||''}</b></button>
      <button type="button" className="marketplace-mini-link" onClick={onOrders}>Мои заказы</button>
      <button type="button" className="marketplace-profile-link" onClick={onCabinet}>◎ Кабинет</button>
    </div>

    <section className="marketplace-hero">
      <div className="marketplace-hero__content">
        <p className="eyebrow">AW HOME · маркетплейс услуг</p>
        <h1>Все услуги для дома — в одном месте</h1>
        <p>Недвижимость, проектирование, ремонт, управление и уход. Выберите услугу, адрес и удобное время.</p>
        <div className="marketplace-hero__actions">
          <button className="market-cta" type="button" onClick={()=>setActiveSection('build')}>Подобрать услугу</button>
          <button className="market-ghost" type="button" onClick={onOrders}>Мои проекты</button>
        </div>
      </div>
      <div className="marketplace-hero__trust">
        <strong>Один сервис на весь жизненный цикл дома</strong>
        <span>◇ Понятный состав услуги</span>
        <span>♢ Адрес и время заказа</span>
        <span>☆ Контроль в кабинете</span>
      </div>
    </section>

    <nav className="market-category-nav" aria-label="Разделы маркетплейса">
      <button className={activeSection==='all'?'is-active':''} type="button" onClick={()=>setActiveSection('all')}><span>◎</span><b>Все услуги</b></button>
      {MARKETPLACE_SECTIONS.map(section=><button key={section.id} className={activeSection===section.id?'is-active':''} type="button" onClick={()=>setActiveSection(section.id)}><span>{section.icon}</span><b>{section.title}</b></button>)}
    </nav>

    <div className="marketplace-layout">
      <main className="marketplace-catalog">
        {shownSections.length?shownSections.map(section=><section className="market-section" key={section.id}>
          <div className="market-section__head"><div><span>{section.number}</span><h2>{section.title}</h2></div><button type="button" onClick={()=>setActiveSection(section.id)}>Все услуги →</button></div>
          <div className="market-service-grid">
            {section.services.map(service=><ServiceCard key={service.id} service={service} favorite={favorites.includes(service.id)} onToggleFavorite={toggleFavorite} onOpen={openService}/>)}
          </div>
        </section>):<div className="market-empty"><strong>Ничего не найдено</strong><p>Попробуйте изменить поисковый запрос или открыть все категории.</p><button type="button" onClick={()=>{setQuery('');setActiveSection('all')}}>Показать все услуги</button></div>}
      </main>

      <aside className="marketplace-sidebar">
        <div className="marketplace-promo"><span>AW HOME</span><h2>Ваш дом в надёжных руках</h2><p>От первой сметы до регулярного ухода за объектом.</p><button className="market-cta" type="button" onClick={()=>setActiveSection('build')}>Выбрать услугу →</button></div>
        <section className="marketplace-popular">
          <div className="marketplace-popular__head"><h3>Популярные услуги</h3><span>AW HOME</span></div>
          {popular.map(service=><button className="popular-service" key={service.id} type="button" onClick={()=>openService(service)}><span className="popular-service__image" style={{backgroundImage:`url("${service.image}")`}}/><span className="popular-service__info"><strong>{service.title}</strong><small>{service.price}</small></span><span className="popular-service__rating">→</span></button>)}
        </section>
        <section className="marketplace-trust-metrics"><div><strong>5</strong><span>разделов</span></div><div><strong>30</strong><span>услуг v0.19</span></div><div><strong>1</strong><span>единый кабинет</span></div></section>
      </aside>
    </div>

    <section className="marketplace-help"><div><strong>Не знаете, что выбрать?</strong><span>Откройте услугу — внутри есть состав, сценарий и форма заказа.</span></div><button className="market-cta" type="button" onClick={()=>openService(allServices[0])}>Посмотреть пример →</button></section>
    <p className="marketplace-disclaimer">Цены в демо-каталоге ориентировочные и не являются публичной офертой. Финальная стоимость определяется после подтверждения параметров заказа.</p>
  </section>
}
