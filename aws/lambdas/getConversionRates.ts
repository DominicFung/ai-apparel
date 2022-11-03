
import fetch from 'node-fetch'
import { S3Client, S3ClientConfig, PutObjectCommand } from '@aws-sdk/client-s3'

export const handler = async (event: any): Promise<any> => {
  console.log(event)
  if (!event.bucketName) return {"status": "Error, no bucket name"}

  let url = `https://open.er-api.com/v6/latest/CAD`
  let res = await ( await fetch(url)).json()

  console.log(res)

  let config = {} as S3ClientConfig
  const client = new S3Client(config)
  const command = new PutObjectCommand({
    Bucket: event.bucketName,
    Key: 'settings/conversions.json',
    Body: JSON.stringify(res, null, 2)
  })
  let s3Res = await client.send(command)
  console.log(s3Res)

  return {"status": "OK"}
}