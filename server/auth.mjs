import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { db, nowIso, uid } from './db.mjs'

const OTP_TTL_MS=Number(process.env.OTP_TTL_MS||5*60*1000)
const SESSION_TTL_MS=Number(process.env.SESSION_TTL_MS||30*24*60*60*1000)
const OTP_SECRET=process.env.OTP_SECRET||'bath-dream-local-otp-secret'
const SESSION_SECRET=process.env.SESSION_SECRET||'bath-dream-local-session-secret'
const OTP_ECHO=process.env.OTP_ECHO!==undefined
  ? String(process.env.OTP_ECHO)==='1'
  : process.env.NODE_ENV!=='production'

const sha=value=>createHash('sha256').update(value).digest('hex')
const otpHash=(challengeId,code)=>sha(`${OTP_SECRET}:${challengeId}:${code}`)
const tokenHash=token=>sha(`${SESSION_SECRET}:${token}`)

export function normalizeContact(method,value) {
  if(method==='email'){
    const email=String(value||'').trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Некорректный e-mail'),{status:400})
    return email
  }

  let digits=String(value||'').replace(/\D/g,'')
  if(digits.length===11&&digits.startsWith('8')) digits='7'+digits.slice(1)
  if(digits.length<10||digits.length>15) throw Object.assign(new Error('Некорректный номер телефона'),{status:400})
  return '+'+digits
}

export function requestOtp(method,contactRaw) {
  if(!['phone','email'].includes(method)) throw Object.assign(new Error('Неизвестный способ подтверждения'),{status:400})
  const contact=normalizeContact(method,contactRaw)
  const cutoff=Date.now()-10*60*1000
  const count=db.prepare('SELECT COUNT(*) AS n FROM otp_challenges WHERE contact=? AND created_at>?').get(contact,cutoff).n
  if(count>=5) throw Object.assign(new Error('Слишком много запросов кода. Повторите позже.'),{status:429})

  const id=uid('otp')
  const code=String(randomInt(1000,10000))
  const createdAt=Date.now()
  const expiresAt=createdAt+OTP_TTL_MS
  db.prepare(`INSERT INTO otp_challenges(id,method,contact,code_hash,expires_at,attempts,created_at)
              VALUES(?,?,?,?,?,?,?)`).run(id,method,contact,otpHash(id,code),expiresAt,0,createdAt)

  return {
    requestId:id,
    method,
    contact,
    expiresIn:Math.floor(OTP_TTL_MS/1000),
    ...(OTP_ECHO?{devCode:code}:{}),
  }
}

function secureEqualHex(a,b) {
  const aa=Buffer.from(a,'hex')
  const bb=Buffer.from(b,'hex')
  return aa.length===bb.length&&timingSafeEqual(aa,bb)
}

function accountShape(account,profile) {
  const method=account.phone?'phone':'email'
  const contact=account.phone||account.email
  return {
    accountId:account.id,
    method,
    contact,
    clientType:profile?.client_type||'',
    profile:profile?JSON.parse(profile.profile_json||'{}'):null,
  }
}

