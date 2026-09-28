import {
  activatePriceBook, createPriceBookVersion, listPriceBooks, updateDraftRate,
} from '../server/pricing.mjs'

const [command,...args]=process.argv.slice(2)

function print(value) {
  console.log(JSON.stringify(value,null,2))
}

try {
  if(command==='list'){
    print(listPriceBooks().map(({rates,wasteRules,logisticsRates,...meta})=>meta))
  } else if(command==='clone'){
    const title=args.join(' ').trim()||undefined
    const created=createPriceBookVersion({title})
    print({...created,rates:undefined,wasteRules:undefined,logisticsRates:undefined})
  } else if(command==='set-rate'){
    const [id,code,rate]=args
    if(!id||!code||rate===undefined) throw new Error('Usage: npm run pricing -- set-rate <priceBookId> <itemCode> <rate>')
    const updated=updateDraftRate(id,code,rate)
    print({id:updated.id,code:updated.code,version:updated.version,status:updated.status,itemCode:code,rate:updated.rates[code]})
  } else if(command==='activate'){
    const [id]=args
    if(!id) throw new Error('Usage: npm run pricing -- activate <priceBookId>')
    const activated=activatePriceBook(id)
    print({id:activated.id,code:activated.code,version:activated.version,status:activated.status,activatedAt:activated.activatedAt})
  } else {
    console.log([
      'Bath Dream pricing CLI',
      '',
      'npm run pricing -- list',
      'npm run pricing -- clone [title]',
      'npm run pricing -- set-rate <priceBookId> <itemCode> <rate>',
      'npm run pricing -- activate <priceBookId>',
    ].join('\n'))
  }
} catch (error) {
  console.error(error instanceof Error?error.message:error)
  process.exitCode=1
}
