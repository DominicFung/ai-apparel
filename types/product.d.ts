
/** Defined by me */
export interface _Product {
  productId: string /** same as for platform */
  platform: 'gelato'|'printful'|'printify',
  printprovider: number
  type: 'shirt' | 'tote' | 'hoodie',
  title: string
  description: string
  images: ProductImageRaw[]
}

interface _ProductImage {
  id: string
  full: ProductImageDetailsRaw
  preview: ProductImageDetailsRaw
}

interface _ProductImageDetails {
  externalUrl: string
  view: 'front' | 'back' | 'none'
  coordinates: {
    top: number
    left: number
  }
}

interface Product  extends _Product {
  images: ProductImage[]
}

interface ProductImage extends _ProductImage {
  full: ProductImageDetails
  preview: ProductImageDetails
}

interface ProductImageDetails extends _ProductImageDetails {
  url: string
}

//** Defined by me */
interface CreateProductRequest {
  productName: string,
  providerName: string,
  type: _Product["type"]
}