import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, PutItemCommand, PutItemCommandOutput } from '@aws-sdk/client-dynamodb'
import { got } from 'got'

import secret from '../../../../../secret.json'
import cdk from '../../../../../cdk-outputs.json'

// {"completed_at":"2022-10-22T19:23:13.735298Z","created_at":"2022-10-22T19:23:09.547552Z","error":null,"hardware":"gpu-a100","id":"jfxln7xypfd27fbzmnai3r7dmy","input":{"prompt":"Obama as an anime character"},"logs":"Using seed: 23357\\n\\n0it [00:00, ?it/s]\\n2it [00:00, 11.60it/s]\\n4it [00:00, 12.12it/s]\\n6it [00:00, 12.63it/s]\\n8it [00:00, 13.02it/s]\\n10it [00:00, 12.95it/s]\\n12it [00:00, 13.40it/s]\\n14it [00:01, 13.44it/s]\\n16it [00:01, 13.53it/s]\\n18it [00:01, 13.60it/s]\\n20it [00:01, 13.04it/s]\\n22it [00:01, 13.32it/s]\\n24it [00:01, 13.39it/s]\\n26it [00:01, 13.26it/s]\\n28it [00:02, 13.57it/s]\\n30it [00:02, 13.77it/s]\\n32it [00:02, 13.39it/s]\\n34it [00:02, 13.62it/s]\\n36it [00:02, 13.79it/s]\\n38it [00:02, 13.54it/s]\\n40it [00:03, 13.33it/s]\\n42it [00:03, 13.56it/s]\\n44it [00:03, 13.20it/s]\\n46it [00:03, 13.49it/s]\\n48it [00:03, 13.14it/s]\\n50it [00:03, 13.02it/s]\\n50it [00:03, 13.27it/s]\\nNSFW content detected in 0 outputs, showing the rest 1 images...","metrics":{"predict_time":4.220899},"output":["https://replicate.delivery/pbxt/w1b7SKsJeFQPDCDXeSeyvfpcVFsrwJoF31HU4Dk8eGffQqP8HA/out-0.png"],"started_at":"2022-10-22T19:23:09.514399Z","status":"succeeded","urls":{"get":"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy","cancel":"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy/cancel"},"version":"cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37","webhook_completed":null}
interface ReplicateOutput {
  completed_at: string
  created_at: string
  error: string | null
  output: string[]
  status: string | null
}

export interface GetServiceImageData {
  id: string
  status: "COMPLETE" | "PROCESSING" | "ERROR"
  url?: string
}

// returns s3 location link
// https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy
export default async function handler(req: NextApiRequest,res: NextApiResponse<GetServiceImageData>) {
  console.log(req.query)

  let result = await got.get(`https://api.replicate.com/v1/predictions/${req.query.serviceId}`, {
    headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
  }).json() as ReplicateOutput
  console.log(result)

  if (result.output && result.output.length > 0) {
    res.status(200).json({
      id: req.query.serviceId as string,
      status: "COMPLETE",
      url: result.output[0]
    })
  } else if (result.status === 'failed') {
    res.status(200).json({ status: "ERROR", id: req.query.serviceId as string })
  } else {
    res.status(420).json({status: "PROCESSING", id: req.query.serviceId as string})
  }
}