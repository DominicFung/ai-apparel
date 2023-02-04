import Footer from '../menu/footer'
import { ReactElement, cloneElement, useState, useEffect } from 'react'
import AppBar from '../menu/appbar'

import CurrencyMenu from '../menu/currencymenu'

import { CustomerRequest, CustomerResponse } from '../../types/customer'

import jscookie from 'js-cookie'

interface LayoutProps { children: ReactElement }
export default function DefaultLayout({ children }: LayoutProps) {

  const [ customer, setCustomer ] = useState<CustomerResponse>()

  const getGeo = async ():Promise<{ip: string}> => {
    let geourl = `https://api.ipify.org?format=json`
    try {
      let geo = await (await fetch(geourl)).json() as {ip: string}
      console.log(geo)
      return geo
    } catch (e) {
      console.warn("ipify likely blocked by adblocker or other privacy extentions on client app.")
      return { ip: "UNKNOWN" }
    }
  }

  const getNewCustomer = async () => {
    console.log('getting new customer')
    const url = '/api/customer'
    let geo = await getGeo()
    let res = await (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ ip: geo.ip } as CustomerRequest)
    })).json() as CustomerResponse
    console.log(`EXCHANGE RATE SET ${res.exchangeRate}`)

    jscookie.set("token", res.token)
    setCustomer(res)
  }

  const getOldCustomer = async () => {
    console.log('getting old customer')
    const url = '/api/customer'
    let res = await (await fetch(url, { method: 'POST', body: JSON.stringify({}) })).json() as CustomerResponse
    console.log(`EXCHANGE RATE SET ${res.exchangeRate}`)
    jscookie.set("token", res.token)
    setCustomer(res)
  }

  const setCustomerCurrency = async (currency: string) => {
    const url = '/api/customer'
    let res = await (await fetch(url, { method: 'POST', body: JSON.stringify({
      customerRequestCurrency: currency
    }) })).json() as CustomerResponse
    console.log(`EXCHANGE RATE SET ${res.exchangeRate}`)
    jscookie.set("token", res.token)
    setCustomer(res)
  }

  useEffect(() => {
    let token = jscookie.get("token")
    console.log(token)
    if (!token || token === "") { getNewCustomer() }
    else { getOldCustomer() }
  }, [])

  return (
    <>
      <main
        className={
          " fixed overflow-hidden z-60 bg-gray-900 bg-opacity-25 inset-0 transform ease-in-out " +
          (!customer
            ? " transition-opacity opacity-100 duration-500 translate-x-0  "
            : " transition-all delay-500 opacity-0 translate-x-full  ")
        }
      ><section className=" w-screen h-full cursor-pointer " /></main>
      <AppBar />
      <CurrencyMenu currency={customer?.currency || "USD"} setCurrency={setCustomerCurrency} />
        <main>{cloneElement(children, { customer } )}</main>
      <Footer />
    </>
  )
}