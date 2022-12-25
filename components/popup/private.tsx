import { Fragment, useEffect, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'

import Link from 'next/link'
import Image from 'next/image'

import { Navigation } from 'swiper'
import { Swiper, SwiperSlide} from 'swiper/react'

interface PrivatePopupProps {
  itemId: string
  startingImg: string
}

const _SM = 640

export default function PrivatePopup(props: PrivatePopupProps){
  const cancelButtonRef = useRef(null)
  
  const [ images, setImages ] = useState<string[]>()
  const [ numSlides, setNumSlides ] = useState(1)

  const getCachedImages = async (si: string) => {
    const url = `/api/printify/mockup/cached/${props.itemId}`
    const i = await (await fetch(url)).json() as string[]
    console.log(i)
    setImages([ si, ...i])
  }

  const updateDimensions = () => {
    if (window.innerWidth > _SM) { setNumSlides(3) }
    else { setNumSlides(1) }
  }

  useEffect(() => {
    if (props.startingImg && props.itemId) {
      getCachedImages(props.startingImg)
      updateDimensions()
      window.addEventListener('resize', updateDimensions, true)
    }
    return () => { 
      window.removeEventListener('resize', updateDimensions)
    }
  }, [props.startingImg, props.itemId])



  return (
    <Transition.Root show={props.startingImg !== ""} as={Fragment}>
    <Dialog
      as="div" style={{zIndex: 100}}
      auto-reopen="true"
      className="fixed inset-0 overflow-y-auto"
      initialFocus={cancelButtonRef}
      onClose={() => {  }}
    >
      <div className="mx-5 flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-600 mb-5">
                    Opps, this is a private product ..
                  </Dialog.Title>
                  { (!images || images?.length <= 0) && 
                    <div className='p-10 text-gray-400'>Loading ..</div> 
                  }
                  <div className='block'>
                    <Swiper
                      spaceBetween={20}
                      slidesPerView={numSlides}
                      navigation
                      pagination={{ clickable: true }}
                      onSlideChange={() => console.log('slide change')}
                      onSwiper={(swiper: any) => console.log(swiper)}
                      modules={[Navigation]}
                    >
                      { images?.map( p => 
                        <SwiperSlide key={p}>
                          <div className="w-full max-w-sm bg-white rounded-lg shadow-md" key={p}>
                            <Image className="p-8 rounded-t-lg" src={p} 
                              alt="product image" width={512} height={512} objectFit={'contain'}
                            />
                          </div>
                        </SwiperSlide>
                      )}
                    </Swiper>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-sm border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {}}
                ref={cancelButtonRef}
              >Request Access</button>
              <Link href="/">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-sm border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >Go Home</button>
              </Link>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition.Root>
  )
}