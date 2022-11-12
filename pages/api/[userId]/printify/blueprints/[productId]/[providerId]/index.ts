import type { NextApiRequest, NextApiResponse } from 'next'
import { got } from 'got'

export interface Blueprints {
  _id: string
  templates: [],
  images: [],
  brand: {
    id: number
  }
  render_settings: {
    cameras: Camera[]
  }
  print_provider: PrintProvider
}

interface Camera {
  id: number
  label: "Front" | "Back"
  position: 'front' | 'back'
  is_default: number
  option_id: number
  camera_id: number
}

interface PrintProvider {
  id: number
  name: string
  launched: boolean
  variants: Variant[]
}

interface Variant {
  id: number
  options: number[] // USE THIS TO SEARCH FOR CAMERA
}

export default async function handler(req: NextApiRequest,res: NextApiResponse<Camera[]>) {
  const {userId, productId, providerId } = req.query

  const url = `https://printify.com/api/v1/blueprints/${productId}/${providerId}`
  let r = await got.get(url).json() as Blueprints
  return r.render_settings.cameras
}