import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { authenticateDevice } from "@/lib/auth"
import { analyseLeaves, InferenceUnavailable, MAX_IMAGE_BYTES } from "@/lib/inference"
import { handle } from "@/lib/validate"

export const dynamic = "force-dynamic"

/**
 * POST /api/ingest/leaf-image   Authorization: Bearer <camera device key>
 * Body: raw JPEG (Content-Type: image/jpeg) from the ESP32-CAM.
 * The image is analysed for leaf colour and discarded; only the indices are stored.
 */
export const POST = handle(async (request: Request) => {
  const device = await authenticateDevice(request)
  if (device instanceof NextResponse) return device
  if (device.kind !== "camera") {
    return NextResponse.json({ error: "Only camera modules can upload leaf images" }, { status: 400 })
  }

  const tree = await queryOne<{ id: string }>(
    "SELECT id FROM trees WHERE camera_device_id = $1 LIMIT 1",
    [device.id]
  )
  if (!tree) {
    return NextResponse.json({ error: "Link this camera to a tree in the dashboard first" }, { status: 409 })
  }

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength === 0) return NextResponse.json({ error: "Empty image" }, { status: 400 })
  if (bytes.byteLength > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Image too large" }, { status: 413 })

  try {
    const health = await analyseLeaves(new Blob([bytes], { type: "image/jpeg" }))
    await query(
      `INSERT INTO leaf_scans (tree_id, device_id, green_ratio, vari, vegetation_coverage)
       VALUES ($1, $2, $3, $4, $5)`,
      [tree.id, device.id, health.green_ratio, health.vari, health.vegetation_coverage]
    )
    await query("UPDATE devices SET last_seen_at = now() WHERE id = $1", [device.id])
    return NextResponse.json({ stored: true, ...health })
  } catch (err) {
    if (err instanceof InferenceUnavailable) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }
})