export function verifyOtp(requestId,codeRaw) {
  const challenge=db.prepare('SELECT * FROM otp_challenges WHERE id=?').get(requestId)
  if(!challenge) throw Object.assign(new Error('Запрос кода не найден'),{status:404})
  if(challenge.consumed_at) throw Object.assign(new Error('Код уже использован'),{status:400})
  if(challenge.expires_at<Date.now()) throw Object.assign(new Error('Срок действия кода истёк'),{status:400})
  if(challenge.attempts>=5) throw Object.assign(new Error('Превышено число попыток'),{status:429})

  const code=String(codeRaw||'').replace(/\D/g,'').slice(0,4)
  db.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=?').run(requestId)
  if(code.length!==4||!secureEqualHex(challenge.code_hash,otpHash(requestId,code))){
    throw Object.assign(new Error('Неверный код'),{status:400})
  }

  const consumedAt=Date.now()
  db.prepare('UPDATE otp_challenges SET consumed_at=? WHERE id=?').run(consumedAt,requestId)

  const column=challenge.method==='phone'?'phone':'email'
  let account=db.prepare(`SELECT * FROM auth_accounts WHERE ${column}=?`).get(challenge.contact)
  const now=nowIso()
  if(!account){
    const id=uid('acc')
    db.prepare(`INSERT INTO auth_accounts(id,${column},${column}_verified,status,created_at,updated_at)
                VALUES(?,?,1,'active',?,?)`).run(id,challenge.contact,now,now)
    account=db.prepare('SELECT * FROM auth_accounts WHERE id=?').get(id)
  } else {
    db.prepare(`UPDATE auth_accounts SET ${column}_verified=1,updated_at=? WHERE id=?`).run(now,account.id)
    account=db.prepare('SELECT * FROM auth_accounts WHERE id=?').get(account.id)
  }

  const rawToken=randomBytes(32).toString('hex')
  const sessionId=uid('ses')
  db.prepare(`INSERT INTO sessions(id,account_id,token_hash,expires_at,created_at)
              VALUES(?,?,?,?,?)`).run(sessionId,account.id,tokenHash(rawToken),Date.now()+SESSION_TTL_MS,Date.now())

  const profile=db.prepare('SELECT * FROM client_profiles WHERE account_id=?').get(account.id)
  return {token:rawToken,account:accountShape(account,profile)}
}

export function authenticate(req) {
  const header=String(req.headers.authorization||'')
  const token=header.startsWith('Bearer ')?header.slice(7).trim():''
  if(!token) throw Object.assign(new Error('Требуется авторизация'),{status:401})

  const session=db.prepare(`SELECT s.*,a.status AS account_status
                            FROM sessions s JOIN auth_accounts a ON a.id=s.account_id
                            WHERE s.token_hash=?`).get(tokenHash(token))
  if(!session||session.revoked_at||session.expires_at<Date.now()||session.account_status!=='active'){
    throw Object.assign(new Error('Сессия недействительна'),{status:401})
  }
  return {accountId:session.account_id,sessionId:session.id,token}
}

export function revokeSession(sessionId) {
  db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').run(Date.now(),sessionId)
}

export function upsertProfile(accountId,clientType,profile={}) {
  if(!['fl','ip','ul'].includes(clientType)) throw Object.assign(new Error('Некорректный тип клиента'),{status:400})
  const account=db.prepare('SELECT * FROM auth_accounts WHERE id=?').get(accountId)
  if(!account) throw Object.assign(new Error('Аккаунт не найден'),{status:404})

  const current=db.prepare('SELECT * FROM client_profiles WHERE account_id=?').get(accountId)
  const now=nowIso()
  const displayName=clientType==='fl'
    ? [profile.firstName,profile.lastName].filter(Boolean).join(' ')
    : clientType==='ip' ? String(profile.ipName||'')
    : String(profile.companyName||'')
  const city=String(profile.city||'')
  const json=JSON.stringify(profile||{})

  if(current){
    db.prepare(`UPDATE client_profiles
                SET client_type=?,display_name=?,city=?,profile_json=?,updated_at=?
                WHERE account_id=?`).run(clientType,displayName,city,json,now,accountId)
  } else {
    db.prepare(`INSERT INTO client_profiles(id,account_id,client_type,display_name,city,profile_json,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?)`).run(uid('cli'),accountId,clientType,displayName,city,json,now,now)
  }

  const next=db.prepare('SELECT * FROM client_profiles WHERE account_id=?').get(accountId)
  return accountShape(account,next)
}

export function getAccountShape(accountId) {
  const account=db.prepare('SELECT * FROM auth_accounts WHERE id=?').get(accountId)
  if(!account) throw Object.assign(new Error('Аккаунт не найден'),{status:404})
  const profile=db.prepare('SELECT * FROM client_profiles WHERE account_id=?').get(accountId)
  return accountShape(account,profile)
}
