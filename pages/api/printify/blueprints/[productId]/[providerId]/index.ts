import type { NextApiRequest, NextApiResponse } from 'next'
import { got } from 'got'

import { PrintifyWebBlueprints, PrintifyWebCamera } from '../../../../../../types/printify'

export default async function handler(req: NextApiRequest,res: NextApiResponse<PrintifyWebCamera[]>) {
  const { productId, providerId } = req.query

  const url = `https://printify.com/api/v1/blueprints/${productId}/${providerId}`
  let r = await got.get(url).json() as PrintifyWebBlueprints
  return r.render_settings.cameras
}