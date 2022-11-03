import { fromIni } from '@aws-sdk/credential-provider-ini'


import { LocationBasedVariant } from "../pages/api/[userId]/printify/getprice";
import { OrderItem } from "../pages/api/[userId]/printify/order/single";

import cdk from '../cdk-outputs.json'
import config from "../src/aws-exports"

export const validateEmail = (email: string) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export const setIntersepter = (b: boolean) => {
  window.onbeforeunload = function() {
    if (b) {
      return "Data will be lost, are you sure you want to continue?";
    } else {  }
  }
}

type SquareEnv = "sandbox" | "production"
export const SQUARE_ENV: SquareEnv = "sandbox"

export const markup = (u: LocationBasedVariant): LocationBasedVariant => {
  let firstItem = u.firstCost * 1.5
  console.log(`Old Price: $${u.firstCost/100}, New Price: ${firstItem/100}`)

  u.firstCost = firstItem
  u.additionalCost = u.additionalCost * 1.1
  return u
}

export const calculatePrice = (ois: OrderItem[]): number => {
  let price = 0 // in cents
  let usedProvider: string[] = []

  for (let oi of ois) {
    let lookup = oi.varients
    for (let c of oi.choice) {
      for (let l of lookup) {
        if (l.id === c.variantId) {
          if (usedProvider.includes(oi.printProviderId)) {
            price += (l.additionalCost) * c.quantity
          } else {
            price += l.firstCost
            price += (l.additionalCost * (c.quantity - 1))
          }
          break
        }
      }
    }
  }

  return price
}

export const currency = [ 
  "CAD", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN","BAM", "BBD", 
  "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", 
  "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", 
  "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "FOK", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", 
  "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", 
  "IRR", "ISK", "JEP", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KID", "KMF", "KRW", "KWD", 
  "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", 
  "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", 
  "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", 
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", 
  "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TVD", "TWD", 
  "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", 
  "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL" as const
]
export type Currency = typeof currency[number]

export interface Conversion {
  "result": "success" | "error"
  "provider": string
  "documentation": string
  "terms_of_use": string
  "time_last_update_unix": number
  "time_last_update_utc": string
  "time_next_update_unix": number
  "time_next_update_utc": string
  "time_eol_unix": number
  "base_code": Currency,
  "rates": {
    [key: Currency]: number
  }
}

