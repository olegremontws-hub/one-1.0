import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port=8799
const base=`http://127.0.0.1:${port}`
const temp=await mkdtemp(join(tmpdir(),'bathdream-api-'))
const dbFile=join(temp,'test.sqlite')

const child=spawn(process.execPath,['server/api.mjs'],{
  env:{
    ...process.env,
    PORT:String(port),
    DB_FILE:dbFile,
    OTP_ECHO:'1',
    OTP_SECRET:'test-otp-secret',
    SESSION_SECRET:'test-session-secret',
  },
  stdio:['ignore','ignore','inherit'],
})

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

async function waitForServer() {
  for(let i=0;i<60;i++){
    try {
      const res=await fetch(base+'/api/health')
      if(res.ok) return res.json()
    } catch {}
    await sleep(100)
  }
  throw new Error('API did not start')
}

async function api(path,{token,...options}={}) {
  return fetch(base+path,{
    ...options,
    headers:{
      ...(options.body?{'content-type':'application/json'}:{}),
      ...(token?{authorization:`Bearer ${token}`}:{}),
      ...(options.headers||{}),
    },
  })
}

try {
  const health=await waitForServer()
  assert.equal(health.ok,true)
  assert.equal(health.storage,'sqlite')

  let pricingResponse=await api('/api/pricing/active')
  assert.equal(pricingResponse.status,200)
  const pricing=await pricingResponse.json()
  assert.equal(pricing.version,1)
  assert.equal(pricing.status,'active')
  assert.ok(pricing.rates['DEM-FL-006']>0)

  let res=await api('/api/auth/otp/request',{
    method:'POST',
    body:JSON.stringify({method:'phone',contact:'+7 999 000-00-00'}),
  })
  assert.equal(res.status,200)
  const challenge=await res.json()
  assert.equal(challenge.devCode.length,4)

  res=await api('/api/auth/otp/verify',{
    method:'POST',
    body:JSON.stringify({requestId:challenge.requestId,code:challenge.devCode}),
  })
  assert.equal(res.status,200)
  const verified=await res.json()
  assert.ok(verified.token)
  assert.equal(verified.account.profile,null)
  const token=verified.token

  res=await api('/api/profile',{
    token,
    method:'PUT',
    body:JSON.stringify({
      clientType:'fl',
      profile:{firstName:'Тест',lastName:'Клиент',city:'Москва'},
    }),
  })
  assert.equal(res.status,200)
  const account=await res.json()
  assert.equal(account.clientType,'fl')
  assert.equal(account.profile.firstName,'Тест')

  const state={
    account,
    orders:[{
      id:'9001',
      status:'calculated',
      objectType:'secondary',
      objectLabel:'Вторичный рынок',
      address:'Москва, тестовый адрес',
      area:'42',
      floor:'5',
      lift:'yes',
      rooms:[],
      demolition:{},
      workTotal:10000,
      logistics:{total:2345},
      total:12345,
    }],
  }

  res=await api('/api/state',{
    token,
    method:'PUT',
    body:JSON.stringify(state),
  })
  assert.equal(res.status,200)

  res=await api('/api/state',{token})
  const restored=await res.json()
  assert.equal(restored.account.profile.lastName,'Клиент')
  assert.equal(restored.orders.length,1)
  assert.equal(restored.orders[0].id,'9001')
  assert.equal(restored.orders[0].total,12345)

  res=await api('/api/orders',{token})
  const orders=await res.json()
  assert.equal(orders.length,1)

  res=await api('/api/orders/9001',{
    token,
    method:'PUT',
    body:JSON.stringify({status:'review'}),
  })
  assert.equal(res.status,200)
  const updated=await res.json()
  assert.equal(updated.status,'review')

  res=await api('/api/orders/9001/documents',{token})
  assert.equal(res.status,200)
  assert.deepEqual(await res.json(),[])

  res=await api('/api/orders/9001/documents',{
    token,
    method:'POST',
    body:JSON.stringify({kind:'quote'}),
  })
  assert.equal(res.status,201)
  const quote=await res.json()
  assert.equal(quote.kind,'quote')
  assert.equal(quote.version,1)
  assert.equal(quote.status,'draft')
  assert.equal(quote.content.order.publicNumber,'9001')
  assert.equal(quote.content.order.totals.total,12345)

  res=await api(`/api/documents/${quote.id}`,{
    token,
    method:'PATCH',
    body:JSON.stringify({status:'issued'}),
  })
  assert.equal(res.status,200)
  const issued=await res.json()
  assert.equal(issued.status,'issued')
  assert.ok(issued.issuedAt)

  res=await api(`/api/documents/${quote.id}`,{
    token,
    method:'PATCH',
    body:JSON.stringify({status:'signed'}),
  })
  assert.equal(res.status,200)
  const signed=await res.json()
  assert.equal(signed.status,'signed')
  assert.ok(signed.signedAt)

  res=await api('/api/orders/9001/documents',{
    token,
    method:'POST',
    body:JSON.stringify({kind:'quote'}),
  })
  assert.equal(res.status,201)
  const quoteV2=await res.json()
  assert.equal(quoteV2.version,2)

  res=await api('/api/orders/9001/documents',{token})
  const documents=await res.json()
  assert.equal(documents.length,2)

  res=await api('/api/orders/9001',{token,method:'DELETE'})
  assert.equal(res.status,200)

  res=await api('/api/orders',{token})
  const empty=await res.json()
  assert.equal(empty.length,0)

  res=await api('/api/logout',{token,method:'POST'})
  assert.equal(res.status,204)

  res=await api('/api/me',{token})
  assert.equal(res.status,401)

  console.log('Bath Dream authenticated SQLite API smoke test passed')
} finally {
  child.kill('SIGTERM')
  await sleep(100)
  await rm(temp,{recursive:true,force:true})
}
