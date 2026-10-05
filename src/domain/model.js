export const CLIENT_TYPES = [
  { id: 'fl', title: 'Физическое лицо', description: 'Личный ремонт квартиры, дома или апартаментов' },
  { id: 'ip', title: 'Индивидуальный предприниматель', description: 'Заказы от имени ИП с договором и счетами' },
  { id: 'ul', title: 'Юридическое лицо', description: 'Заказы компании с реквизитами и закрывающими документами' },
]

export const PROFILE_FIELDS = {
  fl: [
    { key:'firstName', label:'Имя', placeholder:'Иван', required:true },
    { key:'lastName', label:'Фамилия', placeholder:'Иванов', required:true },
    { key:'city', label:'Город', placeholder:'Москва', required:true },
  ],
  ip: [
    { key:'ipName', label:'ФИО / наименование ИП', placeholder:'ИП Иванов Иван Иванович', required:true },
    { key:'inn', label:'ИНН', placeholder:'12 цифр', required:true, digits:12 },
    { key:'ogrnip', label:'ОГРНИП', placeholder:'15 цифр', required:true, digits:15 },
    { key:'city', label:'Город', placeholder:'Москва', required:true },
  ],
  ul: [
    { key:'companyName', label:'Наименование организации', placeholder:'ООО «Компания»', required:true },
    { key:'inn', label:'ИНН', placeholder:'10 цифр', required:true, digits:10 },
    { key:'kpp', label:'КПП', placeholder:'9 цифр', required:true, digits:9 },
    { key:'ogrn', label:'ОГРН', placeholder:'13 цифр', required:true, digits:13 },
    { key:'contactPerson', label:'Контактное лицо', placeholder:'Иван Иванов', required:true },
    { key:'city', label:'Город', placeholder:'Москва', required:true },
  ],
}

export const OBJECT_TYPES = [
  { id: 'new', title: 'Новостройка', text: 'Квартира без предыдущей отделки или с отделкой от застройщика' },
  { id: 'secondary', title: 'Вторичный рынок', text: 'Квартира с существующей отделкой и инженерными системами' },
  { id: 'house', title: 'Дом', text: 'Частный дом, таунхаус или коттедж' },
]

export const ROOM_TYPES = ['Ванная','Санузел','Кухня','Гостиная','Спальня','Прихожая','Балкон / лоджия','Другое']

export const ORDER_STATUSES = [
  { id:'draft', label:'Черновик' },
  { id:'calculated', label:'Расчёт готов' },
  { id:'review', label:'На согласовании' },
  { id:'contract', label:'Договор' },
  { id:'work', label:'В работе' },
  { id:'acceptance', label:'Приёмка' },
  { id:'done', label:'Завершён' },
]

