

export interface OrderItem extends OrderItemRequest {
  orderItemId: string,
  customerId: string,
}

export interface LineItem {
    variantId: number,
    printAreas: {
      front: string
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
  varients: LocationBasedVariant[]
  choice: LineItem[]
}