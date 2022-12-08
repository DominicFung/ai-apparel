import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, HeadObjectCommand } from '@aws-sdk/client-s3'
import { AIImageResponse } from '../../../../types/replicate';

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

export default async function handler(req: NextApiRequest, res: NextApiResponse<AIImageResponse>) {
  const serviceId = req.query.serviceId as string
  
  let s3Config = {} as S3ClientConfig
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
  else { 
    s3Config["credentials"] = { 
      accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
      secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
    }
    s3Config.region = 'us-east-1'
  }
  let s3 = new S3Client(s3Config)

  const darkText = `public/sharp/${serviceId}/text/dark.png`
  const lightText = `public/sharp/${serviceId}/text/light.png`

  try {
    const command1 = new HeadObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: darkText
    })
    await s3.send(command1)

    const command2 = new HeadObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: lightText
    })
    await s3.send(command2)

    res.json({
      id: serviceId,
      status: 'COMPLETE'
    })
  } catch {
    console.log(`https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${lightText}`)
    res.json({
      id: serviceId,
      status: 'PROCESSING'
    })
  }
}