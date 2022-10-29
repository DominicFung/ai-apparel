import type { NextApiRequest, NextApiResponse } from 'next'
import { got } from 'got'

interface CreateProductBody {
  "title": string,
  "description": string,
  "blueprint_id": number,
  "print_provider_id": number,
  "print_areas": [
      {
          "placeholders": [
              {
                  "position": string,
                  "images": [
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      },
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      }
                  ]
              },
              {
                  "position": string,
                  "images": [
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      },
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      }
                  ]
              }
          ],
          "font_color": string,
          "font_family": string,
          "background": string
      },
      {
          "placeholders": [
              {
                  "position": string,
                  "images": [
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      },
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      }
                  ]
              },
              {
                  "position": string,
                  "images": [
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      },
                      {
                          "id": string,
                          "name": string,
                          "type": string,
                          "height": number,
                          "width": number,
                          "x": number,
                          "y": number,
                          "scale": number,
                          "angle": number
                      }
                  ]
              }
          ],
          "font_color": string,
          "font_family": string,
          "background": string
      }
  ],
  "variant_ids": [
      number,
      number
  ]
}

export const MARKUP_MULTIPLIER = 1.9
export const markUp = () => {

}