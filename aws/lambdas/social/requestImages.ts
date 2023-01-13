import fetch from 'node-fetch'

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'

import namedColors from 'color-name-list'
import manualColors from '../../../color.json'

import { AIImageResponse, ReplicateStableDiffusionResponse } from '../../../types/replicate'
import { Product } from '../../../types/product'
import { MockUploadToPrintifyRequest, MockUploadToPrintifyResponse, PrintifyMockRequest, PrintifyMockResponse, VariantResponse } from '../../../types/printify'
import { CustomerRequest, CustomerResponse } from '../../../types/customer'
import { getSheetTab, head, _alphabet, _headersDrillDown, _spreadsheet } from './global'
import { auth, sheets, sheets_v4 } from '@googleapis/sheets'



const TABLE_NAME = process.env.TABLE_NAME || ''
const HOSTAPI = process.env.HOST || "https://aiapparelstore.com"

const _WAIT_SEC = 1000
const _NUM_IMAGES = 3

export const handler = async (event: any): Promise<{statusCode: number, body: string}> => {
  console.log(event)
  if (!event.tabname)   return { statusCode: 400, body: "bad request" }
  if (!event.socialId)  return { statusCode: 400, body: "bad request" }
  if (!event.prompt)    return { statusCode: 400, body: "bad request" }

  const smc = new SecretsManagerClient({})
  const command = new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  })
  const rawsecret = (await smc.send(command)).SecretString

  const dynamo = new DynamoDBClient({})

  if (rawsecret) {
    const secret = JSON.parse(rawsecret) as any
    const rraw = await fetch(HOSTAPI+"/api/customer", {
      method: "POST",
      body: JSON.stringify({ ip: "0.0.0.0", admin: secret.secret } as CustomerRequest)
    })

    console.log(rraw)
    const res0 = await (rraw).json() as CustomerResponse
    console.log(res0)

    const headers = { cookie: res0.token }
    console.log(JSON.stringify(headers, null, 2))
    
    // Generate new image
    const res1 = await (await fetch(HOSTAPI+"/api/replicate/stablediffusion/generate", {
      method: "POST", headers, body: JSON.stringify({ num_executions: 1, prompt: event.prompt })
    })).json() as ReplicateStableDiffusionResponse[]
    let temp = {id: res1[0].id, status: 'PROCESSING'} as AIImageResponse
    const itemId = temp.id

    const res2 = await (await fetch(HOSTAPI+"/api/products", { headers })).json() as Product[]
    const i1 = Math.floor(Math.random()*res2.length)

    const productId = res2[i1].productId
    const printprovider = res2[i1].printprovider

    const res3 = await ( await fetch(HOSTAPI+'/api/printify/variants', {
      method: "POST", headers, body: JSON.stringify({ blueprintId: productId, printprovider })
    })).json() as VariantResponse

    const i2 = Math.floor(Math.random()*res3.locationVariant.length)
    const variantId = res3.locationVariant[i2].id
    const cameras = res3.locationVariant[i2].mockup.cameras
    const colorName = colorNameToHex(res3.locationVariant[i2].options.color)

    // wait for loading to complete
    for (let i=0; i<10; i++) {
      await wait(_WAIT_SEC)
      const res4 = await (await fetch(HOSTAPI+`/api/replicate/stablediffusion/${temp.id}`, { headers })).json() as AIImageResponse
      if (res4.status === "ERROR") return { statusCode: 500, body: "Image Processing Error" }
      if (res4.status === "COMPLETE") { temp = res4; break }
    }

    if (temp.url) {
      const g = generateRandomUniqueIntegers(_NUM_IMAGES, res3.locationVariant.length)

      const res5 = await (await fetch(`${HOSTAPI}/api/printify/mockup/upload`, {
        method: "POST",
        body: JSON.stringify({ 
          itemId, productId, providerId: printprovider.toString()
        } as MockUploadToPrintifyRequest)
      })).json() as MockUploadToPrintifyResponse
      
      let exString = "set "
      let exAttribute = {} as {[k:string]: { S: string } }
      let values = [] as string[]

      for (const {i, j} of g.map((i, j) => ({i, j}))) {
        const res6 = await (await fetch(HOSTAPI+`/api/printify/mockup/${itemId}`, {
          method: 'POST',
          body: JSON.stringify({
            blueprintId: Number(productId),
            printProviderId: printprovider,
            variantId: variantId,
            cameraId: cameras[i].camera_id,
            size: 'full',
            images: res5.images,
            baseColorHex: colorName
          } as PrintifyMockRequest)
        })).json() as PrintifyMockResponse

        // Write Images to array
        exString = `${exString} image${j} = :image${j}`
        exAttribute[`:image${j}`] = { S: res6.url }
        values.push(`=IMAGE(${res6.url})`)

        if (j < g.length-1) exString = `${exString}, `
      }

      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { socialId: { S: event.socialId } },
        UpdateExpression: exString,
        ExpressionAttributeValues: exAttribute
      }))

      const authClient = await (new auth.GoogleAuth({ 
        credentials: secret.google,
        scopes: [ "https://www.googleapis.com/auth/spreadsheets" ]
      })).getClient()

      // Write to Google Sheet
      const tab = await getSheetTab(authClient, { tabName: event.tabname, lastRow: 200, lastColumn: "Z" })
      if (!tab || !tab.data) return { statusCode: 500, body: "Tab data is empty." }
      for (const t of tab.data!) {
        if (!t || !t.rowData || t.rowData!.length <= 1) return { statusCode: 500, body: "Row Data is empty." }
        const drilldownHeaders = head(_headersDrillDown, t.rowData[0] )
        
        let row = 0
        for (const {r, i} of t.rowData!.map((r, i) => ({r, i})) ) {
          if (i === 0) { continue } 
          else {
            console.log("getting Row ...") 
            const a = r.values![drilldownHeaders["SocialId"]]?.effectiveValue?.stringValue
            if (a && a === event.socialId) { row = i; break }
          }
        }
        if (!row) return { statusCode: 400, body: `Missing SocialId: ${event.socialId}` }

        const sletter = _headersDrillDown.indexOf("Image1")
        const eletter = _headersDrillDown.indexOf(`Image${_NUM_IMAGES}`)
        if (sletter === -1 || eletter === -1) return { statusCode: 500, body: `Missing column Image${_NUM_IMAGES}` }

        const s = _alphabet.charAt(sletter)
        const e = _alphabet.charAt(eletter)

        const client = sheets({ version: "v4", auth: authClient })
        const params = {
          spreadsheetId: _spreadsheet,
          range: `${event.tabname}!${s}${row}:${e}${row}`,
          valueInputOption: "RAW",
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
