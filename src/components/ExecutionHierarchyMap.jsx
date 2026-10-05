import { buildEstimateRows, buildRoughEstimateRows, statusLabel } from '../domain/model.js'

const STAGE_STATUS={
  planned:'Запланирован',
  in_progress:'В работе',
  done:'Завершён',
  blocked:'Пауза',
}

function unique(values){
  return [...new Set(values.filter(Boolean))]
}

function compact(items,limit=6){
  const clean=items.filter(Boolean)
  if(clean.length<=limit) return clean
  return [...clean.slice(0,limit),`Ещё позиций: ${clean.length-limit}`]
}

function demolitionTasks(order){
  const rows=buildEstimateRows(order.rooms||[],order.demolition||{},order.rates||{})
  const logistics=order.logistics||{}
  const works=compact(rows.map(row=>`${row.name} · ${row.roomName}`),7)
  return [
    ['Проверка доступа на объект','Фотофиксация исходного состояния','Защита сохраняемых зон и коммуникаций'],
    works.length?works:['Состав демонтажа формируется из сметы заказа'],
    [
      logistics.bags?`Упаковка отходов · ${logistics.bags} мешков`:'Сортировка и упаковка отходов',
      'Вынос из помещений',
      'Погрузка в транспорт',
    ],
    [
      logistics.transportLabel?`Транспорт · ${logistics.transportLabel}`:'Подача транспорта',
      logistics.volume?`Расчётный объём · ${Number(logistics.volume).toFixed(2)} м³`:'Контроль объёма',
      'Передача отходов на утилизацию',
    ],
    ['Контроль освобождённых помещений','Финальная уборка зоны работ','Подготовка результата к приёмке'],
  ]
}

function roughTasks(order){
  const rows=buildRoughEstimateRows(order.rooms||[],order.roughRepair||{},order.rates||{})
  const byCategory=category=>compact(rows.filter(row=>row.category===category).map(row=>`${row.name} · ${row.roomName}`),5)
  const engineering=compact(rows.filter(row=>['Электрика','Сантехника'].includes(row.category)).map(row=>`${row.name} · ${row.roomName}`),6)
  const constructions=compact(rows.filter(row=>['Перегородки','Пол'].includes(row.category)).map(row=>`${row.name} · ${row.roomName}`),6)
  const surfaces=compact(rows.filter(row=>['Пол','Стены','Потолок'].includes(row.category)).map(row=>`${row.name} · ${row.roomName}`),7)
  return [
    ['Проверка геометрии помещений','Разметка уровней и трасс','Подготовка объекта к черновым работам'],
    engineering.length?engineering:['Черновая электрика','Черновая сантехника'],
    constructions.length?constructions:['Перегородки','Подготовка оснований пола'],
    surfaces.length?surfaces:['Полы','Стены','Потолки'],
    ['Проверка скрытых работ','Контроль геометрии и оснований','Подготовка к клиентской приёмке'],
  ]
}

function wasteTasks(order){
  const waste=order.wasteRemoval||{}
  const calc=waste.calculation||{}
  return [
    [
      waste.date?`Дата · ${waste.date}`:'Подтверждение даты',
      waste.timeSlot?`Интервал · ${waste.timeSlot}`:'Подтверждение времени',
      calc.transportLabel?`Машина · ${calc.transportLabel}`:'Подбор транспорта',
    ],
    waste.carryMode==='team'
      ? [`Этаж · ${order.floor||'—'}`,order.lift==='yes'?'Использование лифта':'Ручной спуск','Перенос до точки погрузки']
      : ['Мусор подготовлен клиентом','Проверка зоны погрузки'],
    [
      calc.volume?`Объём · ${Number(calc.volume).toFixed(2)} м³`:'Проверка объёма',
      calc.bags?`Ориентир · ${calc.bags} мешков`:'Проверка упаковки',
      'Погрузка в транспорт',
    ],
    [
      calc.transportLabel?`Транспорт · ${calc.transportLabel}`:'Вывоз с объекта',
      'Доставка до места утилизации',
      'Утилизация строительных отходов',
    ],
    ['Подтверждение завершения вывоза','Фото/статус результата','Закрытие заказа и приёмка'],
  ]
}

function hierarchyFor(order){
  const service=order.serviceType||'demolition'
  if(service==='rough') return {
    label:'Черновой ремонт',
    stages:[
      'Подготовка и разметка',
      'Черновая электрика и сантехника',
      'Перегородки и основания',
      'Полы, стены и потолки',
      'Контроль качества и подготовка к приёмке',
    ],
    tasks:roughTasks(order),
  }
  if(service==='waste') return {
    label:'Вывоз строительного мусора',
    stages:[
      'Подтверждение заказа и подачи',
      'Вынос с объекта',
      'Погрузка',
      'Вывоз и утилизация',
      'Подтверждение завершения',
    ],
    tasks:wasteTasks(order),
  }
  return {
    label:'Демонтаж',
    stages:[
      'Подготовка объекта',
      'Демонтажные работы',
      'Вынос и погрузка',
      'Вывоз и утилизация',
      'Финальная уборка и подготовка к приёмке',
    ],
    tasks:demolitionTasks(order),
  }
}

export default function ExecutionHierarchyMap({order,stages=[],acceptance=null}){
  const model=hierarchyFor(order)
  const bySequence=new Map((stages||[]).map(stage=>[Number(stage.sequence),stage]))
  const overall=stages.length
    ? Math.round(stages.reduce((sum,stage)=>sum+Number(stage.progress||0),0)/stages.length)
    : 0

  return <section className="execution-map">
    <div className="execution-map__head">
      <div>
        <p className="eyebrow">Иерархическая карта</p>
        <h3>Выполнение заказа</h3>
        <span>Заказ №{order.id} · {statusLabel(order.status)}</span>
      </div>
      <strong>{overall}%</strong>
    </div>

    <div className="execution-tree">
      <div className="execution-root">
        <span className="execution-node-index">0</span>
        <div><strong>{model.label}</strong><small>{order.address||'Адрес объекта'}</small></div>
      </div>

      <div className="execution-branches">
        {model.stages.map((title,index)=>{
          const sequence=index+1
          const actual=bySequence.get(sequence)
          const status=actual?.status||'planned'
          const progress=Number(actual?.progress||0)
          const tasks=model.tasks[index]||[]
          return <article className={'execution-branch execution-branch--'+status} key={title}>
            <div className="execution-branch__rail"><span>{sequence}</span></div>
            <div className="execution-branch__card">
              <div className="execution-branch__head">
                <div><strong>{title}</strong><small>{STAGE_STATUS[status]||status}</small></div>
                <b>{progress}%</b>
              </div>
              <div className="execution-branch__progress"><span style={{width:progress+'%'}}/></div>
              <div className="execution-subtasks">
                {tasks.map((task,taskIndex)=><div className="execution-subtask" key={taskIndex}>
                  <span className="execution-subtask__dot"/>
                  <span>{task}</span>
                </div>)}
              </div>
            </div>
          </article>
        })}
      </div>

      <div className={'execution-acceptance execution-acceptance--'+(acceptance?.status||'planned')}>
        <span className="execution-node-index">✓</span>
        <div>
          <strong>Приёмка результата</strong>
          <small>{acceptance?.status==='accepted'?'Работы приняты клиентом':acceptance?.status==='pending'?'Ожидает решения клиента':acceptance?.status==='changes_requested'?'Возвращено на исправление':'После завершения всех этапов'}</small>
        </div>
      </div>
    </div>
  </section>
}
