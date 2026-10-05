import { useMemo, useState } from 'react'
import {
  WASTE_REMOVAL_RATES, WASTE_REMOVAL_TYPES, calculateWasteRemoval, money, toNum,
} from '../domain/model.js'

const LOCAL_WASTE_PRICING={
  id:'local-waste-v1',
  code:'LOCAL-WASTE',
  version:1,
  title:'Вывоз строительного мусора · локальная модель v1',
  currency:'RUB',
  rates:WASTE_REMOVAL_RATES,
}

function StepMeta({current}) {
  return <div className="step-meta">
    <span>Вывоз мусора: шаг {current} из 5</span>
    <div className="step-meta__track"><span style={{width:`${(current/5)*100}%`}}/></div>
  </div>
}

function PrimaryButton({children,disabled=false,onClick}) {
  return <button className="button button--primary" disabled={disabled} onClick={onClick} type="button">{children}</button>
}

export default function CreateWasteOrder({initialOrder,onCancel,onSave}) {
  const source=initialOrder?.wasteRemoval||{}
  const [step,setStep]=useState(initialOrder?.id?5:1)
  const [types,setTypes]=useState(source.types||[])
  const [amountMode,setAmountMode]=useState(source.amountMode||'bags')
  const [bags,setBags]=useState(String(source.bags??10))
  const [volume,setVolume]=useState(String(source.volume??1))
  const [visualSize,setVisualSize]=useState(source.visualSize||'small')
  const [photoName,setPhotoName]=useState(source.photoName||'')
  const [address,setAddress]=useState(initialOrder?.address||source.address||'')
  const [floor,setFloor]=useState(String(initialOrder?.floor??source.floor??''))
  const [lift,setLift]=useState(initialOrder?.lift||source.lift||'yes')
  const [distance,setDistance]=useState(String(source.distance??20))
  const [carryMode,setCarryMode]=useState(source.carryMode||'prepared')
  const [date,setDate]=useState(source.date||'')
  const [timeSlot,setTimeSlot]=useState(source.timeSlot||'08:00–12:00')

  const calculation=useMemo(()=>calculateWasteRemoval({
    types,amountMode,bags,volume,visualSize,floor,lift,distance,carryMode,
  }),[types,amountMode,bags,volume,visualSize,floor,lift,distance,carryMode])

  const toggleType=id=>setTypes(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id])
  const quantityValid=calculation.volume>0
  const conditionsValid=Boolean(address.trim()&&floor)
  const dateValid=Boolean(date&&timeSlot)

  const save=()=>{
    const serviceLogistics={
      transport:calculation.transport,
      transportLabel:calculation.transportLabel,
      disposal:calculation.disposal,
      distanceFee:calculation.distanceFee,
      distanceLabel:calculation.distanceLabel,
      total:calculation.transport+calculation.disposal+calculation.distanceFee,
      volume:calculation.volume,
      bags:calculation.bags,
      weight:0,
      bulky:0,
    }
    onSave({
      ...(initialOrder||{}),
      serviceType:'waste',
      serviceLabel:'Вывоз строительного мусора',
      objectType:'waste',
      objectLabel:'Вывоз строительного мусора',
      address:address.trim(),
      area:'',
      floor,
      lift,
      rooms:[],
      demolition:{},
      roughRepair:{},
      wasteRemoval:{
        types,amountMode,bags:toNum(bags),volume:toNum(volume),visualSize,photoName,
        address:address.trim(),floor,lift,distance:toNum(distance),carryMode,date,timeSlot,
        calculation,
      },
      rates:WASTE_REMOVAL_RATES,
      workTotal:calculation.carry+calculation.loading,
      logistics:serviceLogistics,
      total:calculation.total,
      priceBook:{
        id:LOCAL_WASTE_PRICING.id,code:LOCAL_WASTE_PRICING.code,
        version:LOCAL_WASTE_PRICING.version,title:LOCAL_WASTE_PRICING.title,
        currency:LOCAL_WASTE_PRICING.currency,
      },
      pricingSnapshot:LOCAL_WASTE_PRICING,
    })
  }

  return <section className="workspace waste-wizard">
    <button className="back-link" type="button" onClick={step===1?onCancel:()=>setStep(step-1)}>← {step===1?'Все услуги':'Назад'}</button>
    <StepMeta current={step}/>

    {step===1&&<>
      <div className="page-heading">
        <p className="eyebrow">Вывоз строительного мусора</p>
        <h1>Что нужно вывезти?</h1>
        <p>Можно выбрать несколько типов. Это помогает подобрать транспорт и оценить утилизацию.</p>
      </div>
      <div className="waste-choice-grid">
        {WASTE_REMOVAL_TYPES.map(item=><button key={item.id} type="button" className={types.includes(item.id)?'waste-choice is-selected':'waste-choice'} onClick={()=>toggleType(item.id)}>
          <span className="waste-choice__icon">{item.icon}</span>
          <strong>{item.title}</strong>
          <span className="waste-choice__check">{types.includes(item.id)?'✓':'+'}</span>
        </button>)}
      </div>
      <PrimaryButton disabled={!types.length} onClick={()=>setStep(2)}>Продолжить</PrimaryButton>
    </>}

    {step===2&&<>
      <div className="page-heading">
        <p className="eyebrow">Объём</p>
        <h1>Сколько мусора?</h1>
        <p>Выберите удобный способ. Если объём неизвестен, дадим предварительную оценку.</p>
      </div>
      <div className="mode-switch waste-mode-switch">
        <button type="button" className={amountMode==='bags'?'is-active':''} onClick={()=>setAmountMode('bags')}>Мешки</button>
        <button type="button" className={amountMode==='m3'?'is-active':''} onClick={()=>setAmountMode('m3')}>Кубометры</button>
        <button type="button" className={amountMode==='unknown'?'is-active':''} onClick={()=>setAmountMode('unknown')}>Не знаю объём</button>
      </div>

      {amountMode==='bags'&&<div className="waste-amount-card">
        <label className="field"><span>Количество мешков</span><input inputMode="numeric" value={bags} onChange={e=>setBags(e.target.value.replace(/\D/g,''))}/></label>
        <div className="waste-amount-hint">Ориентировочный объём: <strong>{calculation.volume.toFixed(2)} м³</strong></div>
      </div>}
      {amountMode==='m3'&&<div className="waste-amount-card">
        <label className="field"><span>Объём, м³</span><input inputMode="decimal" value={volume} onChange={e=>setVolume(e.target.value.replace(/[^0-9.,]/g,''))}/></label>
        <div className="waste-amount-hint">Для расчёта выноса это примерно <strong>{calculation.bags} мешков</strong>.</div>
      </div>}
      {amountMode==='unknown'&&<div className="visual-volume-grid">
        {[
          ['small','Мало','До 10 мешков · ~1 м³'],
          ['medium','Средне','10–30 мешков · ~4 м³'],
          ['large','Много','Более 30 мешков · ~8 м³'],
        ].map(([id,title,text])=><button type="button" key={id} className={visualSize===id?'visual-volume is-selected':'visual-volume'} onClick={()=>setVisualSize(id)}>
          <strong>{title}</strong><span>{text}</span>
        </button>)}
      </div>}

      <label className="photo-upload">
        <input type="file" accept="image/*" hidden onChange={e=>setPhotoName(e.target.files?.[0]?.name||'')}/>
        <span>▣</span>
        <strong>{photoName?'Фото добавлено':'Добавить фото (необязательно)'}</strong>
        <small>{photoName||'Фото поможет точнее проверить объём перед подачей машины.'}</small>
      </label>

      <PrimaryButton disabled={!quantityValid} onClick={()=>setStep(3)}>Продолжить</PrimaryButton>
    </>}

    {step===3&&<>
      <div className="page-heading">
        <p className="eyebrow">Условия на объекте</p>
        <h1>Откуда забираем?</h1>
        <p>Этаж, лифт и расстояние до автомобиля влияют только на вынос, если он нужен.</p>
      </div>
      <div className="form-grid form-grid--order">
        <label className="field field--wide"><span>Адрес объекта</span><input placeholder="Москва, улица, дом, квартира" value={address} onChange={e=>setAddress(e.target.value)}/></label>
        <label className="field"><span>Этаж</span><input inputMode="numeric" placeholder="4" value={floor} onChange={e=>setFloor(e.target.value.replace(/\D/g,''))}/></label>
        <label className="field"><span>Расстояние до машины, м</span><input inputMode="numeric" placeholder="20" value={distance} onChange={e=>setDistance(e.target.value.replace(/\D/g,''))}/></label>
      </div>

      <div className="segmented"><span>Есть лифт?</span><div>
        <button className={lift==='yes'?'is-active':''} type="button" onClick={()=>setLift('yes')}>Да</button>
        <button className={lift==='no'?'is-active':''} type="button" onClick={()=>setLift('no')}>Нет</button>
      </div></div>

      <div className="waste-carry-choice">
        <button type="button" className={carryMode==='prepared'?'is-selected':''} onClick={()=>setCarryMode('prepared')}>
          <strong>Мусор уже вынесен</strong><span>Нужны погрузка, транспорт и утилизация</span>
        </button>
        <button type="button" className={carryMode==='team'?'is-selected':''} onClick={()=>setCarryMode('team')}>
          <strong>Нужна бригада</strong><span>Заберём мусор с объекта и вынесем к машине</span>
        </button>
      </div>

      {carryMode==='team'&&<div className="notice">
        {lift==='no'?<span>{floor} этаж без лифта — в расчёте учтён ручной спуск.</span>:<span>Лифт учтён в расчёте выноса.</span>}
      </div>}
      <PrimaryButton disabled={!conditionsValid} onClick={()=>setStep(4)}>Продолжить</PrimaryButton>
    </>}

    {step===4&&<>
      <div className="page-heading">
        <p className="eyebrow">Дата и время</p>
        <h1>Когда нужен вывоз?</h1>
        <p>Выберите дату и удобный интервал подачи.</p>
      </div>
      <label className="field waste-date"><span>Дата вывоза</span><input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label>
      <div className="time-slot-grid">
        {['08:00–12:00','12:00–16:00','16:00–20:00'].map(slot=><button type="button" key={slot} className={timeSlot===slot?'time-slot is-selected':'time-slot'} onClick={()=>setTimeSlot(slot)}>
          <span>◷</span><strong>{slot}</strong>
        </button>)}
      </div>
      <div className="service-next">
        <strong>Обычно вывоз занимает 1–2 часа</strong>
        <span>После оформления заказа можно уточнить детали и точку подачи автомобиля.</span>
      </div>
      <PrimaryButton disabled={!dateValid} onClick={()=>setStep(5)}>Рассчитать стоимость</PrimaryButton>
    </>}

    {step===5&&<>
      <div className="workspace__head waste-result-head">
        <div>
          <p className="eyebrow">Итог расчёта</p>
          <h1>Вывоз строительного мусора</h1>
          <p className="workspace__subtitle">{address} · {date||'дата не выбрана'} · {timeSlot}</p>
        </div>
        <div className="estimate-total"><span>К оплате</span><strong>{money(calculation.total)} ₽</strong></div>
      </div>

      <div className="waste-result-grid">
        <section className="detail-card">
          <p className="eyebrow">Заказ</p>
          <dl>
            <div><dt>Тип мусора</dt><dd>{types.map(id=>WASTE_REMOVAL_TYPES.find(item=>item.id===id)?.title).filter(Boolean).join(', ')}</dd></div>
            <div><dt>Объём</dt><dd>{calculation.volume.toFixed(2)} м³</dd></div>
            <div><dt>Этаж</dt><dd>{floor}{lift==='yes'?' · есть лифт':' · без лифта'}</dd></div>
            <div><dt>Вынос</dt><dd>{carryMode==='team'?'Нужна бригада':'Мусор уже вынесен'}</dd></div>
          </dl>
        </section>
        <section className="detail-card">
          <p className="eyebrow">Дата</p>
          <h2>{date?new Date(date+'T00:00:00').toLocaleDateString('ru-RU'):'—'}</h2>
          <p>{timeSlot}</p>
          <small className="muted">Интервал подачи будет подтверждён при обработке заказа.</small>
        </section>
      </div>

      <section className="detail-card detail-card--wide waste-price-breakdown">
        <p className="eyebrow">Стоимость</p>
        <div><span>Вынос с объекта</span><strong>{money(calculation.carry)} ₽</strong></div>
        <div><span>Погрузка</span><strong>{money(calculation.loading)} ₽</strong></div>
        <div><span>Транспорт · {calculation.transportLabel}</span><strong>{money(calculation.transport)} ₽</strong></div>
        <div><span>Утилизация</span><strong>{money(calculation.disposal)} ₽</strong></div>
        {calculation.distanceFee>0&&<div><span>Дальний пронос · {calculation.distanceLabel}</span><strong>{money(calculation.distanceFee)} ₽</strong></div>}
        <div className="waste-price-breakdown__total"><span>Итого</span><strong>{money(calculation.total)} ₽</strong></div>
      </section>

      <p className="estimate-disclaimer">Расчёт является предварительным. Перед коммерческим запуском тарифы транспорта, погрузки и утилизации необходимо актуализировать и утвердить.</p>
      <div className="wizard-footer">
        <button className="button button--soft" type="button" onClick={()=>setStep(1)}>Изменить расчёт</button>
        <button className="button button--primary button--finish" type="button" disabled={!types.length||!quantityValid||!conditionsValid||!dateValid} onClick={save}>Оформить заказ</button>
      </div>
    </>}
  </section>
}
