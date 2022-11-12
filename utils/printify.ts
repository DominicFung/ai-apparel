interface PrintifyBluePrint {
  blueprintId: number
  printProviders: PrintifyPrintProvider[]
}

interface PrintifyPrintProvider {
  id: number
  minPrice: number
  minPriceSubscription: number
  twoDaysDeliveryEnabled: boolean
  bulkDiscountEnabled: boolean
  averageBusinessDaysInProduction: number
  shipping: any[]
  rankingScore: number
  variants: PrintifyVariant[]
}

interface PrintifyVariant {
  id: number,
  options: number[]
  available: boolean
  availablePrintProviders: string[]
  status: 'in-stock'|'out-of-stock',
  costs: PrintifyPrice[]
}

interface PrintifyPrice {
  blank: number
  fee: number
  result: number // PRICE!
  resultSubscription: number
}

interface PricePerVariant {
  [variantId: number]: number
}

export const  getPrintifyWebPriceListing = async (blueprintId: number, providerId: number) => {
  const url = `https://printify.com/product-catalog-service/api/v1/blueprints/${blueprintId}`
  const response = await(await fetch(url)).json() as PrintifyBluePrint

  let pv = {} as PricePerVariant
  console.log(response.printProviders)

  let p
  for (p of response.printProviders) { if (p.id) break }
  if (p) {
    for (let v of p.variants) {
      pv[v.id] = v.costs[0].result // not sure why costs is an array ..
    }
  }

  return pv
}