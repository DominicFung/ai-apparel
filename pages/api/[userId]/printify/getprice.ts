import type { NextApiRequest, NextApiResponse } from 'next'
import { got } from 'got'

import secret from '../../../../secret.json'
import config from "../../../../src/aws-exports"
import { markup } from '../../../../utils/utils'

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

const countryCode = [ 
  "CA", "US", "AX", "AL", "AD", "AM", "AT", "BY", "BA", "BE", "BV", "BG", "HR",
  "CY", "CZ", "DK", "EE", "FI", "FO", "FR", "GE", "GI", "DE", "GR", "GL", "GP",
  "GG", "VA", "IS", "HU", "IE", "IM", "JE", "IT", "LV", "LT", "LI", "LU", "MK", 
  "MT", "MC", "MD", "ME", "NL", "PL", "NO", "PT", "RO", "RE", "SM", "RS", "SK",
  "SI", "SE", "ES", "CH", "TR", "UA", "GB", "XK", "REST_OF_THE_WORLD"] as const
export type CountryCode = typeof countryCode[number]

export interface GetProviderCostRequest {
  blueprintId: number
  country?: CountryCode
  ip?: string
}

export interface PrintProvider {
  id: number
  title: string
}

interface ProviderVarients {
  id: number
  title: string
  variants: Variant[]
}

interface Variant {
  id: number
  title: string
  options: { size: string, color: string }
  placeholders: Placeholder[]
}

interface Placeholder {
  position: string
  height: number
  width: number
}

interface Shipping {
  handling_time: {
    value: 10,
    unit: "day" | "week" | "month"
  },
  profiles: ShippingProfile[]
}

interface ShippingProfile {
  variant_ids: number[],
  first_item: {
      cost: number,
      currency: string
  },
  additional_items: {
      cost: number,
      currency: string
  },
  countries: CountryCode[]
}

//https://ipgeolocation.io/documentation/ip-geolocation-api.html
interface GeoData {
  "ip": string,
  "hostname": string,
  "continent_code": string,
  "continent_name": string,
  "country_code2": CountryCode,
  "country_code3": string,
  "country_name": string,
  "country_capital": string,
  "state_prov": string,
  "district": string,
  "city": string,
  "zipcode": string,
  "latitude": string,
  "longitude": string,
  "is_eu": boolean,
  "calling_code": string,
  "country_tld": string,
  "languages": string,
  "country_flag": string,
  "geoname_id": string,
  "isp": string,
  "connection_type": string,
  "organization": string,
  "asn": string,
  "currency": {
      "code": string,
      "name": string,
      "symbol": string
  },
  "time_zone": {
      "name": string,
      "offset": number,
      "current_time": string,
      "current_time_unix": number,
      "is_dst": boolean,
      "dst_savings": number
  }
}

export interface LocationBasedVariant extends Variant {
  currency: string,
  firstCost: number,
  additionalCost: number,
}

export interface ProviderLocationVariant extends PrintProvider {
  locationVariant: LocationBasedVariant[]
}

//https://developers.printify.com/#catalog
export default async function handler(req: NextApiRequest,res: NextApiResponse<ProviderLocationVariant>) {
  const userId = req.query.userId as string
  let b = JSON.parse(req.body) as GetProviderCostRequest

  let providers = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers.json`, 
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as PrintProvider[]

  let countryCode: CountryCode = 'US'
  if (b.ip) {
    let geo = await got.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${secret.ipgeolocation.token}&ip=${b.ip}`).json() as GeoData
    countryCode = geo.country_code2
  } else if (b.country) {
    countryCode = b.country
  }
  console.log(countryCode)

  /**
   *  How do we determin the lowest cost print provider?
   *  For now we will just choose the first provider
   */
  if (providers.length < 1) res.status(401)
  let provider = providers[0]
  let providerVariants = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers/${provider.id}/variants.json`, 
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as ProviderVarients

  let costs = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers/${provider.id}/shipping.json`,
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as Shipping
  
  let response = [] as LocationBasedVariant[]
  for (let variant of providerVariants.variants) {
    for (let profile of costs.profiles) {
      if (profile.variant_ids.includes(variant.id) && profile.countries.includes(countryCode)) {
        response.push(
          markup({
            ...variant,
            firstCost: profile.first_item.cost,
            additionalCost: profile.additional_items.cost,
            currency: profile.first_item.currency
          })
        )
        break
      }
    }
  }

  res.json({...provider, locationVariant: response} as ProviderLocationVariant)
}