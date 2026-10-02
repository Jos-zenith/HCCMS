// Client for the Flask inference server (inference/inference_server.py)

export class InferenceUnavailable extends Error {}

function baseUrl(): string {
  const url = process.env.INFERENCE_URL
  if (!url) throw new InferenceUnavailable("INFERENCE_URL is not configured")
  return url.replace(/\/$/, "")
}

async function postImage<T>(path: string, image: Blob, filename: string): Promise<T> {
  const form = new FormData()
  form.append("image", image, filename)
  let res: Response
  try {
    res = await fetch(`${baseUrl()}${path}`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) })
  } catch (err) {
    throw new InferenceUnavailable(`Inference server unreachable: ${(err as Error).message}`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Inference server returned ${res.status}`)
  return data as T
}

export interface SpeciesPrediction {
  species: string
  confidence: number
  top_k: { species: string; confidence: number }[]
}

export interface LeafHealth {
  green_ratio: number
  vari: number
  vegetation_coverage: number
}

export const predictSpecies = (image: Blob) => postImage<SpeciesPrediction>("/predict", image, "bark.jpg")
export const analyseLeaves = (image: Blob) => postImage<LeafHealth>("/leaf-health", image, "leaves.jpg")

export async function inferenceHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${baseUrl()}/health`, { signal: AbortSignal.timeout(5_000) })
    const data = await res.json()
    return { ok: !!data.model_loaded, detail: data.model_loaded ? `${data.classes.length} species` : "model not loaded" }
  } catch (err) {
    return { ok: false, detail: (err as Error).message }
  }
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
