import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand, PutObjectCommand, ListObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
import { ProductImage } from '../../products/[productId]'
Amplify.configure({...config, ssr: true })

export interface MockResponse {
  url: string
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<MockResponse>) {
  const { userId, serviceId } = req.query
  const b = JSON.parse(req.body) as ProductImage

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

  const key = `public/${userId}/stablediffusion/${serviceId}/mockups/${b.id}/combine-${b.fullXY.top}-${b.fullXY.left}.jpg`
  try {
    const command0 = new HeadObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: key
    })
    let response = await s3.send(command0)
    console.log(response)
  } catch {
    console.log(`Mock Image: None saved at "${key}". Generating ..`)

    const command1 = new GetObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: b.full.split(`.s3.amazonaws.com/`)[1]
    })
    const baseImg =  await s3.send(command1)

    
    const command2 = new GetObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: `public/${userId}/stablediffusion/${serviceId}/original.jpg`
    })
    const topImg = await s3.send(command2)

    let base = await baseImg.Body?.transformToByteArray()
    let top = await topImg.Body?.transformToByteArray()

    let combine = await sharp(base)
      .composite([{ input: await sharp(top).toBuffer(), top: 870, left: 635 }]).toBuffer()

    
    const command3 = new PutObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: `public/${userId}/stablediffusion/${serviceId}/mockups/${b.id}/combine-${b.fullXY.top}-${b.fullXY.left}.jpg`,
      Body: combine
    })
    const result = await s3.send(command3)
    console.log(result)
  } finally {
    res.json({
      url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`
    })
  }
}