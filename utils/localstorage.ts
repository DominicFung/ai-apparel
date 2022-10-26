import { GelatoOrder } from '../pages/api/[userId]/gelato/order'

export const storeItems = (productId: string, obj: GelatoOrder[]) => {
  const temp = localStorage.getItem('cart')
  let old: GelatoOrder[] = []
  let current: GelatoOrder[] = []

  if (temp && temp !== "") {
    old = JSON.parse(temp) as GelatoOrder[]
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

export const getItems = (productId: string): GelatoOrder[] => {
  const temp = localStorage.getItem('cart')
  let orderItems: GelatoOrder[] = []
  if (temp && temp !== "") {
    const cart = JSON.parse(temp) as GelatoOrder[]
    for (let item of cart) {
      if (item.productId == productId) {
        orderItems.push(item)
      }
    }
  }
  return orderItems
}

export const getAllItems = (): GelatoOrder[] => {
  const temp = localStorage.getItem('cart')
  let orderItems: GelatoOrder[] = []
  if (temp && temp !== "") {
    orderItems = JSON.parse(temp) as GelatoOrder[]
  }
  return orderItems
}

export const getItemCount = (): number => {
  const temp = localStorage.getItem('cart')
  let orderItems: GelatoOrder[] = []
  if (temp && temp !== "") {
    orderItems = JSON.parse(temp) as GelatoOrder[]
  }

  console.log(orderItems)
  return orderItems.length
}