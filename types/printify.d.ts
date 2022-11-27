import { CountryCode } from "./global"

/** From their Webapp: printify.com */
interface PrintifyWebBlueprints {
  _id: string
  templates: [],
  images: [],
  brand: {
    id: number
  }
  render_settings: {
    cameras: Camera[]
  }
  print_provider: PrintifyWePrintProvider
}

interface PrintifyWebCamera {
  id: number
  label: "Front" | "Back"
  position: 'front' | 'back'
  is_default: number
  option_id: number | null
  camera_id: number
}

interface PrintifyWebPrintProvider {
  id: number
  name: string
  launched: boolean
  variants: PrintifyWebVariant[]
}

interface PrintifyWebVariant {
  id: number
  options: number[] // USE THIS TO SEARCH FOR CAMERA
}

/** From image.printify.com */
interface PrintifyImagePreview {
  print: {
    placeholders: PrintifyImagePreviewPlaceholder[],
    necktag: boolean,       // false
    print_on_side: boolean, // false
    mirror: boolean,        // false
    canvas: boolean,        // false
    seperator_color: "#000"
  }
  decorator_id: number,     // Print Provider Id
  camera_id: number,
  variant_id: number,
  size?: number,
  blueprint_id: number,
  render_version: number    // 1
}

interface PrintifyImagePreviewPlaceholder {
  dom_id: ["#placeholder_back"] | ["#placeholder_front"],
  position: "back" | "front"
  printable: boolean
  images: PrintifyImagePreviewImage[]
}

interface PrintifyImagePreviewImage {
  scale: number // 0.6666666666666666
  x: number     // 0.5
  y: number     // 0.5
  angle: number // 0
  
  type: "image/png"
  id: string

  name?: string
  flipX?: boolean
  flipY?: boolean
  layerType?: 'image'
  src?: string
}

/** From api.printify.com */
interface Blueprint {
  id: number,
  title: string,
  description: string,
  brand: string,
  mode: string,
  images: string[]
}

interface PrintProvider {
  id: number
  title: string
}

interface ProviderVarients {
  id: number
  title: string
  variants: Variant[]
}

interface Variant {
  id: number
  title: string
  options: { size: string, color: string }
  placeholders: Placeholder[]
}

interface Placeholder {
  position: string
  height: number
  width: number
}

interface Shipping {
  handling_time: {
    value: 10,
    unit: "day" | "week" | "month"
  },
  profiles: ShippingProfile[]
}

interface ShippingProfile {
  variant_ids: number[],
  first_item: {
      cost: number,
      currency: string
  },
  additional_items: {
      cost: number,
      currency: string
  },
  countries: CountryCode[]
}

interface PrintifyOrderRequest {
  "external_id": string,
  "label"?: string,
  "line_items": {
    "print_provider_id": number,
    "blueprint_id": number,
    "variant_id": number,
    "print_areas": {
      "front": string
    },
    "quantity": number
  }[],
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

interface PrintifyOrderResponse {
  id: string
}

/** Custom Request/Response, defined by me */
interface PrintifyMockRequest {
  printProviderId: number
  cameraId: number
  variantId: number
  blueprintId: number
  images: {
    image: PrintifyImagePreviewImage
    position: 'front' | 'back'
  }[]
  size: 'preview'|'full'
}

interface PrintifyMockResponse {
  url: string
}

interface VariantRequest {
  blueprintId: number
  printprovider: number
  country?: CountryCode
  ip?: string
}

interface VariantResponse extends PrintProvider {
  locationVariant: LocationBasedVariant[]
}

export interface LocationBasedVariant extends Variant {
  price: number
  currency: string
  firstCost: number
  additionalCost: number
  mockup: {
    options: number[]
    cameras: PrintifyWebCamera[]
  }
}

export interface MockUploadToPrintifyRequest {
  productId: string
  providerId: string
  itemId: string
}

export interface MockUploadToPrintifyResponse {
  images: {
    image: PrintifyImagePreviewImage
    position: 'front' | 'back'
  }[]
}