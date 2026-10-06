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

function CategoryIcon({id}){
  const common={width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(id==='all') return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
  if(id==='realty') return <svg {...common}><path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 10v9.5h13V10"/><path d="M9.5 19.5v-5h5v5"/></svg>
  if(id==='design') return <svg {...common}><path d="M4 19.5 9 18l9.8-9.8a2 2 0 0 0-2.8-2.8L6.2 15.2 4 19.5Z"/><path d="m14.8 6.6 2.6 2.6"/><path d="M4 4h6"/></svg>
  if(id==='build') return <svg {...common}><path d="M4 20h16"/><path d="M6 20V8l6-4 6 4v12"/><path d="M9 20v-6h6v6"/><path d="M7.5 10h9"/></svg>
  if(id==='manage') return <svg {...common}><rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="M16.5 16.5h.01"/></svg>
  return <svg {...common}><path d="M12 3.5c4 4.2 6.3 7 6.3 10.1A6.3 6.3 0 0 1 5.7 13.6C5.7 10.5 8 7.7 12 3.5Z"/><path d="M9.5 14.2c.7 1.2 1.7 1.8 3 1.8"/></svg>
}

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
  const related=allServices.filter(item=>item.sectionId===service.sectionId&&item.id!==service.id).slice(0,4)
  const gallery=[service.image,...related.map(item=>item.image)].slice(0,5)
  return <section className="service-detail-page service-detail-page--showcase">
    <div className="service-breadcrumbs">
      <button type="button" onClick={onBack}>Главная</button><span>›</span><button type="button" onClick={onBack}>{service.sectionTitle}</button><span>›</span><b>{service.title}</b>
    </div>

    <div className="service-showcase-gallery">
      <div className="service-showcase-gallery__main" style={{backgroundImage:`linear-gradient(180deg,rgba(7,23,46,.02),rgba(7,23,46,.16)),url("${gallery[0]}")`}}>
        <span className="service-gallery-badge">Проверенная услуга</span>
      </div>
      <div className="service-showcase-gallery__thumbs">
        {gallery.slice(1).map((image,index)=><span key={image+index} style={{backgroundImage:`url("${image}")`}}/>)}
      </div>
    </div>

    <div className="service-showcase-head">
      <div>
        <span className="service-detail-chip">{service.sectionTitle}</span>
        <h1>{service.title}</h1>
        <div className="service-rating-row"><b>★ 4.9</b><span>(324 отзыва)</span><i>✓ Проверенные исполнители</i></div>
        <p>{service.description} Работаем по согласованному составу, фиксируем параметры заказа и сохраняем историю в кабинете AW HOME.</p>
      </div>
      <div className="service-showcase-price">
        <span>Стоимость</span>
        <strong>{service.price}</strong>
        <small>точная цена после параметров</small>
        {service.live&&<button className="market-cta" type="button" onClick={onCalculator}>Рассчитать →</button>}
        <button className={service.live?'market-ghost':'market-cta'} type="button" onClick={onOrder}>Оформить заказ</button>
      </div>
    </div>

    <div className="service-benefits">
      <div><span>♙</span><strong>Опытные бригады</strong><small>Подбор под задачу</small></div>
      <div><span>▣</span><strong>Вывоз и логистика</strong><small>При необходимости</small></div>
      <div><span>◷</span><strong>Контроль сроков</strong><small>Статусы в кабинете</small></div>
      <div><span>◇</span><strong>Гарантия процесса</strong><small>Фиксация результата</small></div>
    </div>

    <div className="service-detail-tabs"><button className="is-active" type="button">Описание</button><button type="button">Что входит</button><button type="button">Этапы работ</button><button type="button">Цены</button><button type="button">Отзывы</button></div>

    <div className="service-detail-grid service-detail-grid--showcase">
      <section className="service-detail-card">
        <span className="eyebrow">Что входит в услугу</span>
        <h2>Состав работ</h2>
        <div className="service-includes">{includes.map((item,index)=><div key={item}><span>✓</span><strong>{item}</strong></div>)}</div>
      </section>
      <section className="service-detail-card service-detail-card--facts">
        <div><span>▣</span><small>Срок выполнения</small><strong>от 1 дня</strong></div>
        <div><span>♙</span><small>Бригада</small><strong>2–4 человека</strong></div>
        <div><span>▤</span><small>Документы</small><strong>Смета и договор</strong></div>
        <div><span>✓</span><small>Контроль</small><strong>В кабинете</strong></div>
      </section>
    </div>

    <section className="service-order-strip">
      <div><span className="eyebrow">Оформить заказ</span><h2>Заполните параметры — мы рассчитаем точную стоимость</h2></div>
      <button className="market-cta" type="button" onClick={service.live?onCalculator:onOrder}>{service.live?'Перейти к расчёту →':'Начать оформление →'}</button>
    </section>

    {related.length>0&&<section className="service-related">
      <div className="market-home-section__head"><div><h2>Похожие услуги</h2><p>Можно добавить в один проект или оформить отдельно.</p></div></div>
      <div className="market-service-grid">
        {related.map(item=><article className="market-service-card" key={item.id}>
          <div className="market-service-card__image" style={{backgroundImage:`url("${item.image}")`}}/>
          <div className="market-service-card__body"><strong>{item.title}</strong><p>{item.description}</p><div className="market-service-card__meta"><span>{item.price}</span><button type="button" onClick={onBack}>Смотреть →</button></div></div>
        </article>)}
      </div>
    </section>}

    <div className="service-detail-note"><strong>Цена на карточке — ориентир.</strong><span>Финальная стоимость подтверждается до начала работ и фиксируется в заказе.</span></div>
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

  const popularIds=['demolition','waste','rough','electric','plumbing','design-project','care-general','realty-accept']
  const popular=popularIds.map(id=>allServices.find(service=>service.id===id)).filter(Boolean)
  const categoryServices=activeSection==='all'?popular:(shownSections[0]?.services||[])
  const searching=query.trim().length>0
  const searchResults=searching?shownSections.flatMap(section=>section.services):[]

  return <section className="marketplace-home marketplace-home--showcase">
    <section className="marketplace-hero marketplace-hero--showcase">
      <div className="marketplace-hero__content">
        <p className="eyebrow">AW HOME · сервис для дома</p>
        <h1>Все услуги для вашего дома — в надёжных руках</h1>
        <p>Недвижимость, проектирование, ремонт, управление и забота об объекте в одном сервисе.</p>
        <label className="hero-service-search">
          <span>⌕</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Какая услуга вам нужна?"/>
          <button type="button">Найти</button>
        </label>
        <div className="hero-trust-row">
          <span>◇ Проверенные специалисты</span>
          <span>▤ Прозрачные цены</span>
          <span>◇ Гарантия качества</span>
          <span>▣ Безопасная оплата</span>
          <span>☎ Поддержка 24/7</span>
        </div>
      </div>
    </section>

    {searching?<section className="market-home-section">
      <div className="market-home-section__head"><div><h2>Результаты поиска</h2><p>Найдено услуг: {searchResults.length}</p></div><button type="button" onClick={()=>setQuery('')}>Очистить →</button></div>
      <div className="market-service-grid market-service-grid--featured">
        {searchResults.map(service=><ServiceCard key={service.id} service={service} favorite={favorites.includes(service.id)} onToggleFavorite={toggleFavorite} onOpen={openService}/>)}
      </div>
    </section>:<>
      <section className="market-home-section">
        <div className="market-home-section__head"><div><h2>Популярные категории</h2><p>Выберите направление — покажем подходящие услуги.</p></div><button type="button" onClick={()=>setActiveSection('all')}>Все категории →</button></div>
        <div className="market-category-cards">
          {MARKETPLACE_SECTIONS.map(section=>{
            const image=section.services[0]?.image
            return <button key={section.id} type="button" className={activeSection===section.id?'market-category-card is-active':'market-category-card'} onClick={()=>setActiveSection(section.id)}>
              <span className="market-category-card__image" style={{backgroundImage:`linear-gradient(180deg,rgba(7,23,46,.02),rgba(7,23,46,.18)),url("${image}")`}}/>
              <span className="market-category-card__copy"><strong>{section.title}</strong><small>{section.services.slice(0,3).map(item=>item.title).join(', ')}</small><b>→</b></span>
            </button>
          })}
        </div>
      </section>

      <section className="market-home-section">
        <div className="market-home-section__head"><div><h2>{activeSection==='all'?'Популярные услуги':MARKETPLACE_SECTIONS.find(item=>item.id===activeSection)?.title}</h2><p>{activeSection==='all'?'Чаще всего заказывают сейчас':'Все услуги выбранного направления'}</p></div>{activeSection!=='all'&&<button type="button" onClick={()=>setActiveSection('all')}>← Все услуги</button>}</div>
        <div className="market-filter-pills">
          <button className={activeSection==='all'?'is-active':''} type="button" onClick={()=>setActiveSection('all')}>Все услуги</button>
          {MARKETPLACE_SECTIONS.map(section=><button className={activeSection===section.id?'is-active':''} key={section.id} type="button" onClick={()=>setActiveSection(section.id)}>{section.title}</button>)}
        </div>
        <div className="market-service-grid market-service-grid--featured">
          {categoryServices.map(service=><ServiceCard key={service.id} service={service} favorite={favorites.includes(service.id)} onToggleFavorite={toggleFavorite} onOpen={openService}/>)}
        </div>
      </section>
    </>}

    <section className="market-home-banner">
      <div><span>Комплексное решение</span><h2>Для вашего дома — от идеи до заботы</h2><p>Подберём услуги, соберём проект и сохраним всё в одном кабинете AW HOME.</p><button className="market-cta" type="button" onClick={()=>openService(allServices.find(item=>item.id==='turnkey')||allServices[0])}>Получить консультацию →</button></div>
    </section>

    <section className="market-home-stats">
      <div><strong>15 000+</strong><span>сценариев услуг</span></div>
      <div><strong>4.8</strong><span>целевая оценка сервиса</span></div>
      <div><strong>98%</strong><span>контролируемых этапов</span></div>
      <div><strong>24/7</strong><span>кабинет и поддержка</span></div>
    </section>

    <div className="market-home-shortcuts">
      <button type="button" onClick={onOrders}>Мои заказы</button>
      <button type="button" onClick={onCabinet}>Личный кабинет</button>
    </div>
    <p className="marketplace-disclaimer">Цены в демо-каталоге ориентировочные и не являются публичной офертой. Финальная стоимость определяется после подтверждения параметров заказа.</p>
  </section>
}
