import { useEffect, useMemo, useState } from 'react'
import AddressPicker from './AddressPicker.jsx'
import { RoomCard } from './CreateOrder.jsx'
import {
  OBJECT_TYPES, ROUGH_CATALOG, ROUGH_RATES, ROOM_TYPES, buildRoughEstimateRows,
  money, newRoom, roomCalc, suggestedRoughQuantity, toNum,
} from '../domain/model.js'
import { readJSON, removeKey, writeJSON } from '../lib/storage.js'

const LOCAL_ROUGH_PRICING={
  id:'local-rough-v1',
  code:'LOCAL-ROUGH',
  version:1,
  title:'Черновой ремонт · локальная модель v1',
  currency:'RUB',
  rates:ROUGH_RATES,
}

function StepMeta({current,total=4}) {
  return <div className="step-meta"><span>Черновой ремонт: шаг {current} из {total}</span><div className="step-meta__track"><span style={{width:`${(current/total)*100}%`}} /></div></div>
}

function PrimaryButton({children,disabled=false,onClick}) {
  return <button className="button button--primary" disabled={disabled} onClick={onClick} type="button">{children}</button>
}

function RoughWorksStep({rooms,selections,setSelections,onBack,onNext}) {
  const [activeRoomId,setActiveRoomId]=useState(rooms[0]?.id||'')
  const [activeCategory,setActiveCategory]=useState('floor')
  const activeRoom=rooms.find(room=>room.id===activeRoomId)||rooms[0]
  const category=ROUGH_CATALOG.find(item=>item.id===activeCategory)||ROUGH_CATALOG[0]
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
        const suggested=suggestedRoughQuantity(code,activeRoom)
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
      <div>
        <p className="eyebrow">Услуги</p>
        <h1>Черновой ремонт</h1>
        <p className="workspace__subtitle">Выберите черновые работы по каждому помещению. Площади пола, стен и потолка можно автоматически подставить из геометрии.</p>
      </div>
      <div className="selected-counter"><span>Выбрано позиций</span><strong>{selectedCount}</strong></div>
    </div>

    <div className="room-tabs">
      {rooms.map((room,index)=><button key={room.id} className={activeRoomId===room.id?'is-active':''} type="button" onClick={()=>setActiveRoomId(room.id)}>
        <span>{room.type||`Помещение ${index+1}`}</span><small>{roomCalc(room).floor.toFixed(2)} м²</small>
      </button>)}
    </div>

    <div className="service-layout">
      <aside className="service-categories">
        {ROUGH_CATALOG.map(item=><button key={item.id} className={activeCategory===item.id?'is-active':''} type="button" onClick={()=>setActiveCategory(item.id)}>
          <span className="service-categories__icon">{item.icon}</span><span>{item.title}</span>
        </button>)}
      </aside>

      <div className="service-content">
        <div className="service-content__title">
          <div><span className="eyebrow">Помещение: {activeRoom?.type}</span><h2>{category.title}</h2></div>
          <div className="service-title-actions">
            <small>{activeRoom&&calc.floor.toFixed(2)} м² по полу</small>
            <button type="button" className="link-button" onClick={fillGeometry}>Заполнить по геометрии</button>
          </div>
        </div>

        {category.groups.map(group=><section className="service-group" key={group.title}>
          <h3>{group.title}</h3>
          <div className="service-items">
            {group.items.map(([code,name,unit])=>{
              const value=qty(code)
              const suggested=suggestedRoughQuantity(code,activeRoom)
              const step=unit==='шт'?1:.5
              return <article className={value>0?'service-item is-selected':'service-item'} key={code}>
                <div className="service-item__meta">
                  <span className="service-code">{code}</span>
                  <strong>{name}</strong>
                  <small>Единица: {unit}</small>
                  {suggested>0&&<small className="auto-qty">По геометрии: {suggested.toFixed(2)} {unit}</small>}
                </div>
                <div className="qty-wrap">
                  {value<=0?<button className="add-service" type="button" onClick={()=>setQty(code,suggested||step)}>Добавить</button>:
                  <div className="qty-control qty-control--editable">
                    <button type="button" onClick={()=>setQty(code,value-step)}>−</button>
                    <input inputMode="decimal" value={String(value).replace('.',',')} onChange={e=>setQty(code,e.target.value)}/>
                    <button type="button" onClick={()=>setQty(code,value+step)}>+</button>
                  </div>}
                </div>
              </article>
            })}
          </div>
        </section>)}
      </div>
    </div>

    <div className="wizard-footer">
      <div><span>Следующий модуль</span><strong>Предварительная смета чернового ремонта</strong></div>
      <button className="button button--primary button--finish" type="button" onClick={onNext}>Рассчитать смету</button>
    </div>
  </section>
}

