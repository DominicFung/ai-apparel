import Footer from '../menu/footer'
import { ReactElement, cloneElement, useState, useEffect } from 'react'
import AppBar from '../menu/appbar'

import { Customer, CustomerRequest, CustomerResponse } from '../../types/customer'

import jscookie from 'js-cookie'

interface LayoutProps { children: ReactElement }
export default function DefaultLayout({ children }: LayoutProps) {

  const [ customer, setCustomer ] = useState<CustomerResponse>()

  const getGeo = async ():Promise<{ip: string}> => {
    let geourl = `https://api.ipify.org?format=json`
    let geo = await (await fetch(geourl)).json() as {ip: string}
    console.log(geo)
    return geo
  }

  const getNewCustomer = async () => {
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
    const url = '/api/customer'
    let res = await (await fetch(url, { method: 'POST', body: JSON.stringify({}) })).json() as CustomerResponse
    console.log(`EXCHANGE RATE SET ${res.exchangeRate}`)
    setCustomer(res)
  }

  useEffect(() => {
    if (jscookie.get("token")) { getNewCustomer() }
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
        <main>{cloneElement(children, { customer } )}</main>
      <Footer />
    </>
  )
}