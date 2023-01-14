import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { S3Client, S3ClientConfig, PutObjectCommand } from '@aws-sdk/client-s3'
import { got } from 'got'
import Iron from '@hapi/iron'

import secret from '../../../../secret.json'
import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

import { Customer } from '../../../../types/customer'

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

import { ReplicateStableDiffusionResponse, AIImageResponse, AIService } from '../../../../types/replicate'
import { unmarshall } from '@aws-sdk/util-dynamodb'

export default async function handler(req: NextApiRequest,res: NextApiResponse<AIImageResponse|string>) {
  const token = req.cookies.token
  const serviceId = req.query.serviceId as string

  if (token) {
    const customer = await Iron.unseal(token as string, secret.seal, Iron.defaults) as Customer

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
    let s3 = new S3Client(s3Config)

    let promise = []

    try {
      let result = await got.get(`https://api.replicate.com/v1/predictions/${serviceId}`, {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      }).json() as ReplicateStableDiffusionResponse

      if (result.output && result.output.length > 0) {
        let img = await got.get(result.output[0], {
          headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
        })
    
        const key = `public/stablediffusion/${serviceId}/original.jpg`
        const s3Command = new PutObjectCommand({
          Bucket: cdk["AIApparel-S3Stack"].bucketName,
          Key: key,
          Body: img.rawBody
        })
        promise.push(s3.send(s3Command))
    
        const command = new UpdateItemCommand({
          TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
          Key: { serviceId: { S: serviceId } },
          UpdateExpression: "set serviceStatus = :serviceStatus, serviceUrl = :serviceUrl",
          ExpressionAttributeValues: { 
            ':serviceStatus': { S: 'COMPLETE' },
            ':serviceUrl': { S: result.output[0] }
          }
        })
        promise.push(client.send(command))
    
        const command0 = new GetItemCommand({
          TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
          Key: { serviceId: { S: serviceId } }
        })
        const response0 = await client.send(command0)
        if (!response0.Item) { res.status(404).send("Not Found."); return }
        const service = unmarshall(response0.Item) as AIService
    
        const sr = JSON.parse(service.response) as { input: { prompt: string } }
        await Promise.all(promise)

        console.log(`service private? ${service.isPrivate}`)
        console.log(`canAccess: ${service.canAccess}, customerId: ${customer.customerId}`)
        console.log(`what: ${service.canAccess?.includes(customer.customerId)}`)

        if (service.disable) {
          res.status(401).send("Unauthorized."); return
        } else if (service.isPrivate && service.canAccess && !service.canAccess.includes(customer.customerId)) {
          res.status(403).json(`https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`); return
        } else if (service.isPrivate && service.canAccess && service.canAccess.includes(customer.customerId)) {
          res.status(200).json({
            id: serviceId,
            status: "COMPLETE",
            url: result.output[0],
            prompt: sr.input.prompt,
            private: true
          }); return
        } else {
          console.log("returning good stuff")
          res.status(200).json({
            id: serviceId,
            status: "COMPLETE",
            url: result.output[0],
            prompt: sr.input.prompt
          }); return
        }
    
      } else if (result.status === 'failed') {
        const command = new UpdateItemCommand({
          TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
          Key: { serviceId: { S: serviceId } },
          UpdateExpression: "set serviceStatus = :serviceStatus",
          ExpressionAttributeValues: { ':serviceStatus': { S: 'ERROR' } }
        })
        await client.send(command)
        res.status(200).json({ status: "ERROR", id: serviceId }); return
      } else {
        res.status(200).json({status: "PROCESSING", id: serviceId }); return
      }
    } catch {
      res.status(404).send("Image not found."); return
    }
  }
  res.status(401).send("Unauthorized.")
}