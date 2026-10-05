import assert from 'node:assert/strict'
import {
  roomCalc, buildEstimateRows, buildRoughEstimateRows, calculateWasteAndLogistics, cloneOrder, validateOrder,
  DEMO_RATES, ROUGH_RATES, WASTE_REMOVAL_RATES, calculateWasteRemoval, suggestedRoughQuantity,
} from '../src/domain/model.js'

const room={
  id:'room-test',type:'Тест',mode:'exact',
  length:'5',width:'4',height:'3',
  doorWidth:'90',doorHeight:'210',doorQty:'1',
  windowWidth:'150',windowHeight:'140',windowQty:'1',
}

const geo=roomCalc(room)
assert.equal(Number(geo.floor.toFixed(2)),20)
assert.equal(Number(geo.perimeter.toFixed(2)),18)
assert.equal(Number(geo.grossWalls.toFixed(2)),54)
assert.equal(Number(geo.openings.toFixed(2)),3.99)
assert.equal(Number(geo.netWalls.toFixed(2)),50.01)

const selections={
  'room-test:DEM-FL-006':20,
  'room-test:DEM-WL-003':50.01,
}

const rows=buildEstimateRows([room],selections,DEMO_RATES)
assert.equal(rows.length,2)
assert(rows.every(row=>row.sum>0))

const workTotal=rows.reduce((sum,row)=>sum+row.sum,0)
assert(workTotal>0)

const logistics=calculateWasteAndLogistics(rows,{floor:8,lift:'yes'})
assert(logistics.volume>0)
assert(logistics.weight>0)
assert(logistics.total>0)

console.log('Bath Dream smoke test passed')
console.log(JSON.stringify({
  floor:geo.floor,
  netWalls:geo.netWalls,
  workTotal:Math.round(workTotal),
  wasteVolume:Number(logistics.volume.toFixed(2)),
  logisticsTotal:Math.round(logistics.total),
  total:Math.round(workTotal+logistics.total),
},null,2))


const validOrder={
  id:'1923',
  objectType:'secondary',
  address:'Москва, тестовый адрес',
  rooms:[{...room,calc:geo}],
  total:workTotal+logistics.total,
  workTotal,
  logistics,
  status:'calculated',
}
assert.deepEqual(validateOrder(validOrder),[])

const cloned=cloneOrder(validOrder,'1924')
assert.equal(cloned.id,'1924')
assert.equal(cloned.status,'draft')
assert.notEqual(cloned,validOrder)


const roughSelections={
  'room-test:RUF-FL-002':20,
  'room-test:RUF-WL-002':50.01,
  'room-test:RUF-CL-001':20,
}
const roughRows=buildRoughEstimateRows([room],roughSelections,ROUGH_RATES)
assert.equal(roughRows.length,3)
assert(roughRows.every(row=>row.sum>0))
assert.equal(Number(suggestedRoughQuantity('RUF-FL-002',room).toFixed(2)),20)
assert.equal(Number(suggestedRoughQuantity('RUF-WL-002',room).toFixed(2)),50.01)

const roughTotal=roughRows.reduce((sum,row)=>sum+row.sum,0)
const roughOrder={
  id:'1925',
  serviceType:'rough',
  serviceLabel:'Черновой ремонт',
  objectType:'secondary',
  address:'Москва, тестовый адрес',
  rooms:[{...room,calc:geo}],
  roughRepair:roughSelections,
  rates:ROUGH_RATES,
  logistics:{total:0},
  workTotal:roughTotal,
  total:roughTotal,
  status:'calculated',
}
assert.deepEqual(validateOrder(roughOrder),[])
console.log('Bath Dream rough repair smoke test passed')


const wasteCalc=calculateWasteRemoval({
  types:['heavy','mixed'],
  amountMode:'bags',
  bags:40,
  floor:5,
  lift:'no',
  distance:35,
  carryMode:'team',
},WASTE_REMOVAL_RATES)

assert.equal(Number(wasteCalc.volume.toFixed(2)),1)
assert.equal(wasteCalc.bags,40)
assert(wasteCalc.carry>0)
assert(wasteCalc.loading>0)
assert(wasteCalc.transport>0)
assert(wasteCalc.disposal>0)
assert(wasteCalc.distanceFee>0)
assert(wasteCalc.total>wasteCalc.transport)

const wasteOrder={
  id:'1926',
  serviceType:'waste',
  serviceLabel:'Вывоз строительного мусора',
  objectType:'waste',
  objectLabel:'Вывоз строительного мусора',
  address:'Москва, тестовый адрес',
  floor:'5',
  lift:'no',
  rooms:[],
  wasteRemoval:{
    types:['heavy','mixed'],
    amountMode:'bags',
    bags:40,
    distance:35,
    carryMode:'team',
    date:'2026-10-06',
    timeSlot:'08:00–12:00',
    calculation:wasteCalc,
  },
  workTotal:wasteCalc.carry+wasteCalc.loading,
  logistics:{total:wasteCalc.transport+wasteCalc.disposal+wasteCalc.distanceFee},
  total:wasteCalc.total,
  status:'calculated',
}
assert.deepEqual(validateOrder(wasteOrder),[])
console.log('Bath Dream waste removal smoke test passed')
