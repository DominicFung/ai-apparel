import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import got from 'got'

import { ProductImage } from '../../products/[productId]'
import { ReplicateSRResponse } from '../replicate/rudalle-sr/[serviceId]'

import cdk from '../../../../cdk-outputs.json'
import secret from '../../../../secret.json'
import config from "../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

export interface MockResponse {
  url: string
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<MockResponse>) {
  const { userId, serviceId } = req.query
  const b = JSON.parse(req.body) as ProductImage
  console.log(JSON.stringify(b, null, 2))

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

  if (b.full.view === "none") {
    try {
      const command1 = new HeadObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: b.full.url.split(`.s3.amazonaws.com/`)[1]
      })
      await s3.send(command1)
    } catch {
      console.log(`Mock Image: Base Image not saved at "${b.full.url}". Saving ..`)

      let repImage = await got.get(b.full.externalUrl, {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      }).json() as ReplicateSRResponse

      let baseImg = await got.get(repImage.output, {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      })
      const command1 = new PutObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: b.full.url.split(`.s3.amazonaws.com/`)[1],
        Body: baseImg.rawBody
      })
      await s3.send(command1)
    }

    res.json({ url: b.full.url })
    return
  }

  const key = `public/${userId}/stablediffusion/${serviceId}/mockups/${b.id}/${b.full.view}/combine-${b.full.coordinates.top}-${b.full.coordinates.left}.jpg`
  try {
    const command0 = new HeadObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: key
    })
    let response = await s3.send(command0)
    console.log(response)
  } catch {
    console.log(`Mock Image: None saved at "${key}". Generating ..`)

    let baseImg, base
    try {
      const command1 = new HeadObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: b.full.url.split(`.s3.amazonaws.com/`)[1]
      })
      await s3.send(command1)

      const command2 = new GetObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: b.full.url.split(`.s3.amazonaws.com/`)[1]
      })
      baseImg = await s3.send(command2)
      base = await baseImg.Body?.transformToByteArray()
    } catch {
      console.log(`Mock Image: Base Image not saved at "${b.full.url}". Saving ..`)

      let repImage = await got.get(b.full.externalUrl, {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      }).json() as ReplicateSRResponse

      baseImg = await got.get(repImage.output, {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      })
      base = baseImg.rawBody
      const command1 = new PutObjectCommand({
        Bucket: cdk["AIApparel-S3Stack"].bucketName,
        Key: b.full.url.split(`.s3.amazonaws.com/`)[1],
        Body: baseImg.rawBody
      })
      await s3.send(command1)
    } 

    if (!baseImg) { res.status(500); return }
    const command2 = new GetObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: `public/${userId}/stablediffusion/${serviceId}/original.jpg`
    })
    const topImg = await s3.send(command2)
    console.log("Mock Image: Both Image Grabbed.")
    let top = await topImg.Body?.transformToByteArray()

    //console.log(base)

    let combine = await sharp(base)
      .composite([{ input: await sharp(top).toBuffer(), top: b.full.coordinates.top, left: b.full.coordinates.top }]).toBuffer()
    
    const command3 = new PutObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: key,
      Body: combine
    })
    const result = await s3.send(command3)
    console.log(result)
  }

  res.json({
    url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`
  })
}