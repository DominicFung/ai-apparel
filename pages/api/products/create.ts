import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, PutItemCommand, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import  { marshall } from "@aws-sdk/util-dynamodb"
import { got } from 'got'

import { v4 as uuidv4 } from 'uuid'

import cdk from '../../../cdk-outputs.json'
import secret from '../../../secret.json'

import { ReplicateRUDalleSRResponse } from '../../../types/replicate'
import { CreateProductRequest, _Product, _ProductImageDetails } from '../../../types/product'
import { Blueprint, PrintProvider } from '../../../types/printify'
import { RUDALLE_MODEL_VERSION } from '../../../types/constants'


export default async function handler(req: NextApiRequest,res: NextApiResponse<_Product>) {
  console.log(req.headers)
  const { authorization } = req.headers
  console.log( authorization )
  const b = req.body as CreateProductRequest

  if ( authorization === `Bearer ${secret.secret}`) {
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

    const blueprints = await got.get(`https://api.printify.com/v1/catalog/blueprints.json`, 
      { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as Blueprint[]

    let bp: Blueprint | null = null
    for (const blueprint of blueprints) { if (blueprint.title === b.productName) { bp = blueprint; break } }
    if (!bp) { res.status(404); return }

    const providers = await got.get(`https://api.printify.com/v1/catalog/blueprints/${bp.id}/print_providers.json`,
      { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as PrintProvider[]

    let pp: PrintProvider | null = null
    for (const provider of providers) { if (provider.title === b.providerName) { pp = provider; break } }
    if (!pp) { res.status(404); return }

    let product: _Product = {
      productId: String(bp.id),
      type: b.type,
      platform: 'printify',
      printprovider: pp.id,
      title: bp.title,
      description: bp.description.split('<div>')[0].split("<br")[0],
      images: []
    }

    for (let i of bp.images) {
      let rep = await got.post("https://api.replicate.com/v1/predictions", {
        headers: {'Authorization': `TOKEN ${secret.replicate.token}`},
        body: JSON.stringify({
          version: RUDALLE_MODEL_VERSION,
          input: { image: i, scale: 2 }
        })
      }).json() as ReplicateRUDalleSRResponse
      console.log(rep)

      product.images.push({
        id: uuidv4(),
        full: {
          externalUrl: rep.urls.get,
          view: 'none',
          coordinates: { top: 1, left: 1 }
        } as _ProductImageDetails,
        preview: {
          externalUrl: i,
          view: 'front',
          coordinates: { top: 1, left: 1 }
        } as _ProductImageDetails
      })
    }

    const command = new PutItemCommand({
      TableName: cdk["AIApparel-DynamoStack"].AIApparelproductTableName,
      Item: marshall(product)
    })
    let result = await client.send(command)
    console.log(result)

    res.json(product)
  } else { res.status(401) }
}