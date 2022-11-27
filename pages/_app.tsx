import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { NextPage } from 'next'
import { ReactElement, ReactNode, useEffect, useState } from 'react'
import { CustomerRequest, CustomerResponse } from '../types/customer'

import jscookie from 'js-cookie'
import cookie from 'cookie'

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout<{}, {}>,
}

function MyApp({ Component, pageProps }: AppPropsWithLayout) {

  const getCustomer = async () => {
    let geourl = `https://api.ipify.org?format=json`
    let geo = await (await fetch(geourl)).json() as {ip: string}
    console.log(geo)

    const url = '/api/customer'
    let res = await (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ip: geo.ip
      } as CustomerRequest)
    })).json() as CustomerResponse

    jscookie.set("token", res.token, { expires: 365 })
  }

  useEffect(() => {
    if (jscookie.get("token")) {
      console.log(jscookie)
    } else {
      getCustomer()
    }
  }, [])

  const getLayout = Component.getLayout ?? ((page) => page)
  return getLayout(<Component {...pageProps} />)
  
}

export default MyApp