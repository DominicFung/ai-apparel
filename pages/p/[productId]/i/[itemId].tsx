
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../../../styles/Item.module.scss'

import namedColors from 'color-name-list'

import { Tooltip } from "@material-tailwind/react"

import { GetServiceImageData } from '../../../api/[userId]/replicate/stablediffusion/[serviceId]'
import { Product } from '../../../api/products/[productId]'
import { GetProviderCostRequest, LocationBasedVariant, ProviderLocationVariant } from '../../../api/[userId]/printify/variants'
import Drawer from '../../../../components/drawer'
import Payment from '../../../../components/payment'
import { LineItem, OrderItem, SingleItemRequest } from '../../../api/[userId]/printify/order/single'
import { SRResponse, SuperResolutionRequest } from '../../../api/[userId]/replicate/rudalle-sr/generate'
import { NextPageWithLayout } from '../../../_app'
import DefaultLayout from '../../../../components/layouts/default'
import { MockResponse } from '../../../api/[userId]/mockup/[serviceId]'
import { PrintifyMock } from '../../../api/[userId]/printify/mockup/[itemId]'
import { Upload } from '../../../api/[userId]/printify/mockup/upload'
import { PrintifyImageUploadResponse } from '../../../../utils/testUpload'

import manualColors from '../../../../color.json'

// http://localhost:3000/products/1090/item/5oa7mxuhifdovaddw3irl6esdu
// http://localhost:3000/products/1090/item/ywhspomwuzhzllf7idhwgk3g24

