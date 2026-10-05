import { useMemo, useState } from 'react'
import { readJSON, writeJSON } from '../lib/storage.js'

const REQUESTS_KEY='awhome.marketplace.requests'
const FAVORITES_KEY='awhome.marketplace.favorites'

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
  {
    id:'realty',number:'01',title:'Недвижимость',icon:'⌂',accent:'navy',
    services:[
      {id:'realty-search',title:'Подбор недвижимости',price:'от 0 ₽',action:'Заказать',image:IMG.home,description:'Подбор квартиры, апартаментов или дома под задачу клиента.'},
      {id:'realty-buy',title:'Покупка квартиры',price:'от 0 ₽',action:'Подробнее',image:IMG.keys,description:'Сопровождение сделки и проверка объекта перед покупкой.'},
      {id:'realty-sell',title:'Продажа недвижимости',price:'от 0 ₽',action:'Заказать',image:IMG.building,description:'Подготовка объекта, позиционирование и сопровождение продажи.'},
      {id:'realty-accept',title:'Приёмка квартиры',price:'от 5 000 ₽',action:'Заказать',image:IMG.inspection,description:'Проверка отделки, инженерии и фиксация замечаний.'},
      {id:'realty-value',title:'Оценка недвижимости',price:'от 4 000 ₽',action:'Рассчитать',image:IMG.building,description:'Предварительная оценка рыночной стоимости объекта.'},
      {id:'realty-move',title:'Переезд',price:'от 3 000 ₽',action:'Заказать',image:IMG.move,description:'Упаковка, погрузка, перевозка и разгрузка имущества.'},
    ],
  },
  {
    id:'design',number:'02',title:'Архитектура и Дизайн',icon:'▱',accent:'gold',
    services:[
      {id:'design-project',title:'Дизайн-проект квартиры',price:'от 1 500 ₽/м²',action:'Заказать',image:IMG.interior,description:'Концепция, планировка, визуализации и рабочие чертежи.'},
      {id:'design-bath',title:'Дизайн ванной комнаты',price:'от 20 000 ₽',action:'Подробнее',image:IMG.bathroom,description:'Планировка санузла, подбор отделки и сантехники.'},
      {id:'design-layout',title:'Планировочное решение',price:'от 10 000 ₽',action:'Заказать',image:IMG.plans,description:'Несколько вариантов функциональной планировки объекта.'},
      {id:'design-3d',title:'3D-визуализация',price:'от 500 ₽/м²',action:'Заказать',image:IMG.interior,description:'Фотореалистичная визуализация будущего интерьера.'},
      {id:'design-materials',title:'Подбор материалов',price:'от 3 000 ₽',action:'Подробнее',image:IMG.materials,description:'Подбор отделочных материалов под бюджет и концепцию.'},
      {id:'design-supply',title:'Комплектация интерьера',price:'от 5 000 ₽',action:'Заказать',image:IMG.interior,description:'Мебель, свет, сантехника, декор и контроль поставок.'},
    ],
  },
  {
    id:'build',number:'03',title:'Стройка и Ремонт',icon:'△',accent:'blue',
    services:[
      {id:'demolition',title:'Демонтаж',price:'от 300 ₽/м²',action:'Рассчитать',image:IMG.demolition,description:'Демонтаж отделки, конструкций, сантехники и инженерии.',live:'demolition'},
      {id:'waste',title:'Вывоз строительного мусора',price:'от 5 000 ₽',action:'Рассчитать',image:IMG.truck,description:'Вынос, погрузка, транспорт и утилизация строительных отходов.',live:'waste'},
      {id:'rough',title:'Черновой ремонт',price:'от 3 000 ₽/м²',action:'Рассчитать',image:IMG.rough,description:'Стены, пол, потолок, инженерия и подготовка оснований.',live:'rough'},
      {id:'electric',title:'Электромонтажные работы',price:'от 1 500 ₽/точка',action:'Заказать',image:IMG.electric,description:'Разводка, щит, кабельные линии и установочные точки.'},
      {id:'plumbing',title:'Сантехнические работы',price:'от 1 500 ₽/точка',action:'Заказать',image:IMG.plumbing,description:'Водоснабжение, канализация, инсталляции и подключения.'},
      {id:'turnkey',title:'Ремонт под ключ',price:'от 12 000 ₽/м²',action:'Подробнее',image:IMG.renovation,description:'Полный цикл ремонта с управлением сроками и сметой.'},
    ],
  },
  {
    id:'manage',number:'04',title:'УправКом',icon:'▥',accent:'steel',
    services:[
      {id:'manage-flat',title:'Управление квартирой',price:'от 1 000 ₽/мес',action:'Заказать',image:IMG.management,description:'Контроль объекта, подрядчиков, счетов и сервисных задач.'},
      {id:'manage-tech',title:'Техническое обслуживание',price:'от 2 000 ₽',action:'Заказать',image:IMG.engineer,description:'Плановые проверки инженерных систем и оборудования.'},
      {id:'manage-emergency',title:'Аварийный мастер',price:'от 3 000 ₽',action:'Вызвать',image:IMG.engineer,description:'Срочный выезд специалиста при бытовой аварии.'},
      {id:'manage-meters',title:'Контроль счётчиков',price:'от 500 ₽',action:'Заказать',image:IMG.meter,description:'Снятие показаний и контроль приборов учёта.'},
      {id:'manage-bills',title:'Оплата коммунальных услуг',price:'от 0 ₽',action:'Подробнее',image:IMG.management,description:'Организация учёта начислений и регулярных платежей.'},
      {id:'manage-contractors',title:'Контроль подрядчиков',price:'от 2 000 ₽',action:'Заказать',image:IMG.inspection,description:'Приём исполнителей, фотоотчёт и контроль результата.'},
    ],
  },
  {
    id:'care',number:'05',title:'Уход за домом',icon:'◒',accent:'green',
    services:[
      {id:'care-general',title:'Генеральная уборка',price:'от 3 000 ₽',action:'Заказать',image:IMG.cleaning,description:'Комплексная уборка квартиры или дома.'},
      {id:'care-after',title:'Уборка после ремонта',price:'от 4 000 ₽',action:'Заказать',image:IMG.cleaning,description:'Удаление строительной пыли и подготовка к заселению.'},
      {id:'care-window',title:'Мытьё окон',price:'от 500 ₽/окно',action:'Заказать',image:IMG.window,description:'Окна, рамы, откосы и стеклянные поверхности.'},
      {id:'care-sofa',title:'Химчистка мебели',price:'от 1 500 ₽',action:'Заказать',image:IMG.sofa,description:'Диваны, кресла, матрасы и мягкая мебель.'},
      {id:'care-floor',title:'Уход за паркетом',price:'от 1 000 ₽/м²',action:'Подробнее',image:IMG.floor,description:'Очистка, восстановление и защитный уход за полом.'},
      {id:'care-handyman',title:'Домашний мастер',price:'от 1 500 ₽/час',action:'Заказать',image:IMG.engineer,description:'Мелкий ремонт, монтаж и бытовые задачи по дому.'},
    ],
  },
]

