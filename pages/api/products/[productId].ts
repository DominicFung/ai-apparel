import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, GetItemCommand, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import  { unmarshall } from "@aws-sdk/util-dynamodb"

import got from 'got'

import cdk from '../../../cdk-outputs.json'
import config from "../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

import { Product, _Product } from '../../../types/product'

export default async function handler(req: NextApiRequest,res: NextApiResponse<Product>) {
  const productId = req.query.productId as string
  
  let config = {} as DynamoDBClientConfig
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
  else { 
    config["credentials"] = { 
      accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
      secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
    }
    config.region = 'us-east-1'
  }
  let client = new DynamoDBClient(config)

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

  let command = new GetItemCommand({
    TableName: cdk["AIApparel-DynamoStack"].AIApparelproductTableName,
    Key: { productId: { S: productId } }
  })

  let response = await client.send(command)
  if (response.Item != undefined) {
    let r = unmarshall(response.Item) as _Product
    let product = { ...r, images: []} as Product

    for (let i of r.images) {
      //const fullKey = `products/printify/${productId}/${i.id}/full.jpg`
      const previewKey = `products/printify/${productId}/${i.id}/preview.jpg`

      // try {
      //   const command0 = new HeadObjectCommand({
      //     Bucket: cdk["AIApparel-S3Stack"].bucketName,
      //     Key: fullKey,
      //   })
      //   await s3.send(command0)
      // } catch {
      //   console.log(`Full Image not yet saved "${fullKey}". Saving ..`)
      //   let img = await got.get(i.full.externalUrl, {
      //     headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      //   }).json() as ReplicateRUDalleSRResponse

      //   if (img.output) {
      //     let rawImg = await got.get(img.output, {
      //       headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      //     })

      //     const command1 = new PutObjectCommand({
      //       Bucket: cdk["AIApparel-S3Stack"].bucketName,
      //       Key: fullKey,
      //       Body: rawImg.rawBody
      //     })
      //     await s3.send(command1)
      //   }
      // } 
      
      try {
        const command0 = new HeadObjectCommand({
          Bucket: cdk["AIApparel-S3Stack"].bucketName,
          Key: previewKey
        })
        await s3.send(command0)
      } catch {
        console.log(`Full Image not yet saved "${previewKey}". Saving ..`)
        let img = await got.get(i.preview.externalUrl)
        const command1 = new PutObjectCommand({
          Bucket: cdk["AIApparel-S3Stack"].bucketName,
          Key: previewKey,
          Body: img.rawBody
        })
        await s3.send(command1)
      }

      product.images.push({
        id: i.id,
        //full: {...i.full, url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${fullKey}`},
        preview: { ...i.preview, url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${previewKey}` }
      })
    }

    res.json(product)
  } else { res.status(401) }
}