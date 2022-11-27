
import { useEffect, useState } from 'react'
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk'

import { 
  EnvelopeIcon, PhoneIcon, HomeIcon, BuildingOffice2Icon
} from '@heroicons/react/24/solid'

import { calculatePrice, SQUARE_ENV as ENV } from '../utils/utils'
import { TokenResult, VerifyBuyerResponseDetails } from '@square/web-sdk'

import countries from '../countries.json'
import secret from '../secret.json'

import regionList from '../country-region.json'
import { OrderItem } from '../types/order'
import { CountryCode } from '../types/global'
import { AIImageResponse } from '../types/replicate'
import { PaymentRequest, PaymentResponse } from '../types/square'

interface PaymentProps {
  orderItem: OrderItem | undefined
  fullImageServiceId: string | undefined
}

interface Region {
  name: string
  shortCode: string
}

interface RegionCountry {
  countryName: string
  countryShortCode: CountryCode
  regions: Region[]
}
const regs = regionList as unknown as RegionCountry[]
const countryKeys = Object.keys(countries)
export default function Payment(props: PaymentProps){

  const [ firstname, setFirstname ] = useState("")
  const [ lastname, setLastname ] = useState("")
  const [ email, setEmail ] = useState("")
  const [ phone, setPhone ] = useState("")
  const [ country, setCountry ] = useState<CountryCode>("US")
  const [ address1, setAddress1 ] = useState("")
  const [ address2, setAddress2 ] = useState("")
  const [ city, setCity ] = useState("")
  const [ zip, setZip ] = useState("")

  const [ region, setRegion ] = useState<string>()
  const [ regions, setRegions ] = useState<Region[]>()

  const [ price, setPrice ] = useState(0)
  const [ disable,  isDisabled ] = useState(true)
  const [ image, setImage ] = useState<AIImageResponse>()

  const checkFormFilled = () => {
    console.log(image)
    if ( firstname === "" ) { isDisabled(true); return }
    if ( lastname === "" ) { isDisabled(true); return } 
    if ( email === "" ) { isDisabled(true); return }
    if ( phone === "" ) { isDisabled(true); return }
    if ( address1 === "" ) { isDisabled(true); return }
    if ( city === "" ) { isDisabled(true); return }
    if ( zip === "" ) { isDisabled(true); return } 
    isDisabled(false)
  }

  const reloadImage = async (serviceId: string) => {
    console.log("Reloading HD Image in Payment ... ")
    let url = `/api/userid/replicate/rudalle-sr/${serviceId}`
    let response = await (await fetch(url)).json() as AIImageResponse
    if (response.status === 'PROCESSING') { 
      setTimeout( reloadImage, 1600+(Math.random()*500), serviceId )
    } else if (response.status === 'ERROR') {
      console.error(`RUDallE-SR encountered an error, Replicate.io service ID: ${response.id}`)
    } else {
      console.log("Image set!")
      setImage(response)
    }
  }

  const validForm = (): boolean => {
    return true
  }

  useEffect(() => {
    if (props.orderItem && props.fullImageServiceId) {
      setPrice(calculatePrice([props.orderItem]))
      reloadImage(props.fullImageServiceId)
    }
  }, [props.orderItem, props.fullImageServiceId])

  useEffect(() => {
    checkFormFilled()
  }, [firstname, lastname, email, phone, address1, city, zip])

  useEffect(() => {
    for (let r of regs) {
      if (r.countryShortCode === country) {
        setRegions(r.regions)
      } 
    }
  }, [country])

  const handleCardTokenized = async (
    token: TokenResult, buyer?: VerifyBuyerResponseDetails | null | undefined
  ) => {
    if (validForm() && props.orderItem) {
      console.log(JSON.stringify(props.orderItem.orderItemId, null, 2))
      const response = await (await fetch(`/api/userId/printify/order/payment`, {
        method: 'POST',
        body: JSON.stringify({
          sourceId: token,
          orders: [ props.orderItem.orderItemId ],
          addressTo: {
            firstname, lastname, email, phone,
            country, address1, address2, city, zip,
            region
          }
        } as PaymentRequest)
      })).json() as PaymentResponse
      console.log(response)
      alert(JSON.stringify(response, null, 2))
    }
  }

  return (<>
    <div className='mb-8'>
      <h2>${(price/100).toFixed(2)} {props.orderItem?.varients[0].currency}</h2>
     { props.orderItem && <small className="italic text-xs text-gray-500" style={{fontSize: 10}}>Order Id: {props.orderItem.orderItemId}</small>}
    </div>
    <form className='mb-8'>
      <div className='flex flex-row'>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="firstname" className="block mb-2 text-sm font-medium text-gray-900">First Name</label>
          <input type="text" id="firstname" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="John" required
              value={firstname} onChange={e => { setFirstname(e.target.value) }}/>
        </div>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="lastname" className="block mb-2 text-sm font-medium text-gray-900">Last Name</label>
          <input type="text" id="lastname" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Smith" required 
              value={lastname} onChange={e => { setLastname(e.target.value) }}/>
        </div>
      </div>
      <div className='px-1 mb-3'>
        <label htmlFor="email-address-icon" className="block mb-2 text-sm font-medium text-gray-900">Email</label>
        <div className="relative">
          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <EnvelopeIcon className='w-4 h-4 text-gray-500' />
          </div>
          <input type="email" id="email-address-icon" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="John.Smith@email.com" 
              value={email} onChange={e => { setEmail(e.target.value) }}/>
        </div>
      </div>
      <div className='px-1 mb-3'>
        <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-900">Phone</label>
        <div className="relative">
          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <PhoneIcon className='w-4 h-4 text-gray-500' />
          </div>
          <input type="text" id="phone" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="123 123 1234" 
              value={phone} onChange={e => { setPhone(e.target.value) }}/>
        </div>
      </div>
      <div className='flex flex-row'>
        <div className='px-1 mb-3 flex-grow'>
          <label htmlFor="countries" className="block mb-2 text-sm font-medium text-gray-900">Country</label>
          <select id="countries" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            value={country} onChange={e => { setCountry(e.target.value as unknown as CountryCode) }}
          >
            { countryKeys.map(c => {
              return <option value={c} key={c}>
                {countries[c]}
              </option>
            }) }
          </select>
        </div>
        <div className='px-1 mb-3 flex-grow-0'>
          <label htmlFor="region" className="block mb-2 text-sm font-medium text-gray-900">Country</label>
          <select id="region" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            value={region} onChange={e => { setRegion(e.target.value) }}
          >
            { regions?.map(c => {
              return <option value={c.shortCode} key={c.name}>
                {c.name}
              </option>
            }) }
          </select>
        </div>
      </div>
      <div className='flex flex-row'>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="address1" className="block mb-2 text-sm font-medium text-gray-900">Address</label>
          <div className="relative">
            <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <HomeIcon className='w-4 h-4 text-gray-500' />
            </div>
            <input type="text" id="address1" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="123 Apple Street" required 
                value={address1} onChange={e => { setAddress1(e.target.value) }}/>
          </div>
        </div>
        <div className="px-1 mb-4 flex-grow-0">
          <label htmlFor="address2" className="block mb-2 text-sm font-medium text-gray-900">Unit</label>
          <input type="text" id="address2" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="2" required 
              value={address2} onChange={e => { setAddress2(e.target.value) }}/>
        </div>
      </div>
      <div className='flex flex-row'>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="city" className="block mb-2 text-sm font-medium text-gray-900">City</label>
          <div className="relative">
            <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <BuildingOffice2Icon className='w-4 h-4 text-gray-500' />
            </div>
            <input type="text" id="city" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="Savannah" required 
                value={city} onChange={e => { setCity(e.target.value) }}/>
          </div>
        </div>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="zip" className="block mb-2 text-sm font-medium text-gray-900">Zip Code</label>
          <input type="text" id="zip" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="31404" required 
              value={zip} onChange={e => { setZip(e.target.value) }}/>
        </div>
      </div>
    </form>
    <PaymentForm
      applicationId={secret.square[ENV].appId}
      locationId={secret.square[ENV].locationId}
      cardTokenizeResponseReceived={handleCardTokenized}
      
    >
      <CreditCard buttonProps={{
        isLoading: disable || image === undefined
      }} />
    </PaymentForm>
  </>)
}