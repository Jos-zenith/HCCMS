import { NextResponse } from "next/server"
import { findSpeciesKey, TREE_SPECIES } from "@/lib/species"
import { InferenceUnavailable, MAX_IMAGE_BYTES, predictSpecies } from "@/lib/inference"
import { handle } from "@/lib/validate"

export const dynamic = "force-dynamic"

// POST (multipart, field "image"): identify a tree species from a bark photo
export const POST = handle(async (request: Request) => {
  let image: File
  try {
    const entry = (await request.formData()).get("image")
    if (!(entry instanceof File) || entry.size === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }
    image = entry
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 413 })
  }

  try {
    const result = await predictSpecies(image)
    const candidates = result.top_k.map((p) => {
      const key = findSpeciesKey(p.species)
      return { key: key ?? null, name: key ? TREE_SPECIES[key].name : p.species, scientificName: p.species, confidence: p.confidence }
    })
    return NextResponse.json({ candidates })
  } catch (err) {
    const status = err instanceof InferenceUnavailable ? 503 : 422
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
})
