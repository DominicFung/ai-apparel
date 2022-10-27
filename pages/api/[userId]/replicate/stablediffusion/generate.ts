import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, PutItemCommand, PutItemCommandOutput } from '@aws-sdk/client-dynamodb'
import { got } from 'got'

import secret from '../../../../../secret.json'
import cdk from '../../../../../cdk-outputs.json'

import config from "../../../../../src/aws-exports"

import { Amplify, withSSRContext } from "aws-amplify"
Amplify.configure({...config, ssr: true })

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
{"completed_at":"2022-10-22T19:23:13.735298Z","created_at":"2022-10-22T19:23:09.547552Z","error":null,"hardware":"gpu-a100","id":"jfxln7xypfd27fbzmnai3r7dmy","input":{"prompt":"Obama as an anime character"},"logs":"Using seed: 23357\\n\\n0it [00:00, ?it/s]\\n2it [00:00, 11.60it/s]\\n4it [00:00, 12.12it/s]\\n6it [00:00, 12.63it/s]\\n8it [00:00, 13.02it/s]\\n10it [00:00, 12.95it/s]\\n12it [00:00, 13.40it/s]\\n14it [00:01, 13.44it/s]\\n16it [00:01, 13.53it/s]\\n18it [00:01, 13.60it/s]\\n20it [00:01, 13.04it/s]\\n22it [00:01, 13.32it/s]\\n24it [00:01, 13.39it/s]\\n26it [00:01, 13.26it/s]\\n28it [00:02, 13.57it/s]\\n30it [00:02, 13.77it/s]\\n32it [00:02, 13.39it/s]\\n34it [00:02, 13.62it/s]\\n36it [00:02, 13.79it/s]\\n38it [00:02, 13.54it/s]\\n40it [00:03, 13.33it/s]\\n42it [00:03, 13.56it/s]\\n44it [00:03, 13.20it/s]\\n46it [00:03, 13.49it/s]\\n48it [00:03, 13.14it/s]\\n50it [00:03, 13.02it/s]\\n50it [00:03, 13.27it/s]\\nNSFW content detected in 0 outputs, showing the rest 1 images...","metrics":{"predict_time":4.220899},"output":["https://replicate.delivery/pbxt/w1b7SKsJeFQPDCDXeSeyvfpcVFsrwJoF31HU4Dk8eGffQqP8HA/out-0.png"],"started_at":"2022-10-22T19:23:09.514399Z","status":"succeeded","urls":{"get":"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy","cancel":"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy/cancel"},"version":"cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37","webhook_completed":null}
*/

export interface ReplicateSDResponse {
  completed_at: string | null,
  created_at: string,
  error: string | null,
  hardware: "cpu" | "gpu-t4" | "gpu-a100",
  id: string,
  input: ReplicateSDRequest
  logs: string,
  metrics: any,
  output: string[],
  started_at: null,
  status: string | null,
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
          serviceStatus: { S: "PROCESSING" },
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