import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { v4 as uuidv4 } from 'uuid'
import { DynamoDBClient, DynamoDBClientConfig, PutItemCommand, PutItemCommandOutput } from '@aws-sdk/client-dynamodb'
import  { marshall } from "@aws-sdk/util-dynamodb"

import { LocationBasedVariant } from '../variants'

import cdk from '../../../../../cdk-outputs.json'
import config from "../../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

export interface SingleItemRequest {
  printProviderId: string
  productId: string
  varients: LocationBasedVariant[]
  choice: LineItem[]
}

export interface OrderItem extends SingleItemRequest {
  orderItemId: string,
  userId: string,
}

export interface LineItem {
    "variantId": number,
    "printAreas": {
      "front": string
    },
    "quantity": number
}

export default async function handler(req: NextApiRequest,res: NextApiResponse) {
  const userId = req.query.userId as string
  let b = JSON.parse(req.body) as SingleItemRequest

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

  let order = {
    orderItemId: uuidv4(),
    ...b, userId, 
  } as OrderItem
  
  let command = new PutItemCommand({
    TableName: cdk["AIApparel-DynamoStack"].AIApparelorderItemTableName,
    Item: marshall(order)
  })
  
  console.log(order)
  await client.send(command)
  res.json(order)
}