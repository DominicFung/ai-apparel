
import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'

import fs from 'fs'

import cdk from '../../../../cdk-outputs.json'

import { CookieShape, PrintifyImageUploadResponse, uploadToPrintifyImages } from '../../../../utils/printify'
import { MockImage, MockUploadToPrintifyRequest, MockUploadToPrintifyResponse, PrintifyImagePreviewImage } from '../../../../types/printify'
import sharp from 'sharp'

import path from 'path';
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { AIService } from '../../../../types/replicate'

path.resolve(process.cwd(), 'fonts', 'fonts.conf');
path.resolve(process.cwd(), 'fonts', 'Quicksand-VariableFont_wght.ttf');

// https://images.printify.com/storage/anonymous
export default async function handler(req: NextApiRequest, res: NextApiResponse<MockUploadToPrintifyResponse>) {
  const b = JSON.parse(req.body) as MockUploadToPrintifyRequest

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

  // Get Prompt
  const command0 = new GetItemCommand({
    TableName: cdk["AIApparel-DynamoStack"].AIApparelaiServiceTableName,
    Key: { serviceId: { S: b.itemId } }
  })
  const response0 = await client.send(command0)
  if (!response0.Item) { res.status(404); return }
  const service = unmarshall(response0.Item) as AIService

  //console.log(service.response)
  const sr = JSON.parse(service.response) as { input: { prompt: string } }
  //console.log(`prompt: ${sr.input.prompt}`)

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
  const key = `public/stablediffusion/${b.itemId}/original.jpg`
  
  const command = new GetObjectCommand({
    Bucket: cdk["AIApparel-S3Stack"].bucketName,
    Key: key
  })
  let response = await s3.send(command)
  if (response.Body) {

    const command1 = new GetObjectCommand({
      Bucket: cdk["AIApparel-S3Stack"].bucketName,
      Key: `settings/cookies.json`
    })
    let cookieRaw = await (await s3.send(command1)).Body?.transformToString()
    if (!cookieRaw) { console.error(`cookies not found in settings/cookies.json`); res.status(401); return }
    let cookies = JSON.parse(cookieRaw) as CookieShape[]

    let promises = [] as Promise<PrintifyImageUploadResponse>[]
    //let p = [] as PrintifyImageUploadResponse[]
    let track = [] as MockImage[]

    promises.push( uploadToPrintifyImages(response.Body as ReadableStream<any>, cookies))
    track.push({
      image: { id: "", scale: 0.666666, x: 0.5, y: 0.5, angle: 0, type: "image/png" },
      position: 'front',
      color: 'na'
    } as MockImage)

    const darkFileName = `darktemp.png`
    const lightFileName = `lighttemp.png`
    if (!fs.existsSync(path.join(process.cwd(), 'tmp')))
      fs.mkdirSync(path.join(process.cwd(), 'tmp'))

    await sharp({
      text: {
        width: 1000,
        height: 500,
        text: `<i>"${sr.input.prompt}"</i>`,
        font: 'Quicksand',
        fontfile: path.join(process.cwd(), 'fonts', 'Quicksand-VariableFont_wght.ttf'),
        align: 'center',
        justify: true,
        rgba: true
      }
    }).toFile(
      path.join(process.cwd(), 'tmp', darkFileName)
    )

    await sharp({
      text: {
        width: 1000,
        height: 500,
        text: `<span foreground="white" style="italic">"${sr.input.prompt}"</span>`,
        font: 'Quicksand',
        fontfile: path.join(process.cwd(), 'fonts', 'Quicksand-VariableFont_wght.ttf'),
        align: 'center',
        justify: true,
        rgba: true
      }
    }).toFile(
      path.join(process.cwd(), 'tmp', lightFileName)
    )

    const stream1 = fs.createReadStream(path.join(process.cwd(), 'tmp', darkFileName))
    const stream2 = fs.createReadStream(path.join(process.cwd(), 'tmp', lightFileName))
    
    promises.push( uploadToPrintifyImages(stream1, cookies) )
    track.push({
      image: { id: "", scale: 0.666666, x: 0.5, y: 0.5, angle: 0, type: "image/png" },
      position: 'back',
      color: 'black'
    } as MockImage)

    promises.push( uploadToPrintifyImages(stream2, cookies) )
    track.push({
      image: { id: "", scale: 0.666666, x: 0.5, y: 0.5, angle: 0, type: "image/png" },
      position: 'back',
      color: 'white'
    } as MockImage)

    // let logo = fs.createReadStream(join(__dirname, '../../../', './assets/Logo-Light.png'))
    // backPromises.push(uploadToPrintifyImages(logo, cookies))
    
    const p = await Promise.all(promises)

    let r = { images: [] } as MockUploadToPrintifyResponse
    for (let i in track) { 
      track[i].image.id = p[i].id
      r.images.push(track[i])
    }
    // console.log(JSON.stringify(r, null, 2))
    res.json(r)
  }
}