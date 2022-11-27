import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { Client, CreatePaymentRequest, Environment } from 'square'

import { v4 as uuidv4 } from 'uuid'
import { got } from 'got'

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"
import secret from '../../../../secret.json'

import { Order, OrderItem } from '../../../../types/order'

import { calculatePrice, Conversion, Currency, SQUARE_ENV } from '../../../../utils/utils'

import { PaymentResponse, PaymentRequest } from '../../../../types/square'
import { PrintifyOrderRequest, PrintifyOrderResponse } from '../../../../types/printify'

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

const env = {
  "sandbox": Environment.Sandbox,
  "production": Environment.Production
}

const { paymentsApi } = new Client({
  accessToken: secret.square[SQUARE_ENV].token,
  environment: env[SQUARE_ENV]
})

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

export default async function handler(req: NextApiRequest,res: NextApiResponse<PaymentResponse>) {
  if (req.method === 'POST') {
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
    } as PrintifyOrderRequest

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
        orderId, customerId: b.customerId,
        orderItemIds: b.orders,
        printify: { request: p, response: response },
        square: { request: s, response: result }
      } as Order)
    })
    const r = await client.send(command)
    console.log(r)
    
    res.json({
      orderId, printifyId: response.id, squareId: result.payment?.id
    } as PaymentResponse)
  }
}
