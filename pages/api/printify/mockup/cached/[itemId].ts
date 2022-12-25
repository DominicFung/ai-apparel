import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, ListObjectsV2Command } from '@aws-sdk/client-s3'

import cdk from '../../../../../cdk-outputs.json'
import config from "../../../../../src/aws-exports"

export default async function handler(req: NextApiRequest,res: NextApiResponse<string[]>) {
  const { itemId } = req.query

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

  let r = []
  const command0 = new ListObjectsV2Command({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Prefix: `public/printify-mockup/${itemId}/`
  })
  let response0 = await s3.send(command0)
  if (response0.Contents && response0.Contents.length > 0) {
    for (const o of response0.Contents) {
      if (o.Key?.includes("/preview/")) {r.push(`https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${o.Key}`)}
    }
  }
  console.log(r)
  res.status(200).json(r)
}