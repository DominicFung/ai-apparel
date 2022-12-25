import { STABLEDIFF_MODEL_VERSION, RUDALLE_MODEL_VERSION } from './constants'
type ModelVersion = typeof STABLEDIFF_MODEL_VERSION | typeof RUDALLE_MODEL_VERSION

/** Replicate Replicate */
export interface ReplicateStableDiffusionRequest {
  version: ModelVersion
  input: ReplicateStableDiffusionInput
}

export interface ReplicateRUDalleSRRequest {
  version: ModelVersion
  input: ReplicateRUDalleSRInput
}

export interface ReplicateStableDiffusionInput {
  prompt: string
}

export interface ReplicateRUDalleSRInput {
  image: string
  scale: string
}
 
export interface ReplicateBase {
  completed_at: string | null,
  created_at: string,
  error: string | null,
  hardware: "cpu" | "gpu-t4" | "gpu-a100",
  id: string,
  input: ReplicateSDRequest
  logs: string,
  metrics: any,
  started_at: null,
  status: string | null,
  urls: {
    get: string     //"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy",
    cancel: string  //"https://api.replicate.com/v1/predictions/jfxln7xypfd27fbzmnai3r7dmy/cancel"
  },
  version: string
}

export interface ReplicateStableDiffusionResponse extends ReplicateBase {
  output: string[]
}

export interface ReplicateRUDalleSRResponse extends ReplicateBase {
  output: string
}

/** Custom Request/Response, defined by me */
export interface GenerateAIImageRequest {
  num_executions: number
  input: ReplicateStableDiffusionInput
}

export interface SuperResolutionRequest {
  stablediffusionId: string,
  input: { scale: number }
}

export interface SuperResolutionResponse extends ReplicateRUDalleSRResponse {
  s3ImageUrl: string
}

export interface AIImageResponse {
  id: string
  status: "COMPLETE" | "PROCESSING" | "ERROR"
  url?: string
  prompt?: string
  private?: boolean
}

/** AI Service Table */
export interface AIService {
  customerId: string,
  serviceId: string,
  input: {
    prompt?: string
    image?: string
    scale?: number
  },
  created_at: string, 
  aiPlatform: 'REPLICATE',
  aiModel: 'stablediffusion' | 'rudalle-sr'
  aiModelVersion: string,
  serviceStatus: "PROCESSING" | "COMPLETE" | "ERROR",
  response: string

  // serviceId of the super resolution
  superResolutionId?: string
  serviceUrl?: string
  
  // only applies if aiModel is stablediffusion
  disable: boolean,    // If true, will make the product (item) completely invisible
  isPrivate: boolean,  // If true, only customers in "canAccess" can access. A product can also be private if it has profanity, or trademark.
  canAccess: string[]  // array of customer id.
}