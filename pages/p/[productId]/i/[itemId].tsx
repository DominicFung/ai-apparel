
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../../../styles/Item.module.scss'
import { animateScroll } from 'react-scroll'

import namedColors from 'color-name-list'

import { Tooltip } from "@material-tailwind/react"

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import Drawer from '../../../../components/drawer'
import Payment from '../../../../components/payment'

import { NextPageWithLayout } from '../../../_app'
import DefaultLayout from '../../../../components/layouts/default'

import manualColors from '../../../../color.json'
import Head from 'next/head'

import { AIImageResponse, SuperResolutionRequest, SuperResolutionResponse } from '../../../../types/replicate'
import { Product } from '../../../../types/product'
import { LocationBasedVariant, MockUploadToPrintifyRequest, MockUploadToPrintifyResponse, PrintifyMockRequest, PrintifyMockResponse, Variant, VariantRequest, VariantResponse } from '../../../../types/printify'
import { LineItem, OrderItem, OrderItemRequest } from '../../../../types/order'
import { isBright } from '../../../../utils/utils'
import ThankYouPopup from '../../../../components/popup/thankyou'
import { PaymentResponse } from '../../../../types/square'
import { EyeSlashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid'
import ItemNotFound from '../../../../components/popup/itemnotfound'
import PrivatePopup from '../../../../components/popup/private'

// http://localhost:3000/products/1090/item/5oa7mxuhifdovaddw3irl6esdu
// http://localhost:3000/products/1090/item/ywhspomwuzhzllf7idhwgk3g24

interface IVariant {
  variantId: number,
  color: { name: string, hex: string, price: number | null } 
}

interface Sizes {
  [size: string]: {
    disabled: boolean
    variant: IVariant[]
  }
}

const colorNameToHex = (color: string): string => {
  let c = namedColors.find( c => c.name === color )
  if (c) return c.hex
  else if ( manualColors[color] ) return manualColors[color]
  else return ""
}

const Item: NextPageWithLayout = (props) => {
  const router = useRouter()
  const { productId, itemId } = router.query

  const [aiimage, setAIImage] = useState<AIImageResponse>()
  const [product, setProduct] = useState<Product>()
  const [printifyUpload, setPrintifyUpload] = useState<MockUploadToPrintifyResponse>()
  const [providerVariant, setProviderVariant] = useState<VariantResponse>()

  const [ mockPreview, setMockPreviews ] = useState<(PrintifyMockResponse|null)[]>([])
  const [ mockImages, setMockImages ] = useState<(PrintifyMockResponse|null)[]>([])
  
  //** Belongs to storeItem */
  const [ price, setPrice ] = useState(0)
  const [ totalPrice, setTotalPrice ] = useState(0)
  const [ currency, setCurrency ] = useState('USD')
  const [ sizes, setSizes ] = useState<Sizes>({}) // Key to menu, if size change, colors change

  const [ pictureIndex, setPicutreIndex] = useState(0)

  const [ quantityText, setQuantityText ] = useState("1")
  const [ quantity, setQuantity ] = useState(1)
  const [ tab, setTab ] = useState(0)

  const [ sizeChoices, setSizeChoices ] = useState<string[]>([])
  const [ colorChoices, setColorChoices ] = useState<number[]>([0])
  const [ customInstructions, setCustomInstructions ] = useState<string[]>([""])

  const [ paymentDrawerOpen, setPaymentDrawerOpen ] = useState(false)
  const [ orderItem, setOrderItem ] = useState<OrderItem>()
  const [ fullImageServiceId, setFullImageServiceId ] = useState<string>()

  const [ paymentResponse, setPaymentResponse ] = useState<PaymentResponse>()
  const [ thankyouOpen, setThankyouOpen ] = useState(false)

  // if the item is private
  const [ showPrivateWarning, setShowPrivateWarning ] = useState(false)
  const [ imageNotFound, setImageNotFound ] = useState<boolean>()
  const [ imageIsPrivate, setImageIsPrivate ] = useState("")


  /** AI Image */
  const getImage = async (serviceId: string) => {
    let url = `/api/replicate/stablediffusion/${serviceId}`
    let r = await fetch(url)

    console.log('HERE')
    console.log(r.status)
    if (r.status === 404 || r.status === 401) { setImageNotFound(true) }
    else if (r.status === 403) { 
      setImageNotFound(false)
      const response = await (r).json() as string
      setImageIsPrivate(response) 
    } else {
      setImageNotFound(false)
      const response = await (r).json() as AIImageResponse
      if (response.private) { setShowPrivateWarning(true) }
      if (response.status === 'PROCESSING') { 
        setTimeout( getImage, 600+(Math.random()*500), serviceId )
      }
      setAIImage(response)
    }
  }

  const getProduct = async (productId: string) => {
    const url = `/api/products/${productId}`
    const product = await (await fetch(url)).json() as Product
    setProduct(product)
    getCostPerVarient(product)
  }

  const populateFullMockImage = async (p: Product, v: LocationBasedVariant, index: number, pu: MockUploadToPrintifyResponse) => {
    const url = `/api/printify/mockup/${itemId}`
    const i = v.mockup.cameras[index]
    const colorName = colorNameToHex(v.options.color)

    const response = await (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        blueprintId: Number(p.productId),
        printProviderId: p.printprovider,
        variantId: v.id,
        cameraId: i.camera_id,
        size: 'full',
        images: pu.images,
        baseColorHex: colorName
      } as PrintifyMockRequest)
    })).json() as PrintifyMockResponse

    let temp = mockImages
    temp[index] = response
    setMockImages([...temp])
  }

  const populateMockImages = async (p: Product, v: LocationBasedVariant, pu: MockUploadToPrintifyResponse) => {
    let a = []
    if (v.mockup.cameras.length > 0) {
      const colorName = colorNameToHex(v.options.color)
      let c = v.mockup.cameras
      for (let i of c) {
        const url = `/api/printify/mockup/${itemId}`
        const response = fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            blueprintId: Number(p.productId),
            printProviderId: p.printprovider,
            variantId: v.id,
            cameraId: i.camera_id,
            size: 'preview',
            images: pu.images,
            baseColorHex: colorName
          } as PrintifyMockRequest)
        })
        a.push(response)
      }

      Promise.all(a).then( async a => {
        let previews = [], full = []
        for (let i of a) {
          previews.push( await i.json() as PrintifyMockResponse )
          full.push(null)
        }
        setMockPreviews(previews)
        setMockImages(full)
      })
    }
  }

  const getCostPerVarient = async (product: Product) => {
    if (product.platform === "printify") {
      
      let url = `/api/printify/variants`
      let productId =Number(product.productId)
      console.log(productId)

      const body = {
        blueprintId: productId,
        printprovider: product.printprovider
      } as VariantRequest
      
      const r = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body)
      })
      if (r.status >= 400) { return }
      let response = await r.json() as VariantResponse

      setProviderVariant(response)

      /** 
       * List all variants for user, this will be a size based menu. 
       * Each size must be UNIQUE. We're going to generate a new key structure.*/
      let sizes: Sizes = {}

      for (let v of response.locationVariant) {
        if (!Object.keys(sizes).includes(v.options.size)) {
          sizes[v.options.size] = { variant: [], disabled: true }
        }

        let c = namedColors.find( color => color.name === v.options.color )
        if (v.price) sizes[v.options.size].disabled = false
        if (c) {
          sizes[v.options.size].variant.push({variantId: v.id, color: { ...c, price: v.price } })
        } else if (manualColors[v.options.color]) {
          sizes[v.options.size].variant.push({variantId: v.id, color: { name: v.options.color, hex: manualColors[v.options.color], price: v.price }})
        } else sizes[v.options.size].variant.push({variantId: v.id, color: { name: v.options.color, hex: "", price: v.price }})
      }

      setSizes(sizes)
      let keys = Object.keys(sizes)
      let iks = keys[0]

      for (let i=0; i<keys.length; i++) {
        if (!sizes[keys[i]].disabled) { iks = keys[i]; break }
      }

      console.log(sizes)
      console.log(iks)
      setSizeChoices([iks])
    }
  }

  const incrementQuantity = () => {
    console.log("increment quantity")
    let i = parseInt(quantityText)
    if (i >= 1 && i<=7) { 
      setQuantityText(""+(i+1))
      colorChoices.push(0)
      sizeChoices.push(Object.keys(sizes)[0])
      customInstructions.push("")

      setQuantity(i+1)
      setColorChoices(colorChoices)
      setSizeChoices(sizeChoices)
      setCustomInstructions(customInstructions)
      setTab(i)
    }
    else { console.warn(`quanity is NAN: ${i}`) }
  }

  const decrementQuantity = () => {
    console.log("decrement quantity")
    let j = parseInt(quantityText)
    if (j > 1) { 
      const i = j-1
      setQuantityText(""+(i)) 
      
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

    }
    else { console.warn(`quanity is NAN: ${j}`) }
  }

  const generateHQImage = async () => {
    let url = `/api/replicate/rudalle-sr/generate`
    let response = await (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        stablediffusionId: itemId,
        input: { scale: 8 }
      } as SuperResolutionRequest)
    })).json() as SuperResolutionResponse

    return response
  }

  const buyNow = async () => {
    let fullImageService = (await generateHQImage())
    setFullImageServiceId(fullImageService.id)
    
    let dynamicProgramming = {} as { [key: string]: LineItem }
    for (let i=0; i<quantity; i++) {
      const s = sizeChoices[i]
      console.log(sizes[s])
      const c =   (sizes[s].variant[colorChoices[i]] as IVariant).color.hex
      const vid = (sizes[s].variant[colorChoices[i]] as IVariant).variantId

      let printAreas = { 
        front: fullImageService.s3ImageUrl 
      } as { front?: string, back?: string }

      let key = `${s}::::${c}`
      if (dynamicProgramming[key]) {
        dynamicProgramming[key].notes[dynamicProgramming[key].quantity] = customInstructions[i]
        dynamicProgramming[key].quantity += 1
      } else {
        if (printifyUpload) {
          const shirtIsBright = isBright(c)
    
          for (let p of printifyUpload.images) {
            if (p.position === "back" && p.color === "black" && shirtIsBright) {
              printAreas.back = p.url; break
            } else if (p.position === "back" && p.color === "white" && !shirtIsBright) {
              printAreas.back = p.url; break
            }
          }
        }

        dynamicProgramming[key] = {
          variantId: vid,
          printAreas,
          quantity: 1,
          notes: [customInstructions[i]]
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
      choice: lineItems,
      itemId: itemId
    } as OrderItemRequest

    let url = `/api/printify/order/single`
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
    const url = `/api/printify/mockup/upload`
    let response = await (await fetch(url, {
      method: "POST",
      body: JSON.stringify({ 
        itemId, productId, providerId
      } as MockUploadToPrintifyRequest)
    })).json() as MockUploadToPrintifyResponse
    console.log(response)
    
    setPrintifyUpload(response)
  }
  
  useEffect(() => {
    if (productId && itemId) {
      animateScroll.scrollToTop()
      getProduct(productId as string)
      getImage(itemId as string)
    }
  }, [productId, itemId])

  useEffect(() => {
    if (product && itemId && imageNotFound === false) {
      putPrintifyImage(itemId as string, product.productId, String(product.printprovider))
    }
  }, [product, itemId, imageNotFound])

  // Generate PREVIEW IMAGES
  useEffect(() => {
    if (product && providerVariant && tab >= 0 && sizes && sizeChoices.length > 0 && colorChoices.length > 0 && printifyUpload) {
      const vid = sizes[sizeChoices[tab]].variant[colorChoices[tab]].variantId
      let variant = providerVariant.locationVariant[0]
      for (let v of providerVariant.locationVariant) {
        if (v.id === vid){ variant=v; break }
      }
      populateMockImages(product, variant, printifyUpload)
    }
  }, [product, itemId, providerVariant, tab, sizeChoices, colorChoices, sizes, printifyUpload])

  // Generate FULL Image
  useEffect(() => {
    if (product && providerVariant && tab >= 0 && sizes && sizeChoices.length > 0 && colorChoices.length > 0 && printifyUpload && mockPreview.length > 0) {
      const vid = sizes[sizeChoices[tab]].variant[colorChoices[tab]].variantId
      let variant = providerVariant.locationVariant[0]
      for (let v of providerVariant.locationVariant) {
        if (v.id === vid){ variant=v; break }
      }
      populateFullMockImage(product, variant, pictureIndex, printifyUpload)
    }
  }, [product, providerVariant, mockPreview, pictureIndex, tab, sizeChoices, colorChoices, sizes, printifyUpload])

  useEffect(() => {
    // SETTING TOTAL PRICE
    if (sizeChoices.length > 0 && colorChoices.length > 0 && colorChoices.length === sizeChoices.length && props.customer && product) {
      console.log(product)
      console.log(props.customer.exchangeRate)
      let price = 0
      for (let i in sizeChoices) {
        const s = sizes[sizeChoices[i]]
        console.log(s)
        price += s.variant[colorChoices[i]].color.price! * props.customer.exchangeRate
      }
      setTotalPrice(price)
    }

    if (sizeChoices.length > 0 && colorChoices.length > 0 && colorChoices.length === sizeChoices.length && props.customer && product && tab < colorChoices.length) {
      console.log(product)
      console.log(props.customer.exchangeRate)
      const s = sizes[sizeChoices[tab]]
      setPrice(s.variant[colorChoices[tab]].color.price! * props.customer.exchangeRate)
    }

    if (props.customer) setCurrency(props.customer.currency)
  }, [sizeChoices, colorChoices, quantity, props.customer, product, tab])

  useEffect(() => {
    if (paymentResponse) { 
      setPaymentDrawerOpen(false)
      setThankyouOpen(true)
    }
  }, [paymentResponse])

  return (<>
    <Head>
      <title>
        AI Apparel Store | Product
      </title>
      <meta
        name="description"
        content={`Extremely amazing AI Designed Apparel by user. FREE Generative AI Apparel Designer (Shirts, Hoodies, Tote Bags, etc.). Enjoy the power of Text-to-Image AI.`}
        key="desc"
      />
      <meta property="og:title" content={`AI Apparel Store | Product`} />
      <meta
        property="og:description"
        content={`Extremely amazing AI Designed Apparel by user. FREE Generative AI Apparel Designer (Shirts, Hoodies, Tote Bags, etc.). Enjoy the power of Text-to-Image AI.`}
      />
      <meta
        property="og:image"
        content="https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/stablediffusion/4hj6efalc5ge5bq4z32ys2kjv4/original.jpg"
      />
    </Head>

    <main
      className={
        " fixed overflow-hidden z-50 bg-gray-900 bg-opacity-75 inset-0 transform ease-in-out " +
        ( aiimage && product && printifyUpload && providerVariant && mockPreview.length > 0 && mockImages.length > 0 && price > 0
          ? " transition-all delay-500 opacity-0 translate-x-full ": " transition-opacity opacity-100 duration-500 translate-x-0 "
        )
      }
    ><section className=" w-screen h-full cursor-pointer " /></main>
    <PrivatePopup startingImg={imageIsPrivate} itemId={itemId as string}/>
    <ItemNotFound open={imageNotFound || false} itemId={itemId as string} productId={productId as string}/>
    <ThankYouPopup open={thankyouOpen} setOpen={setThankyouOpen} paymentResponse={paymentResponse} />
    <Drawer header='Payment' isOpen={paymentDrawerOpen} setIsOpen={setPaymentDrawerOpen}>
      <Payment customer={props.customer} orderItem={orderItem} fullImageServiceId={fullImageServiceId} serviceId={itemId as string} setPaymentResponse={setPaymentResponse} />
    </Drawer>
    <div className={`${styles.mainBackground} w-full p-4 lg:pt-32 flex justify-center pb-24 `+(showPrivateWarning?"pt-20":"pt-10")}>
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
                <div style={{backgroundImage: `url(${ mockImages[pictureIndex]? mockImages[pictureIndex]!.url : (mockPreview[pictureIndex] ? mockPreview[pictureIndex]!.url : (product?.images ? product!.images[0].preview.url : ""))})`, backgroundColor: "#748DA6"}}
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
                <b>${(price/100).toFixed(2)}</b> {currency} &nbsp; 
                { quantity > 1 && <small className='text-xs italic text-gray-200'> total: ${(totalPrice/100).toFixed(2)}</small> }
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
                          <button key={i} className={`${styles.addtocartButton} rounded p-1 px-2 mr-1 inline-flex items-center justify-center bg-gray-300 hover:cursor-pointer border-2 my-1 hover:border-white`}
                            style={{borderColor: sizeChoices[tab] === v ? "white" : "", color: sizeChoices[tab] === v ? "white" : "" }}
                            disabled={sizes[sizeChoices[tab]]?.disabled}
                            onClick={() => { 
                              sizeChoices[tab] = v
                              setSizeChoices([...sizeChoices])
                            }}>
                              {v}
                          </button>
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
                      sizes[sizeChoices[tab]]?.variant.map((v, i) => {
                        return (
                          <Tooltip content={<span className='bg-gray-700 p-2 rounded'>{v.color.name}</span>} key={i}>
                            <span
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
                    Back / Prompt
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline"
                    disabled={true}
                    value={aiimage?.prompt || ""}
                  />
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
                  <button className={`${styles.buynowButton} text-gray-600 hover:text-gray-800 hover:bg-darkgreen hover:font-bold p-2 pr-8 pl-8 rounded`}
                    disabled={ !product || !providerVariant || !aiimage }
                    onClick={(e) => {
                      e.preventDefault()
                      if (product) {
                        buyNow()
                      } else console.log("NO STORE ITEM!")
                    }}
                  >
                    Buy Now! {quantity === 1 ? "": ` (${quantity})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    { showPrivateWarning && 
      <div className="fixed top-0 pt-24 lg:pt-28 w-full" >
        <div className="text-center py-0 lg:py-4 lg:px-4"
          style={{background: "rgba(211,206,223, 0.8)"}}
        >
          <div className="p-2 items-center text-gray-50 leading-none lg:rounded-full flex lg:inline-flex" role="alert"
            style={{background: "rgba(0,0,0,0.5)"}}
          >
            <span className="flex rounded-full bg-gray-400 uppercase px-2 py-1 text-xs font-bold mr-3">
              <EyeSlashIcon className='w-4 h-4 text-white' />
            </span>
            <span className="font-semibold mr-2 text-left flex-auto">This item is only visible to you for a limited time.</span>
            <QuestionMarkCircleIcon className='w-6 h-6 text-gray-50' />
          </div>
        </div>
      </div>
    }
  </>
  )
}

Item.getLayout = (children) => {
  return <DefaultLayout>{children}</DefaultLayout>
}
export default Item