export const DEMO_CATALOG = [
  { id:'floor', title:'Пол', icon:'▱', groups:[{ title:'Покрытия и основание', items:[
    ['DEM-FL-001','Ламинат','м²'],['DEM-FL-002','Линолеум','м²'],['DEM-FL-004','Паркет','м²'],
    ['DEM-FL-006','Плитка','м²'],['DEM-FL-007','Керамогранит','м²'],['DEM-FL-008','Стяжка','м²'],
    ['DEM-FL-012','Плинтус','м.п.'],
  ]}]},
  { id:'walls', title:'Стены', icon:'▥', groups:[{ title:'Отделка и конструкции', items:[
    ['DEM-WL-001','Обои','м²'],['DEM-WL-002','Штукатурка','м²'],['DEM-WL-003','Плитка','м²'],
    ['DEM-WL-005','Перегородка ГКЛ','м²'],['DEM-WL-006','Газоблок / ПГП','м²'],
    ['DEM-WL-008','Кирпичная перегородка','м²'],['DEM-WL-010','Железобетонная перегородка','м²'],
  ]}]},
  { id:'ceiling', title:'Потолок', icon:'═', groups:[{ title:'Потолочные конструкции', items:[
    ['DEM-CL-001','Натяжной потолок','м²'],['DEM-CL-002','Потолок ГКЛ','м²'],
    ['DEM-CL-003','Armstrong','м²'],['DEM-CL-004','Штукатурка потолка','м²'],['DEM-CL-005','Краска / шпаклёвка','м²'],
  ]}]},
  { id:'electric', title:'Электрика', icon:'ϟ', groups:[
    { title:'Освещение', items:[
      ['DEM-EL-LGT-001','Лампа / лампочка','шт'],['DEM-EL-LGT-002','Точечный светильник','шт'],
      ['DEM-EL-LGT-003','Люстра','шт'],['DEM-EL-LGT-004','Бра','шт'],['DEM-EL-LGT-005','LED-лента','м.п.'],
      ['DEM-EL-LGT-006','LED-профиль','м.п.'],['DEM-EL-LGT-007','Трек','м.п.'],
      ['DEM-EL-LGT-008','Трековый светильник','шт'],['DEM-EL-LGT-009','Драйвер / трансформатор','шт'],
      ['DEM-EL-LGT-010','Датчик движения','шт'],
    ]},
    { title:'Розетки и управление', items:[
      ['DEM-EL-001','Розетка','шт'],['DEM-EL-011','Выключатель','шт'],['DEM-EL-012','Рамка','шт'],
      ['DEM-EL-013','Подрозетник','шт'],['DEM-EL-014','Диммер / терморегулятор','шт'],
    ]},
    { title:'Проводка и щит', items:[
      ['DEM-EL-004','Силовой кабель','м.п.'],['DEM-EL-005','Проводка','м.п.'],['DEM-EL-006','Кабель-канал','м.п.'],
      ['DEM-EL-003','Электрощит','шт'],['DEM-EL-015','Автомат','шт'],['DEM-EL-016','УЗО / дифавтомат','шт'],
    ]},
  ]},
  { id:'plumbing', title:'Сантехника', icon:'◉', groups:[{ title:'Приборы и сети', items:[
    ['DEM-PL-003','Ванна','шт'],['DEM-PL-006','Унитаз','шт'],['DEM-PL-005','Раковина / мойка','шт'],
    ['DEM-PL-001','Смеситель','шт'],['DEM-PL-007','Инсталляция','шт'],['DEM-PL-010','Трубы водоснабжения / отопления','м.п.'],
    ['DEM-PL-011','Канализация','м.п.'],['DEM-PL-009','Полотенцесушитель','шт'],
  ]}]},
  { id:'doors', title:'Двери', icon:'▯', groups:[{ title:'Двери и проёмы', items:[
    ['DEM-DR-001','Дверной блок','шт'],['DEM-DR-002','Полотно','шт'],['DEM-DR-003','Коробка / наличники','компл.'],
  ]}]},
  { id:'windows', title:'Окна', icon:'▦', groups:[{ title:'Оконные элементы', items:[
    ['DEM-WN-001','Оконный блок','м²'],['DEM-WN-002','Подоконник','м.п.'],['DEM-WN-003','Откосы','м.п.'],
  ]}]},
  { id:'furniture', title:'Мебель', icon:'▤', groups:[{ title:'Встроенная и корпусная мебель', items:[
    ['DEM-FU-001','Кухня','компл.'],['DEM-FU-002','Встроенный шкаф','шт'],['DEM-FU-003','Гардеробная','компл.'],
    ['DEM-FU-004','Столешница','м.п.'],
  ]}]},
  { id:'other', title:'Другое', icon:'+', groups:[{ title:'Прочее', items:[
    ['DEM-OTHER-001','Другая конструкция / элемент','шт'],
  ]}]},
]

export const DEMO_RATES = {
  'DEM-FL-001':700,'DEM-FL-002':600,'DEM-FL-004':1000,'DEM-FL-006':1500,'DEM-FL-007':2000,'DEM-FL-008':1200,'DEM-FL-012':250,
  'DEM-WL-001':500,'DEM-WL-002':800,'DEM-WL-003':1500,'DEM-WL-005':1000,'DEM-WL-006':1300,'DEM-WL-008':1600,'DEM-WL-010':3500,
  'DEM-CL-001':500,'DEM-CL-002':900,'DEM-CL-003':700,'DEM-CL-004':700,'DEM-CL-005':400,
  'DEM-EL-LGT-001':100,'DEM-EL-LGT-002':500,'DEM-EL-LGT-003':1500,'DEM-EL-LGT-004':800,'DEM-EL-LGT-005':400,
  'DEM-EL-LGT-006':300,'DEM-EL-LGT-007':600,'DEM-EL-LGT-008':400,'DEM-EL-LGT-009':500,'DEM-EL-LGT-010':500,
  'DEM-EL-001':500,'DEM-EL-011':500,'DEM-EL-012':200,'DEM-EL-013':300,'DEM-EL-014':500,'DEM-EL-004':1000,
  'DEM-EL-005':750,'DEM-EL-006':300,'DEM-EL-003':7000,'DEM-EL-015':400,'DEM-EL-016':600,
  'DEM-PL-003':3000,'DEM-PL-006':2500,'DEM-PL-005':2000,'DEM-PL-001':1000,'DEM-PL-007':3500,'DEM-PL-010':1200,
  'DEM-PL-011':1200,'DEM-PL-009':2500,'DEM-DR-001':3500,'DEM-DR-002':2000,'DEM-DR-003':1000,
  'DEM-WN-001':3000,'DEM-WN-002':700,'DEM-WN-003':800,'DEM-FU-001':8000,'DEM-FU-002':3000,'DEM-FU-003':5000,
  'DEM-FU-004':1000,'DEM-OTHER-001':1000,
}


