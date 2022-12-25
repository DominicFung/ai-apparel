import type { NextApiRequest, NextApiResponse } from 'next'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { DynamoDBClient, DynamoDBClientConfig, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { got } from 'got'
import Iron from '@hapi/iron'

import secret from '../../../secret.json'
import config from "../../../src/aws-exports"
import { markup } from '../../../utils/utils'

import { Amplify } from "aws-amplify"
import { getPrintifyWebPriceListing } from '../../../utils/printify'
Amplify.configure({...config, ssr: true })

import { CountryCode } from '../../../types/global'
import { 
  LocationBasedVariant, PrintifyWebBlueprints, PrintifyWebCamera, 
  ProviderVarients, Shipping, VariantRequest, VariantResponse 
} from '../../../types/printify'
import { Customer } from '../../../types/customer'

import cdk from '../../../cdk-outputs.json'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { _Product } from '../../../types/product'


//https://developers.printify.com/#catalog
export default async function handler(req: NextApiRequest,res: NextApiResponse<VariantResponse|string>) {
  const token = req.cookies.token
  if (!token) { res.status(401).send("Unauthorized."); return }

  const customer = (await Iron.unseal(token, secret.seal, Iron.defaults)) as Customer

  let b = JSON.parse(req.body) as VariantRequest
  let countryCode: CountryCode = customer.geo.country_code2 || 'US'
  //console.log(countryCode)
  
  //console.log(`blueprintid: ${b.blueprintId}, printproviderid: ${b.printprovider}`)
  let providerVariants = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers/${b.printprovider}/variants.json`, 
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as ProviderVarients
  
  let costs = await got.get(`https://api.printify.com/v1/catalog/blueprints/${b.blueprintId}/print_providers/${b.printprovider}/shipping.json`,
    { headers: {"Authorization": `Bearer ${secret.printify.token}`} }).json() as Shipping

  const primary = await getPrintifyWebPriceListing(b.blueprintId, b.printprovider)
  
  let response = [] as LocationBasedVariant[]
  const url = `https://printify.com/api/v1/blueprints/${b.blueprintId}/${b.printprovider}`
  let r = await got.get(url).json() as PrintifyWebBlueprints

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
  let rProduct = await client.send(new GetItemCommand({ 
    TableName: cdk["AIApparel-DynamoStack"].AIApparelproductTableName,
    Key: { productId: { S: b.blueprintId.toString() } }
  }))

  if (rProduct.Item != undefined) {
    let product = unmarshall(rProduct.Item) as _Product

    for (let variant of providerVariants.variants) {
      for (let profile of costs.profiles) {
        if (profile.variant_ids.includes(variant.id) && profile.countries.includes(countryCode)) {
          //console.log(`VariantId: ${variant.id}: PRICE $${primary[variant.id]/100} USD`)
  
          let internalvariant
          for (let v of r.print_provider.variants) {
            if (v.id === variant.id) { internalvariant = v; break }
          }
          if (!internalvariant) { res.status(404); return }
  
          let cameras = [] as PrintifyWebCamera[]
          for (let c of r.render_settings.cameras) {
            if (c.option_id === null) { cameras.push(c) }
            else if (internalvariant.options.includes(c.option_id)) { cameras.push(c) }
          }
  
          response.push(
            markup({
              ...variant,
              price: primary[variant.id],
              firstCost: profile.first_item.cost,
              additionalCost: profile.additional_items.cost,
              currency: profile.first_item.currency,
              mockup: {
                options: internalvariant.options,
                cameras: cameras
              }
            }, product.markup)
          )
          break
        }
      }
    }
  
    // User is not of a shipping location with a discount. 
    // Use REST_OF_THE_WORLD. We only do this if there is no other option.
    if (response.length === 0) {
      for (let variant of providerVariants.variants) {
        for (let profile of costs.profiles) {
          if (profile.variant_ids.includes(variant.id) && profile.countries.includes("REST_OF_THE_WORLD")) {
            let internalvariant
            for (let v of r.print_provider.variants) {
              if (v.id === variant.id) { internalvariant = v; break }
            }
            if (!internalvariant) { res.status(404); return }
  
            let cameras = [] as PrintifyWebCamera[]
            for (let c of r.render_settings.cameras) {
              if (c.option_id === null) { cameras.push(c) }
              else if (internalvariant.options.includes(c.option_id)) { cameras.push(c) }
            }
  
            response.push(
              markup({
                ...variant,
                price: primary[variant.id],
                firstCost: profile.first_item.cost,
                additionalCost: profile.additional_items.cost,
                currency: profile.first_item.currency,
                mockup: {
                  options: internalvariant.options,
                  cameras: cameras
                }
              }, product.markup)
            )
            break
          }
        }
      }
    }

  }
  //console.log(response)
  res.json({id: b.printprovider, locationVariant: response} as VariantResponse)
}