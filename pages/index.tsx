import { useEffect, useState } from 'react'
import { NextPageWithLayout } from './_app'
import Image from 'next/image'
import s from '../styles/Home.module.scss'
import { Element, scroller } from 'react-scroll'
import { BoltIcon } from '@heroicons/react/24/solid'

import HomeLayout from '../components/layouts/home'
import ProductPopup from '../components/popup/products'

import { Navigation, Pagination } from 'swiper'
import { Swiper, SwiperSlide} from 'swiper/react'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import Head from 'next/head'

import { AIImageResponse, GenerateAIImageRequest, ReplicateStableDiffusionResponse } from '../types/replicate'

const NUM_IMAGES = 3

const showCase = [
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ywhspomwuzhzllf7idhwgk3g24/75982/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ucz6jdbkmvdmdnzmsv75aaa2xm/75191/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/hcbzzow2pvhvzcy5h4y2uxa4zu/53740/full/original.png",

  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ywhspomwuzhzllf7idhwgk3g24/75982/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ucz6jdbkmvdmdnzmsv75aaa2xm/75191/full/original.png",
]

const Home: NextPageWithLayout = (props) => {
  const [prompt, setPrompt] = useState("")
  const [images, setImages] = useState<AIImageResponse[]>([
    {
      id: "4hj6efalc5ge5bq4z32ys2kjv4",
      status: 'COMPLETE',
      url: "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/stablediffusion/4hj6efalc5ge5bq4z32ys2kjv4/original.jpg",
    },
    {
      id: "sjlxtbxk6ne33ckpp2mcv3fae4",
      status: 'COMPLETE',
      url: "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/stablediffusion/sjlxtbxk6ne33ckpp2mcv3fae4/original.jpg",
    },
    {
      id: "sj7y4cdv3ngglo4bgszb6aafcu",
      status: 'COMPLETE',
      url: "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/stablediffusion/sj7y4cdv3ngglo4bgszb6aafcu/original.jpg",
    }
  ])
  const [generateResult, setGenerateResult] = useState<ReplicateStableDiffusionResponse[]>([])
  const [ loading, setLoading ] = useState(false)

  const [ openProducts, setOpenProducts ] = useState(false)
  const [ activeItemId, setActiveItemId ] = useState<string>("")

  let generateImages = async () => {
    setLoading(true)
    let url = '/api/replicate/stablediffusion/generate'
    let response = await (await fetch(url, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        num_executions: NUM_IMAGES,
        customerId: "",
        input: { prompt }
      } as GenerateAIImageRequest)
    })).json() as ReplicateStableDiffusionResponse[]

    console.log(response)
    setGenerateResult([...response])
  }

  const reloadImages = async (oldImgs: AIImageResponse[]) => {
    let newImgs = []
    let loading = false
    
    for (let i of oldImgs) {
      let url = `/api/replicate/stablediffusion/${i.id}`
      const response = await (await fetch(url)).json() as AIImageResponse
      newImgs.push(response)
      if (response.status !== 'COMPLETE') { 
        loading = true
        setTimeout( reloadImages, 1600+(Math.random()*500), newImgs )
      }
    }

    setImages([... newImgs])
    setLoading(loading)
  }

  const selectAiImage = (itemId: string) => {
    setActiveItemId(itemId)
    setOpenProducts(true)
  }

  useEffect(() => {
    if (generateResult.length > 0) {
      let temp = []
      for (let i=0; i<generateResult.length; i++) {
        temp.push({id: generateResult[i].id, status: 'PROCESSING'} as AIImageResponse)
      }

      setTimeout( reloadImages, 2600+(Math.random()*500), temp)
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
        content="https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/stablediffusion/4hj6efalc5ge5bq4z32ys2kjv4/original.jpg"
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
                className={`${s.actionButton} hidden lg:flex flex-row py-5 px-3 text-white rounded hover:bg-gray-700 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none`}
                disabled={loading}
              > 
                { loading && 
                <div role="status" className='h-0 w-full flex justify-center'>
                  <svg className="inline mr-2 w-6 h-6 text-gray-700 animate-spin fill-pink-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div> }
                <span className='flex flex-row'>
                  <span className='px-1'>Generate</span>
                  <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block ${ loading ? "text-gray-200" : "text-yellow-200" }`} />
                </span>
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
                  className={`${s.actionButton} justify-center m-1 py-3 px-3 text-white rounded active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none`}
                  disabled={loading}
              > 
                { loading && 
                <div role="status" className='h-0'>
                  <svg className="inline mr-2 w-6 h-6 text-gray-700 animate-spin fill-pink-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div>}
              
                <span className='flex flex-row'>
                  <span className='px-1'>Generate</span>
                  <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block ${ loading ? "text-gray-200" : "text-yellow-200" }`} />
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
                    <SwiperSlide key={i.id} style={{display: "flex", justifyContent: "center"}}>
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
            <h2 className={`${s.resultTitle} text-5xl p-10 pt-20 w-screen`}>Results!</h2>
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
                    <div className={`${s.wrapper}`} key={i.id}>
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
              <p className={`text-gray-50 p-8 lg:p-1`}>
                In August 2022, text-to-image AI art has won the first place in a digital art competition.
              </p>
              <p className={`text-gray-50 p-8 lg:p-1`}>
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
