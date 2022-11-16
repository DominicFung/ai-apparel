import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import { v4 as uuidv4 } from 'uuid'

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

export interface MockRequest {
  baseImage: string,
  topImage: string,
  combine: string
}

export interface MockResponse {
  url: string
}

// https://www.npmjs.com/package/images
// https://stackoverflow.com/questions/8070708/merge-2-images-with-node-js

export default async function handler(req: NextApiRequest,res: NextApiResponse<MockResponse>) {
  const b = JSON.parse(req.body) as MockRequest

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

  const command1 = new GetObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: b.baseImage
  })
  const baseImg =  await s3.send(command1)

  const command2 = new GetObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: b.topImage
  })
  const topImg = await s3.send(command2)
  let base = await baseImg.Body?.transformToByteArray()
  let top = await topImg.Body?.transformToByteArray()
  
  let combine = await sharp(base)
    .composite([{ input: await sharp(top).toBuffer(), top: 870, left: 635 }]).toBuffer()

  let id = uuidv4()
  const command3 = new PutObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: `${b.combine}/${id}.jpg`,
    Body: combine
  })
  await s3.send(command3)
  res.json({ url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${b.combine}/${id}.jpg` })
}
