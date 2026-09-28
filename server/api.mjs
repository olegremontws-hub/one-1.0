import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname=dirname(fileURLToPath(import.meta.url))
const DATA_FILE=join(__dirname,'data.json')
const PORT=Number(process.env.PORT||8787)

const emptyState=()=>({
  version:1,
  account:null,
  orders:[],
  updatedAt:new Date().toISOString(),
})

async function readState() {
  try {
    return JSON.parse(await readFile(DATA_FILE,'utf8'))
  } catch {
    const state=emptyState()
    await writeState(state)
    return state
  }
}

async function writeState(state) {
  const next={...state,version:1,updatedAt:new Date().toISOString()}
  await writeFile(DATA_FILE,JSON.stringify(next,null,2),'utf8')
  return next
}

function json(res,status,data) {
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':'content-type',
  })
  res.end(JSON.stringify(data))
}

async function body(req) {
  const chunks=[]
  for await (const chunk of req) chunks.push(chunk)
  if(!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server=http.createServer(async (req,res)=>{
  try {
    if(req.method==='OPTIONS') return json(res,204,{})
    const url=new URL(req.url,'http://localhost')

    if(url.pathname==='/api/health'&&req.method==='GET') {
      return json(res,200,{ok:true,service:'bath-dream-api',version:1})
    }

    if(url.pathname==='/api/state'&&req.method==='GET') {
      return json(res,200,await readState())
    }

    if(url.pathname==='/api/state'&&req.method==='PUT') {
      const payload=await body(req)
      return json(res,200,await writeState({
        version:1,
        account:payload.account||null,
        orders:Array.isArray(payload.orders)?payload.orders:[],
      }))
    }

    if(url.pathname==='/api/orders'&&req.method==='GET') {
      const state=await readState()
      return json(res,200,state.orders)
    }

    if(url.pathname==='/api/orders'&&req.method==='POST') {
      const order=await body(req)
      const state=await readState()
      if(!order?.id) return json(res,400,{error:'order.id is required'})
      if(state.orders.some(item=>String(item.id)===String(order.id))) return json(res,409,{error:'order already exists'})
      state.orders=[order,...state.orders]
      await writeState(state)
      return json(res,201,order)
    }

    const match=url.pathname.match(/^\/api\/orders\/([^/]+)$/)
    if(match) {
      const id=decodeURIComponent(match[1])
      const state=await readState()
      const index=state.orders.findIndex(item=>String(item.id)===id)

      if(req.method==='GET') {
        if(index<0) return json(res,404,{error:'order not found'})
        return json(res,200,state.orders[index])
      }

      if(req.method==='PUT') {
        if(index<0) return json(res,404,{error:'order not found'})
        const order=await body(req)
        state.orders[index]={...state.orders[index],...order,id:state.orders[index].id}
        await writeState(state)
        return json(res,200,state.orders[index])
      }

      if(req.method==='DELETE') {
        if(index<0) return json(res,404,{error:'order not found'})
        const [removed]=state.orders.splice(index,1)
        await writeState(state)
        return json(res,200,removed)
      }
    }

    return json(res,404,{error:'not found'})
  } catch (error) {
    return json(res,500,{error:error instanceof Error?error.message:'internal error'})
  }
})

server.listen(PORT,()=>{
  console.log(`Bath Dream API: http://localhost:${PORT}`)
})
