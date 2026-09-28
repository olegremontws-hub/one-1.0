import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

const port=8799
const base=`http://127.0.0.1:${port}`
const child=spawn(process.execPath,['server/api.mjs'],{
  env:{...process.env,PORT:String(port)},
  stdio:['ignore','ignore','inherit'],
})

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

async function waitForServer() {
  for(let i=0;i<30;i++){
    try {
      const res=await fetch(base+'/api/health')
      if(res.ok) return res.json()
    } catch {}
    await sleep(100)
  }
  throw new Error('API did not start')
}

try {
  const health=await waitForServer()
  assert.equal(health.ok,true)

  const state={
    account:{profile:{firstName:'Test'},clientType:'fl',contact:'+79990000000',method:'phone'},
    orders:[{id:'9001',status:'calculated',objectType:'secondary',address:'Test',rooms:[],total:12345}],
  }

  let res=await fetch(base+'/api/state',{
    method:'PUT',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(state),
  })
  assert.equal(res.status,200)

  res=await fetch(base+'/api/orders')
  const orders=await res.json()
  assert.equal(orders.length,1)
  assert.equal(orders[0].id,'9001')

  res=await fetch(base+'/api/orders/9001')
  assert.equal(res.status,200)

  res=await fetch(base+'/api/orders/9001',{
    method:'PUT',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({status:'review'}),
  })
  const updated=await res.json()
  assert.equal(updated.status,'review')

  res=await fetch(base+'/api/orders/9001',{method:'DELETE'})
  assert.equal(res.status,200)

  res=await fetch(base+'/api/orders')
  const empty=await res.json()
  assert.equal(empty.length,0)

  console.log('Bath Dream API smoke test passed')
} finally {
  child.kill('SIGTERM')
}
