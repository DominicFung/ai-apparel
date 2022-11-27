import type { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, PutItemCommand, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import Iron from '@hapi/iron'

import got from 'got'

import { CustomerResponse, Customer, CustomerRequest } from '../../../types/customer'
import { GeoData } from '../../../types/geodata'

import secret from '../../../secret.json'
import cdk from '../../../cdk-outputs.json'
import { marshall } from '@aws-sdk/util-dynamodb'


export default async function handler(req: NextApiRequest,res: NextApiResponse<CustomerResponse>) {
  const token = req.cookies.token
  const b = JSON.parse(req.body) as CustomerRequest

  console.log(token)
  console.log(b)

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

  if (token) {
    let customer = (await Iron.unseal(token, secret.seal, Iron.defaults)) as Customer
    if (customer) {
      customer.lastAccess = Date.now()
      const command = new PutItemCommand({
        TableName: cdk["AIApparel-DynamoStack"].AIApparelcustomerTableName,
        Item: marshall(customer)
      })
      await client.send(command)

      res.json({ token })
      return
    }
  }  
  
  if (b.ip) {
    let geo = await got.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${secret.ipgeolocation.token}&ip=${b.ip}`).json() as GeoData

    let customer = {
      customerId: uuidv4(),
      ip: b.ip, geo,
      lastAccess: Date.now()
    } as Customer

    const command = new PutItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelcustomerTableName,
      Item: marshall(customer)
    })
    await client.send(command)

    const customerToken = await Iron.seal(customer, secret.seal, Iron.defaults)
    res.json({ token: customerToken })
    return
  }

  res.status(404)
}