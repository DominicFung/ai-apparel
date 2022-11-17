
import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'

import cdk from '../../../../../cdk-outputs.json'
import config from "../../../../../src/aws-exports"

import { CookieShape, PrintifyImageUploadResponse, testUpload } from '../../../../../utils/testUpload'

export interface Upload {
  productId: string
  providerId: string
  itemId: string
}

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

    let test = await testUpload(response.Body as ReadableStream<any>, cookies)
    res.json(test)
  }
}