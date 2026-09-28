import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const port=8811
const base=`http://127.0.0.1:${port}`
const temp=await mkdtemp(join(tmpdir(),'bathdream-production-'))
const staticDir=resolve(process.env.PRODUCTION_STATIC_DIR||'dist-production')

const child=spawn(process.execPath,['server/api.mjs'],{
  env:{
    ...process.env,
    NODE_ENV:'production',
    PORT:String(port),
    DB_FILE:join(temp,'production.sqlite'),
    STATIC_DIR:staticDir,
    SERVE_STATIC:'1',
    OTP_ECHO:'1',
    OTP_SECRET:'production-static-smoke-otp-secret',
    SESSION_SECRET:'production-static-smoke-session-secret',
  },
  stdio:['ignore','ignore','inherit'],
})

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

async function waitForServer(){
  for(let i=0;i<60;i++){
    try{
      const response=await fetch(base+'/api/health')
      if(response.ok) return
    }catch{}
    await sleep(100)
  }
  throw new Error('Production server did not start')
}

try{
  await waitForServer()

  let response=await fetch(base+'/api/health')
  const health=await response.json()
  assert.equal(health.ok,true)
  assert.equal(health.storage,'sqlite')

  response=await fetch(base+'/')
  assert.equal(response.status,200)
  assert.match(response.headers.get('content-type')||'',/text\/html/)
  const html=await response.text()
  assert.match(html,/id="root"/)

  const asset=html.match(/<script[^>]+src="([^"]+)"/)?.[1]
  assert.ok(asset,'Built JS asset was not found in index.html')
  assert.ok(asset.startsWith('/assets/'),`Expected root-based asset path, got ${asset}`)

  response=await fetch(base+asset)
  assert.equal(response.status,200)
  assert.match(response.headers.get('content-type')||'',/javascript/)

  response=await fetch(base+'/some/client/route')
  assert.equal(response.status,200)
  assert.match(await response.text(),/id="root"/)

  response=await fetch(base+'/api/auth/otp/request',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({method:'email',contact:'preview@example.com'}),
  })
  assert.equal(response.status,200)
  const otp=await response.json()
  assert.match(otp.devCode,/^\d{4}$/)

  console.log('Bath Dream single-service production smoke test passed')
}finally{
  child.kill('SIGTERM')
  await sleep(100)
  await rm(temp,{recursive:true,force:true})
}
