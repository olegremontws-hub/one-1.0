import { useEffect, useMemo, useState } from 'react'
import AddressPicker from './AddressPicker.jsx'
import {
  DEMO_CATALOG, DEMO_RATES, DEMO_RISKS, LOGISTICS_RATES, OBJECT_TYPES, ROOM_TYPES, WASTE_RULES,
  buildEstimateRows, calculateWasteAndLogistics, money, newRoom, roomCalc,
  suggestedQuantity, toNum,
} from '../domain/model.js'
import { readJSON, removeKey, writeJSON } from '../lib/storage.js'

const LOCAL_PRICING={
  id:'local-v1',
  code:'LOCAL-DEMO',
  version:1,
  title:'Локальная модель v1',
  currency:'RUB',
  rates:DEMO_RATES,
  wasteRules:WASTE_RULES,
  logisticsRates:LOGISTICS_RATES,
}

function StepMeta({current,total=4,label='Новый заказ'}) {
  return <div className="step-meta"><span>{label}: шаг {current} из {total}</span><div className="step-meta__track"><span style={{width:`${(current/total)*100}%`}} /></div></div>
}

function PrimaryButton({children,disabled=false,onClick}) {
  return <button className="button button--primary" disabled={disabled} onClick={onClick} type="button">{children}</button>
}

