import type { NextApiRequest, NextApiResponse } from 'next'
import { got } from 'got'

import secret from '../../../../secret.json'
import config from "../../../../src/aws-exports"
import { markup } from '../../../../utils/utils'

import { Amplify } from "aws-amplify"
import { getPrintifyWebPriceListing } from '../../../../utils/printify'
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
  printprovider: number
  country?: CountryCode
  ip?: string
}

export interface PrintProvider {
  id: number
}

export interface ProviderVarients {
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
  price: number
  currency: string
  firstCost: number
  additionalCost: number
  mockup: {
    options: number[]
    cameras: Camera[]
  }
}

export interface Blueprints {
  _id: string
  templates: [],
  images: [],
  brand: {
    id: number
  }
  render_settings: {
    cameras: Camera[]
  }
  print_provider: InternalPrintProvider
}

interface InternalPrintProvider {
  id: number
  name: string
  launched: boolean
  variants: InternalVariant[]
}

interface InternalVariant {
  id: number
  options: number[] // USE THIS TO SEARCH FOR CAMERA
}

interface Camera {
  id: number
  label: "Front" | "Back"
  position: 'front' | 'back'
  is_default: number
  option_id: number | null
  camera_id: number
}

export interface ProviderLocationVariant extends PrintProvider {
  locationVariant: LocationBasedVariant[]
}

//https://developers.printify.com/#catalog
export default async function handler(req: NextApiRequest,res: NextApiResponse<ProviderLocationVariant>) {
  const userId = req.query.userId as string
  let b = JSON.parse(req.body) as GetProviderCostRequest
  let countryCode: CountryCode = 'US'
  if (b.ip) {
    let geo = await got.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${secret.ipgeolocation.token}&ip=${b.ip}`).json() as GeoData
    countryCode = geo.country_code2
  } else if (b.country) {
    countryCode = b.country
  }
  //console.log(countryCode)
  
  //console.log(`blueprintid: ${b.blueprintId}, printproviderid: ${b.printprovider}`)
  let providerVariants = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers/${b.printprovider}/variants.json`, 
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as ProviderVarients
  
  let costs = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers/${b.printprovider}/shipping.json`,
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as Shipping

  const primary = await getPrintifyWebPriceListing(b.blueprintId, b.printprovider)
  
  let response = [] as LocationBasedVariant[]
  const url = `https://printify.com/api/v1/blueprints/${b.blueprintId}/${b.printprovider}`
  let r = await got.get(url).json() as Blueprints

  for (let variant of providerVariants.variants) {
    for (let profile of costs.profiles) {
      if (profile.variant_ids.includes(variant.id) && profile.countries.includes(countryCode)) {
        //console.log(`VariantId: ${variant.id}: PRICE $${primary[variant.id]/100} USD`)

        let internalvariant
        for (let v of r.print_provider.variants) {
          if (v.id === variant.id) { internalvariant = v; break }
        }
        if (!internalvariant) { res.status(404); return }

        let cameras = [] as Camera[]
        for (let c of r.render_settings.cameras) {
          if (c.option_id === null) { cameras.push(c) }
          else if (internalvariant.options.includes(c.option_id)) { cameras.push(c) }
        }

        response.push(
          markup({
            ...variant,
            price: primary[variant.id],
            firstCost: profile.first_item.cost,
            additionalCost: profile.additional_items.cost,
            currency: profile.first_item.currency,
            mockup: {
              options: internalvariant.options,
              cameras: cameras
            }
          })
        )
        break
      }
    }
  }

  // User is not of a shipping location with a discount. 
  // Use REST_OF_THE_WORLD. We only do this if there is no other option.
  if (response.length === 0) {
    for (let variant of providerVariants.variants) {
      for (let profile of costs.profiles) {
        if (profile.variant_ids.includes(variant.id) && profile.countries.includes("REST_OF_THE_WORLD")) {
          let internalvariant
          for (let v of r.print_provider.variants) {
            if (v.id === variant.id) { internalvariant = v; break }
          }
          if (!internalvariant) { res.status(404); return }

          let cameras = [] as Camera[]
          for (let c of r.render_settings.cameras) {
            if (c.option_id === null) { cameras.push(c) }
            else if (internalvariant.options.includes(c.option_id)) { cameras.push(c) }
          }

          response.push(
            markup({
              ...variant,
              price: primary[variant.id],
              firstCost: profile.first_item.cost,
              additionalCost: profile.additional_items.cost,
              currency: profile.first_item.currency,
              mockup: {
                options: internalvariant.options,
                cameras: cameras
              }
            })
          )
          break
        }
      }
    }
  }

  //console.log(response)
  res.json({id: b.printprovider, locationVariant: response} as ProviderLocationVariant)
}