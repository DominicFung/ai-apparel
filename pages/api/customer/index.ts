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
import { GetObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import { Conversion } from '../../../utils/utils'

export default async function handler(req: NextApiRequest,res: NextApiResponse<CustomerResponse>) {
  const token = req.cookies.token

  console.log(req.body)
  let b = req.body as CustomerRequest
  if (typeof b === "string") { 
    console.log("req.body is a string")
    b = JSON.parse(b) as CustomerRequest 
  }
  
  console.log(b)
  console.log(token)
  if (!token && !b.ip) { res.status(401); return }

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
  const command0 = new GetObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: `settings/conversions-usd.json`
  })
  const s3Res = await (await s3.send(command0)).Body?.transformToString()
  if (s3Res) {
    let conversion = JSON.parse(s3Res) as Conversion

    if (token) {
      const customer = (await Iron.unseal(token, secret.seal, Iron.defaults)) as Customer
      if (customer) {
        customer.lastAccess = Date.now()
        const command = new PutItemCommand({
          TableName: cdk["AIApparel-DynamoStack"].AIApparelcustomerTableName,
          Item: marshall(customer)
        })
        await client.send(command)
        
        const refreshToken = await Iron.seal(customer, secret.seal, Iron.defaults)
        console.log(`Exchange Rate: ${customer.geo.currency.code} ${conversion.rates[customer.geo.currency.code]}`)
        res.json({ token: refreshToken, currency: customer.geo.currency.code, exchangeRate: conversion.rates[customer.geo.currency.code] })
        return
      }
    }
    
    if (b.ip) {
      console.log(b.ip)

      let geo = {
        currency: { code: "CAN", symbol: "$" }
      } as GeoData

      let customerId = uuidv4()
      if (b.admin && b.admin === secret.secret) {
        customerId = "ADMIN"
      } else {
        geo = await got.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${secret.ipgeolocation.token}&ip=${b.ip}`).json() as GeoData
      }
      const customer = {
        customerId, ip: b.ip, geo,
        lastAccess: Date.now()
      } as Customer
  
      const command = new PutItemCommand({
        TableName: cdk["AIApparel-DynamoStack"].AIApparelcustomerTableName,
        Item: marshall(customer)
      })
      await client.send(command)
  
      const customerToken = await Iron.seal(customer, secret.seal, Iron.defaults)
      console.log(`Exchange Rate: ${customer.geo.currency.code} ${conversion.rates[customer.geo.currency.code]}`)
      res.json({ token: customerToken, currency: customer.geo.currency.code, exchangeRate: conversion.rates[customer.geo.currency.code] })
      return
    }
  }
  res.status(404)
}