const allServices=MARKETPLACE_SECTIONS.flatMap(section=>section.services.map(service=>({...service,sectionId:section.id,sectionTitle:section.title})))

function MarketplaceRequest({service,onClose,onSaved}){
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [address,setAddress]=useState('')
  const [date,setDate]=useState('')
  const canSave=name.trim()&&phone.replace(/\D/g,'').length>=10&&address.trim()
  const save=()=>{
    if(!canSave) return
    const current=readJSON(REQUESTS_KEY,[])||[]
    const request={id:'REQ-'+Date.now(),serviceId:service.id,serviceTitle:service.title,name,phone,address,date,createdAt:new Date().toISOString(),status:'new'}
    writeJSON(REQUESTS_KEY,[request,...current])
    onSaved(request)
  }
  return <div className="market-modal" role="dialog" aria-modal="true">
    <button className="market-modal__backdrop" type="button" onClick={onClose} aria-label="Закрыть"/>
    <div className="market-modal__sheet">
      <button className="market-modal__close" type="button" onClick={onClose}>×</button>
      <p className="eyebrow">Заявка на услугу</p>
      <h2>{service.title}</h2>
      <p>{service.description}</p>
      <div className="market-modal__form">
        <label><span>Имя</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Как к вам обращаться"/></label>
        <label><span>Телефон</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 999 123-45-67" inputMode="tel"/></label>
        <label><span>Адрес объекта</span><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Москва, улица, дом"/></label>
        <label><span>Желаемая дата</span><input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>
      <button className="market-cta market-cta--wide" type="button" disabled={!canSave} onClick={save}>Отправить заявку</button>
      <small>Демо-заявка сохраняется локально в браузере.</small>
    </div>
  </div>
}

