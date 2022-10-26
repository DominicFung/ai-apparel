import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import Image from 'next/image'
import styles from '../styles/Home.module.scss'

import { 
  ShoppingBagIcon, ArrowRightOnRectangleIcon, MagnifyingGlassIcon,
  HeartIcon 
} from '@heroicons/react/24/solid'

import aiimage2 from '../imgs/home/aiimage2.jpeg'
import aiimage3 from '../imgs/home/aiimage3.jpeg'
import aiimage4 from '../imgs/home/aiimage4.jpeg'
import aiimage5 from '../imgs/home/aiimage5.jpeg'

import { GetServiceImageData } from './api/[userId]/replicate/stablediffusion/[serviceId]'
import { ReplicateSDResponse, RequestProps } from './api/[userId]/replicate/stablediffusion/generate'
import Link from 'next/link'

const NUM_IMAGES = 3

const Home: NextPage = () => {
  const [prompt, setPrompt] = useState("Monstera in the style of Art Nouveau.")

  const [images, setImages] = useState<GetServiceImageData[]>([])
  const [generateResult, setGenerateResult] = useState<ReplicateSDResponse[]>([])

  let generateImages = async () => {
    let url = '/api/userid/replicate/stablediffusion/generate'
    let response = await (await fetch(url, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        num_executions: NUM_IMAGES,
        userId: 'userid',
        userType: 'GUEST',
        input: { prompt }
      } as RequestProps)
    })).json() as ReplicateSDResponse[]

    console.log(response)
    setGenerateResult([...response])
  }
    
  //let url = '/api/userid/replicate/stablediffusion/jfxln7xypfd27fbzmnai3r7dmy'
  const reloadImage = async (serviceId: string, index: number) => {
    let url = `/api/userid/replicate/stablediffusion/${serviceId}`
    let response = await (await fetch(url)).json() as GetServiceImageData
    if (response.status === 'PROCESSING') { 
      setTimeout( reloadImage, 1600+(Math.random()*500), serviceId, index )
    }
    
    images[index] = response
    setImages([...images])
  }

  useEffect(() => {
    let temp = []
    for (let i=0; i<generateResult.length; i++) {
      temp.push({id: generateResult[i].id, status: 'PROCESSING'} as GetServiceImageData)
      setTimeout( reloadImage, 2600+(Math.random()*500), generateResult[i].id, i)
    }
    setImages([...temp])
  }, [generateResult])

  return (
    <div className={`${styles.mainBackground} flex justify-center`}>
      <div className='max-w-screen-2xl'>
        <div className={`${styles.titleBox} border`}>
          <div className="flex flex-row">
            <div className="flex flex-grow">
              <span className={`${styles.appbartext}`}>AI Apperal</span>
            </div>
            <div className="flex">
              <span className={`${styles.appbartext}`}
              >Advanced</span>
              <span className={`${styles.appbartext}`}>Store</span>
              <span className={`${styles.appbartext}`}>
                <ShoppingBagIcon className={styles.icons}/>
              </span>
              <span className={`${styles.appbartext}`}>
                <ArrowRightOnRectangleIcon className={styles.icons}/>
              </span>
            </div>
          </div>
          <div className='flex flex-row'>
            <div className="">
              <div className={`${styles.title}`}>Print your AI Design</div>
              <p className={`${styles.titleParagraph}`}>This is a paragraph that describes how this product works.</p>
            </div>
            <div className='sm:hidden md:grid xl:grid-cols-3 md:grid-cols-2 py-10 gap-1'>
              <span><Image src={aiimage2} objectFit={'contain'}/></span>
              <span><Image src={aiimage3} objectFit={'contain'}/></span>
              <span><Image src={aiimage4} objectFit={'contain'}/></span>
              <span><Image src={aiimage5} objectFit={'contain'}/></span>
            </div>
          </div>
        </div>
        <div>

          <div>
            <div className="flex justify-center">
              <div className={styles.searchBox}>
                <input
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value) }}
                  type="text"
                  className="
                    form-control
                    block
                    w-full
                    px-3
                    py-1.5
                    text-2xl
                    font-normal
                    text-gray-700
                    bg-white bg-clip-padding
                    border border-solid border-gray-300
                    rounded
                    transition
                    ease-in-out
                    m-3
                    focus:text-gray-700 focus:bg-white focus:border-gray-600 focus:outline-none
                  "
                  id="exampleSearch"
                  placeholder="Describe Shirt ..."
                />
              </div>
              <button onClick={generateImages}
                className='ml-10 mt-3 h-12 w-20 bg-gray-600 rounded hover:bg-gray-700 text-gray-100 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none disabled:bg-gray-400'
              >
                <MagnifyingGlassIcon className='h-6 w-6 inline-block' />
              </button>
            </div>
            
          </div>

          <div className='grid grid-cols-3 gap-3 px-20 py-2'>
            {images.map((i, e) => {
              if (i && i.status === 'COMPLETE' && i.url) {
                return (
                <Link href={`products/1090/item/${i.id}`}>
                  <span key={i.id} className={styles.aiImage}>
                    <div style={{height: 0}}>
                      <span className="relative" style={{top: 500, left: 500}}>
                        <HeartIcon className={`${styles.fav} w-6 h-6`} />
                      </span>
                    </div>
                    <Image src={i.url} width={512} height={512} objectFit={'contain'}/>
                  </span>
                </Link>)
              } else {
                return <div key={e} className={styles.loadingImage} />
              }
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

export default Home
