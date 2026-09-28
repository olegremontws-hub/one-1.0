const API_BASE=String(import.meta.env.VITE_API_URL||'').replace(/\/$/,'')

export const REMOTE_ENABLED=Boolean(API_BASE)

async function request(path,options={}) {
  if(!REMOTE_ENABLED) throw new Error('Remote API is not configured')
  const response=await fetch(API_BASE+path,{
    ...options,
    headers:{
      'content-type':'application/json',
      ...(options.headers||{}),
    },
  })
  if(!response.ok){
    let message=`API error ${response.status}`
    try {
      const data=await response.json()
      if(data?.error) message=data.error
    } catch {}
    throw new Error(message)
  }
  return response.status===204?null:response.json()
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

export function checkRemoteHealth() {
  return request('/api/health')
}
