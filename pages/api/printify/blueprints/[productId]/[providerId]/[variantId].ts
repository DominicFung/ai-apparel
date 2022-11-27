import type { NextApiRequest, NextApiResponse } from 'next'
import { got } from 'got'

import { PrintifyWebBlueprints, PrintifyWebCamera } from '../../../../../../types/printify'

export default async function handler(req: NextApiRequest,res: NextApiResponse<PrintifyWebCamera[]>) {
  const { productId, providerId, variantId } = req.query

  const url = `https://printify.com/api/v1/blueprints/${productId}/${providerId}`
  let r = await got.get(url).json() as PrintifyWebBlueprints

  let variant
  for (let v of r.print_provider.variants) {
    if (String(v.id) === variantId) { variant = v; break }
  }
  if (!variant) { res.status(404); return }

  let cameras = [] as PrintifyWebCamera[]
  for (let c of r.render_settings.cameras) {
    if (variant.options.includes(c.option_id)) { cameras.push(c) }
  }
  res.json(cameras)
}