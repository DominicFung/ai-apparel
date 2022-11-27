import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { S3Client, S3ClientConfig, PutObjectCommand } from '@aws-sdk/client-s3'
import { got } from 'got'

import secret from '../../../../secret.json'
import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

import { ReplicateStableDiffusionResponse, AIImageResponse } from '../../../../types/replicate'

export default async function handler(req: NextApiRequest,res: NextApiResponse<AIImageResponse>) {
  const serviceId = req.query.serviceId as string

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

  let result = await got.get(`https://api.replicate.com/v1/predictions/${serviceId}`, {
    headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
  }).json() as ReplicateStableDiffusionResponse

  if (result.output && result.output.length > 0) {
    let img = await got.get(result.output[0], {
      headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
    })

    const s3Command = new PutObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: `public/stablediffusion/${serviceId}/original.jpg`,
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
    Promise.all(promise)
    res.status(200).json({
      id: serviceId,
      status: "COMPLETE",
      url: result.output[0]
    })
  } else if (result.status === 'failed') {
    const command = new UpdateItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
      Key: { serviceId: { S: serviceId } },
      UpdateExpression: "set serviceStatus = :serviceStatus",
      ExpressionAttributeValues: { ':serviceStatus': { S: 'ERROR' } }
    })
    await client.send(command)
    res.status(200).json({ status: "ERROR", id: serviceId })
  } else {
    res.status(200).json({status: "PROCESSING", id: serviceId })
  }
}