
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import type { NextPage } from 'next'
import Image from 'next/image'
import styles from '../../../../styles/Item.module.scss'

import { v4 } from 'uuid'

import { storeItems } from '../../../../utils/localstorage'
import { GetServiceImageData } from '../../../api/[userId]/replicate/stablediffusion/[serviceId]'
import { Product } from '../../../api/products/[productId]'
import { GelatoOrder } from '../../../api/[userId]/gelato/order'
import { GetProviderCostRequest, UserVariant } from '../../../api/[userId]/printify/getprice'
import { MARKUP_MULTIPLIER } from '../../../api/[userId]/printify/createProduct'

// http://localhost:3000/products/1090/item/5oa7mxuhifdovaddw3irl6esdu
const TAILWIND_SIZE = {
  '2xl': 1536,
  'xl': 1280,
  'lg': 1024,
  'md': 768,
  'sm': 640
}


const Item: NextPage = () => {
  const router = useRouter()
  const { productId, itemId } = router.query

  const [image, setImage] = useState<GetServiceImageData>()
  const [storeItem, setStoreItem] = useState<Product>()

  const [ pictureIndex, setPicutreIndex] = useState(0)
  const [ focusPictureUrl, setFocusPictureUrl ] = useState("")

  const [ quantityText, setQuantityText ] = useState("1")
  const [ quantity, setQuantity ] = useState(1)
  const [ tab, setTab ] = useState(0)

  const [ colorChoices, setColorChoices ] = useState<number[]>([0])
  const [ customTexts, setCustomTexts ] = useState<string[]>([""])
  const [ customInstructions, setCustomInstructions ] = useState<string[]>([""])

  const [ isUpdateCart, setIsUpdateCart ] = useState(false)
  const [ twSize, setTwSize ] = useState<'xl'|'2xl'|'lg'|'md'|'sm'|"xs">('xl')

  const handleResize = () => {
    if (window.innerWidth >= TAILWIND_SIZE['2xl']) { setTwSize('2xl'); console.log('2xl'); return }
    if (window.innerWidth >= TAILWIND_SIZE['xl']) { setTwSize('xl'); console.log('xl'); return }
    if (window.innerWidth >= TAILWIND_SIZE['lg']) { setTwSize('lg'); console.log('lg'); return }
    if (window.innerWidth >= TAILWIND_SIZE['md']) { setTwSize('md'); console.log('md'); return }
    if (window.innerWidth >= TAILWIND_SIZE['sm']) { setTwSize('sm'); console.log('sm'); return }
    setTwSize('xs'); return
  }

  /** AI Image */
  const getImage = async (serviceId: string) => {
    let url = `/api/userid/replicate/stablediffusion/${serviceId}`
    let response = await (await fetch(url)).json() as GetServiceImageData
    if (response.status === 'PROCESSING') { 
      setTimeout( getImage, 600+(Math.random()*500), serviceId )
    }
    setImage(response)
  }

  const getProduct = async (productId: string) => {
    let url = `/api/products/${productId}`
    let response = await (await fetch(url)).json() as Product
    setStoreItem(response)
    getCostPerVarient(response)
  }

  const getCostPerVarient = async (product: Product) => {
    if (product.platform === "printify") {
      let geourl = `https://api.ipify.org?format=json`
      let geo = await (await fetch(geourl)).json() as {ip: string}
      console.log(geo)

      let url = `/api/userId/printify/getprice`
      let productId =Number(product.productId)
      console.log(productId)
      let response = await (await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          blueprintId: productId,
          ip: geo.ip
        } as GetProviderCostRequest)
      })).json() as UserVariant[]

      /** 
       * For now we will assume first varient is the only variant of the product.
       * variant should mean size and/or colour
      */
      product.price = response[0].firstItem.cost
      console.log(product.price)
      setStoreItem({...product})
    }
    
  }

  const incrementQuantity = () => {
    console.log("increment quantity")
    let i = parseInt(quantityText)
    if (i >= 1) { setQuantityText(""+(i+1)) }
    else { console.warn(`quanity is NAN: ${i}`) }
  }

  const decrementQuantity = () => {
    console.log("decrement quantity")
    let i = parseInt(quantityText)
    if (i > 1) { setQuantityText(""+(i-1)) }
    else { console.warn(`quanity is NAN: ${i}`) }
  }

  const addToCart = (si: Product, cc: number[], ct: string[], ai: string[]) => {
    let cartItems: GelatoOrder[] = []
    for (let i=0; i<colorChoices.length; i++) {
      cartItems.push({
        orderId: `aiapparel-${v4()}`,
        productId: productId,
        purchasePrice: si.price,
        color: si.colors[cc[i]],
        text: ct[i],
        additionalInstructions: ai[i],
      } as GelatoOrder)
    }

    console.log(`storing cart items: ${JSON.stringify(cartItems)}`)
    setIsUpdateCart(true)
    storeItems(si.productId, cartItems)
  }
  
  useEffect(() => {
    if (productId && itemId) {
      getProduct(productId as string)
      getImage(itemId as string)
    }
  }, [productId, itemId])

  useEffect(() => {
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])


  return (<>
    <div className={`${styles.mainBackground} w-full p-4 pt-32 flex justify-center pb-24`}>
      <div className="container mx-w-2xl">
        <div className="pt-20 pb-20 grid grid-cols-6 w-full gap-8">
          <div className="lg:col-span-4 col-span-6 lg:pl-0 pl-8" style={{
            height: ['xs','sm', 'md'].includes(twSize) ? 500 : ""
          }}>
            <div className="grid grid-cols-6 gap-2 h-full">
              <div className="w-full col-span-1">
                <div className="w-full grid grid-flow-row gap-1 justify-end">
                  { storeItem?.images?.map((v, i) => {
                      return (
                        <div key={i} style={{
                          backgroundImage: `url(${storeItem?.images ? storeItem?.images[i].preview : ""})`, backgroundColor: "#748DA6",
                          border: pictureIndex == i ? "solid gray 2px" : ""
                        }} onClick={() => { setPicutreIndex(i) }}
                          className="w-20 h-20 bg-cover bg-center transition duration-700 ease-in-out group-hover:opacity-60"
                        />
                      )
                  })}
                </div>
              </div>
              <div className="w-full col-span-5 h-full">
                { image && image.url && <div className={styles.aiImage}>
                  <span style={{
                    position: "relative", 
                    top: twSize === 'xs' ? "" : storeItem?.images[pictureIndex].location[twSize].top, 
                    left: twSize === 'xs' ? "" : storeItem?.images[pictureIndex].location[twSize].left, 
                  }}>
                    <Image src={image.url} alt={"ai image"} width={256} height={256} objectFit={'contain'}/>
                  </span>
                </div> }
                <div style={{backgroundImage: `url(${focusPictureUrl}), url(${storeItem?.images ? storeItem?.images[pictureIndex].full : ""})`, backgroundColor: "#748DA6"}}
                  className="w-full h-full bg-cover bg-center transition duration-700 ease-in-out group-hover:opacity-60"
                />
                
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 col-span-6 divide-y divide-gray-300">
            <div className="">
              <div>
                <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-gray-100 bg-gray-300 rounded-full">#cool</span>
                <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-gray-100 bg-gray-300 rounded-full">#fancy</span>
              </div>
              <h2 className="text-4xl text-white">{storeItem?.title}</h2>
              <small className="italic text-xs text-gray-300" style={{fontSize: 10}}>Product id: {productId}</small>

              <div className={`${styles.dollarAmount} py-4`}>
                <b>${storeItem?.price.toFixed(2)}</b> {storeItem?.currency}
              </div>

              <p className={`${styles.description} m-2 p-4 rounded`}>{storeItem?.description}</p>
              
              <div className="flex flex-row pt-4">
                  <label htmlFor="custom-input-number" className="w-full text-gray-50 text-sm font-semibold pt-3.5">Quantity:</label>
                
                <div className="custom-number-input h-10 w-20">
                  <div className="flex flex-row h-10 w-full rounded-lg relative bg-transparent mt-1">
                    <button data-action="decrement" className=" bg-gray-300 text-gray-600 hover:text-gray-50 hover:bg-gray-400 h-full w-20 rounded-l cursor-pointer outline-none"
                      onClick={decrementQuantity}
                    >
                      <span className="m-auto text-2xl font-thin">−</span>
                    </button>
                    <input type="text" className="focus:outline-none text-center w-full bg-gray-300 font-semibold text-md hover:text-black focus:text-black  md:text-basecursor-default flex items-center text-gray-700  outline-none" name="custom-input-number" 
                      value={quantityText} onChange={(e) => { setQuantityText(e.target.value) }} />
                    <button data-action="increment" className="bg-gray-300 text-gray-600 hover:text-gray-50 hover:bg-gray-400 h-full w-20 rounded-r cursor-pointer"
                      onClick={incrementQuantity}
                    >
                      <span className="m-auto text-2xl font-thin">+</span>
                    </button>
                  </div>
                </div>
              </div>
              { quantity === 1 ? <div className="h-4" /> :
                <div className="w-full mx-auto mt-4 rounded flex">
                  <label className="pt-4">Item:</label>
                  <ul id="tabs" className="inline-flex w-full px-1 pt-2 ">
                    { colorChoices.map((v, i) => {
                      if (i === tab)
                        return (
                          <li key={i} className="px-4 py-2 -mb-px font-semibold text-gray-800 border-b-2 border-blue-400 rounded-t opacity-50">
                            <button onClick={() => { setTab(i) }}>{i+1}</button>
                          </li>)
                      else
                        return (
                          <li key={i} className="px-4 py-2 font-semibold text-gray-800 rounded-t opacity-50">
                            <button onClick={() => { setTab(i) }}>{i+1}</button>
                          </li>)
                    })}
                  </ul>
                </div>
              }
            </div>
            
            <div className="w-full p-2">
              <div className={`rounded pt-2`}>
                <div className="flex">
                  <label className="block text-gray-50 text-sm font-bold mb-1 mr-5 pt-1.5" htmlFor="username">
                    Colour:
                  </label>
                  <div className="mb-4 pb-4">
                    {
                      storeItem?.colors.map((v, i) => {
                        return (
                          <span key={i}
                            className="rounded-full h-8 w-8 mr-1 inline-flex items-center justify-center border-2 border-white hover:border-gray-200"
                            style={{backgroundColor: v||"", borderColor: colorChoices[tab]===i?v||"":""}}  
                            onClick={() => { 
                              colorChoices[tab] = i
                              setColorChoices([...colorChoices])
                            }}>
                            <span className={`rounded-full h-7 w-7 inline-flex items-center justify-center hover:border-gray-200 hover:border-2
                              ${ colorChoices[tab]===i ?  "border-2 border-white" : ""}`} />
                          </span>
                        )
                      })
                    }
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-50 text-sm font-bold mb-2" htmlFor="username">
                    Custom Text
                  </label>
                  <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-50 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Text" 
                    value={customTexts[tab] || ""} onChange={(e) => {
                      customTexts[tab] = e.target.value
                      setCustomTexts([...customTexts])
                    }}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-50 text-sm font-bold mb-2" htmlFor="username">
                    Additional instructions
                  </label>
                  <textarea rows={5}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-50 leading-tight focus:outline-none focus:shadow-outline" placeholder="Instructions" 
                    value={customInstructions[tab]} onChange={(e) => {
                      customInstructions[tab] = e.target.value
                      setCustomInstructions([...customInstructions])
                    }}
                  />
                </div>

                <div className="w-full flex justify-center mb-4">
                    <button className={`${styles.addtocartButton} bg-gray-300 hover:bg-gray-400 p-2 pr-8 pl-8 rounded`}
                      onClick={(e) => { 
                        e.preventDefault()
                        if (storeItem) {
                          addToCart( storeItem, colorChoices, customTexts, customInstructions )
                        } else console.log("NO STORE ITEM!")
                      }}
                    >
                      {isUpdateCart ? "Update Cart":"Add to cart"}{quantity === 1 ? "": ` (${quantity})`}
                    </button>
                </div>
                <div className="w-full flex justify-center mb-4">
                  <button className={`${styles.buynowButton} text-gray-600 hover:text-gray-300 hover:bg-darkgreen hover:font-bold p-2 pr-8 pl-8 rounded`}
                    onClick={(e) => {
                      e.preventDefault()
                      if (storeItem) {
                        addToCart( storeItem, colorChoices, customTexts, customInstructions )
                        //history.push('/cart')
                      } else console.log("NO STORE ITEM!")
                    }}
                  >
                    Buy Now!
                  </button>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </>
  )
}

export default Item