export const ROUGH_CATALOG = [
  { id:'floor', title:'Пол', icon:'▱', groups:[{ title:'Основание пола', items:[
    ['RUF-FL-001','Грунтовка основания пола','м²'],
    ['RUF-FL-002','Устройство стяжки','м²'],
    ['RUF-FL-003','Наливной пол','м²'],
    ['RUF-FL-004','Гидроизоляция пола','м²'],
  ]}]},
  { id:'walls', title:'Стены', icon:'▥', groups:[{ title:'Подготовка стен', items:[
    ['RUF-WL-001','Грунтовка стен','м²'],
    ['RUF-WL-002','Штукатурка стен по маякам','м²'],
    ['RUF-WL-003','Базовая шпаклёвка стен','м²'],
    ['RUF-WL-004','Армирование стеклохолстом','м²'],
  ]}]},
  { id:'ceiling', title:'Потолок', icon:'═', groups:[{ title:'Черновой потолок', items:[
    ['RUF-CL-001','Грунтовка потолка','м²'],
    ['RUF-CL-002','Штукатурка потолка','м²'],
    ['RUF-CL-003','Базовая шпаклёвка потолка','м²'],
    ['RUF-CL-004','Каркас и обшивка ГКЛ','м²'],
  ]}]},
  { id:'partitions', title:'Перегородки', icon:'▤', groups:[{ title:'Новые конструкции', items:[
    ['RUF-PT-001','Перегородка из ГКЛ','м²'],
    ['RUF-PT-002','Перегородка из ПГП / газоблока','м²'],
    ['RUF-PT-003','Формирование дверного проёма','шт'],
  ]}]},
  { id:'electric', title:'Электрика', icon:'ϟ', groups:[{ title:'Черновая электрика', items:[
    ['RUF-EL-001','Штробление под кабель','м.п.'],
    ['RUF-EL-002','Прокладка кабеля','м.п.'],
    ['RUF-EL-003','Подрозетник / установочное место','шт'],
    ['RUF-EL-004','Монтаж электрического щита','шт'],
  ]}]},
  { id:'plumbing', title:'Сантехника', icon:'◉', groups:[{ title:'Черновая сантехника', items:[
    ['RUF-PL-001','Разводка водоснабжения','м.п.'],
    ['RUF-PL-002','Разводка канализации','м.п.'],
    ['RUF-PL-003','Точка водоснабжения','шт'],
    ['RUF-PL-004','Монтаж инсталляции','шт'],
  ]}]},
]

export const ROUGH_RATES = {
  'RUF-FL-001':180,'RUF-FL-002':1400,'RUF-FL-003':900,'RUF-FL-004':850,
  'RUF-WL-001':160,'RUF-WL-002':1150,'RUF-WL-003':650,'RUF-WL-004':550,
  'RUF-CL-001':180,'RUF-CL-002':1350,'RUF-CL-003':750,'RUF-CL-004':1900,
  'RUF-PT-001':2100,'RUF-PT-002':2300,'RUF-PT-003':3500,
  'RUF-EL-001':650,'RUF-EL-002':350,'RUF-EL-003':850,'RUF-EL-004':9500,
  'RUF-PL-001':1600,'RUF-PL-002':1800,'RUF-PL-003':2800,'RUF-PL-004':6500,
}

