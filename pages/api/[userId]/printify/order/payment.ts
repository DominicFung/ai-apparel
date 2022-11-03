import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { Client, CreatePaymentRequest, CreatePaymentResponse, Environment } from 'square'
import { TokenResult } from '@square/web-sdk'

import { v4 as uuidv4 } from 'uuid'
import { got } from 'got'

import { CountryCode } from '../getprice'

import cdk from '../../../../../cdk-outputs.json'
import config from "../../../../../src/aws-exports"
import secret from '../../../../../secret.json'
import { calculatePrice, Conversion, Currency, SQUARE_ENV } from '../../../../../utils/utils'

//BigInt.prototype.toJSON = function() { return this.toString() }

import { Amplify } from "aws-amplify"
import { OrderItem } from './single'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
Amplify.configure({...config, ssr: true })

const env = {
  "sandbox": Environment.Sandbox,
  "production": Environment.Production
}

const { paymentsApi } = new Client({
  accessToken: secret.square[SQUARE_ENV].token,
  environment: env[SQUARE_ENV]
})

export interface PaymentRequest {
  sourceId: TokenResult,
  orders: [string],
  addressTo: AddressTo
}

export interface AddressTo {
  firstname: string
  lastname: string
  email: string
  phone: string
  country: CountryCode
  region: string
  address1: string
  address2: string
  city: string
  zip: string
}

interface Order {
  userId: string
  orderId: string
  orderItemIds: string[]
  printify: {
    request: PrintifyOrder,
    response: PrintifyOrderResponse
  }
  square: {
    request: CreatePaymentRequest,
    response: CreatePaymentResponse
  }
}

export interface TrackingOrder {
  orderId: string,
  printifyId: string,
  squareId: string
}

interface PrintifyOrder {
  "external_id": string,
  "label"?: string,
  "line_items": {
    "print_provider_id": number,
    "blueprint_id": number,
    "variant_id": number,
    "print_areas": {
      "front": string
    },
    "quantity": number
  }[],
  "shipping_method": number, // ??
  "send_shipping_notification": boolean,
  "address_to": {
    "first_name": string,
    "last_name": string,
    "email": string,
    "phone": string,
    "country": CountryCode,
    "region": string, //""
    "address1": string,
    "address2": string,
    "city": string,
    "zip": string
  }
}

interface PrintifyOrderResponse {
  "id": string
}

export const convertToCAD = async (price: number, currency: Currency): Promise<number> => {
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
  const command = new GetObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: `settings/conversions.json`
  })
  let res = await (await s3.send(command)).Body?.transformToString()
  if (res) {
    let conversion =  JSON.parse(res) as Conversion
    let conRate = conversion.rates[currency]
    return price * (1/conRate)
  }
  return -1
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<TrackingOrder>) {
  if (req.method === 'POST') {
    const userId = req.query.userId as string
    let b = JSON.parse(req.body) as PaymentRequest

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

    let orderItems: OrderItem[] = []
    for (let orderItemId of b.orders) {
      let command = new GetItemCommand({
        TableName: cdk["AIApparel-DynamoStack"].AIApparelorderItemTableName,
        Key: { orderItemId: { S: orderItemId } }
      })
      let response = await client.send(command)
      if (response.Item != undefined) {
        orderItems.push(unmarshall(response.Item) as OrderItem)
      }
    }

    let price = calculatePrice( orderItems )
    console.log(JSON.stringify(orderItems, null, 2))
    const orderId = uuidv4()

    let p = {
      external_id: orderId,
      line_items: [],
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: b.addressTo.firstname,
        last_name:  b.addressTo.lastname,
        email:      b.addressTo.email,
        phone:      b.addressTo.phone,
        country:    b.addressTo.country,
        region:     b.addressTo.region,
        address1:   b.addressTo.address1,
        address2:   b.addressTo.address2,
        city:       b.addressTo.city,
        zip:        b.addressTo.zip
      }
    } as PrintifyOrder

    for (let oi of orderItems) {
      for (let v of oi.choice) {
        p.line_items.push({
          "print_provider_id": Number(oi.printProviderId),
          "blueprint_id": Number(oi.productId),
          "variant_id": v.variantId,
          "print_areas": v.printAreas,
          "quantity": v.quantity
        })
      }
    }

    console.log(JSON.stringify(p, null, 2))

    let url = `https://api.printify.com/v1/shops/${secret.printify.shopId}/orders.json`
    let response = await got.post(url, {
      headers: {"Authorization": `Bearer ${secret.printify.token}`},
      body: JSON.stringify(p)
    }).json() as PrintifyOrderResponse
    console.log(response)

    const amount = await convertToCAD(price, orderItems[0].varients[0].currency)

    let s = {
      idempotencyKey: orderId,
      sourceId: b.sourceId.token as string,
      amountMoney: {
        amount: BigInt(Math.ceil(amount)),
        currency: 'CAD'
      }
    } as CreatePaymentRequest
    const { result } = await paymentsApi.createPayment(s)
    console.log(result)

    let command = new PutItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelorderTableName,
      Item: marshall({
        orderId, userId,
        orderItemIds: b.orders,
        printify: { request: p, response: response },
        square: { request: s, response: result }
      } as Order)
    })
    const r = await client.send(command)
    console.log(r)
    
    res.json({
      orderId, printifyId: response.id, squareId: result.payment?.id
    } as TrackingOrder)
  }
}
