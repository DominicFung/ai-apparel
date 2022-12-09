import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, ScanCommand, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'

import got from 'got'

import cdk from '../../../cdk-outputs.json'

import { unmarshall } from '@aws-sdk/util-dynamodb'
import { Product, _Product } from '../../../types/product'

export default async function handler(req: NextApiRequest,res: NextApiResponse<Product[]>) {
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

  let command = new ScanCommand({
    TableName: cdk["AIApparel-DynamoStack"].AIApparelproductTableName
  })
  const response = await client.send(command)
  if (response.Items && response.Items.length > 0) {
    let r: _Product[] = []
    response.Items.forEach((i) => { r.push( unmarshall(i) as _Product )})
    let products: Product[] = []

    for (let p of r) {
      let product = { ...p, images: []} as Product
      for (let i of p.images) {
        //const fullKey = `products/printify/${p.productId}/${i.id}/full.jpg`
        const previewKey = `products/printify/${p.productId}/${i.id}/preview.jpg` 
        
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
          preview: { ...i.preview, url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${previewKey}` }
        })
      }

      products.push(product)
    }

    res.json(products)
  } else { res.status(401) }
}