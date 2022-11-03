import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { got } from 'got'

import secret from '../../../../../secret.json'
import cdk from '../../../../../cdk-outputs.json'

import config from "../../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
import { ReplicateSDResponse } from '../stablediffusion/generate'
Amplify.configure({...config, ssr: true })

export interface AIService {
  serviceId: string,
  userId: string,
  input: {
    prompt?: string
    image?: string
    scale?: number
  },
  created_at: string, 
  aiPlatform: 'REPLICATE',
  aiModel: 'stablediffusion' | 'rudalle-sr'
  aiModelVersion: string,
  serviceStatus: "PROCESSING" | "COMPLETE" | "ERROR",
  response: string

  // serviceId of the super resolution
  superResolutionId?: string
  serviceUrl?: string
}

export interface SuperResolutionRequest {
  stablediffusionId: string,
  input: { scale: number }
}

export interface SRResponse extends ReplicateSDResponse {
  s3ImageUrl: string
}

// https://replicate.com/cjwbw/rudalle-sr
const MODEL_VERSION = "32fdb2231d00a10d33754cc2ba794a2dfec94216579770785849ce6f149dbc69"
export default async function handler(req: NextApiRequest,res: NextApiResponse<SRResponse>) {
  const userId = req.query.userId as string
  let b = JSON.parse(req.body) as SuperResolutionRequest

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
  
  const command1 = new GetItemCommand({
    TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
    Key: { serviceId: { S: b.stablediffusionId } }
  })
  const response = await client.send(command1)
  
  if (response.Item) {
    const stablediffusionService = unmarshall(response.Item) as AIService
    console.log(stablediffusionService)
    if (stablediffusionService.superResolutionId) {
      console.log(stablediffusionService.superResolutionId)
      let result = await got.get(`https://api.replicate.com/v1/predictions/${stablediffusionService.superResolutionId}`, {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      }).json() as ReplicateSDResponse

      const key = `public/${userId}/rudalle-sr/${stablediffusionService.superResolutionId}/original.jpg`
      res.json({ ...result, s3ImageUrl: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`})
      return
    }
  }
    
  console.log("Generating HQ image for print ... ")
  const imgurl =  `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/public/${userId}/stablediffusion/${b.stablediffusionId}/original.jpg`
  let replicateRes = await got.post("https://api.replicate.com/v1/predictions", {
    headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
    body: JSON.stringify({
      "version": MODEL_VERSION,
      "input": {
        "image": imgurl,
        "scale": b.input.scale
      }
    })
  }).json() as ReplicateSDResponse
  console.log(replicateRes)

  if (replicateRes.error === null) {
    const service = {
      serviceId: replicateRes.id,
        userId: userId,
        input: { 
          image: imgurl,
          scale: b.input.scale
        },
        created_at: replicateRes.created_at,
        aiPlatform: 'REPLICATE',
        aiModel: 'rudalle-sr',
        aiModelVersion: MODEL_VERSION,
        serviceStatus: 'PROCESSING',
        response: JSON.stringify(replicateRes)
    } as AIService
    const command2 = new PutItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
      Item: marshall(service)
    })
    await client.send(command2)

    const command3 = new UpdateItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
      Key: { serviceId: { S: b.stablediffusionId } },
      UpdateExpression: "set superResolutionId = :superResolutionId",
      ExpressionAttributeValues: { 
        ':superResolutionId': { S: replicateRes.id },
      }
    })
    await client.send(command3)

    const key = `public/${userId}/rudalle-sr/${replicateRes.id}/original.jpg`
    res.json({ ...replicateRes, s3ImageUrl: `https://${cdk["AIApparel-S3Stack"].bucketName}/${key}`})
  }
}