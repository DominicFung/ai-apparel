
import { useState } from 'react'
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk'

import { 
  EnvelopeIcon, PhoneIcon, HomeIcon, BuildingOffice2Icon
} from '@heroicons/react/24/solid'

import countries from '../countries.json'
import secret from '../secret.json'
import { SQUARE_ENV as ENV } from '../utils/utils'
import { TokenResult, VerifyBuyerResponseDetails } from '@square/web-sdk'

interface PaymentProps {}

const countryKeys = Object.keys(countries)

export default function Payment(props: PaymentProps){

  const [ firstname, setFirstname ] = useState("")
  const [ lastname, setLastname ] = useState("")
  const [ email, setEmail ] = useState("")
  const [ phone, setPhone ] = useState("")

  const handleCardTokenized = async (
    token: TokenResult, buyer?: VerifyBuyerResponseDetails | null | undefined
  ) => {
    const response = await fetch(``)

    alert(JSON.stringify(token, null, 2))
  }

  return (<>
    <form className='mb-8'>
      <div className='flex flex-row'>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="firstname" className="block mb-2 text-sm font-medium text-gray-900">First Name</label>
          <input type="text" id="firstname" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="John" required
              value={firstname} onChange={(e) => { setFirstname(e.target.value) }}/>
        </div>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="lastname" className="block mb-2 text-sm font-medium text-gray-900">Last Name</label>
          <input type="text" id="lastname" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Smith" required 
              value={lastname} onChange={(e) => { setLastname(e.target.value) }}/>
        </div>
      </div>
      <div className='px-1 mb-3'>
        <label htmlFor="email-address-icon" className="block mb-2 text-sm font-medium text-gray-900">Email</label>
        <div className="relative">
          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <EnvelopeIcon className='w-4 h-4 text-gray-500' />
          </div>
          <input type="email" id="email-address-icon" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="John.Smith@email.com" 
              value={email} onChange={(e) => { setEmail(e.target.value) }}/>
        </div>
      </div>
      <div className='px-1 mb-3'>
        <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-900">Phone</label>
        <div className="relative">
          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <PhoneIcon className='w-4 h-4 text-gray-500' />
          </div>
          <input type="text" id="phone" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="123 123 1234" 
              value={phone} onChange={(e) => { setPhone(e.target.value) }}/>
        </div>
      </div>
      <div className='px-1 mb-3'>
        <label htmlFor="countries" className="block mb-2 text-sm font-medium text-gray-900">Country</label>
        <select id="countries" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
          { countryKeys.map(c => {
            return <option value={c} key={c}>
              {countries[c]}
            </option>
          }) }
        </select>
      </div>
      <div className='flex flex-row'>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="address1" className="block mb-2 text-sm font-medium text-gray-900">Address</label>
          <div className="relative">
            <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <HomeIcon className='w-4 h-4 text-gray-500' />
            </div>
            <input type="text" id="address1" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="123 Apple Street" required />
          </div>
        </div>
        <div className="px-1 mb-4 flex-grow-0">
          <label htmlFor="address2" className="block mb-2 text-sm font-medium text-gray-900">Unit</label>
          <input type="text" id="address2" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="2" required />
        </div>
      </div>
      <div className='flex flex-row'>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="city" className="block mb-2 text-sm font-medium text-gray-900">City</label>
          <div className="relative">
            <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <BuildingOffice2Icon className='w-4 h-4 text-gray-500' />
            </div>
            <input type="text" id="city" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5" placeholder="Savannah" required />
          </div>
        </div>
        <div className="px-1 mb-4 flex-grow">
          <label htmlFor="zip" className="block mb-2 text-sm font-medium text-gray-900">Zip Code</label>
          <input type="text" id="zip" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="31404" required />
        </div>
      </div>
    </form>
    <PaymentForm
      applicationId={secret.square[ENV].appId}
      locationId={secret.square[ENV].locationId}
      cardTokenizeResponseReceived={handleCardTokenized}
    >
      <CreditCard />
    </PaymentForm>
  </>)
}