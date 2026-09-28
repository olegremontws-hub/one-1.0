import assert from 'node:assert/strict'
import {
  roomCalc, buildEstimateRows, calculateWasteAndLogistics, DEMO_RATES,
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
