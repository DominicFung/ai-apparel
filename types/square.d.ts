
/** Defined by me. Payment */
export interface PaymentRequest {
  customerId: string
  sourceId: TokenResult
  orders: [string]
  addressTo: AddressTo
}

// TrackingOrder
export interface PaymentResponse {
  orderId: string,
  printifyId: string,
  squareId: string
}

export interface AddressTo {
  firstname: string
  lastname: string
  email: string
  phone: string
  country: CountryCode
  region: string
  address1: string
  address2: string
  city: string
  zip: string
}
