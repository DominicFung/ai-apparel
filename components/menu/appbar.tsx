import { useState } from 'react'
import Link from 'next/link'

import { ShoppingBagIcon } from '@heroicons/react/24/solid'
import whiteLogo from '../../assets/Logo-v2.png'
import Image from 'next/image'

export default function AppBar () {
  const [ cartNum, setCartNum ] = useState(0)

  const cartListener = (e: any) => {
    console.log(`cartListener(): ${JSON.stringify(e)}`)
    let num = e.detail.cartcount as number
    setCartNum(num)
  }

  return (
    <nav className="w-full flex items-center justify-between flex-wrap bg-lightsage p-6 fixed z-40 overflow-x-hidden"
      style={{
        background: "linear-gradient(95.8deg, rgba(116, 141, 166, 0.3) 45.93%, rgba(156, 180, 204, 0.3) 95.87%)",
        backdropFilter: "saturate(180%) blur(5px)"
      }}
    >
      <div className="w-full flex lg:hidden">
        <Link href={'/'}>
          <Image src={whiteLogo} alt="Logo" width={150} height={50} objectFit={'contain'} />
        </Link>
        <div className="flex flex-grow" />
        <button className="flex items-center px-3 py-2 border rounded text-white border-white hover:text-white hover:border-white"
          onClick={() => { }}
        >
          <svg className="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><title>Menu</title><path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"/></svg>
        </button>
      </div>
        <div className="w-full hidden lg:flex flex-grow lg:items-center lg:w-auto lg:visible px-4">
          <div className={`text-sm`}>
            <span className='block mt-4 lg:inline-block lg:mt-0 text-gray-100 mr-4'>
              <Link href="/">
                Home
              </Link>
            </span>
            <span className='block mt-4 lg:inline-block lg:mt-0 text-gray-100 mr-4'>
              <Link href="/">
                Products
              </Link>
            </span>
            
            
          </div>
          <div className="flex flex-grow" />
          <div className="flex items-center flex-shrink-0 text-white mr-6 p-4 text-2xl">
            AI Apparel Store
          </div>
          <div className="flex flex-grow" />
          <div className={`text-sm flex flex-row items-center justify-between`}>
            <span className={`block mt-4 lg:inline-block lg:mt-0 text-gray-100 mr-4`}>
              <Link href="/creations">Creations!</Link></span>
            <a href="#responsive-header" className={`block mt-4 lg:inline-block lg:mt-0 text-gray-100 mr-4`}>About</a>
            <div>
              <span className="relative inline-block">
                <Link href={'/'} className={`inline-block text-sm px-4 py-2 text-gray-100 hover:text-white`}>
                  <>
                    <ShoppingBagIcon className='w-6 h-6 text-gray-100' />
                    { cartNum > 0 ? 
                      <span className="absolute top-2 right-4 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-gray-600 rounded-full"
                        style={{fontSize: 10}}
                      >{cartNum}</span> : null
                    }
                  </>
                </Link>
              </span>
              
            </div>
          </div>
        </div>
      </nav>
  )
}