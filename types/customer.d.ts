import { GeoData } from "./geodata"

export interface CustomerRequest {
  ip: string
}

export interface CustomerResponse {
  token: string,
  currency: string,
  exchangeRate: number
}

export interface Customer extends CustomerRequest {
  customerId: string
  lastAccess: number
  geo: GeoData
}