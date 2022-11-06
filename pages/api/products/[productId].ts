import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, GetItemCommand, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import  { unmarshall } from "@aws-sdk/util-dynamodb"

import cdk from '../../../cdk-outputs.json'

import config from "../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

export interface Product {
  productId: string /** same as for platform */
  platform: 'gelato'|'printful'|'printify',
  printprovider?: number
  type: 'shirt' | 'tote' | 'hoodie',
  title: string
  description: string
  images: ProductImage[]
}

export interface ProductImage {
  id: string
  full: string
  preview: string
  fullXY: ProductImageCoordinates
  previewXY: ProductImageCoordinates
}

export interface ProductImageCoordinates {
  top: number, left: number
}

/**
 * http://localhost:3000/products/1090/item/xoonokm3e5ac3dqumzmcfmr2wu
 * 
    POSTMAN
    https://api.printify.com/v1/catalog/blueprints.json

    {
        "id": 1090,
        "title": "Natural Tote Bag",
        "description": "A 100% cotton tote bag is the champion of durability, sustainability, and style. You can print your stunning designs on both sides of this bag in beautiful quality that'll last for years to come.<div>.:Material: 6 oz./yd², 100% natural cotton canvas fabric</div><br /><div>.:One size: 15\" x 16\" (38.1cm x 40.6cm)</div><br /><div>.:Convenient self-fabric handles</div><br /><div>.:Double-sided print</div>",
        "brand": "S&S Bags",
        "model": "42795",
        "images": [
            "https://images.printify.com/62a87c8f8ee62c507507bf35",
            "https://images.printify.com/62b02ad7ebb57f0d3e07ac80",
            "https://images.printify.com/62a1e8518daaf5c7e50353ca",
            "https://images.printify.com/62aae0fcf3f409724f048967",
            "https://images.printify.com/632d85c08a4829244c052ef8"
        ]
    },
 */

export default async function handler(req: NextApiRequest,res: NextApiResponse<Product>) {
  console.log(req.query)
  const productId = req.query.productId as string
  
  let config = {} as DynamoDBClientConfig
  console.log(process.env.AWS_PROFILE)
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
  else { 
    config["credentials"] = { 
      accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
      secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
    }
    config.region = 'us-east-1'
  }
  let client = new DynamoDBClient(config)

  let command = new GetItemCommand({
    TableName: cdk["AIApparel-DynamoStack"].AIApparelproductTableName,
    Key: { productId: { S: productId } }
  })

  let response = await client.send(command)
  if (response.Item != undefined) {
    console.log(unmarshall(response.Item) as Product)
    res.json(unmarshall(response.Item) as Product)
  } else { res.status(401)}
}