import { useEffect, useId, useMemo, useRef, useState } from 'react'

const MAPS_KEY=String(import.meta.env.VITE_YANDEX_MAPS_API_KEY||'').trim()
const SUGGEST_KEY=String(import.meta.env.VITE_YANDEX_SUGGEST_API_KEY||'').trim()
const HAS_YANDEX_API=Boolean(MAPS_KEY&&SUGGEST_KEY)
const MOSCOW_CENTER=[55.751244,37.618423]

let yandexPromise=null

function loadYandex(){
  if(!HAS_YANDEX_API) return Promise.resolve(null)
  if(window.ymaps) return new Promise(resolve=>window.ymaps.ready(()=>resolve(window.ymaps)))
  if(yandexPromise) return yandexPromise

  yandexPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script')
    script.src=`https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${encodeURIComponent(MAPS_KEY)}&suggest_apikey=${encodeURIComponent(SUGGEST_KEY)}`
    script.async=true
    script.onload=()=>{
      if(!window.ymaps) return reject(new Error('Yandex Maps API не загрузился'))
      window.ymaps.ready(()=>resolve(window.ymaps))
    }
    script.onerror=()=>reject(new Error('Не удалось загрузить Yandex Maps API'))
    document.head.appendChild(script)
  })

  return yandexPromise
}

function widgetUrl(address){
  const query=String(address||'Москва').trim()||'Москва'
  return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(query)}&z=14`
}

export default function AddressPicker({
  value,
  onChange,
  label='Адрес объекта',
  placeholder='Москва, улица, дом',
  required=true,
}){
  const uid=useId().replace(/:/g,'')
  const inputRef=useRef(null)
  const mapRef=useRef(null)
  const mapInstance=useRef(null)
  const placemarkRef=useRef(null)
  const suggestRef=useRef(null)
  const [apiReady,setApiReady]=useState(false)
  const [apiError,setApiError]=useState('')
  const [mapQuery,setMapQuery]=useState(value||'Москва')
  const iframeSrc=useMemo(()=>widgetUrl(mapQuery),[mapQuery])

  useEffect(()=>{
    if(HAS_YANDEX_API) return
    const timer=setTimeout(()=>setMapQuery(value||'Москва'),500)
    return ()=>clearTimeout(timer)
  },[value])

  const placeAddress=async(address)=>{
    const text=String(address||'').trim()
    if(!text||!mapInstance.current||!window.ymaps) return
    try {
      const result=await window.ymaps.geocode(text,{results:1})
      const first=result.geoObjects.get(0)
      if(!first) return
      const coords=first.geometry.getCoordinates()
      mapInstance.current.setCenter(coords,16,{checkZoomRange:true})
      if(placemarkRef.current) mapInstance.current.geoObjects.remove(placemarkRef.current)
      placemarkRef.current=new window.ymaps.Placemark(coords,{
        balloonContent:text,
        hintContent:text,
      },{preset:'islands#blackIcon'})
      mapInstance.current.geoObjects.add(placemarkRef.current)
    } catch {}
  }

  useEffect(()=>{
    let cancelled=false
    let suggest=null
    let map=null

    loadYandex()
      .then(ymaps=>{
        if(cancelled||!ymaps||!inputRef.current||!mapRef.current) return
        map=new ymaps.Map(mapRef.current,{
          center:MOSCOW_CENTER,
          zoom:10,
          controls:['zoomControl'],
        })
        mapInstance.current=map

        suggest=new ymaps.SuggestView(inputRef.current,{
          results:7,
        })
        suggestRef.current=suggest
        suggest.events.add('select',event=>{
          const item=event.get('item')
          const next=item?.value||item?.displayName||''
          if(next){
            onChange(next)
            placeAddress(next)
          }
        })

        setApiReady(true)
        if(value) placeAddress(value)
      })
      .catch(error=>{
        if(!cancelled) setApiError(error instanceof Error?error.message:'Карта временно недоступна')
      })

    return ()=>{
      cancelled=true
      try { suggest?.destroy() } catch {}
      try { map?.destroy() } catch {}
      suggestRef.current=null
      mapInstance.current=null
    }
  },[])

  const commit=()=>{
    const text=String(value||'').trim()
    if(!text) return
    setMapQuery(text)
    placeAddress(text)
  }

  return <div className="address-picker">
    <div className="address-picker__field">
      <label className="field">
        <span>{label}</span>
        <input
          id={`address-${uid}`}
          ref={inputRef}
          autoComplete="street-address"
          placeholder={placeholder}
          value={value}
          required={required}
          onChange={event=>onChange(event.target.value)}
          onBlur={commit}
          onKeyDown={event=>{if(event.key==='Enter') commit()}}
        />
      </label>
      <div className="address-picker__meta">
        <span>{HAS_YANDEX_API?(apiReady?'Справочник адресов Яндекса подключён':'Подключаем справочник адресов…'):'Введите адрес и выберите точный дом'}</span>
        {apiError&&<small>{apiError}</small>}
      </div>
    </div>

    <div className="address-picker__map" aria-label="Карта Яндекса">
      {HAS_YANDEX_API
        ? <div ref={mapRef} className="address-picker__map-canvas"/>
        : <iframe
            key={iframeSrc}
            src={iframeSrc}
            title="Яндекс Карта"
            loading="lazy"
            allowFullScreen
          />}
    </div>
  </div>
}
