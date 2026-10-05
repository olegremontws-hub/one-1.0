import { money, statusLabel } from '../domain/model.js'

function clientName(profile){
  if(!profile) return 'Клиент'
  return profile.fullName||profile.fio||profile.name||profile.displayName||profile.contactPerson||profile.companyName||'Клиент'
}

function serviceTitle(order){
  if(order?.serviceType==='rough') return 'Черновой ремонт'
  if(order?.serviceType==='waste') return 'Вывоз строительного мусора'
  return 'Демонтаж'
}

export default function ClientHome({profile,orders,onOpenOrder,onCreateProject,onWaste,onOrders}){
  const name=clientName(profile)
  const current=orders?.[0]||null
  const projects=(orders||[]).slice(0,6)

  return <section className="client-home">
    <div className="client-home__welcome">
      <div>
        <p className="eyebrow">Личный кабинет</p>
        <h1>Доброе утро, {name}!</h1>
      </div>
      <div className="estimator-call">
        <span>Вызов сметчика: <b>Не выбрано</b></span>
        <button className="secondary-button" type="button">Время приезда сметчика</button>
      </div>
    </div>

    <section className="home-section">
      <div className="home-section__title">
        <div>
          <h2>Недавние действия</h2>
          <p>Просматривайте актуальную информацию. Следите за тем, чтобы работа шла по плану.</p>
        </div>
      </div>

      <div className="recent-grid">
        <article className="recent-info-card">
          <span className="recent-info-card__icon">↗</span>
          <strong>Недавние действия</strong>
          <p>{current?'У вас есть активный заказ. Откройте карточку, чтобы проверить смету и ход выполнения.':'Создайте первый проект и получите прозрачную смету.'}</p>
        </article>

        {current?<button className="current-order-card" type="button" onClick={()=>onOpenOrder(current.id)}>
          <div className="current-order-card__top">
            <span>Заказ № {current.id}</span>
            <small>{statusLabel(current.status)}</small>
          </div>
          <strong>{serviceTitle(current)}</strong>
          <p>{current.address||'Адрес не указан'}</p>
          <div className="current-order-card__bottom">
            <span>{money(current.total||0)} ₽</span>
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

    <section className="home-section">
      <div className="home-section__title"><h2>Дополнительные услуги</h2></div>
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
        {projects.length?projects.map((order,index)=><button className={'project-tile project-tile--'+((index%4)+1)} key={order.id} type="button" onClick={()=>onOpenOrder(order.id)}>
          <div className="project-tile__image">
            <span>{serviceTitle(order)}</span>
            <b>№ {order.id}</b>
          </div>
          <strong>{order.objectLabel||serviceTitle(order)}</strong>
          <p>{order.address||'Адрес объекта'}</p>
          <span>{money(order.total||0)} ₽</span>
        </button>):[
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
