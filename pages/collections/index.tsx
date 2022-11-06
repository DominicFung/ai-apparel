import Image from "next/image";
import { useEffect, useState } from "react";
import { MockRequest, MockResponse } from "../api/[userId]/mockup";
import { NextPageWithLayout } from "../_app";


const Collections: NextPageWithLayout = () => {

  const [ mock, setMock ] = useState<MockResponse>()

  const getMockup = async () => {
    let url = `/api/userid/mockup`
    let response = await (await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        baseImage: 'products/printify/1090/toteBag6.png',
        topImage: 'public/userid/stablediffusion/ywhspomwuzhzllf7idhwgk3g24/original.jpg',
        combine: 'public/userid/mockup'
      } as MockRequest)
    })).json() as MockResponse
    console.log(response)
    setMock(response)
  }
    
  useEffect(() => {
    getMockup()
  }, [])

  return (
    <div>
      <div>Mock Up</div>
      { mock && <Image src={mock.url}  alt="Current Image" layout='fill' objectFit={'contain'} /> }
    </div>
  )
}

export default Collections