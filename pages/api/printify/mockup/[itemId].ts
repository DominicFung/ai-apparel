import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { got } from 'got'

import cdk from '../../../../cdk-outputs.json'
import config from "../../../../src/aws-exports"

import { PrintifyImagePreview, PrintifyImagePreviewImage, PrintifyMockRequest, PrintifyMockResponse } from '../../../../types/printify'

const isBright = (color: string): boolean => {
  const hex = color.replace('#', '');
  const c_r = parseInt(hex.substring(0, 0 + 2), 16);
  const c_g = parseInt(hex.substring(2, 2 + 2), 16);
  const c_b = parseInt(hex.substring(4, 4 + 2), 16);
  const brightness = ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
  return brightness > 155;
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<PrintifyMockResponse>) {
  const { itemId } = req.query
  const b = JSON.parse(req.body) as PrintifyMockRequest
  //console.log(JSON.stringify(b.images, null, 2))

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
  const key = `public/printify-mockup/${itemId}/${b.cameraId}/${b.size}/original.png`

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
    } as PrintifyImagePreview

    let fronts = [] as PrintifyImagePreviewImage[]
    let backs = [] as PrintifyImagePreviewImage[]
    for (let i of b.images) {
      //console.log(`${i.position} ${i.color}`)
      if (i.position === 'front') { 
        fronts.push(i.image); continue
      } else if (i.position === 'back') { 
        let light = isBright(b.baseColorHex)
        if (i.color === 'white' && !light) {
          backs.push(i.image); continue
        } else if (i.color === 'black' && light) {
          backs.push(i.image); continue
        } // else { console.error(`text and background matching failed. ${b.baseColorHex} text Color: ${i.color}, shirt is bright?: ${light}`) }
      } else { console.error(`position not found: ${i.position}`) }
    }

    console.log(backs)
    
    p.print.placeholders.push({
      dom_id: ["#placeholder_back"],
      position: "back",
      printable: true,
      images: backs
    })
  
    p.print.placeholders.push({
      dom_id: ["#placeholder_front"],
      position: "front",
      printable: true,
      images: fronts
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