function RoughEstimateStep({rooms,selections,initialRates,onBack,onSave}) {
  const [rates,setRates]=useState(()=>({...ROUGH_RATES,...(initialRates||{})}))
  const rows=useMemo(()=>buildRoughEstimateRows(rooms,selections,rates),[rooms,selections,rates])
  const workTotal=rows.reduce((sum,row)=>sum+row.sum,0)
  const grouped=rooms.map(room=>({room,rows:rows.filter(row=>row.roomId===room.id)})).filter(group=>group.rows.length)
  const updateRate=(code,value)=>setRates(current=>({...current,[code]:Math.max(0,toNum(value))}))

  return <section className="workspace workspace--estimate">
    <button className="back-link" type="button" onClick={onBack}>← Черновые работы</button>
    <StepMeta current={4}/>
    <div className="workspace__head estimate-head">
      <div>
        <p className="eyebrow">Предварительная смета</p>
        <h1>Расчёт чернового ремонта</h1>
        <p className="workspace__subtitle">Смета формируется по помещениям и выбранным работам. Ставки пока являются расчётной моделью прототипа.</p>
      </div>
      <div className="estimate-total"><span>Текущий итог</span><strong>{money(workTotal)} ₽</strong></div>
    </div>

    {grouped.length===0?<div className="empty-state estimate-empty">
      <h2>Черновые работы не выбраны</h2>
      <p>Вернитесь на предыдущий шаг и добавьте нужные позиции.</p>
    </div>:
    <div className="estimate-groups">{grouped.map(({room,rows:roomRows})=><section className="estimate-room" key={room.id}>
      <div className="estimate-room__head"><div><span className="room-index">✓</span><h2>{room.type}</h2></div><strong>{money(roomRows.reduce((s,r)=>s+r.sum,0))} ₽</strong></div>
      <div className="estimate-table">
        <div className="estimate-row estimate-row--head"><span>Работа</span><span>Количество</span><span>Ставка</span><span>Сумма</span></div>
        {roomRows.map(row=><div className="estimate-row" key={row.roomId+row.code}>
          <div><strong>{row.name}</strong><small>{row.code} · {row.category}</small></div>
          <span>{row.quantity.toFixed(2)} {row.unit}</span>
          <label className="rate-input"><input inputMode="numeric" value={rates[row.code]??0} onChange={e=>updateRate(row.code,e.target.value)}/><span>₽/{row.unit}</span></label>
          <strong>{money(row.sum)} ₽</strong>
        </div>)}
      </div>
    </section>)}</div>}

    <div className="estimate-summary">
      <div><span>Черновые работы</span><strong>{money(workTotal)} ₽</strong></div>
      <div><span>Материалы</span><strong>По отдельному расчёту</strong></div>
      <div className="estimate-summary__total"><span>Работы итого</span><strong>{money(workTotal)} ₽</strong></div>
    </div>

    <p className="estimate-disclaimer">Черновой прайс используется для продуктового прототипа. Перед коммерческим запуском ставки, состав работ, нормы и материалы необходимо утвердить.</p>
    <div className="wizard-footer">
      <div><span>Статус</span><strong>Черновик заказа готов</strong></div>
      <button className="button button--primary button--finish" type="button" onClick={()=>onSave({
        serviceType:'rough',
        serviceLabel:'Черновой ремонт',
        roughRepair:selections,
        rates,
        workTotal,
        logistics:{total:0},
        total:workTotal,
        priceBook:{
          id:LOCAL_ROUGH_PRICING.id,
          code:LOCAL_ROUGH_PRICING.code,
          version:LOCAL_ROUGH_PRICING.version,
          title:LOCAL_ROUGH_PRICING.title,
          currency:LOCAL_ROUGH_PRICING.currency,
        },
        pricingSnapshot:LOCAL_ROUGH_PRICING,
      })}>Сохранить заказ</button>
    </div>
  </section>
}

