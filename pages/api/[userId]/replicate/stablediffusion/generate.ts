import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, PutItemCommand, PutItemCommandOutput } from '@aws-sdk/client-dynamodb'
import { got } from 'got'

import secret from '../../../../../secret.json'
import cdk from '../../../../../cdk-outputs.json'

export interface RequestProps {
  num_executions: number,
  userId: string,
  userType: 'GUEST' | 'FB',
  input: ReplicateSDRequest
}

export interface ReplicateSDRequest {
  prompt: string,
  width?: number,
  height?: number
}

/*
{"completed_at":null,"created_at":"2022-10-22T19:23:09.547552Z","error":null,"hardware":"gpu-a100","id":"jfxln7xypfd27fbzmnai3r7dmy","input":{"prompt":"Obama as an anime character"},"logs":null,"metrics":{},"output":null,"started_at":null,"status":"starting","urls":{"get":"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy","cancel":"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy/cancel"},"version":"cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37","webhook_completed":null}
*/

export interface ReplicateSDResponse {
  completed_at: string|null,
  created_at: string,
  error: string|null,
  hardware: "cpu" | "gpu-t4" | "gpu-a100",
  id: string,
  input: ReplicateSDRequest
  logs: string,
  metrics: any,
  output: null,
  started_at: null,
  status: string ,
  urls: {
    get: string     //"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy",
    cancel: string  //"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy/cancel"
  },
  version: string
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<ReplicateSDResponse[]>) {
  console.log(req.query)
  console.log(req.body)
  let b = req.body as RequestProps

  let config = {} as DynamoDBClientConfig
  console.log(process.env.AWS_PROFILE)
  if (process.env.AWS_PROFILE) { config["credentials"] = fromIni({ profile: process.env.AWS_PROFILE }) }

  let client = new DynamoDBClient(config)
  let responses = [] as ReplicateSDResponse[]
  let dynamoPromise = [] as Promise<PutItemCommandOutput>[]

  for (let i=0; i<b.num_executions; i++) {
    let replicateRes = await got.post("https://api.replicate.com/v1/predictions", {
      headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
      body: JSON.stringify({
        "version": "cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37",
        "input": b.input
      })
    }).json() as ReplicateSDResponse

    if (replicateRes.error === null) {
      const command = new PutItemCommand({
        TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
        Item: {
          serviceId: { S: replicateRes.id },
          userId: { S: b.userId },
          prompt: { S: b.input.prompt },
          created_at: { S: replicateRes.created_at }, 
          aiPlatform: { S: 'REPLICATE' },
          status: { S: "PENDING" },
          retryAttempt: { N: `0` },
          response: {S: JSON.stringify(replicateRes)}
        }
      })

      responses.push(replicateRes)
      dynamoPromise.push(client.send(command))
    } else { console.error(`Issue with Replicate Job Id: ${replicateRes.id}, error: ${replicateRes.error}`) }
  }

  await Promise.all(dynamoPromise)
  res.status(200).json(responses)
}