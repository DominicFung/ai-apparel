import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { got } from 'got'

import cdk from '../../../../../cdk-outputs.json'
import config from "../../../../../src/aws-exports"

interface PrintifyPreview {
  print: {
    placeholders: PrintifyPreviewPlaceholder[],
    necktag: boolean,       // false
    print_on_side: boolean, // false
    mirror: boolean,        // false
    canvas: boolean,        // false
    seperator_color: "#000"
  }
  decorator_id: number,     // Print Provider Id
  camera_id: number,
  variant_id: number,
  size?: number,
  blueprint_id: number,
  render_version: number    // 1
}

interface PrintifyPreviewPlaceholder {
  dom_id: ["#placeholder_back"] | ["#placeholder_front"],
  position: "back" | "front"
  printable: boolean
  images: PrintifyPreviewImages[]
}

interface PrintifyPreviewImages {
  scale: number // 0.6666666666666666
  x: number     // 0.5
  y: number     // 0.5
  angle: number // 0
  
  type: "image/png"
  src: string
  id: string

  name?: string
  flipX?: boolean
  flipY?: boolean
  layerType?: 'image'
}

export interface PrintifyMock {
  printProviderId: number
  cameraId: number
  variantId: number
  blueprintId: number
  size: 'preview'|'full'
}

export interface MockResponse {
  url: string
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<MockResponse>) {
  const { userId, itemId } = req.query
  const b = JSON.parse(req.body) as PrintifyMock

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
  const key = `public/${userId}/printify-mockup/${itemId}/${b.cameraId}/${b.size}/original.png`

  try {
    const command0 = new HeadObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: key
    })
    await s3.send(command0)
  } catch {
    let p = {
      print: {
        placeholders: [],
        necktag: false,
        print_on_side: false,
        mirror: false,
        canvas: false,
        seperator_color: "#000"
      },
      decorator_id: b.printProviderId,
      camera_id: b.cameraId,
      variant_id: b.variantId,
      blueprint_id: b.blueprintId,
      render_version: 1,
      size: b.size === 'preview' ? 128 : 512
    } as PrintifyPreview
  
    p.print.placeholders.push({
      dom_id: ["#placeholder_back"],
      position: "back",
      printable: true,
      images: []
    })
  
    p.print.placeholders.push({
      dom_id: ["#placeholder_front"],
      position: "front",
      printable: true,
      images: [{
        scale: 0.666666,
        x: 0.5,
        y: 0.5,
        angle: 0,
        type: "image/png",
        src: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/public/${userId}/stablediffusion/${itemId}/original.jpg`,
        
        /**
         * This ID comes from a post request to here: 
         *    https://images.printify.com/storage/anonymous
         *  Uploading the picture. POST request.
         */
        id: "636ec1cdca91e74067ae7f79"
      }]
    })
  
    const url = `https://images.printify.com/preview`
    let r = await got.post(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(p)
    })
  
    
    const command = new PutObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: key, Body: r.rawBody
    })
    await s3.send(command)
  }

  res.json({
    url: `https://${cdk["AIApparel-S3Stack"].bucketName}.s3.amazonaws.com/${key}`
  })
}