interface Sizes {
  [size: string]: { 
    variantId: number, 
    color: { name: string, hex: string } }[]
}
const _ENV = 'Dev' as 'Dev' | 'Production'
const Item: NextPageWithLayout = () => {
  const router = useRouter()
  const { productId, itemId } = router.query

  const [aiimage, setAIImage] = useState<GetServiceImageData>()
  const [printifyUploaoId, setPrintifyUploaoId] = useState<string>()
  const [product, setProduct] = useState<Product>()
  const [providerVariant, setProviderVariant] = useState<ProviderLocationVariant>()

  const [ mockPreview, setMockPreviews ] = useState<(MockResponse|null)[]>([])
  const [ mockImages, setMockImages ] = useState<(MockResponse|null)[]>([])
  

  //** Belongs to storeItem */
  const [ price, setPrice ] = useState(0)
  const [ currency, setCurrency ] = useState('USD')
  const [ sizes, setSizes ] = useState<Sizes>({}) // Key to menu, if size change, colors change

  const [ pictureIndex, setPicutreIndex] = useState(0)

  const [ quantityText, setQuantityText ] = useState("1")
  const [ quantity, setQuantity ] = useState(1)
  const [ tab, setTab ] = useState(0)

  const [ sizeChoices, setSizeChoices ] = useState<string[]>([])
  const [ colorChoices, setColorChoices ] = useState<number[]>([0])
  const [ customInstructions, setCustomInstructions ] = useState<string[]>([""])

  const [ isUpdateCart, setIsUpdateCart ] = useState(false)

  const [ paymentDrawerOpen, setPaymentDrawerOpen ] = useState(false)
  const [ orderItem, setOrderItem ] = useState<OrderItem>()
  const [ fullImageServiceId, setFullImageServiceId ] = useState<string>()

  /** AI Image */
  const getImage = async (serviceId: string) => {
    let url = `/api/userid/replicate/stablediffusion/${serviceId}`
    let response = await (await fetch(url)).json() as GetServiceImageData
    if (response.status === 'PROCESSING') { 
      setTimeout( getImage, 600+(Math.random()*500), serviceId )
    }
    setAIImage(response)
  }

  const getProduct = async (productId: string) => {
    const url = `/api/products/${productId}`
    const product = await (await fetch(url)).json() as Product
    setProduct(product)
    getCostPerVarient(product)
  }

  const populateFullMockImage = async (p: Product, v: LocationBasedVariant, index: number, printifyUploaoId: string) => {
    const url = `/api/userid/printify/mockup/${itemId}`
    const i = v.mockup.cameras[index]
    const response = await (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        blueprintId: Number(p.productId),
        printProviderId: p.printprovider,
        variantId: v.id,
        cameraId: i.camera_id,
        size: 'full',
        imageId: printifyUploaoId
      } as PrintifyMock)
    })).json() as MockResponse

    let temp = mockImages
    temp[index] = response
    setMockImages([...temp])
  }

  const populateMockImages = async (p: Product, v: LocationBasedVariant, printifyUploaoId: string) => {
    let a = []
    if (v.mockup.cameras.length > 0) {
      let c = v.mockup.cameras
      for (let i of c) {
        const url = `/api/userid/printify/mockup/${itemId}`
        const response = fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            blueprintId: Number(p.productId),
            printProviderId: p.printprovider,
            variantId: v.id,
            cameraId: i.camera_id,
            size: 'preview',
            imageId: printifyUploaoId
          } as PrintifyMock)
        })

        a.push(response)
      }

      Promise.all(a).then( async a => {
        let previews = [], full = []
        for (let i of a) {
          previews.push( await i.json() as MockResponse )
          full.push(null)
        }
        setMockPreviews(previews)
        setMockImages(full)
      })
    }
  }

  const getCostPerVarient = async (product: Product) => {
    if (product.platform === "printify") {
      let geo: {ip: string} | undefined
      if (_ENV === 'Production') {
        let geourl = `https://api.ipify.org?format=json`
        let geo = await (await fetch(geourl)).json() as {ip: string}
        console.log(geo)
      }
      
      let url = `/api/userid/printify/variants`
      let productId =Number(product.productId)
      console.log(productId)

      let body: GetProviderCostRequest
      if (geo) {
        body = {
          blueprintId: productId,
          printprovider: product.printprovider,
          ip: geo.ip
        } as GetProviderCostRequest
      } else {
        body = {
          blueprintId: productId,
          printprovider: product.printprovider,
          country: 'CA'
        } as GetProviderCostRequest
      }
      
      let response = await (await fetch(url, {
        method: "POST",
        body: JSON.stringify(body)
      })).json() as ProviderLocationVariant

      setProviderVariant(response)

      /** 
       * List all variants for user, this will be a size based menu. 
       * Each size must be UNIQUE. We're going to generate a new key structure.*/
      let sizes: Sizes = {}
      for (let v of response.locationVariant) {
        if (!Object.keys(sizes).includes(v.options.size)) {
          sizes[v.options.size] = []
        }

        let c = namedColors.find( color => color.name === v.options.color )
        if (c) sizes[v.options.size].push({variantId: v.id, color: c})
        else if (manualColors[v.options.color])
        sizes[v.options.size].push({variantId: v.id, color: { name: v.options.color, hex: manualColors[v.options.color] }})
        else sizes[v.options.size].push({variantId: v.id, color: { name: v.options.color, hex: "" }})
      }
      setSizes(sizes)

      let iks = Object.keys(sizes)[0]
      setSizeChoices([iks])

      // Some varients dont have prices ....
      // Also, this is the wrong way to do pricing

      for (let variant of response.locationVariant) {
        console.log(`price: ${variant.price}`)
        if (variant.price) {
          setPrice(variant.price + variant.firstCost)
          setCurrency(variant.currency)
          break
        }

      }
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

  useEffect(() => {
    let i = parseInt(quantityText)
    if (i) { 
      setQuantity(i) 
      if (tab >= i) { setTab(i-1) }

      let oldLen = colorChoices.length
      let dif = i - oldLen

      if (dif > 0)
        for (let a=0; a<dif; a++) {
          colorChoices.push(0)
          sizeChoices.push(Object.keys(sizes)[0])
          customInstructions.push("")
        }
      else if (dif < 0)
        for (let a=0; a>dif; a--) {
          colorChoices.pop()
          customInstructions.pop()
        }
      else console.log("No change in i value. OK")

      setColorChoices(colorChoices)
      setSizeChoices(sizeChoices)
      setCustomInstructions(customInstructions)

    } else { console.warn(`quanity is NAN: ${i}`) }
  }, [quantityText])

  const generateHQImage = async () => {
    let url = `/api/userid/replicate/rudalle-sr/generate`
    let response = await (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        stablediffusionId: itemId,
        input: { scale: 8 }
      } as SuperResolutionRequest)
    })).json() as SRResponse

    return response
  }

  const buyNow = async () => {
    let fullImageService = (await generateHQImage())
    setFullImageServiceId(fullImageService.id)

    let dynamicProgramming = {} as { [key: string]: LineItem }
    for (let i=0; i<quantity; i++) {
      const s = sizeChoices[i]
      const c = sizes[s][colorChoices[i]].color.hex
      const vid= sizes[s][colorChoices[i]].variantId

      let key = `${s}::::${c}`
      if (dynamicProgramming[key]) {
        dynamicProgramming[key].quantity += 1
      } else {
        dynamicProgramming[key] = {
          variantId: vid,
          printAreas: { front: fullImageService.s3ImageUrl },
          quantity: 1
        } as LineItem
      }
    }

    let lineItems: LineItem[] = []
    for (let d of Object.keys(dynamicProgramming)) {
      lineItems.push(dynamicProgramming[d])
    }
    
    let orderItem = {
      productId: productId as string,
      printProviderId: providerVariant?.id.toString(),
      varients: providerVariant?.locationVariant,
      choice: lineItems
    } as SingleItemRequest

    let url = `/api/userid/printify/order/single`
    let response = await (await fetch(url, {
      method: "POST",
      body: JSON.stringify(orderItem)
    })).json() as OrderItem

    if (response) {
      console.log(response)
      setOrderItem(response)
      setPaymentDrawerOpen(true)
    } else console.error("ERROR, buy now no response.")
  }

  const putPrintifyImage = async (itemId: string, productId: string, providerId: string) => {
    const url = `/api/userid/printify/mockup/upload`
    let response = await (await fetch(url, {
      method: "POST",
      body: JSON.stringify({ 
        itemId, productId, providerId
      } as Upload)
    })).json() as PrintifyImageUploadResponse
    console.log(response)
    setPrintifyUploaoId(response.id)
  }
  
  useEffect(() => {
    if (productId && itemId) {
      getProduct(productId as string)
      getImage(itemId as string)
    }
  }, [productId, itemId])

  useEffect(() => {
    if (product && itemId) {
      putPrintifyImage(itemId as string, product.productId, String(product.printprovider))
    }
  }, [product, itemId])

  // Generate PREVIEW IMAGES
  useEffect(() => {
    if (product && providerVariant && tab >= 0 && sizes && sizeChoices.length > 0 && colorChoices.length > 0 && printifyUploaoId) {
      const vid = sizes[sizeChoices[tab]][colorChoices[tab]].variantId
      let variant = providerVariant.locationVariant[0]
      for (let v of providerVariant.locationVariant) {
        if (v.id === vid){ variant=v; break }
      }
      populateMockImages(product, variant, printifyUploaoId)
    }
  }, [product, itemId, providerVariant, tab, sizeChoices, colorChoices, sizes, printifyUploaoId])

  // Generate FULL Image
  useEffect(() => {
    if (product && providerVariant && tab >= 0 && sizes && sizeChoices.length > 0 && colorChoices.length > 0 && printifyUploaoId && mockPreview.length > 0) {
      const vid = sizes[sizeChoices[tab]][colorChoices[tab]].variantId
      let variant = providerVariant.locationVariant[0]
      for (let v of providerVariant.locationVariant) {
        if (v.id === vid){ variant=v; break }
      }
      populateFullMockImage(product, variant, pictureIndex, printifyUploaoId)
    }
  }, [product, providerVariant, mockPreview, pictureIndex, tab, sizeChoices, colorChoices, sizes, printifyUploaoId])

  return (<>
    <Drawer header='Payment' isOpen={paymentDrawerOpen} setIsOpen={setPaymentDrawerOpen}>
      <Payment orderItem={orderItem} fullImageServiceId={fullImageServiceId}/>
    </Drawer>
    <div className={`${styles.mainBackground} w-full p-4 pt-32 flex justify-center pb-24`}>
      <div className="container mx-w-2xl">
        <div className="pt-20 pb-20 grid grid-cols-6 w-full gap-8">
          <div className="lg:col-span-4 col-span-6 lg:pl-0 pl-8">
            <div className="grid grid-cols-6 gap-2 h-full">
              <div className="w-full col-span-1">
                <div className="w-full grid grid-flow-row gap-1 justify-end">
                  { 
                  mockPreview.length > 0 ? 
                    mockPreview?.map((v, i) => {
                      return (
                        <div key={i} style={{
                          backgroundImage: `url(${(v ? v.url : "")})`, backgroundColor: "#748DA6",
                          border: pictureIndex == i ? "solid gray 2px" : ""
                        }} onClick={() => { setPicutreIndex(i) }}
                          className="w-20 h-20 bg-cover bg-center transition duration-700 ease-in-out group-hover:opacity-60"
                        />
                      )
                    }) :
                    product?.images?.map((v, i) => {
                        return (
                          <div key={i} style={{
                            backgroundImage: `url(${(product?.images ? product?.images[i].preview.url : "")})`, backgroundColor: "#748DA6",
                            border: pictureIndex == i ? "solid gray 2px" : ""
                          }} onClick={() => { setPicutreIndex(i) }}
                            className="w-20 h-20 bg-cover bg-center transition duration-700 ease-in-out group-hover:opacity-60"
                          />
                        )
                    })}
                </div>
              </div>
              <div className="w-full col-span-5 h-full">
                <div style={{backgroundImage: `url(${ mockImages[pictureIndex]? mockImages[pictureIndex]!.url : (mockPreview[pictureIndex] ? mockPreview[pictureIndex]!.url : "")})`, backgroundColor: "#748DA6"}}
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
              <h2 className="text-4xl text-white">{product?.title}</h2>
              <small className="italic text-xs text-gray-300" style={{fontSize: 10}}>Product id: {productId}</small>

              <div className={`${styles.dollarAmount} py-4`}>
                <b>${(price/100).toFixed(2)}</b> {currency}
              </div>

              <p className={`${styles.description} m-2 p-4 rounded`}>{product?.description}</p>
              
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
                    Sizes:
                  </label>
                  <div className="mb-4 pb-4">
                    {
                      Object.keys(sizes).map((v, i) => {
                        return (
                          <span key={i} className={`${styles.addtocartButton} rounded p-1 px-2 mr-1 inline-flex items-center justify-center bg-gray-300 hover:cursor-pointer border-2 my-1 hover:border-white`}
                            style={{borderColor: sizeChoices[tab] === v ? "white" : "", color: sizeChoices[tab] === v ? "white" : "" }}
                            onClick={() => { 
                              sizeChoices[tab] = v
                              setSizeChoices([...sizeChoices])
                            }}>
                              {v}
                          </span>
                        )
                      })
                    }
                  </div>
                </div>

                <div className="flex">
                  <label className="block text-gray-50 text-sm font-bold mb-1 mr-5 pt-1.5" htmlFor="username">
                    Colour:
                  </label>
                  <div className="mb-4 pb-4">
                    {
                      sizes[sizeChoices[tab]]?.map((v, i) => {
                        return (
                          <Tooltip content={<span className='bg-gray-700 p-2 rounded'>{v.color.name}</span>}>
                            <span key={i}
                              className="rounded-full h-8 w-8 mr-1 inline-flex items-center justify-center border-2 border-white hover:border-gray-200"
                              style={{backgroundColor: v.color.hex ||"", borderColor: colorChoices[tab]===i?v.color.hex||"":""}}  
                              onClick={() => { 
                                colorChoices[tab] = i
                                setColorChoices([...colorChoices])
                              }}>
                              <span className={`rounded-full h-7 w-7 inline-flex items-center justify-center hover:border-gray-200 hover:border-2
                                ${ colorChoices[tab]===i ?  "border-2 border-white" : ""}`} />
                            </span>
                          </Tooltip>
                        )
                      })
                    }
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-50 text-sm font-bold mb-2" htmlFor="username">
                    Notes
                  </label>
                  <textarea rows={5}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Instructions" 
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
                        if (product) {
                          //addToCart( storeItem, colorChoices, customTexts, customInstructions )
                        } else console.log("NO STORE ITEM!")
                      }}
                    >
                      {isUpdateCart ? "Update Cart":"Add to cart"}{quantity === 1 ? "": ` (${quantity})`}
                    </button>
                </div>
                <div className="w-full flex justify-center mb-4">
                  <button className={`${styles.buynowButton} text-gray-600 hover:text-gray-800 hover:bg-darkgreen hover:font-bold p-2 pr-8 pl-8 rounded`}
                    disabled={ !product || !providerVariant || !aiimage }
                    onClick={(e) => {
                      e.preventDefault()
                      if (product) {
                        //addToCart( storeItem, colorChoices, customTexts, customInstructions )
                        //history.push('/cart')
                        buyNow()
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

Item.getLayout = (children) => {
  return <DefaultLayout>{children}</DefaultLayout>
}
export default Item