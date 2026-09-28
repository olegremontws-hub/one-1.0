const API_BASE=String(import.meta.env.VITE_API_URL||'').replace(/\/$/,'')
const TOKEN_KEY='bathdream.remote.token'

export const REMOTE_ENABLED=Boolean(API_BASE)

function readToken() {
  try { return localStorage.getItem(TOKEN_KEY)||'' } catch { return '' }
}

function writeToken(token) {
  try {
    if(token) localStorage.setItem(TOKEN_KEY,token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function hasRemoteSession() {
  return Boolean(readToken())
}

async function request(path,options={}) {
  if(!REMOTE_ENABLED) throw new Error('Remote API is not configured')
  const token=options.auth===false?'':readToken()
  const response=await fetch(API_BASE+path,{
    ...options,
    headers:{
      ...(options.body?{'content-type':'application/json'}:{}),
      ...(token?{authorization:`Bearer ${token}`}:{}),
      ...(options.headers||{}),
    },
  })

  if(!response.ok){
    let message=`API error ${response.status}`
    try {
      const data=await response.json()
      if(data?.error) message=data.error
    } catch {}
    if(response.status===401&&options.auth!==false) writeToken('')
    const error=new Error(message)
    error.status=response.status
    throw error
  }

  return response.status===204?null:response.json()
}

export function requestRemoteOtp(method,contact) {
  return request('/api/auth/otp/request',{
    auth:false,
    method:'POST',
    body:JSON.stringify({method,contact}),
  })
}

export async function verifyRemoteOtp(requestId,code) {
  const result=await request('/api/auth/otp/verify',{
    auth:false,
    method:'POST',
    body:JSON.stringify({requestId,code}),
  })
  writeToken(result.token)
  return result
}

export function saveRemoteProfile(clientType,profile) {
  return request('/api/profile',{
    method:'PUT',
    body:JSON.stringify({clientType,profile}),
  })
}

export function loadRemoteState() {
  return request('/api/state')
}

export function saveRemoteState({account,orders}) {
  return request('/api/state',{
    method:'PUT',
    body:JSON.stringify({account:account||null,orders:Array.isArray(orders)?orders:[]}),
  })
}

export async function logoutRemote() {
  try {
    if(readToken()) await request('/api/logout',{method:'POST'})
  } finally {
    writeToken('')
  }
}

export function checkRemoteHealth() {
  return request('/api/health',{auth:false})
}


export function loadActivePricing() {
  return request('/api/pricing/active',{auth:false})
}


export function loadOrderDocuments(orderNumber) {
  return request(`/api/orders/${encodeURIComponent(orderNumber)}/documents`)
}

export function createOrderDocument(orderNumber,kind) {
  return request(`/api/orders/${encodeURIComponent(orderNumber)}/documents`,{
    method:'POST',
    body:JSON.stringify({kind}),
  })
}

export function loadRemoteDocument(id) {
  return request(`/api/documents/${encodeURIComponent(id)}`)
}

export function updateRemoteDocumentStatus(id,status) {
  return request(`/api/documents/${encodeURIComponent(id)}`,{
    method:'PATCH',
    body:JSON.stringify({status}),
  })
}
