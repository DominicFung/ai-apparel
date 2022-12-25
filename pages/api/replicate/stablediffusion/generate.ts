import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, PutItemCommand, PutItemCommandOutput } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { got } from 'got'
import Iron from '@hapi/iron'

import secret from '../../../../secret.json'
import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

import { Amplify } from "aws-amplify"
Amplify.configure({...config, ssr: true })

import { AIService, GenerateAIImageRequest, ReplicateStableDiffusionRequest, ReplicateStableDiffusionResponse } from '../../../../types/replicate'
import { Customer } from '../../../../types/customer'
import { STABLEDIFF_MODEL_VERSION } from '../../../../types/constants'
import { hasProfanity, hasTrademark } from '../../../../utils/utils'

export default async function handler(req: NextApiRequest,res: NextApiResponse<ReplicateStableDiffusionResponse[]>) {
  console.log(`GET /api/replicate/stablediffusion/generate`)
  const token = req.cookies.token
  if (!token) { res.status(401); return }

  let b = req.body as GenerateAIImageRequest
  let c = await Iron.unseal(token as string, secret.seal, Iron.defaults) as Customer

  console.log(b)
  console.log(c)

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
    let responses = [] as ReplicateStableDiffusionResponse[]
    let dynamoPromise = [] as Promise<PutItemCommandOutput>[]

    for (let i=0; i<b.num_executions; i++) {
      let replicateRes = await got.post("https://api.replicate.com/v1/predictions", {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
        body: JSON.stringify({
          version: STABLEDIFF_MODEL_VERSION,
          input: b.input
        } as ReplicateStableDiffusionRequest)
      }).json() as ReplicateStableDiffusionResponse

      // Check prompt for profanity and trademark
      const isPrivate = hasProfanity(b.input.prompt) || hasTrademark(b.input.prompt)
      const canAccess = [c.customerId]

      const service = {
        serviceId: replicateRes.id,
        customerId: c.customerId,
        input: { prompt: b.input.prompt },
        created_at: replicateRes.created_at,
        aiPlatform: 'REPLICATE',
        aiModel: 'stablediffusion',
        aiModelVersion: STABLEDIFF_MODEL_VERSION,
        serviceStatus: 'PROCESSING',
        response: JSON.stringify(replicateRes),

        disable: false,
        isPrivate, canAccess
      } as AIService

      if (replicateRes.error === null) {
        const command = new PutItemCommand({
          TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
          Item: marshall(service)
        })

        responses.push(replicateRes)
        dynamoPromise.push(client.send(command))
      } else { console.error(`Issue with Replicate Job Id: ${replicateRes.id}, error: ${replicateRes.error}`) }
    }

    await Promise.all(dynamoPromise)
    res.json(responses)
  } else res.status(401)
}