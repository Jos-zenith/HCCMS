import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { authenticateDevice } from "@/lib/auth"
import { handle, readJson, ValidationError } from "@/lib/validate"

export const dynamic = "force-dynamic"

// field in payload -> [column, min, max, allowed device kinds]
const FIELDS = {
  temperature: ["temperature_c", -20, 70, ["tree", "vehicle"]],
  humidity: ["humidity_pct", 0, 100, ["tree", "vehicle"]],
  soil_moisture: ["soil_moisture_pct", 0, 100, ["tree"]],
  ph: ["soil_ph", 0, 14, ["tree"]],
  light: ["light_pct", 0, 100, ["tree"]],
  co2_ppm: ["co2_ppm", 0, 20_000, ["vehicle"]],
  pm25: ["pm25_ugm3", 0, 2_000, ["vehicle"]],
} as const

type Field = keyof typeof FIELDS
const MAX_BATCH = 200
const MAX_AGE_MS = 14 * 86_400_000 // buffered readings older than this are rejected
const MAX_FUTURE_MS = 5 * 60_000

/**
 * POST /api/ingest   Authorization: Bearer <device key>
 *
 * Body: one reading, or { "readings": [ ... ] } for buffered uploads.
 * A reading: { "ts": <unix seconds, optional>, "temperature": 31.2, "soil_moisture": 42, ... }
 * Re-sending a reading with the same ts is ignored, so retries are safe.
 */
export const POST = handle(async (request: Request) => {
  const device = await authenticateDevice(request)
  if (device instanceof NextResponse) return device
  if (device.kind === "camera") {
    return NextResponse.json({ error: "Camera modules upload to /api/ingest/leaf-image" }, { status: 400 })
  }

  const body = await readJson(request)
  const items = Array.isArray(body.readings) ? body.readings : [body]
  if (items.length === 0) throw new ValidationError("No readings")
  if (items.length > MAX_BATCH) throw new ValidationError(`At most ${MAX_BATCH} readings per request`)

  const now = Date.now()
  const rows: { recordedAt: Date; values: Partial<Record<Field, number>> }[] = []
  const rejected: { index: number; reason: string }[] = []

  items.forEach((raw: unknown, index: number) => {
    if (!raw || typeof raw !== "object") return rejected.push({ index, reason: "not an object" })
    const r = raw as Record<string, unknown>

    let recordedAt = new Date(now)
    if (r.ts !== undefined) {
      const ts = Number(r.ts)
      if (!Number.isFinite(ts)) return rejected.push({ index, reason: "invalid ts" })
      recordedAt = new Date(ts * 1000)
      if (recordedAt.getTime() > now + MAX_FUTURE_MS) return rejected.push({ index, reason: "ts in the future (check NTP)" })
      if (recordedAt.getTime() < now - MAX_AGE_MS) return rejected.push({ index, reason: "ts older than 14 days" })
    }

    const values: Partial<Record<Field, number>> = {}
    for (const field of Object.keys(FIELDS) as Field[]) {
      const v = r[field]
      if (v === undefined || v === null) continue
      const [, min, max, kinds] = FIELDS[field]
      if (!(kinds as readonly string[]).includes(device.kind)) continue
      const n = Number(v)
      if (!Number.isFinite(n) || n < min || n > max) {
        return rejected.push({ index, reason: `${field} out of range ${min}..${max}` })
      }
      values[field] = n
    }
    if (Object.keys(values).length === 0) return rejected.push({ index, reason: "no supported sensor fields" })
    rows.push({ recordedAt, values })
  })

  let stored = 0
  for (const row of rows) {
    const fields = Object.keys(row.values) as Field[]
    const cols = fields.map((f) => FIELDS[f][0])
    const res = await query(
      `INSERT INTO readings (device_id, recorded_at, ${cols.join(", ")})
       VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(", ")})
       ON CONFLICT (device_id, recorded_at) DO NOTHING RETURNING id`,
      [device.id, row.recordedAt.toISOString(), ...fields.map((f) => row.values[f])]
    )
    stored += res.length
  }
  await query("UPDATE devices SET last_seen_at = now() WHERE id = $1", [device.id])

  return NextResponse.json(
    { stored, duplicates: rows.length - stored, rejected, serverTime: Math.floor(now / 1000) },
    { status: rejected.length && !rows.length ? 400 : 200 }
  )
})
