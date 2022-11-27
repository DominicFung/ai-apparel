import { GeoData } from "./geodata"

export interface CustomerRequest {
  ip: string
}

export interface CustomerResponse {
  token: string
}

export interface Customer extends CustomerRequest {
  customerId: string
  lastAccess: number
  geo: GeoData
}