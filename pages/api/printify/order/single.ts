import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { v4 as uuidv4 } from 'uuid'
import { DynamoDBClient, DynamoDBClientConfig, PutItemCommand, PutItemCommandOutput } from '@aws-sdk/client-dynamodb'
import  { marshall } from "@aws-sdk/util-dynamodb"
import Iron from '@hapi/iron'

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"
import secret from '../../../../secret.json'

import { OrderItem, OrderItemRequest } from '../../../../types/order'
import { Customer } from '../../../../types/customer'

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

export default async function handler(req: NextApiRequest,res: NextApiResponse<OrderItem>) {
  let b = JSON.parse(req.body) as OrderItemRequest
  let c = await Iron.unseal(req.cookies.token as string, secret.seal, Iron.defaults) as Customer

  if (c && c.customerId) {
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
      customerId: c.customerId,
      ...b
    } as OrderItem
    
    let command = new PutItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelorderItemTableName,
      Item: marshall(order)
    })
    
    console.log(order)
    await client.send(command)
    res.json(order)
  } res.status(401)
}