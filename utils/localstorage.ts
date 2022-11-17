import { OrderItem } from "../pages/api/[userId]/printify/order/single"

export const storeItems = (productId: string, obj: any[]) => {
  const temp = localStorage.getItem('cart')
  let old: OrderItem[] = []
  let current: OrderItem[] = []

  if (temp && temp !== "") {
    old = JSON.parse(temp) as OrderItem[]
    console.log(`localstorage.storeItems(): old = ${JSON.stringify(old)}`)
    
    // ** Remove all current that contains our productId
    for (let oldItem of old) {
      if (oldItem.productId != productId) { current.push(oldItem) }
    }
  } else { console.log(`localstorage.storeItems(): temp is empty`) }

  current = current.concat(obj)
  console.log(current)
  document.body.dispatchEvent( new CustomEvent('cartUpdate', {
    detail: { cartcount: current.length }
  }))
  localStorage.setItem('cart', JSON.stringify(current))
}

export const clearItems = () => {
  document.body.dispatchEvent( new CustomEvent('cartUpdate', {
    detail: { cartcount: 0 }
  }))
  localStorage.setItem('cart', "")
}

export const getItems = (productId: string): OrderItem[] => {
  const temp = localStorage.getItem('cart')
  let orderItems: OrderItem[] = []
  if (temp && temp !== "") {
    const cart = JSON.parse(temp) as OrderItem[]
    for (let item of cart) {
      if (item.productId == productId) {
        orderItems.push(item)
      }
    }
  }
  return orderItems
}

export const getAllItems = (): OrderItem[] => {
  const temp = localStorage.getItem('cart')
  let orderItems: OrderItem[] = []
  if (temp && temp !== "") {
    orderItems = JSON.parse(temp) as OrderItem[]
  }
  return orderItems
}

export const getItemCount = (): number => {
  const temp = localStorage.getItem('cart')
  let orderItems: OrderItem[] = []
  if (temp && temp !== "") {
    orderItems = JSON.parse(temp) as OrderItem[]
  }

  console.log(orderItems)
  return orderItems.length
}