export const ROUGH_AUTO_QTY = {
  'RUF-FL-001':'floor','RUF-FL-002':'floor','RUF-FL-003':'floor','RUF-FL-004':'floor',
  'RUF-WL-001':'netWalls','RUF-WL-002':'netWalls','RUF-WL-003':'netWalls','RUF-WL-004':'netWalls',
  'RUF-CL-001':'ceiling','RUF-CL-002':'ceiling','RUF-CL-003':'ceiling','RUF-CL-004':'ceiling',
}

export const roughItemIndex = Object.fromEntries(
  ROUGH_CATALOG.flatMap(category => category.groups.flatMap(group =>
    group.items.map(([code,name,unit]) => [code,{code,name,unit,category:category.title,group:group.title}])
  ))
)

export const DEMO_AUTO_QTY = {
  'DEM-FL-001':'floor','DEM-FL-002':'floor','DEM-FL-004':'floor','DEM-FL-006':'floor','DEM-FL-007':'floor','DEM-FL-008':'floor',
  'DEM-FL-012':'perimeter','DEM-WL-001':'netWalls','DEM-WL-002':'netWalls','DEM-WL-003':'netWalls',
  'DEM-CL-001':'ceiling','DEM-CL-002':'ceiling','DEM-CL-003':'ceiling','DEM-CL-004':'ceiling','DEM-CL-005':'ceiling',
  'DEM-DR-001':'doorQty','DEM-DR-002':'doorQty','DEM-DR-003':'doorQty','DEM-WN-001':'windowArea',
}

export const DEMO_RISKS = {
  'DEM-WL-010':'Перед демонтажем железобетонной конструкции требуется инженерная проверка. Если стена несущая или затрагивается проём — нужны проектные решения и согласование.',
}

export const WASTE_RULES = {
  'DEM-FL-001':{type:'Дерево / ламинат',m3:.015,kg:8,bag:true},
  'DEM-FL-002':{type:'Линолеум',m3:.006,kg:3,bag:true},
  'DEM-FL-004':{type:'Дерево / паркет',m3:.02,kg:12,bag:true},
  'DEM-FL-006':{type:'Керамика',m3:.012,kg:25,bag:true},
  'DEM-FL-007':{type:'Керамогранит',m3:.014,kg:30,bag:true},
  'DEM-FL-008':{type:'Стяжка',m3:.05,kg:90,bag:true},
  'DEM-FL-012':{type:'Плинтус',m3:.001,kg:.5,bag:true},
  'DEM-WL-001':{type:'Обои',m3:.002,kg:.6,bag:true},
  'DEM-WL-002':{type:'Штукатурка',m3:.015,kg:20,bag:true},
  'DEM-WL-003':{type:'Керамика',m3:.012,kg:25,bag:true},
  'DEM-WL-005':{type:'ГКЛ',m3:.05,kg:25,bag:true},
  'DEM-WL-006':{type:'Газоблок / ПГП',m3:.10,kg:70,bag:true},
  'DEM-WL-008':{type:'Кирпич',m3:.12,kg:180,bag:true},
  'DEM-WL-010':{type:'Железобетон',m3:.12,kg:288,bag:true},
  'DEM-CL-001':{type:'ПВХ / текстиль',m3:.004,kg:1,bag:true},
  'DEM-CL-002':{type:'ГКЛ',m3:.04,kg:20,bag:true},
  'DEM-CL-003':{type:'Минеральные панели',m3:.03,kg:7,bag:true},
  'DEM-CL-004':{type:'Штукатурка',m3:.012,kg:16,bag:true},
  'DEM-CL-005':{type:'Отделочный слой',m3:.004,kg:5,bag:true},
  'DEM-DR-001':{type:'Дверной блок',m3:.16,kg:35,bag:false},
  'DEM-DR-002':{type:'Дверное полотно',m3:.09,kg:25,bag:false},
  'DEM-DR-003':{type:'Короб / наличники',m3:.05,kg:12,bag:false},
  'DEM-WN-001':{type:'Оконный блок',m3:.12,kg:30,bag:false},
  'DEM-PL-003':{type:'Сантехника',m3:.45,kg:55,bag:false},
  'DEM-PL-006':{type:'Сантехника',m3:.18,kg:30,bag:false},
  'DEM-PL-005':{type:'Сантехника',m3:.12,kg:18,bag:false},
  'DEM-PL-007':{type:'Металл / сантехника',m3:.12,kg:20,bag:false},
  'DEM-FU-001':{type:'Мебель',m3:1.2,kg:120,bag:false},
  'DEM-FU-002':{type:'Мебель',m3:.7,kg:70,bag:false},
  'DEM-FU-003':{type:'Мебель',m3:1.0,kg:100,bag:false},
  'DEM-FU-004':{type:'Столешница',m3:.04,kg:18,bag:false},
}

