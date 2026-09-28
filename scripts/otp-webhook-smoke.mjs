import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const apiPort=8801
const hookPort=8802
const apiBase=`http://127.0.0.1:${apiPort}`
const hookUrl=`http://127.0.0.1:${hookPort}/otp`
const temp=await mkdtemp(join(tmpdir(),'bathdream-otp-'))
let delivered=null

const hook=http.createServer(async(req,res)=>{
  const chunks=[]
  for await(const chunk of req) chunks.push(chunk)
  delivered=JSON.parse(Buffer.concat(chunks).toString('utf8'))
  res.writeHead(204)
  res.end()
})
await new Promise(resolve=>hook.listen(hookPort,'127.0.0.1',resolve))

const child=spawn(process.execPath,['server/api.mjs'],{
  env:{
    ...process.env,
    NODE_ENV:'production',
    PORT:String(apiPort),
    DB_FILE:join(temp,'prod.sqlite'),
    OTP_ECHO:'0',
    OTP_SECRET:'production-test-otp-secret',
    SESSION_SECRET:'production-test-session-secret',
    OTP_WEBHOOK_URL:hookUrl,
  },
  stdio:['ignore','ignore','inherit'],
})

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function waitForApi(){
  for(let i=0;i<60;i++){
    try {
      const res=await fetch(apiBase+'/api/health')
      if(res.ok) return
    } catch {}
    await sleep(100)
  }
  throw new Error('API did not start')
}

try{
  await waitForApi()

  let res=await fetch(apiBase+'/api/auth/otp/request',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({method:'email',contact:'client@example.com'}),
  })
  assert.equal(res.status,200)
  const challenge=await res.json()
  assert.equal(challenge.devCode,undefined)
  assert.equal(delivered.contact,'client@example.com')
  assert.match(delivered.code,/^\d{4}$/)
  assert.equal(delivered.method,'email')

  res=await fetch(apiBase+'/api/auth/otp/verify',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({requestId:challenge.requestId,code:delivered.code}),
  })
  assert.equal(res.status,200)
  const verified=await res.json()
  assert.ok(verified.token)

  console.log('Bath Dream production OTP webhook smoke test passed')
} finally {
  child.kill('SIGTERM')
  await new Promise(resolve=>hook.close(resolve))
  await sleep(100)
  await rm(temp,{recursive:true,force:true})
}
