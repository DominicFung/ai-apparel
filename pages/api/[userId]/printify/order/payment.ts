import type { NextApiRequest, NextApiResponse } from 'next'
import { Client, Environment } from 'square'
import { v4 as uuidv4 } from 'uuid'
import { got } from 'got'

import { CountryCode } from '../getprice'

import secret from '../../../../../secret.json'
import { SQUARE_ENV } from '../../../../../utils/utils'

//BigInt.prototype.toJSON = function() { return this.toString() }

const env = {
  "sandbox": Environment.Sandbox,
  "production": Environment.Production
}

const { paymentsApi } = new Client({
  accessToken: secret.square[SQUARE_ENV].token,
  environment: env[SQUARE_ENV]
})

interface PrintifyOrder {
  "external_id": string,
  "label": string,
  "line_items": [
    {
      "print_provider_id": number,
      "blueprint_id": number,
      "variant_id": number,
      "print_areas": {
        "front": string
      },
      "quantity": number
    }
  ],
  "shipping_method": number, // ??
  "send_shipping_notification": boolean,
  "address_to": {
    "first_name": string,
    "last_name": string,
    "email": string,
    "phone": string,
    "country": CountryCode,
    "region": string, //""
    "address1": string,
    "address2": string,
    "city": string,
    "zip": string
  }
}

export default async function handler(req: NextApiRequest,res: NextApiResponse) {
  
}

