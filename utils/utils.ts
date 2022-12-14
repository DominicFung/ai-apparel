import { OrderItem } from "../types/order";
import { LocationBasedVariant } from "../types/printify";

export const BASEMARKUP = 1.9

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
export const SQUARE_ENV: SquareEnv = process.env.NODE_ENV === "production" ? "production" : "sandbox"

export const markup = (u: LocationBasedVariant, markup?: number | undefined): LocationBasedVariant => {
  u.price = u.price * (markup || BASEMARKUP )
  u.firstCost = u.firstCost * 1
  u.additionalCost = u.additionalCost * 1
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
          price += l.price * c.quantity
          
          // FREE SHIPPING FOR NOW!!!
          // if (usedProvider.includes(oi.printProviderId)) {
          //   price += (l.additionalCost) * c.quantity
          // } else {
          //   price += l.firstCost
          //   price += (l.additionalCost * (c.quantity - 1))
          // }
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

export const isBright = (color: string): boolean => {
  const hex = color.replace('#', '');
  const c_r = parseInt(hex.substring(0, 0 + 2), 16);
  const c_g = parseInt(hex.substring(2, 2 + 2), 16);
  const c_b = parseInt(hex.substring(4, 4 + 2), 16);
  const brightness = ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
  return brightness > 155;
}