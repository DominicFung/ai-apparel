import { useEffect, useState } from 'react'
import { NextPageWithLayout } from './_app'
import Image from 'next/image'
import s from '../styles/Home.module.scss'

import { Element, scroller } from 'react-scroll'

import { BoltIcon } from '@heroicons/react/24/solid'

import { GetServiceImageData } from './api/[userId]/replicate/stablediffusion/[serviceId]'
import { ReplicateSDResponse, GenerateRequest } from './api/[userId]/replicate/stablediffusion/generate'
import HomeLayout from '../components/layouts/home'

import ProductPopup from '../components/popup/products'

import { Navigation, Pagination } from 'swiper'
import { Swiper, SwiperSlide} from 'swiper/react'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import Head from 'next/head'

// To return to non-web
// aws amplify update-app --region us-east-1 --app-id d13h2md0ftccbx --platform WEB_DYNAMIC

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
  const [images, setImages] = useState<GetServiceImageData[]>([
    {
      id: "4hj6efalc5ge5bq4z32ys2kjv4",
      status: 'COMPLETE',
      url: "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/stablediffusion/4hj6efalc5ge5bq4z32ys2kjv4/original.jpg",
    },
    {
      id: "sjlxtbxk6ne33ckpp2mcv3fae4",
      status: 'COMPLETE',
      url: "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/stablediffusion/sjlxtbxk6ne33ckpp2mcv3fae4/original.jpg",
    },
    {
      id: "sj7y4cdv3ngglo4bgszb6aafcu",
      status: 'COMPLETE',
      url: "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/stablediffusion/sj7y4cdv3ngglo4bgszb6aafcu/original.jpg",
    }
  ])
  const [generateResult, setGenerateResult] = useState<ReplicateSDResponse[]>([])

  const [ openProducts, setOpenProducts ] = useState(false)
  const [ activeItemId, setActiveItemId ] = useState<string>("")

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

  const selectAiImage = (itemId: string) => {
    setActiveItemId(itemId)
    setOpenProducts(true)
  }

  useEffect(() => {
    if (generateResult.length > 0) {
      let temp = []
      for (let i=0; i<generateResult.length; i++) {
        temp.push({id: generateResult[i].id, status: 'PROCESSING'} as GetServiceImageData)
        setTimeout( reloadImage, 2600+(Math.random()*500), generateResult[i].id, i)
      }
      setImages([...temp])
      scroller.scrollTo("aiimages", {
        duration: 1500,
        delay: 100,
        smooth: true,
        offset: 50
      })
    }
  }, [generateResult])

  useEffect(() => {
    console.log(images)
  }, [images])

  return (
    <>
    <Head>
      <title>
        AI Apperal Store | Generative AI
      </title>
      <meta
        name="description"
        content="FREE Generative AI Apparel Designer (Shirts, Hoodies, Tote Bags, etc.)"
        key="desc"
      />
      <meta property="og:title" content="AI Apperal Store | FREE AI Apperal Designer" />
      <meta
        property="og:description"
        content="FREE Generative AI Apparel Designer (Shirts, Hoodies, Tote Bags, etc.). Enjoy the power of Text-to-Image AI."
      />
      <meta
        property="og:image"
        content="https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/userid/stablediffusion/4hj6efalc5ge5bq4z32ys2kjv4/original.jpg"
      />
    </Head>
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
          <div className={`${s.glass} m-5`}>
            <div className={`${s.title} text-center lg:text-left text-2xl lg:text-8xl leading-relaxed`}>
              Free AI Apperal Designer
            </div>
            {/* <p className={`${s.titleParagraph}`}>
              Embrace your love of generative AI! 
            </p> */}
            <p className={`${s.titleParagraph} hidden lg:inline-block text-base lg:text-2xl`}>
              Describe the image you want to see on your apparel and print!
            </p>
            
            <div className='flex w-full flex-row-reverse lg:mt-10'>
              <button onClick={generateImages}
                className={`${s.actionButton} hidden lg:flex flex-row py-5 px-3 text-white rounded hover:bg-gray-700 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none disabled:bg-gray-400`}
              > <span className='px-1'>Generate</span>
                <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block text-yellow-200`} />
              </button>

              <input
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value) }}
                type="text"
                className="form-control hidden lg:block w-full mx-1 p-3 lg:text-xl
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
                placeholder="New York City skyline blue pink newspaper collage."
              />
              <textarea rows={3} 
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value) }}
                className="form-control block lg:hidden w-full mx-1 p-3 lg:text-xl
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
                placeholder="New York City skyline blue pink newspaper collage."
              />
            </div>
            <div className='flex lg:hidden w-full justify-center'>
              <button onClick={generateImages}
                  className={`${s.actionButton} justify-center m-1 py-3 px-3 text-white rounded hover:bg-gray-700 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none disabled:bg-gray-400`}
              > <span className='flex flex-row'>
                  <span className='px-1'>Generate</span>
                  <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block text-yellow-200`} />
                </span>
              </button>
            </div>
            
          </div>
        </div>
      </div>
      
      {images.length > 0 && <div className='flex justify-center'>
        <Element name="aiimages">
          <div className='block lg:hidden w-screen overflow-x-hidden p-5'>
          <h2 className={`${s.resultTitle} text-5xl p-10 pt-20`}>Results!</h2>
            <Swiper
              spaceBetween={20}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              onSlideChange={() => console.log('slide change')}
              onSwiper={(swiper: any) => console.log(swiper)}
              modules={[Navigation, Pagination]}
            >
              {images.map((i, e) => {
                if (i && i.status === 'COMPLETE' && i.url) {
                  return (
                    <SwiperSlide key={i.id}>
                      <span className={s.aiImage} key={i.id} onClick={() => { selectAiImage(i.id) }}>
                        <Image src={i.url} width={512} height={512} objectFit={'contain'} alt={`AI Image ${e} ${i.id}`}/>
                      </span>
                    </SwiperSlide>
                    )
                } else {
                  return (
                    <SwiperSlide key={i.id}>
                      <div className={s.wrapper} key={i.id}>
                        <div key={e} className={`${s.loadingImage} ${s.animate}`} />
                      </div>
                    </SwiperSlide>
                  )
                }
              })}
            </Swiper>
          </div>
          <div className='max-w-screen-2xl hidden lg:block'>
            <h2 className={`${s.resultTitle} text-5xl p-10 pt-20`}>Results!</h2>
            <div className='grid grid-cols-3 gap-3 px-20 py-2'>
              {images.map((i, e) => {
                if (i && i.status === 'COMPLETE' && i.url) {
                  return (
                    <span className={s.aiImage} key={i.id}
                      onClick={() => { selectAiImage(i.id) }}
                    >
                      <Image src={i.url} width={512} height={512} objectFit={'contain'} alt={`AI Image ${e} ${i.id}`}/>
                    </span>)
                } else {
                  return (
                    <div className={s.wrapper} key={i.id}>
                      <div key={e} className={`${s.loadingImage} ${s.animate}`} />
                    </div>
                  )
                }
              })}
            </div>
          </div>
        </Element>
      </div>}

      <div>
        <Element name="howitworks">
          <div className='flex justify-center'>
            <div className='max-w-screen-2xl'>
              <h2 className={`${s.resultTitle} text-5xl p-10 pt-20`}>How it Works,</h2>
            </div>
          </div>
          <div className='flex justify-center'>
            <div className='max-w-screen-2xl'>
              <p className={`text-gray-50 p-1`}>
                In August 2022, text-to-image AI art has won the first place in a digital art competition.
              </p>
              <p className={`text-gray-50 p-1`}>
                As Text-to-Image models get better, 
              </p>
            </div>
          </div>
          
          
        </Element>
      </div>

      
    </div>
    <ProductPopup itemId={activeItemId} open={openProducts} setOpen={setOpenProducts} />
    </>
  )
}

Home.getLayout = (children) => {
  return <HomeLayout>{children}</HomeLayout>
}

export default Home