export default function CreateRoughOrder({initialOrder,onCancel,onSave}) {
  const isEditing=Boolean(initialOrder?.id)
  const draftKey=isEditing?`bathdream.draft.rough.${initialOrder.id}`:'bathdream.draft.rough.new'
  const savedDraft=useMemo(()=>isEditing?null:readJSON(draftKey,null),[draftKey,isEditing])
  const source=initialOrder||savedDraft||{}

  const [orderStep,setOrderStep]=useState(source.orderStep||(isEditing?4:1))
  const [objectType,setObjectType]=useState(source.objectType||'')
  const [address,setAddress]=useState(source.address||'')
  const [area,setArea]=useState(source.area||'')
  const [floor,setFloor]=useState(source.floor||'')
  const [lift,setLift]=useState(source.lift||'yes')
  const [rooms,setRooms]=useState(source.rooms?.length?source.rooms:[newRoom(0)])
  const [roughSelections,setRoughSelections]=useState(source.roughRepair||{})
  const selected=OBJECT_TYPES.find(x=>x.id===objectType)

  useEffect(()=>{
    writeJSON(draftKey,{
      orderStep,serviceType:'rough',objectType,address,area,floor,lift,rooms,
      roughRepair:roughSelections,pricingSnapshot:LOCAL_ROUGH_PRICING,
    })
  },[draftKey,orderStep,objectType,address,area,floor,lift,rooms,roughSelections])

  const objectValid=Boolean(objectType&&address.trim())
  const roomsValid=rooms.length>0&&rooms.every(room=>{
    const calc=roomCalc(room)
    return room.type&&calc.floor>0&&toNum(room.height)>0
  })

  const baseOrder=()=>({
    ...(initialOrder||{}),
    serviceType:'rough',
    serviceLabel:'Черновой ремонт',
    objectType,
    objectLabel:selected?.title,
    address,area,floor,lift,
    rooms:rooms.map(room=>({...room,calc:roomCalc(room)})),
    roughRepair:roughSelections,
    demolition:{},
  })

  const finish=payload=>{
    removeKey(draftKey)
    onSave({...baseOrder(),...payload})
  }

  if(orderStep===1) return <section className="workspace workspace--narrow">
    <button className="back-link" type="button" onClick={onCancel}>← Услуги</button>
    <StepMeta current={1}/>
    <div className="page-heading">
      <p className="eyebrow">{isEditing?'Редактирование заказа':'Черновой ремонт'}</p>
      <h1>Расскажите об объекте</h1>
      <p>Используем ту же геометрию объекта, что и в демонтаже, а затем рассчитаем черновые работы.</p>
    </div>
    <div className="object-grid">{OBJECT_TYPES.map(item=><button key={item.id} className={objectType===item.id?'object-card is-selected':'object-card'} type="button" onClick={()=>setObjectType(item.id)}>
      <span className="object-card__icon">{item.id==='new'?'▦':item.id==='secondary'?'⌂':'△'}</span>
      <strong>{item.title}</strong><small>{item.text}</small>
    </button>)}</div>
    <AddressPicker value={address} onChange={setAddress}/>
    <div className="form-grid form-grid--order">
      <label className="field"><span>Общая площадь по полу, м²</span><input inputMode="decimal" placeholder="72" value={area} onChange={e=>setArea(e.target.value.replace(/[^0-9.,]/g,''))}/></label>
      <label className="field"><span>Этаж</span><input inputMode="numeric" placeholder="8" value={floor} onChange={e=>setFloor(e.target.value.replace(/\D/g,''))}/></label>
    </div>
    <div className="segmented"><span>Есть лифт?</span><div>
      <button className={lift==='yes'?'is-active':''} onClick={()=>setLift('yes')} type="button">Да</button>
      <button className={lift==='no'?'is-active':''} onClick={()=>setLift('no')} type="button">Нет</button>
    </div></div>
    <PrimaryButton disabled={!objectValid} onClick={()=>setOrderStep(2)}>Продолжить</PrimaryButton>
  </section>

  if(orderStep===2) return <section className="workspace workspace--rooms">
    <button className="back-link" type="button" onClick={()=>setOrderStep(1)}>← Данные объекта</button>
    <StepMeta current={2}/>
    <div className="workspace__head room-page-head">
      <div><p className="eyebrow">Помещения и геометрия</p><h1>Добавьте помещения</h1><p className="workspace__subtitle">Площади пола, стен и потолка автоматически используются в расчёте чернового ремонта.</p></div>
      <button className="button button--compact" type="button" onClick={()=>setRooms(current=>[...current,newRoom(current.length)])}>+ Добавить помещение</button>
    </div>
    <div className="rooms-list">{rooms.map((room,index)=><RoomCard key={room.id} room={room} index={index} canRemove={rooms.length>1} onChange={next=>setRooms(current=>current.map(r=>r.id===room.id?next:r))} onRemove={()=>setRooms(current=>current.filter(r=>r.id!==room.id))}/>)}</div>
    <div className="wizard-footer">
      <div><span>Следующий модуль</span><strong>Услуги → Черновой ремонт</strong></div>
      <button className="button button--primary button--finish" disabled={!roomsValid} type="button" onClick={()=>setOrderStep(3)}>Продолжить</button>
    </div>
  </section>

  if(orderStep===3) return <RoughWorksStep rooms={rooms} selections={roughSelections} setSelections={setRoughSelections} onBack={()=>setOrderStep(2)} onNext={()=>setOrderStep(4)}/>

  return <RoughEstimateStep rooms={rooms} selections={roughSelections} initialRates={initialOrder?.rates} onBack={()=>setOrderStep(3)} onSave={finish}/>
}