export const LOGISTICS_RATES = {
  bagPrice:40,
  carryBagLift:120,
  carryBagNoLiftBase:140,
  carryBagPerFloor:15,
  bulkyCarryLift:800,
  bulkyCarryNoLiftBase:1000,
  bulkyCarryPerFloor:150,
  loadingMin:3500,
  loadingPerM3:1200,
  disposalPerM3:2500,
  transportTiers:[
    {max:1,price:8000,label:'Малый вывоз до 1 м³'},
    {max:4,price:14000,label:'Газель / малый контейнер до 4 м³'},
    {max:8,price:22000,label:'Контейнер до 8 м³'},
    {max:20,price:42000,label:'Контейнер до 20 м³'},
  ],
}

export const demoItemIndex = Object.fromEntries(
  DEMO_CATALOG.flatMap(category => category.groups.flatMap(group =>
    group.items.map(([code,name,unit]) => [code,{code,name,unit,category:category.title,group:group.title}])
  ))
)

export const toNum = value => Number.parseFloat(String(value ?? '').replace(',', '.')) || 0
export const money = value => Math.round(value || 0).toLocaleString('ru-RU')

export function validateProfileField(field,value) {
  const raw=String(value ?? '').trim()
  if(field.required && !raw) return 'Обязательное поле'
  if(field.digits && raw.replace(/\D/g,'').length !== field.digits) return `Нужно ${field.digits} цифр`
  return ''
}

export function roomCalc(room) {
  const height=toNum(room.height)
  const floor=room.mode==='exact' ? toNum(room.length)*toNum(room.width) : toNum(room.floorArea)
  const perimeter=room.mode==='exact' ? 2*(toNum(room.length)+toNum(room.width)) : floor>0 ? 4*Math.sqrt(floor) : 0
  const grossWalls=perimeter*height
  const doorArea=(toNum(room.doorWidth)/100)*(toNum(room.doorHeight)/100)*Math.max(1,toNum(room.doorQty))
  const windowArea=(toNum(room.windowWidth)/100)*(toNum(room.windowHeight)/100)*Math.max(1,toNum(room.windowQty))
  const openings=doorArea+windowArea
  return {
    floor,ceiling:floor,perimeter,grossWalls,doorArea,windowArea,
    doorQty:toNum(room.doorWidth)&&toNum(room.doorHeight)?Math.max(1,toNum(room.doorQty)):0,
    windowQty:toNum(room.windowWidth)&&toNum(room.windowHeight)?Math.max(1,toNum(room.windowQty)):0,
    openings,netWalls:Math.max(0,grossWalls-openings),
  }
}

export function newRoom(index=0) {
  return {
    id:`room-${Date.now()}-${index}`,type:index===0?'Ванная':'',mode:'exact',
    length:'',width:'',floorArea:'',height:'',
    doorWidth:'',doorHeight:'',doorQty:'1',
    windowWidth:'',windowHeight:'',windowQty:'1',
  }
}

export function suggestedQuantity(code,room) {
  const source=DEMO_AUTO_QTY[code]
  if(!source) return 0
  return toNum(roomCalc(room)[source])
}

export function suggestedRoughQuantity(code,room) {
  const source=ROUGH_AUTO_QTY[code]
  if(!source) return 0
  return toNum(roomCalc(room)[source])
}

export function buildEstimateRows(rooms,selections,rates=DEMO_RATES) {
  return Object.entries(selections || {}).map(([key,quantity])=>{
    const split=key.indexOf(':')
    const roomId=key.slice(0,split)
    const code=key.slice(split+1)
    const room=rooms.find(item=>item.id===roomId)
    const item=demoItemIndex[code] || {code,name:code,unit:'шт',category:'Другое'}
    const rate=toNum(rates[code] ?? DEMO_RATES[code])
    return {...item,roomId,roomName:room?.type||'Помещение',quantity:toNum(quantity),rate,sum:toNum(quantity)*rate}
  }).filter(row=>row.quantity>0)
}


