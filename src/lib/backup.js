export const BACKUP_VERSION = 1

export function makeBackup({account,orders}) {
  return {
    app:'Bath Dream Client MVP',
    version:BACKUP_VERSION,
    exportedAt:new Date().toISOString(),
    account:account || null,
    orders:Array.isArray(orders)?orders:[],
  }
}

export function downloadBackup(data) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  const date=new Date().toISOString().slice(0,10)
  link.href=url
  link.download=`bath-dream-backup-${date}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file) {
  const text=await file.text()
  const data=JSON.parse(text)
  if(data?.app!=='Bath Dream Client MVP') throw new Error('Это не резервная копия Bath Dream')
  if(data?.version!==BACKUP_VERSION) throw new Error('Версия резервной копии не поддерживается')
  if(!Array.isArray(data.orders)) throw new Error('Некорректный список заказов')
  return data
}
