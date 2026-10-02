import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { hashKey, newDeviceId, newKey, requireHousehold } from "@/lib/auth"
import { handle, readJson, str, ValidationError } from "@/lib/validate"

export const dynamic = "force-dynamic"

const KINDS = ["tree", "vehicle", "camera"] as const

// POST: provision a device. The device key is returned once, to flash into the firmware.
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied

  const body = await readJson(request)
  const kind = str(body, "kind", { required: true }) as (typeof KINDS)[number]
  if (!KINDS.includes(kind)) throw new ValidationError(`kind must be one of ${KINDS.join(", ")}`)
  const name = str(body, "name", { max: 60 }) ?? `${kind[0].toUpperCase()}${kind.slice(1)} module`

  const deviceId = newDeviceId(kind)
  const key = newKey("dev")
  await query(
    "INSERT INTO devices (id, household_id, kind, name, key_hash) VALUES ($1, $2, $3, $4, $5)",
    [deviceId, id, kind, name, hashKey(key)]
  )
  return NextResponse.json({ id: deviceId, kind, name, key }, { status: 201 })
})