function ServiceCard({service,favorite,onToggleFavorite,onAction}){
  return <article className="market-service-card">
    <div className="market-service-card__image" style={{backgroundImage:`linear-gradient(180deg,rgba(7,23,46,0) 45%,rgba(7,23,46,.18)),url("${service.image}")`}}>
      <button type="button" className={favorite?'market-heart is-active':'market-heart'} onClick={()=>onToggleFavorite(service.id)} aria-label="В избранное">{favorite?'♥':'♡'}</button>
    </div>
    <div className="market-service-card__body">
      <strong>{service.title}</strong>
      <p>{service.description}</p>
      <div className="market-service-card__meta">
        <span>{service.price}</span>
        <button type="button" onClick={()=>onAction(service)}>{service.action} <b>→</b></button>
      </div>
    </div>
  </article>
}

export default function MarketplaceHome({onDemolition,onWaste,onRough,onOrders,onCabinet}){
  const [query,setQuery]=useState('')
  const [activeSection,setActiveSection]=useState('all')
  const [requestService,setRequestService]=useState(null)
  const [notice,setNotice]=useState('')
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

  const toggleFavorite=id=>{
    const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id]
    setFavorites(next)
    writeJSON(FAVORITES_KEY,next)
  }

  const action=service=>{
    if(service.live==='demolition') return onDemolition()
    if(service.live==='waste') return onWaste()
    if(service.live==='rough') return onRough()
    setRequestService(service)
  }

  const popular=['demolition','waste','rough'].map(id=>allServices.find(service=>service.id===id)).filter(Boolean)

  return <section className="marketplace-home">
    <div className="marketplace-topline">
      <button className="marketplace-location" type="button">● Москва <span>⌄</span></button>
      <label className="marketplace-search">
        <span>⌕</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти услугу: ремонт квартиры, дизайн, клининг…"/>
      </label>
      <button type="button" className="marketplace-mini-link" onClick={()=>setActiveSection('all')}>♡ Избранное <b>{favorites.length||''}</b></button>
      <button type="button" className="marketplace-mini-link" onClick={onOrders}>Мои заказы</button>
      <button type="button" className="marketplace-profile-link" onClick={onCabinet}>◎ Кабинет</button>
    </div>

    <section className="marketplace-hero">
      <div className="marketplace-hero__content">
        <p className="eyebrow">AW HOME · маркетплейс услуг</p>
        <h1>Маркетплейс услуг для дома</h1>
        <p>Недвижимость, проектирование, ремонт, управление и уход — в одном сервисе.</p>
        <div className="marketplace-hero__actions">
          <button className="market-cta" type="button" onClick={()=>setActiveSection('build')}>Подобрать услугу</button>
          <button className="market-ghost" type="button" onClick={onOrders}>Мои проекты</button>
        </div>
      </div>
      <div className="marketplace-hero__trust">
        <strong>Комфортный дом начинается с надёжных людей</strong>
        <span>◇ Проверенные специалисты</span>
        <span>♢ Безопасные сделки</span>
        <span>☆ Контроль качества</span>
      </div>
    </section>

    <nav className="market-category-nav" aria-label="Разделы маркетплейса">
      <button className={activeSection==='all'?'is-active':''} type="button" onClick={()=>setActiveSection('all')}><span>◎</span><b>Все услуги</b></button>
      {MARKETPLACE_SECTIONS.map(section=><button key={section.id} className={activeSection===section.id?'is-active':''} type="button" onClick={()=>setActiveSection(section.id)}>
        <span>{section.icon}</span><b>{section.title}</b>
      </button>)}
    </nav>

    {notice&&<div className="marketplace-notice">{notice}<button type="button" onClick={()=>setNotice('')}>×</button></div>}

    <div className="marketplace-layout">
      <main className="marketplace-catalog">
        {shownSections.length?shownSections.map(section=><section className="market-section" key={section.id}>
          <div className="market-section__head">
            <div><span>{section.number}</span><h2>{section.title}</h2></div>
            <button type="button" onClick={()=>setActiveSection(section.id)}>Все услуги →</button>
          </div>
          <div className="market-service-grid">
            {section.services.map(service=><ServiceCard key={service.id} service={service} favorite={favorites.includes(service.id)} onToggleFavorite={toggleFavorite} onAction={action}/>)}
          </div>
        </section>):<div className="market-empty"><strong>Ничего не найдено</strong><p>Попробуйте изменить поисковый запрос или открыть все категории.</p><button type="button" onClick={()=>{setQuery('');setActiveSection('all')}}>Показать все услуги</button></div>}
      </main>

      <aside className="marketplace-sidebar">
        <div className="marketplace-promo">
          <span>AW HOME</span>
          <h2>Ваш дом в надёжных руках</h2>
          <p>От первой сметы до регулярного ухода за объектом.</p>
          <button className="market-cta" type="button" onClick={()=>setActiveSection('build')}>Создать заказ →</button>
        </div>

        <section className="marketplace-popular">
          <div className="marketplace-popular__head"><h3>🔥 Популярные услуги</h3><span>Сейчас</span></div>
          {popular.map((service,index)=><button className="popular-service" key={service.id} type="button" onClick={()=>action(service)}>
            <span className="popular-service__image" style={{backgroundImage:`url("${service.image}")`}}/>
            <span className="popular-service__info"><strong>{service.title}</strong><small>{service.price}</small></span>
            <span className="popular-service__rating">★ {(4.9-index*.1).toFixed(1)}</span>
          </button>)}
        </section>

        <section className="marketplace-trust-metrics">
          <div><strong>10 000+</strong><span>услуг и сценариев</span></div>
          <div><strong>4.8</strong><span>целевая оценка</span></div>
          <div><strong>1 сервис</strong><span>для всего дома</span></div>
        </section>
      </aside>
    </div>

    <section className="marketplace-help">
      <div><strong>Не знаете, что выбрать?</strong><span>Поможем определить нужную услугу под объект и задачу.</span></div>
      <button className="market-cta" type="button" onClick={()=>setRequestService({id:'consult',title:'Консультация AW HOME',description:'Поможем подобрать подходящую услугу и следующий шаг.',price:'Бесплатно'})}>Получить консультацию →</button>
    </section>

    <p className="marketplace-disclaimer">Цены в демо-каталоге ориентировочные и не являются публичной офертой. Финальная стоимость определяется после расчёта параметров заказа.</p>

    {requestService&&<MarketplaceRequest service={requestService} onClose={()=>setRequestService(null)} onSaved={request=>{
      setRequestService(null)
      setNotice(`Заявка ${request.id} сохранена. Следующим этапом подключим отправку менеджеру AW HOME.`)
    }}/>}
  </section>
}