export function RoomCard({room,index,onChange,onRemove,canRemove}) {
  const calc=roomCalc(room)
  const set=(key,value)=>onChange({...room,[key]:value})

  return <article className="room-card">
    <div className="room-card__head">
      <div><span className="room-index">{index+1}</span><strong>Помещение {index+1}</strong></div>
      {canRemove && <button className="danger-link" type="button" onClick={onRemove}>Удалить</button>}
    </div>

    <label className="field"><span>Тип помещения</span>
      <select value={room.type} onChange={e=>set('type',e.target.value)}>
        <option value="">Выберите</option>{ROOM_TYPES.map(x=><option key={x}>{x}</option>)}
      </select>
    </label>

    <div className="mode-switch">
      <button type="button" className={room.mode==='exact'?'is-active':''} onClick={()=>set('mode','exact')}>Точный по размерам</button>
      <button type="button" className={room.mode==='quick'?'is-active':''} onClick={()=>set('mode','quick')}>Быстрый по м²</button>
    </div>

    {room.mode==='exact' ? <div className="form-grid room-dimensions">
      <label className="field"><span>Длина, м</span><input inputMode="decimal" placeholder="5,00" value={room.length} onChange={e=>set('length',e.target.value)}/></label>
      <label className="field"><span>Ширина, м</span><input inputMode="decimal" placeholder="4,00" value={room.width} onChange={e=>set('width',e.target.value)}/></label>
      <label className="field field--wide"><span>Высота потолка, м</span><input inputMode="decimal" placeholder="3,00" value={room.height} onChange={e=>set('height',e.target.value)}/></label>
    </div> : <div className="form-grid room-dimensions">
      <label className="field"><span>Площадь по полу, м²</span><input inputMode="decimal" placeholder="20,00" value={room.floorArea} onChange={e=>set('floorArea',e.target.value)}/></label>
      <label className="field"><span>Высота потолка, м</span><input inputMode="decimal" placeholder="3,00" value={room.height} onChange={e=>set('height',e.target.value)}/></label>
      <p className="quick-note">Предварительный расчёт: периметр определяется для условно квадратного помещения.</p>
    </div>}

    <details className="openings">
      <summary>Окна и двери</summary>
      <div className="opening-grid">
        <div><h3>Дверь</h3><div className="mini-fields">
          <label><span>Ширина, см</span><input inputMode="numeric" value={room.doorWidth} onChange={e=>set('doorWidth',e.target.value)}/></label>
          <label><span>Высота, см</span><input inputMode="numeric" value={room.doorHeight} onChange={e=>set('doorHeight',e.target.value)}/></label>
          <label><span>Кол-во</span><input inputMode="numeric" value={room.doorQty} onChange={e=>set('doorQty',e.target.value)}/></label>
        </div></div>
        <div><h3>Окно</h3><div className="mini-fields">
          <label><span>Ширина, см</span><input inputMode="numeric" value={room.windowWidth} onChange={e=>set('windowWidth',e.target.value)}/></label>
          <label><span>Высота, см</span><input inputMode="numeric" value={room.windowHeight} onChange={e=>set('windowHeight',e.target.value)}/></label>
          <label><span>Кол-во</span><input inputMode="numeric" value={room.windowQty} onChange={e=>set('windowQty',e.target.value)}/></label>
        </div></div>
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

function DemolitionStep({rooms,selections,setSelections,onBack,onNext}) {
  const [activeRoomId,setActiveRoomId]=useState(rooms[0]?.id||'')
  const [activeCategory,setActiveCategory]=useState('floor')
  const activeRoom=rooms.find(room=>room.id===activeRoomId)||rooms[0]
  const category=DEMO_CATALOG.find(item=>item.id===activeCategory)||DEMO_CATALOG[0]
  const calc=activeRoom?roomCalc(activeRoom):{}

  const qty=code=>toNum(selections[`${activeRoomId}:${code}`])
  const setQty=(code,next)=>{
    const key=`${activeRoomId}:${code}`
    const numeric=Math.max(0,toNum(next))
    setSelections(current=>{
      const copy={...current}
      if(numeric<=0) delete copy[key]
      else copy[key]=Number(numeric.toFixed(2))
      return copy
    })
  }

  const fillGeometry=()=>{
    setSelections(current=>{
      const copy={...current}
      category.groups.forEach(group=>group.items.forEach(([code])=>{
        const suggested=suggestedQuantity(code,activeRoom)
        if(suggested>0) copy[`${activeRoomId}:${code}`]=Number(suggested.toFixed(2))
      }))
      return copy
    })
  }

  const selectedCount=Object.values(selections).filter(value=>toNum(value)>0).length

  return <section className="workspace workspace--services">
    <button className="back-link" type="button" onClick={onBack}>← Помещения и геометрия</button>
    <StepMeta current={3}/>
    <div className="workspace__head service-head">
      <div><p className="eyebrow">Услуги</p><h1>Демонтажные работы</h1><p className="workspace__subtitle">Выберите конкретные элементы. Площадные позиции могут получать количество из геометрии помещения.</p></div>
      <div className="selected-counter"><span>Выбрано позиций</span><strong>{selectedCount}</strong></div>
    </div>

    <div className="room-tabs">
      {rooms.map((room,index)=><button key={room.id} className={activeRoomId===room.id?'is-active':''} type="button" onClick={()=>setActiveRoomId(room.id)}>
        <span>{room.type||`Помещение ${index+1}`}</span><small>{roomCalc(room).floor.toFixed(2)} м²</small>
      </button>)}
    </div>

    <div className="service-layout">
      <aside className="service-categories">
        {DEMO_CATALOG.map(item=><button key={item.id} className={activeCategory===item.id?'is-active':''} type="button" onClick={()=>setActiveCategory(item.id)}>
          <span className="service-categories__icon">{item.icon}</span><span>{item.title}</span>
        </button>)}
      </aside>

      <div className="service-content">
        <div className="service-content__title">
          <div><span className="eyebrow">Помещение: {activeRoom?.type}</span><h2>{category.title}</h2></div>
          <div className="service-title-actions"><small>{activeRoom&&calc.floor.toFixed(2)} м² по полу</small><button type="button" className="link-button" onClick={fillGeometry}>Заполнить по геометрии</button></div>
        </div>

        {category.groups.map(group=><section className="service-group" key={group.title}><h3>{group.title}</h3><div className="service-items">
          {group.items.map(([code,name,unit])=>{
            const value=qty(code)
            const suggested=suggestedQuantity(code,activeRoom)
            const step=unit==='шт'||unit==='компл.'?1:.5
            return <article className={value>0?'service-item is-selected':'service-item'} key={code}>
              <div className="service-item__meta">
                <span className="service-code">{code}</span><strong>{name}</strong><small>Единица: {unit}</small>
                {suggested>0&&<small className="auto-qty">По геометрии: {suggested.toFixed(2)} {unit}</small>}
                {DEMO_RISKS[code]&&value>0&&<small className="risk-note">{DEMO_RISKS[code]}</small>}
              </div>
              <div className="qty-wrap">
                {value<=0?<button className="add-service" type="button" onClick={()=>setQty(code,suggested||step)}>Добавить</button>:
                <div className="qty-control qty-control--editable"><button type="button" onClick={()=>setQty(code,value-step)}>−</button><input inputMode="decimal" value={String(value).replace('.',',')} onChange={e=>setQty(code,e.target.value)}/><button type="button" onClick={()=>setQty(code,value+step)}>+</button></div>}
              </div>
            </article>
          })}
        </div></section>)}
      </div>
    </div>

    <div className="wizard-footer"><div><span>Следующий модуль</span><strong>Предварительная смета и логистика</strong></div><button className="button button--primary button--finish" type="button" onClick={onNext}>Рассчитать смету</button></div>
  </section>
}

function EstimateStep({rooms,selections,initialRates,floor,lift,onBack,onSave,pricingConfig}) {
  const baseRates=pricingConfig?.rates||DEMO_RATES
  const [rates,setRates]=useState(()=>({...baseRates,...(initialRates||{})}))
  useEffect(()=>{
    if(!initialRates&&pricingConfig?.rates) setRates({...pricingConfig.rates})
  },[pricingConfig?.id])
  const rows=useMemo(()=>buildEstimateRows(rooms,selections,rates),[rooms,selections,rates])
  const workTotal=rows.reduce((sum,row)=>sum+row.sum,0)
  const logisticsRates=pricingConfig?.logisticsRates||LOGISTICS_RATES
  const wasteRules=pricingConfig?.wasteRules||WASTE_RULES
  const logistics=useMemo(
    ()=>calculateWasteAndLogistics(rows,{floor,lift,rates:logisticsRates,wasteRules}),
    [rows,floor,lift,pricingConfig?.id],
  )
  const grandTotal=workTotal+logistics.total

  const grouped=rooms.map(room=>({room,rows:rows.filter(row=>row.roomId===room.id)})).filter(group=>group.rows.length)
  const updateRate=(code,value)=>setRates(current=>({...current,[code]:Math.max(0,toNum(value))}))

  return <section className="workspace workspace--estimate">
    <button className="back-link" type="button" onClick={onBack}>← Демонтажные работы</button>
    <StepMeta current={4}/>
    <div className="workspace__head estimate-head">
      <div><p className="eyebrow">Предварительная смета</p><h1>Расчёт демонтажа</h1><p className="workspace__subtitle">Работы, отходы и логистика считаются отдельными блоками. Прайс: {pricingConfig?`${pricingConfig.code} · v${pricingConfig.version}`:'локальная модель v1'}.</p></div>
      <div className="estimate-total"><span>Текущий итог</span><strong>{money(grandTotal)} ₽</strong></div>
    </div>

    {grouped.length===0?<div className="empty-state estimate-empty"><h2>Демонтаж не выбран</h2><p>Можно вернуться и добавить позиции либо сохранить заказ без демонтажных работ.</p></div>:
    <div className="estimate-groups">{grouped.map(({room,rows:roomRows})=><section className="estimate-room" key={room.id}>
      <div className="estimate-room__head"><div><span className="room-index">✓</span><h2>{room.type}</h2></div><strong>{money(roomRows.reduce((s,r)=>s+r.sum,0))} ₽</strong></div>
      <div className="estimate-table">
        <div className="estimate-row estimate-row--head"><span>Работа</span><span>Количество</span><span>Ставка</span><span>Сумма</span></div>
        {roomRows.map(row=><div className="estimate-row" key={row.roomId+row.code}>
          <div><strong>{row.name}</strong><small>{row.code} · {row.category}</small>{DEMO_RISKS[row.code]&&<small className="risk-note risk-note--table">Инженерная проверка</small>}</div>
          <span>{row.quantity.toFixed(2)} {row.unit}</span>
          <label className="rate-input"><input inputMode="numeric" value={rates[row.code]??0} onChange={e=>updateRate(row.code,e.target.value)}/><span>₽/{row.unit}</span></label>
          <strong>{money(row.sum)} ₽</strong>
        </div>)}
      </div>
    </section>)}</div>}

    <section className="logistics-block">
      <div className="logistics-block__head"><div><p className="eyebrow">Отходы и логистика</p><h2>Полный цикл вывоза</h2></div><strong>{money(logistics.total)} ₽</strong></div>

      <div className="waste-kpis">
        <div><span>Расчётный объём</span><strong>{logistics.volume.toFixed(2)} м³</strong></div>
        <div><span>Расчётная масса</span><strong>{Math.round(logistics.weight)} кг</strong></div>
        <div><span>Мешки</span><strong>{logistics.bags} шт</strong></div>
        <div><span>Крупногабарит</span><strong>{logistics.bulky} ед.</strong></div>
      </div>

      <div className="logistics-grid logistics-grid--priced">
        <div><span>Упаковка и мешки</span><strong>{money(logistics.packaging)} ₽</strong><small>Модель: мешки × расчётная цена.</small></div>
        <div><span>Вынос</span><strong>{money(logistics.carry)} ₽</strong><small>{lift==='yes'?'Лифт учтён':'Учтён подъём/спуск без лифта'} · этаж {floor||1}.</small></div>
        <div><span>Погрузка</span><strong>{money(logistics.loading)} ₽</strong><small>Минимальная подача + объём.</small></div>
        <div><span>Транспорт</span><strong>{money(logistics.transport)} ₽</strong><small>{logistics.transportLabel}.</small></div>
        <div><span>Утилизация</span><strong>{money(logistics.disposal)} ₽</strong><small>Расчёт по объёму отходов.</small></div>
      </div>

      {logistics.byType.length>0&&<details className="waste-details"><summary>Состав отходов</summary><div>{logistics.byType.map(item=><p key={item.type}><strong>{item.type}</strong><span>{item.volume.toFixed(2)} м³ · {Math.round(item.weight)} кг</span></p>)}</div></details>}
    </section>

    <div className="estimate-summary">
      <div><span>Демонтажные работы</span><strong>{money(workTotal)} ₽</strong></div>
      <div><span>Мусор и логистика</span><strong>{money(logistics.total)} ₽</strong></div>
      <div className="estimate-summary__total"><span>Итого</span><strong>{money(grandTotal)} ₽</strong></div>
    </div>

    <p className="estimate-disclaimer">Ставки и коэффициенты сейчас являются расчётной моделью прототипа. Перед коммерческим запуском их необходимо актуализировать и утвердить.</p>
    <div className="wizard-footer"><div><span>Статус</span><strong>Черновик заказа готов</strong></div><button className="button button--primary button--finish" type="button" onClick={()=>onSave({
      rates,
      workTotal,
      logistics,
      total:grandTotal,
      priceBook:{
        id:(pricingConfig||LOCAL_PRICING).id,code:(pricingConfig||LOCAL_PRICING).code,
        version:(pricingConfig||LOCAL_PRICING).version,title:(pricingConfig||LOCAL_PRICING).title,
        currency:(pricingConfig||LOCAL_PRICING).currency,
      },
      pricingSnapshot:pricingConfig||LOCAL_PRICING,
    })}>Сохранить заказ</button></div>
  </section>
}

export default function CreateOrder({initialOrder,onCancel,onSave,pricing}) {
  const isEditing=Boolean(initialOrder?.id)
  const draftKey=isEditing?`bathdream.draft.${initialOrder.id}`:'bathdream.draft.new'
  const savedDraft=useMemo(()=>isEditing?null:readJSON(draftKey,null),[draftKey,isEditing])
  const source=initialOrder||savedDraft||{}
  const pricingConfig=source.pricingSnapshot||(isEditing?LOCAL_PRICING:(pricing||null))

  const [orderStep,setOrderStep]=useState(source.orderStep|| (isEditing?4:1))
  const [objectType,setObjectType]=useState(source.objectType||'')
  const [address,setAddress]=useState(source.address||'')
  const [area,setArea]=useState(source.area||'')
  const [floor,setFloor]=useState(source.floor||'')
  const [lift,setLift]=useState(source.lift||'yes')
  const [rooms,setRooms]=useState(source.rooms?.length?source.rooms:[newRoom(0)])
  const [demoSelections,setDemoSelections]=useState(source.demolition||{})
  const selected=OBJECT_TYPES.find(x=>x.id===objectType)

  useEffect(()=>{
    writeJSON(draftKey,{orderStep,objectType,address,area,floor,lift,rooms,demolition:demoSelections,pricingSnapshot:pricingConfig})
  },[draftKey,orderStep,objectType,address,area,floor,lift,rooms,demoSelections,pricingConfig])

  const objectValid=Boolean(objectType&&address.trim())
  const roomsValid=rooms.length>0&&rooms.every(room=>{
    const calc=roomCalc(room)
    return room.type&&calc.floor>0&&toNum(room.height)>0
  })

  const baseOrder=()=>({
    ...(initialOrder||{}),objectType,objectLabel:selected?.title,address,area,floor,lift,
    rooms:rooms.map(room=>({...room,calc:roomCalc(room)})),demolition:demoSelections,
  })

  const finish=payload=>{
    removeKey(draftKey)
    onSave({...baseOrder(),...payload})
  }

  if(orderStep===1) return <section className="workspace workspace--narrow">
    <button className="back-link" type="button" onClick={onCancel}>← Мои заказы</button>
    <StepMeta current={1}/>
    <div className="page-heading"><p className="eyebrow">{isEditing?'Редактирование заказа':'Создание заказа'}</p><h1>Расскажите об объекте</h1><p>На следующем шаге добавим помещения и геометрию.</p></div>
    <div className="object-grid">{OBJECT_TYPES.map(item=><button key={item.id} className={objectType===item.id?'object-card is-selected':'object-card'} type="button" onClick={()=>setObjectType(item.id)}><span className="object-card__icon">{item.id==='new'?'▦':item.id==='secondary'?'⌂':'△'}</span><strong>{item.title}</strong><small>{item.text}</small></button>)}</div>
    <AddressPicker value={address} onChange={setAddress}/>
    <div className="form-grid form-grid--order">
      <label className="field"><span>Общая площадь по полу, м²</span><input inputMode="decimal" placeholder="72" value={area} onChange={e=>setArea(e.target.value.replace(/[^0-9.,]/g,''))}/></label>
      <label className="field"><span>Этаж</span><input inputMode="numeric" placeholder="8" value={floor} onChange={e=>setFloor(e.target.value.replace(/\D/g,''))}/></label>
    </div>
    <div className="segmented"><span>Есть лифт?</span><div><button className={lift==='yes'?'is-active':''} onClick={()=>setLift('yes')} type="button">Да</button><button className={lift==='no'?'is-active':''} onClick={()=>setLift('no')} type="button">Нет</button></div></div>
    <PrimaryButton disabled={!objectValid} onClick={()=>setOrderStep(2)}>Продолжить</PrimaryButton>
  </section>

  if(orderStep===2) return <section className="workspace workspace--rooms">
    <button className="back-link" type="button" onClick={()=>setOrderStep(1)}>← Данные объекта</button>
    <StepMeta current={2}/>
    <div className="workspace__head room-page-head"><div><p className="eyebrow">Помещения и геометрия</p><h1>Добавьте помещения</h1><p className="workspace__subtitle">Размеры вводятся один раз и автоматически используются дальше.</p></div><button className="button button--compact" type="button" onClick={()=>setRooms(current=>[...current,newRoom(current.length)])}>+ Добавить помещение</button></div>
    <div className="rooms-list">{rooms.map((room,index)=><RoomCard key={room.id} room={room} index={index} canRemove={rooms.length>1} onChange={next=>setRooms(current=>current.map(r=>r.id===room.id?next:r))} onRemove={()=>setRooms(current=>current.filter(r=>r.id!==room.id))}/>)}</div>
    <div className="wizard-footer"><div><span>Следующий модуль</span><strong>Услуги → Демонтажные работы</strong></div><button className="button button--primary button--finish" disabled={!roomsValid} type="button" onClick={()=>setOrderStep(3)}>Продолжить</button></div>
  </section>

  if(orderStep===3) return <DemolitionStep rooms={rooms} selections={demoSelections} setSelections={setDemoSelections} onBack={()=>setOrderStep(2)} onNext={()=>setOrderStep(4)}/>

  return <EstimateStep rooms={rooms} selections={demoSelections} initialRates={initialOrder?.rates} floor={floor} lift={lift} onBack={()=>setOrderStep(3)} onSave={finish} pricingConfig={pricingConfig}/>
}
