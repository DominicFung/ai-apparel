import { LocationBasedVariant } from './printify'

export interface OrderItem extends OrderItemRequest {
  orderItemId: string,
  customerId: string,
  environment: "development" | "production" | "test"
}

export interface LineItem {
    variantId: number,
    printAreas: {
      front?: string | { src: string, scale: number, x: number, y: number, angle: number }[]
      back?: string | { src: string, scale: number, x: number, y: number, angle: number }[]
    },
    quantity: number
}

interface Order {
  customerId: string
  orderId: string
  orderItemIds: string[]
  printify: {
    request: PrintifyOrder,
    response: PrintifyOrderResponse
  }
  square: {
    request: CreatePaymentRequest,
    response: CreatePaymentResponse
  }
}

/** Requests / Response - defined by me */
export interface OrderItemRequest {
  printProviderId: string
  productId: string
  itemId: string
  varients: LocationBasedVariant[]
  choice: LineItem[]
}