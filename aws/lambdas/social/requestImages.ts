import axios from 'axios'

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { APIGatewayEvent } from 'aws-lambda'

import namedColors from 'color-name-list'
import manualColors from '../../../color.json'

import { AIImageResponse, GenerateAIImageRequest, ReplicateStableDiffusionResponse } from '../../../types/replicate'
import { Product } from '../../../types/product'
import { MockUploadToPrintifyRequest, MockUploadToPrintifyResponse, PrintifyMockRequest, PrintifyMockResponse, VariantResponse } from '../../../types/printify'
import { CustomerRequest, CustomerResponse } from '../../../types/customer'

import { getSheetTab, head, _alphabet, _headersDrillDown, _spreadsheet } from './global'
import { auth, sheets, sheets_v4 } from '@googleapis/sheets'


const TABLE_NAME = process.env.TABLE_NAME || ''
const BUCKET_NAME = process.env.BUCKET_NAME || ''
const HOSTAPI = process.env.HOST || ''


const _WAIT_SEC = 7500
const _NUM_IMAGES = 3

export const handler = async (event: APIGatewayEvent): Promise<{statusCode: number, body: string}> => {
  console.log(event)
  if (!event.queryStringParameters?.tabName)   return { statusCode: 400, body: "bad request" }
  if (!event.queryStringParameters?.socialId)  return { statusCode: 400, body: "bad request" }

  const tabName = event.queryStringParameters!.tabName as string
  const socialId =event.queryStringParameters!.socialId as string

  const smc = new SecretsManagerClient({})
  const command = new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  })
  const rawsecret = (await smc.send(command)).SecretString

  const dynamo = new DynamoDBClient({})
  const s3 = new S3Client({})

  if (rawsecret) {
    const secret = JSON.parse(rawsecret) as any

    const authClient = await (new auth.GoogleAuth({ 
      credentials: secret.google,
      scopes: [ "https://www.googleapis.com/auth/spreadsheets" ]
    })).getClient()

    let row = 0; let soc = ""; let promptRaw = "" as string|null|undefined
    let tabRaw = undefined as sheets_v4.Schema$GridData|undefined
    const tabBase = await getSheetTab(authClient, { tabName: tabName, lastRow: 200, lastColumn: "Z" })
    if (!tabBase || !tabBase.data) return { statusCode: 500, body: "Tab data is empty." }
    for (const t of tabBase.data!) {
      if (!t || !t.rowData || t.rowData!.length <= 1) return { statusCode: 500, body: "Row Data is empty." }
      const drilldownHeaders = head(_headersDrillDown, t.rowData[0] )
      
      for (const {r, i} of t.rowData!.map((r, i) => ({r, i})) ) {
        if (i === 0) { continue } 
        else {
          console.log("getting Row ...") 
          const a = r.values![drilldownHeaders["SocialId"]]?.effectiveValue?.stringValue
          if (a && a === socialId) { 
            row = i; soc=a; 
            promptRaw = r.values![drilldownHeaders["Prompt"]]?.effectiveValue?.stringValue
            break
          }
        }
      }

      if (soc) { tabRaw=t; break }
    }

    if (!row) return { statusCode: 400, body: `No Row found with SocialId: ${socialId}` }
    if (!soc) return { statusCode: 400, body: `Missing SocialId: ${socialId}` }
    if (!tabRaw) return { statusCode: 400, body: `Tab Not Found.` }
    if (!promptRaw) return { statusCode: 400, body: `Prompt is NULL for SocialId: ${socialId}.` }
    
    const prompt = promptRaw!
    
    const res0 = (await axios({ url: HOSTAPI+"/api/customer",
      method: "post", data: JSON.stringify({ ip: "0.0.0.0", admin: secret.secret } as CustomerRequest), headers: { "Content-Type": "application/json" }
    })).data as CustomerResponse
    console.log(res0)

    const headers = { "Cookie": `token=${res0.token};`, "Content-Type": "application/json" }
    console.log(JSON.stringify(headers, null, 2))
    
    // Generate new image
    const res1 = (await axios(HOSTAPI+"/api/replicate/stablediffusion/generate", {
      method: "POST", headers, data: JSON.stringify({ num_executions: 1, input: { prompt } } as GenerateAIImageRequest)
    })).data as ReplicateStableDiffusionResponse[]
    let temp = {id: res1[0].id, status: 'PROCESSING'} as AIImageResponse
    const itemId = temp.id

    const res2 = (await axios(HOSTAPI+"/api/products", { headers })).data as Product[]
    const i1 = Math.floor(Math.random()*res2.length)

    const productId = res2[i1].productId
    const printprovider = res2[i1].printprovider

    const res3 = (await axios(HOSTAPI+'/api/printify/variants', {
      method: "POST", headers, data: JSON.stringify({ blueprintId: productId, printprovider })
    })).data as VariantResponse

    const i2 = Math.floor(Math.random()*res3.locationVariant.length)
    const variantId = res3.locationVariant[i2].id
    const cameras = res3.locationVariant[i2].mockup.cameras
    const colorName = colorNameToHex(res3.locationVariant[i2].options.color)

    console.log(`variantId: ${variantId}`)
    console.log(`cameras ${JSON.stringify(cameras)}`)
    console.log(`color Hex: ${colorName}`)

    // wait for loading to complete
    for (let i=0; i<10; i++) {
      console.log(`Waiting ... ${i}`)
      await wait(_WAIT_SEC)
      const res4 = (await axios(HOSTAPI+`/api/replicate/stablediffusion/${itemId}`, { headers })).data as AIImageResponse
      if (res4.status === "ERROR") return { statusCode: 500, body: "Image Processing Error" }
      if (res4.status === "COMPLETE") { temp = res4; break }
    }

    console.log(`temp: ${JSON.stringify(temp)}`)

    if (temp.url) {
      const g = generateRandomUniqueIntegers(_NUM_IMAGES, cameras.length)
      console.log(g)

      const _MAX = 10
      for (let k = 0; k < _MAX; k++) {
        await wait(_WAIT_SEC)
        try {
          const command0 = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `public/stablediffusion/${itemId}/original.jpg`
          })
          await s3.send(command0)
          break // hitting this line means the file exists
        } catch { console.log(`Waiting for AI generated image ... ${k}`) }

        if (k === _MAX-1) return { statusCode: 500, body: `Unable to wait for public/stablediffusion/${itemId}/original.jpg to upload.` }
      }

      const res5 = (await axios(`${HOSTAPI}/api/printify/mockup/upload`, {
        method: "POST", headers,
        data: JSON.stringify({ 
          itemId, productId, providerId: printprovider.toString()
        } as MockUploadToPrintifyRequest)
      })).data as MockUploadToPrintifyResponse
      
      let exString = "set "
      let exAttribute = {} as {[k:string]: { S: string } }
      let values = [] as string[]

      for (const {i, j} of g.map((i, j) => ({i, j}))) {
        console.log(`working with random index: ${i} camera: ${cameras[i]}`)

        const res6 = (await axios(HOSTAPI+`/api/printify/mockup/${itemId}`, {
          method: 'POST', headers,
          data: JSON.stringify({
            blueprintId: Number(productId),
            printProviderId: printprovider,
            variantId: variantId,
            cameraId: cameras[i].id,
            size: 'full',
            images: res5.images,
            baseColorHex: colorName
          } as PrintifyMockRequest)
        })).data as PrintifyMockResponse

        // Write Images to array
        exString = `${exString} image${j} = :image${j}`
        exAttribute[`:image${j}`] = { S: res6.url }
        values.push(`=IMAGE("${res6.url}")`)

        if (j < g.length-1) exString = `${exString}, `
      }

      values.push(`=HYPERLINK("${HOSTAPI}/p/${productId}/i/${itemId}")`)

      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { socialId: { S: socialId } },
        UpdateExpression: exString,
        ExpressionAttributeValues: exAttribute
      }))

      // write to google sheet.
      const sletter = _headersDrillDown.indexOf("Image1")
      const eletter = _headersDrillDown.indexOf(`Link`)
      if (sletter === -1 || eletter === -1) return { statusCode: 500, body: `Missing "Image1" or "Link" Column.` }

      const s = _alphabet.charAt(sletter)
      const e = _alphabet.charAt(eletter)

      const client = sheets({ version: "v4", auth: authClient })
      const params = {
        spreadsheetId: _spreadsheet,
        range: `${tabName}!${s}${row+1}:${e}${row+1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [ values ] }
      } as sheets_v4.Params$Resource$Spreadsheets$Values$Update
      const res7 = await client.spreadsheets.values.update(params)
      console.log(res7)

      return { statusCode: 200, body: "OK" }
    }
    return { statusCode: 500, body: "Server Error" }
  }
  return { statusCode: 500, body: "Server Error" }
}

const wait = (timeToDelay: number) => new Promise((resolve) => setTimeout(resolve, timeToDelay))

const generateRandomUniqueIntegers = (x: number, max: number): number[] => {
  let range = Array.from({length: max}, (_,i) => i)
  for (let i = range.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [range[i], range[j]] = [range[j], range[i]]
  }
  return range.slice(0, x)
}

const colorNameToHex = (color: string): string => {
  let c = namedColors.find( c => c.name === color )
  if (c) return c.hex
  else if ( (manualColors as any)[color] ) return (manualColors as any)[color]
  else return ""
}
