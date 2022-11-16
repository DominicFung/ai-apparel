
import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'

import {Readable} from "stream"
import {FormDataEncoder} from "form-data-encoder"
import { FormData, Blob } from "formdata-node"
import fetch from "node-fetch"
import got from 'got'

import cdk from '../../../../../cdk-outputs.json'
import config from "../../../../../src/aws-exports"
import secret from "../../../../../secret.json"
import { CookieShape, PrintifyImageUploadResponse, testUpload } from '../../../../../utils/testUpload'

export interface Upload {
  productId: string
  providerId: string
  itemId: string
}

interface PrinifyUploadRequest {
  file_name: string,
  url: string
}

interface PrintifyUploadResponse {
  id: string
  file_name: string
  height: number
  width: number
  size: number
  mime_type: "image/png",
  preview_url: string,
  upload_time: string
}

// export interface PrintifyImageUploadResponse {
//   id: string,
//   file_name: string,
//   height: number,
//   width: number,
//   size: number,
//   mime_type: 'image/png',
//   preview_url: string,
//   upload_time: string
// }

// https://images.printify.com/storage/anonymous
export default async function handler(req: NextApiRequest, res: NextApiResponse<PrintifyImageUploadResponse>) {
  const { userId } = req.query
  const b = JSON.parse(req.body) as Upload
  console.log(b)

  let s3Config = {} as S3ClientConfig
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
  else { 
    s3Config["credentials"] = { 
      accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
      secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
    }
    s3Config.region = 'us-east-1'
  }
  const s3 = new S3Client(s3Config)
  const key = `public/${userId}/stablediffusion/${b.itemId}/original.jpg`

  //const url = "https://api.printify.com/v1/uploads/images.json"
  // let upload = await got.post(url, { 
  //   headers: {"Authorization": `Bearer ${secret.printify.token}`},
  //   body: JSON.stringify({
  //     file_name: `${b.itemId}.png`,
  //     url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`
  //   } as PrinifyUploadRequest )
  // }).json() as PrintifyImageUploadResponse
  // console.log(upload)
  // res.json(upload)
  

    const command = new GetObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: key
    })
    let response = await s3.send(command)
    if (response.Body) {

      const command1 = new GetObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: `settings/cookies.json`
      })
      let cookieRaw = await (await s3.send(command1)).Body?.transformToString()
      if (!cookieRaw) { console.error(`cookies not found in settings/cookies.json`); res.status(401); return }
      let cookies = JSON.parse(cookieRaw) as CookieShape[]

      // const baseUrl = `https://printify.com/app/editor/${b.productId}/${b.providerId}`
      // let baseRes = await got.get(baseUrl, {
      //   headers: {
      //     'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
      //   }
      // })
      // console.log(baseRes.headers)
      // const rawCookie = baseRes.headers['set-cookie'] as string[]
      // const cookie = rawCookie.map((i) => i.split(";")[0])
      // console.log(cookie)

      let test = await testUpload(response.Body as ReadableStream<any>, cookies)
      res.json(test)
      
      // const form = new FormData()
      // const file = await response.Body.transformToByteArray()
      // form.set('file', file)
      // form.set('isListed', true)
  
      // const url = "https://images.printify.com/storage/anonymous"
      // const encoder = new FormDataEncoder(form)
  
      // const options = {
      //   method: "post",
      //   headers: {
      //     ... encoder.headers,
      //     'authority':'images.printify.com',
      //     'accept': "application/json, text/plain, */*",
      //     'accept-language':'en-US,en;q=0.9',
      //     'dnt': '1',
      //     'origin': "https://printify.com",
      //     'referer': "https://printify.com/",
      //     "sec-ch-ua": '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
      //     "sec-ch-ua-mobile": "?0",
      //     "sec-ch-ua-platform": "macOS",
      //     "sec-fetch-dest": "empty",
      //     "sec-fetch-mode": "cors",
      //     "sec-fetch-site": "same-site",
      //     'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
      //     'Cookie':  cookieString
      //   },
      //   body: Readable.from(encoder),
      //   redirect: "follow" as RequestRedirect
      // }
  
      // const result = await fetch(url, options)
      // console.log(result)

      // const r = await result.json() as PrintifyImageUploadResponse
      // res.json(r)
    }
}