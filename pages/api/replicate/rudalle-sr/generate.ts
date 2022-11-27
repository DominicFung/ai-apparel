import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { got } from 'got'
import Iron from '@hapi/iron'

import secret from '../../../../secret.json'
import cdk from '../../../../cdk-outputs.json'

import config from "../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

import { AIService, SuperResolutionRequest, SuperResolutionResponse, ReplicateRUDalleSRResponse } from '../../../../types/replicate'
import { Customer } from '../../../../types/customer'
import { RUDALLE_MODEL_VERSION } from '../../../../types/constants'

export default async function handler(req: NextApiRequest,res: NextApiResponse<SuperResolutionResponse>) {
  let b = JSON.parse(req.body) as SuperResolutionRequest
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
        }).json() as ReplicateRUDalleSRResponse

        const key = `public/rudalle-sr/${stablediffusionService.superResolutionId}/original.jpg`
        res.json({ ...result, s3ImageUrl: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`})
        return
      }
    }
      
    console.log("Generating HQ image for print ... ")
    const imgurl =  `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/public/stablediffusion/${b.stablediffusionId}/original.jpg`
    let replicateRes = await got.post("https://api.replicate.com/v1/predictions", {
      headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      body: JSON.stringify({
        "version": RUDALLE_MODEL_VERSION,
        "input": {
          "image": imgurl,
          "scale": b.input.scale
        }
      })
    }).json() as ReplicateRUDalleSRResponse
    console.log(replicateRes)

    if (replicateRes.error === null) {
      const service = {
        serviceId: replicateRes.id,
          customerId: c.customerId,
          input: { 
            image: imgurl,
            scale: b.input.scale
          },
          created_at: replicateRes.created_at,
          aiPlatform: 'REPLICATE',
          aiModel: 'rudalle-sr',
          aiModelVersion: RUDALLE_MODEL_VERSION,
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

      const key = `public/rudalle-sr/${replicateRes.id}/original.jpg`
      res.json({ ...replicateRes, s3ImageUrl: `https://${cdk["AIApparel-S3Stack"].bucketName}/${key}`})
    }
  } else res.status(401)
}