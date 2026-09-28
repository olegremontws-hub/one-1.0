import { spawn } from 'node:child_process'

const npm=process.platform==='win32'?'npm.cmd':'npm'
const env={...process.env,VITE_API_URL:process.env.VITE_API_URL||'http://localhost:8787'}

const server=spawn(npm,['run','server'],{stdio:'inherit',env})
const client=spawn(npm,['run','dev'],{stdio:'inherit',env})

let stopping=false
function stop(code=0){
  if(stopping) return
  stopping=true
  server.kill('SIGTERM')
  client.kill('SIGTERM')
  setTimeout(()=>process.exit(code),150)
}

server.on('exit',code=>{ if(!stopping&&code) stop(code) })
client.on('exit',code=>{ if(!stopping&&code) stop(code) })

process.on('SIGINT',()=>stop(0))
process.on('SIGTERM',()=>stop(0))
