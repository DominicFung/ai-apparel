import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { SESClientConfig, SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { Client, CreatePaymentRequest, Environment } from 'square'

import { v4 as uuidv4 } from 'uuid'
import { got } from 'got'
import Iron from '@hapi/iron'

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"
import secret from '../../../../secret.json'

import { Order, OrderItem } from '../../../../types/order'

import { calculatePrice, Conversion, Currency, SQUARE_ENV } from '../../../../utils/utils'

import { PaymentResponse, PaymentRequest } from '../../../../types/square'
import { PrintifyOrderRequest, PrintifyOrderResponse } from '../../../../types/printify'

import { Amplify } from "aws-amplify"
import { generateEmail } from '../../../../email/reciept'
import { Customer } from '../../../../types/customer'
import { PRINTIFY_IMAGE_ANGLE, PRINTIFY_IMAGE_SCALE, PRINTIFY_IMAGE_X, PRINTIFY_IMAGE_Y } from '../../../../types/constants'

Amplify.configure({...config, ssr: true })

const env = {
  "sandbox": Environment.Sandbox,
  "production": Environment.Production
}

interface BigInt {
  toJSON: () => string;
}
BigInt.prototype["toJSON"] = function () {
  return this.toString()
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
  const token = req.cookies.token
  if (req.method === 'POST' && token) {
    let b = JSON.parse(req.body) as PaymentRequest
    const customer = (await Iron.unseal(token, secret.seal, Iron.defaults)) as Customer

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

    let sesConfig = {} as SESClientConfig
    if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }
    else {
      sesConfig["credentials"] = { 
        accessKeyId: cdk["AIApparel-IamStack"].AccessKey, 
        secretAccessKey: cdk["AIApparel-IamStack"].SecretKey 
      }
      sesConfig.region = 'us-east-1'
    }
    const ses = new SESClient(sesConfig)

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
      external_id: `${process.env.NODE_ENV}_${orderId}`,
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
        if (v.printAreas.front && typeof v.printAreas.front === "string") {
          let temp = v.printAreas.front
          v.printAreas.front = [{
            src: temp,
            scale: PRINTIFY_IMAGE_SCALE,
            x: PRINTIFY_IMAGE_X,
            y: PRINTIFY_IMAGE_Y,
            angle: PRINTIFY_IMAGE_ANGLE
          }]
        }

        if (v.printAreas.back && typeof v.printAreas.back === "string") {
          let temp = v.printAreas.back
          v.printAreas.back = [{
            src: temp,
            scale: PRINTIFY_IMAGE_SCALE,
            x: PRINTIFY_IMAGE_X,
            y: PRINTIFY_IMAGE_Y,
            angle: PRINTIFY_IMAGE_ANGLE
          }]
        }

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

    console.log("=== HERE ===")
    console.log(JSON.stringify({
      orderId, customerId: b.customerId,
      orderItemIds: b.orders,
      printify: { request: p, response: response },
      square: { request: s, response: result }
    }, null, 2))

    let command = new PutItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelorderTableName,
      Item: marshall({
        orderId, customerId: b.customerId,
        orderItemIds: b.orders,
        printify: { request: p, response: response },
        square: { request: s, response: result },
        environment: process.env.NODE_ENV
      } as Order, { removeUndefinedValues: true }),
      
    })
    await client.send(command)

    const paymentResposne = {
      orderId, printifyId: response.id, squareId: result.payment?.id
    } as PaymentResponse


    await ses.send( new SendEmailCommand({
      Source: "no-reply@aiapparelstore.com",
      ConfigurationSetName: "aiapparelstore", // might not need
      Destination: { 
        ToAddresses: [ b.addressTo.email ],
        CcAddresses: [ 'hello@aiapparelstore.com' ],
        BccAddresses: [ "dominic.fung@icloud.com" ] 
      },
      Message: {
        Subject: { Data: "Thank You!" },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: (await generateEmail(customer, orderItems, price, b, paymentResposne)).html
          }
        }  
      } 
    }))

    res.json(paymentResposne)
  }
}
