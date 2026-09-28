import http from 'node:http'
import './db.mjs'
import {
  authenticate, getAccountShape, requestOtp, revokeSession, upsertProfile, verifyOtp,
} from './auth.mjs'
import {
  createOrder, deleteOrder, getOrder, listOrders, syncOrders, updateOrder,
} from './orders.mjs'
import { getActivePriceBook } from './pricing.mjs'
import { createDocument, getDocument, listDocuments, updateDocumentStatus } from './documents.mjs'
import { createPayment, listPayments, updatePaymentStatus } from './payments.mjs'

const PORT=Number(process.env.PORT||8787)
const MAX_BODY=2*1024*1024

function json(res,status,data) {
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':'content-type,authorization',
    'cache-control':'no-store',
  })
  if(status===204) return res.end()
  res.end(JSON.stringify(data))
}

async function body(req) {
  const chunks=[]
  let size=0
  for await (const chunk of req){
    size+=chunk.length
    if(size>MAX_BODY) throw Object.assign(new Error('Слишком большой запрос'),{status:413})
    chunks.push(chunk)
  }
  if(!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Некорректный JSON'),{status:400})
  }
}

function requireAuth(req) {
  return authenticate(req)
}

const server=http.createServer(async (req,res)=>{
  try {
    if(req.method==='OPTIONS') return json(res,204)
    const url=new URL(req.url,'http://localhost')

    if(url.pathname==='/api/health'&&req.method==='GET'){
      return json(res,200,{ok:true,service:'bath-dream-api',version:5,storage:'sqlite'})
    }

    if(url.pathname==='/api/pricing/active'&&req.method==='GET'){
      return json(res,200,getActivePriceBook())
    }

    if(url.pathname==='/api/auth/otp/request'&&req.method==='POST'){
      const payload=await body(req)
      return json(res,200,await requestOtp(payload.method,payload.contact))
    }

    if(url.pathname==='/api/auth/otp/verify'&&req.method==='POST'){
      const payload=await body(req)
      return json(res,200,verifyOtp(payload.requestId,payload.code))
    }

    if(url.pathname==='/api/me'&&req.method==='GET'){
      const auth=requireAuth(req)
      return json(res,200,getAccountShape(auth.accountId))
    }

    if(url.pathname==='/api/logout'&&req.method==='POST'){
      const auth=requireAuth(req)
      revokeSession(auth.sessionId)
      return json(res,204)
    }

    if(url.pathname==='/api/profile'&&req.method==='PUT'){
      const auth=requireAuth(req)
      const payload=await body(req)
      return json(res,200,upsertProfile(auth.accountId,payload.clientType,payload.profile||{}))
    }

    if(url.pathname==='/api/state'&&req.method==='GET'){
      const auth=requireAuth(req)
      const account=getAccountShape(auth.accountId)
      return json(res,200,{
        version:5,
        account,
        orders:account.profile?listOrders(auth.accountId):[],
        updatedAt:new Date().toISOString(),
      })
    }

    if(url.pathname==='/api/state'&&req.method==='PUT'){
      const auth=requireAuth(req)
      const payload=await body(req)
      if(payload.account?.profile&&payload.account?.clientType){
        upsertProfile(auth.accountId,payload.account.clientType,payload.account.profile)
      }
      const orders=syncOrders(auth.accountId,payload.orders||[])
      return json(res,200,{
        version:5,
        account:getAccountShape(auth.accountId),
        orders,
        updatedAt:new Date().toISOString(),
      })
    }

    if(url.pathname==='/api/orders'&&req.method==='GET'){
      const auth=requireAuth(req)
      return json(res,200,listOrders(auth.accountId))
    }

    if(url.pathname==='/api/orders'&&req.method==='POST'){
      const auth=requireAuth(req)
      return json(res,201,createOrder(auth.accountId,await body(req)))
    }

    const orderPaymentsMatch=url.pathname.match(/^\/api\/orders\/([^/]+)\/payments$/)
    if(orderPaymentsMatch){
      const auth=requireAuth(req)
      const number=decodeURIComponent(orderPaymentsMatch[1])
      if(req.method==='GET') return json(res,200,listPayments(auth.accountId,number))
      if(req.method==='POST'){
        const payload=await body(req)
        return json(res,201,createPayment(auth.accountId,number,payload))
      }
    }

    const paymentMatch=url.pathname.match(/^\/api\/payments\/([^/]+)$/)
    if(paymentMatch){
      const auth=requireAuth(req)
      const id=decodeURIComponent(paymentMatch[1])
      if(req.method==='PATCH'){
        const payload=await body(req)
        return json(res,200,updatePaymentStatus(auth.accountId,id,payload.status))
      }
    }

    const orderDocumentsMatch=url.pathname.match(/^\/api\/orders\/([^/]+)\/documents$/)
    if(orderDocumentsMatch){
      const auth=requireAuth(req)
      const number=decodeURIComponent(orderDocumentsMatch[1])
      if(req.method==='GET') return json(res,200,listDocuments(auth.accountId,number))
      if(req.method==='POST'){
        const payload=await body(req)
        return json(res,201,createDocument(auth.accountId,number,payload.kind))
      }
    }

    const documentMatch=url.pathname.match(/^\/api\/documents\/([^/]+)$/)
    if(documentMatch){
      const auth=requireAuth(req)
      const id=decodeURIComponent(documentMatch[1])
      if(req.method==='GET') return json(res,200,getDocument(auth.accountId,id))
      if(req.method==='PATCH'){
        const payload=await body(req)
        return json(res,200,updateDocumentStatus(auth.accountId,id,payload.status))
      }
    }

    const match=url.pathname.match(/^\/api\/orders\/([^/]+)$/)
    if(match){
      const auth=requireAuth(req)
      const number=decodeURIComponent(match[1])

      if(req.method==='GET') return json(res,200,getOrder(auth.accountId,number))
      if(req.method==='PUT') return json(res,200,updateOrder(auth.accountId,number,await body(req)))
      if(req.method==='DELETE') return json(res,200,deleteOrder(auth.accountId,number))
    }

    return json(res,404,{error:'Маршрут не найден'})
  } catch (error) {
    const status=Number(error?.status)||500
    if(status>=500) console.error(error)
    return json(res,status,{error:error instanceof Error?error.message:'Внутренняя ошибка'})
  }
})

server.listen(PORT,()=>{
  console.log(`Bath Dream API v5: http://localhost:${PORT}`)
})