export function buildRoughEstimateRows(rooms,selections,rates=ROUGH_RATES) {
  return Object.entries(selections || {}).map(([key,quantity])=>{
    const split=key.indexOf(':')
    const roomId=key.slice(0,split)
    const code=key.slice(split+1)
    const room=rooms.find(item=>item.id===roomId)
    const item=roughItemIndex[code] || {code,name:code,unit:'шт',category:'Другое'}
    const rate=toNum(rates[code] ?? ROUGH_RATES[code])
    return {...item,roomId,roomName:room?.type||'Помещение',quantity:toNum(quantity),rate,sum:toNum(quantity)*rate}
  }).filter(row=>row.quantity>0)
}

function transportFor(volume,rates) {
  const tier=rates.transportTiers.find(item=>volume<=item.max)
  if(tier) return {price:tier.price,label:tier.label}
  const maxTier=rates.transportTiers[rates.transportTiers.length-1]
  const count=Math.max(1,Math.ceil(volume/maxTier.max))
  return {price:count*maxTier.price,label:`${count} × контейнер до ${maxTier.max} м³`}
}

export function calculateWasteAndLogistics(rows,{floor=1,lift='yes',rates=LOGISTICS_RATES,wasteRules=WASTE_RULES}={}) {
  let volume=0
  let weight=0
  let bags=0
  let bulky=0
  const byType={}

  rows.forEach(row=>{
    const rule=wasteRules[row.code] || {type:'Смешанные отходы',m3:.01,kg:5,bag:true}
    const rowVolume=row.quantity*rule.m3
    const rowWeight=row.quantity*rule.kg
    volume+=rowVolume
    weight+=rowWeight
    if(rule.bag) bags+=Math.ceil(Math.max(rowWeight/25,rowVolume/.025))
    else bulky+=Math.max(1,Math.ceil(row.quantity))

    const existing=byType[rule.type] || {type:rule.type,volume:0,weight:0}
    existing.volume+=rowVolume
    existing.weight+=rowWeight
    byType[rule.type]=existing
  })

  const floorNumber=Math.max(1,toNum(floor)||1)
  const packaging=bags*rates.bagPrice
  const carry=lift==='yes'
    ? bags*rates.carryBagLift + bulky*rates.bulkyCarryLift
    : bags*(rates.carryBagNoLiftBase+floorNumber*rates.carryBagPerFloor) +
      bulky*(rates.bulkyCarryNoLiftBase+floorNumber*rates.bulkyCarryPerFloor)
  const loading=volume>0 ? Math.max(rates.loadingMin,volume*rates.loadingPerM3) : 0
  const transport=volume>0 ? transportFor(volume,rates) : {price:0,label:'Не требуется'}
  const disposal=volume>0 ? Math.max(3000,volume*rates.disposalPerM3) : 0
  const total=packaging+carry+loading+transport.price+disposal

  return {
    volume,weight,bags,bulky,
    packaging,carry,loading,transport:transport.price,transportLabel:transport.label,disposal,total,
    byType:Object.values(byType).sort((a,b)=>b.volume-a.volume),
  }
}


export function validateOrder(order) {
  const errors=[]
  if(!order?.objectType) errors.push('Не выбран тип объекта')
  if(!String(order?.address||'').trim()) errors.push('Не указан адрес объекта')
  if(!Array.isArray(order?.rooms) || order.rooms.length===0) errors.push('Не добавлены помещения')
  ;(order?.rooms||[]).forEach((room,index)=>{
    const calc=roomCalc(room)
    if(!room.type) errors.push(`Помещение ${index+1}: не выбран тип`)
    if(calc.floor<=0) errors.push(`Помещение ${index+1}: площадь должна быть больше 0`)
    if(toNum(room.height)<=0) errors.push(`Помещение ${index+1}: высота должна быть больше 0`)
  })
  if(toNum(order?.total)<0) errors.push('Итог заказа не может быть отрицательным')
  return errors
}

export function statusLabel(status) {
  return ORDER_STATUSES.find(item=>item.id===status)?.label || 'Черновик'
}

export function cloneOrder(order,newId) {
  const now=new Date().toISOString()
  return {
    ...JSON.parse(JSON.stringify(order)),
    id:String(newId),
    status:'draft',
    createdAt:now,
    updatedAt:now,
  }
}
