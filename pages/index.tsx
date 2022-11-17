import { useEffect, useState } from 'react'
import { NextPageWithLayout } from './_app'
import Image from 'next/image'
import s from '../styles/Home.module.scss'

import { Element, scroller } from 'react-scroll'

import { BoltIcon } from '@heroicons/react/24/solid'

import { GetServiceImageData } from './api/[userId]/replicate/stablediffusion/[serviceId]'
import { ReplicateSDResponse, GenerateRequest } from './api/[userId]/replicate/stablediffusion/generate'
import Link from 'next/link'
import HomeLayout from '../components/layouts/home'


const NUM_IMAGES = 3

const showCase = [
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/printify-mockup/ywhspomwuzhzllf7idhwgk3g24/75982/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/printify-mockup/ucz6jdbkmvdmdnzmsv75aaa2xm/75191/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/printify-mockup/hcbzzow2pvhvzcy5h4y2uxa4zu/53740/full/original.png",

  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/printify-mockup/ywhspomwuzhzllf7idhwgk3g24/75982/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/printify-mockup/ucz6jdbkmvdmdnzmsv75aaa2xm/75191/full/original.png",
]

const Home: NextPageWithLayout = () => {
  const [prompt, setPrompt] = useState("")
  const [images, setImages] = useState<GetServiceImageData[]>([])
  const [generateResult, setGenerateResult] = useState<ReplicateSDResponse[]>([])

  let generateImages = async () => {
    let url = '/api/userid/replicate/stablediffusion/generate'
    let response = await (await fetch(url, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        num_executions: NUM_IMAGES,
        input: { prompt }
      } as GenerateRequest)
    })).json() as ReplicateSDResponse[]

    console.log(response)
    setGenerateResult([...response])

    scroller.scrollTo("aiimages", {
      duration: 1500,
      delay: 100,
      smooth: true,
      offset: 50
    })
  }
    
  //let url = '/api/userid/replicate/stablediffusion/jfxln7xypfd27fbzmnai3r7dmy'
  const reloadImage = async (serviceId: string, index: number) => {
    let url = `/api/userid/replicate/stablediffusion/${serviceId}`
    let response = await (await fetch(url)).json() as GetServiceImageData
    if (response.status === 'PROCESSING') { 
      setTimeout( reloadImage, 1600+(Math.random()*500), serviceId, index )
    } else if (response.status === 'ERROR') {
      console.error(`Stable Diffusion encountered an error, Replicate.io service ID: ${response.id}`)
    } else {
      images[index] = response
      setImages([...images])
    }
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
    <div className={`${s.mainBackground}`}>
      <div className={s.section1}>
        <div className={`${s.slider}`}>
          <div className={`${s.slidetrack}`}>
            { showCase.map( (v, i) => {
              return <div className={`${s.slide} bg-cover bg-center mx-1`} key={i}
                style={{
                  backgroundImage: `url(${v})`,
                  backgroundColor: "#748DA6"
                }}
              />
              })
            }
          </div>
        </div>

        <div className='w-full flex justify-center'>
          <div className={s.glass}>
            <div className={`${s.title}`}>Print your AI Design</div>
            <p className={`${s.titleParagraph}`}>
              Embrace your love of generative AI! 
            </p>
            <p className={`${s.titleParagraph}`}>
              Describe the image you want to see on your apparel and print!
            </p>
            
            <div className='flex w-full flex-row-reverse mt-10'>
              <button onClick={generateImages}
                className={`${s.actionButton} flex flex-row py-5 px-3 text-white rounded hover:bg-gray-700 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none disabled:bg-gray-400`}
              > <span className='px-1'>Generate</span>
                <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block text-yellow-200`} />
              </button>

              <input
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value) }}
                type="text"
                className="form-control block w-full mx-1 px-3 text-xl
                  font-normal
                  text-gray-700
                  bg-white bg-clip-padding
                  border border-solid border-gray-300
                  rounded
                  transition
                  ease-in-out
                  focus:text-gray-700 focus:bg-white focus:border-gray-600 focus:outline-none
                "
                id="exampleSearch"
                placeholder="New York City as a collage with a sunset in the background."
              />
              
            </div>
          </div>
        </div>
      </div>
      
      {images.length > 0 && <div className='flex justify-center'>
        <Element name="aiimages">
          <div className='max-w-screen-2xl'>
            <h2 className={`${s.resultTitle} text-4xl p-5`}>Results!</h2>
            <div className='grid grid-cols-3 gap-3 px-20 py-2'>
              {images.map((i, e) => {
                if (i && i.status === 'COMPLETE' && i.url) {
                  return (
                  <Link href={`p/77/i/${i.id}`} key={i.id}>
                    <span className={s.aiImage}>
                      <Image src={i.url} width={512} height={512} objectFit={'contain'} alt={`AI Image ${e} ${i.id}`}/>
                    </span>
                  </Link>)
                } else {
                  return <div key={e} className={s.loadingImage} />
                }
              })}
            </div>
          </div>
        </Element>
      </div>}
      

    </div>
  )
}

Home.getLayout = (children) => {
  return <HomeLayout>{children}</HomeLayout>
}

export default Home
