import { useEffect, useState } from 'react'
import { NextPageWithLayout } from './_app'
import Image from 'next/image'
import s from '../styles/Home.module.scss'
import { Element, scroller } from 'react-scroll'
import { ArrowPathRoundedSquareIcon, BoltIcon, QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'

import ProductPopup from '../components/popup/products'

import { Navigation, Pagination } from 'swiper'
import { Swiper, SwiperSlide} from 'swiper/react'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import Head from 'next/head'

import { AIImageResponse, GenerateAIImageRequest, ReplicateStableDiffusionResponse } from '../types/replicate'
import DefaultLayout from '../components/layouts/default'
import { getAIImageResponse, setAIImageResponse } from '../utils/localstorage'

import Filter from 'bad-words'
import TM from '@domfung/trademark'
import Link from 'next/link'
import { generatePrompt } from '../utils/utils'

const NUM_IMAGES = 3

const showCase = [
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ywhspomwuzhzllf7idhwgk3g24/75982/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/svhbglzrnrht5d6o4n5cgsuuhi/74949/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/hcbzzow2pvhvzcy5h4y2uxa4zu/53740/full/original.png",

  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ywhspomwuzhzllf7idhwgk3g24/75982/full/original.png",
  "https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/printify-mockup/ucz6jdbkmvdmdnzmsv75aaa2xm/75191/full/original.png",
]

const Home: NextPageWithLayout = (props) => {
  const filter = new Filter()
  const tm = new TM()

  const [prompt, setPrompt] = useState("")
  const [images, setImages] = useState<AIImageResponse[]>([])

  const [ loading, setLoading ] = useState(false)

  const [ openProducts, setOpenProducts ] = useState(false)
  const [ activeItemId, setActiveItemId ] = useState<string>("")

  const [ openWarning, setOpenWarning ] = useState(false)

  let checkProfanityOrTrademark = () => {
    const isProfane = filter.isProfane(prompt)
    console.log(`is profane? ${isProfane}`)

    const isTrademarked = tm.isTrademarked(prompt)
    console.log(`is Tademarked? ${isTrademarked}`)

    setOpenWarning(isProfane || isTrademarked)
  }

  let generateImages = async () => {
    checkProfanityOrTrademark()
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

    let temp = []
    for (let i=0; i<response.length; i++) {
      temp.push({id: response[i].id, status: 'PROCESSING'} as AIImageResponse)
    }

    setTimeout( reloadImages, 5000, temp)
    setImages([...temp])
    scroller.scrollTo("aiimages", {
      duration: 1500,
      delay: 100,
      smooth: true,
      offset: 50
    })
  }

  const reloadImages = async (oldImgs: AIImageResponse[]) => {
    let newImgs = []
    let loading = false

    for (let i=0; i<oldImgs.length; i++) {
      let url = `/api/replicate/stablediffusion/${oldImgs[i].id}`
      const response = await (await fetch(url)).json() as AIImageResponse
      newImgs.push(response)
      if (response.status !== 'COMPLETE') { loading = true }
    }

    if (loading) setTimeout( reloadImages, 3000, newImgs )
    else { setAIImageResponse( newImgs ) }

    setImages([... newImgs])
    setLoading(loading)
  }

  const genPrompt = () => {
    setPrompt(generatePrompt())
  }

  const selectAiImage = (itemId: string) => {
    setActiveItemId(itemId)
    setOpenProducts(true)
  }

  useEffect(() => {
    setImages( getAIImageResponse() )
  }, [])

  useEffect(() => {
    if (openWarning) {
      setTimeout(() => {
        setOpenWarning(false)
      }, 8000)
    }
  }, [openWarning])

  return (
    <>
    <Head>
      <title>
        AI Apparel Store | Generative AI
      </title>
      <meta
        name="description"
        content="FREE Generative AI Apparel Designer (Shirts, Hoodies, Tote Bags, etc.)"
        key="desc"
      />
      <meta property="og:title" content="AI Apparel Store | FREE AI Apparel Designer" />
      <meta
        property="og:description"
        content="FREE Generative AI Apparel Designer (Shirts, Hoodies, Tote Bags, etc.). Enjoy the power of Text-to-Image AI."
      />
      <meta
        property="og:image"
        content="https://aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com/public/stablediffusion/4hj6efalc5ge5bq4z32ys2kjv4/original.jpg"
      />
      <meta name="facebook-domain-verification" content="sv3nt8bevvehlx6r36ibcpax5n6w8l" />
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
              Free AI Apparel Designer
            </div>
            <p className={`${s.titleParagraph} hidden lg:inline-block text-base lg:text-2xl`}>
              Describe the image you want to see on your apparel and print!
            </p>
            
            <div className='flex w-full flex-row-reverse lg:mt-10'>
              <button onClick={generateImages}
                className={`${s.actionButton} hidden lg:flex flex-row py-5 px-3 text-white rounded hover:bg-gray-700 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none`}
                disabled={loading || prompt === ""}
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
                  <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block ${ loading || prompt === "" ? "text-gray-200" : "text-yellow-200" }`} />
                </span>
              </button>
              <button onClick={genPrompt}
                className={`${s.actionButton} hidden lg:flex flex-row mx-1 py-5 px-5 text-white rounded hover:bg-gray-700 hover:text-white active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none`}
                disabled={loading}
              > 
                <ArrowPathRoundedSquareIcon className={`${s.actionIcon} h-6 w-6 inline-block ${ loading ? "text-gray-200" : "text-white" }`} />
              </button>

              <input
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value) }}
                type="text"
                className="form-control hidden lg:block w-full mx-0 p-3 lg:text-xl
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
                className="form-control block lg:hidden w-full mx-0 p-3 lg:text-xl
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
            <div className='flex justify-center lg:hidden w-full'>
              <button onClick={genPrompt}
                className={`${s.actionButton} justify-center my-1 py-3 px-3 text-white rounded active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none`}
                disabled={loading}
              > 
                <ArrowPathRoundedSquareIcon className={`${s.actionIcon} h-6 w-6 inline-block ${ loading ? "text-gray-200" : "text-white" }`} />
              </button>
              <button onClick={generateImages}
                  className={`${s.actionButton} justify-center m-1 py-3 px-3 text-white rounded active:shadow-lg mouse shadow transition ease-in duration-200 focus:outline-none`}
                  disabled={loading || prompt === ""}
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
                  <BoltIcon className={`${s.actionIcon} h-6 w-6 inline-block ${ loading || prompt === "" ? "text-gray-200" : "text-yellow-200" }`} />
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
          <div className='max-w-screen-2xl hidden lg:block overflow-x-hidden'>
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
            <div className='max-w-screen-md pb-10 text-lg text-center'>
              <p className={`text-gray-50 px-8 py-1 lg:p-4`}>
                Our AI Apparel store uses the latest in generative AI technology to create unique and one-of-a-kind designs. Simply upload a photo of yourself, and our AI will generate a personalized design based on your unique features.
              </p>
              <p className={`text-gray-50 px-8 py-1 lg:p-4`}>
                Our AI-generated designs are perfect for print-on-demand apparel, allowing you to create custom t-shirts, hoodies, and more with your own personal touch. With our high-quality printing and fast turnaround time, you can have your custom apparel delivered to your doorstep in no time.
              </p>
              <p className={`text-gray-50 px-8 py-1 lg:p-4`}>
                In addition to our AI-generated designs, we also offer a wide selection of pre-designed apparel for you to choose from. From trendy graphics to classic styles, we have something for everyone.
              </p>
              <p className={`text-gray-50 px-8 py-1 lg:p-4`}>
              At AI Apparel, we are committed to providing the highest quality apparel and the best possible customer service. Our team of experts is always available to answer any questions you may have and help you create the perfect design for your unique style.
              </p>
              <p className={`text-gray-50 px-8 py-1 lg:p-4`}>
                Keywords: AI, generative AI, personalized design, print-on-demand apparel, custom t-shirts, hoodies, pre-designed apparel, high-quality printing, fast turnaround time, customer service.
              </p>
            </div>
          </div>
          
          
        </Element>
      </div>

      
    </div>
    <ProductPopup itemId={activeItemId} open={openProducts} setOpen={setOpenProducts} />

    <div className={'z-50 fixed bottom-5 md:left-5 delay-400 duration-500 ease-in-out transition-all transform  '+ 
        (openWarning ? 'translate-y-0' : 'translate-y-72') }>
      <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline pl-5 pr-20">
          You will not be able to share creations that have <span className='font-bold'>profanity</span> or <span className='font-bold'>trademarked</span> words. Read more <Link href='/'>here</Link>.
        </span>
        <span className="absolute top-0 bottom-0 right-0 pr-16 py-3">
          <QuestionMarkCircleIcon className='w-6 h-6 text-orange-700'/>
        </span>
        <span className='absolute top-0 bottom-0 right-0 pr-4 py-3' onClick={() => { setOpenWarning(false) }}>
          <XMarkIcon className='w-6 h-6 text-orange-500' />
        </span>
      </div>
    </div>
    </>
  )
}

Home.getLayout = (children) => {
  return <DefaultLayout>{children}</DefaultLayout>
}

export default Home
