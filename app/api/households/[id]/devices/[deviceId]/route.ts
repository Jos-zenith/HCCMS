import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { hashKey, newKey, requireHousehold } from "@/lib/auth"
import { handle } from "@/lib/validate"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; deviceId: string }> }

// POST: rotate the device key (e.g. a board was lost or the key leaked)
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const { id, deviceId } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied
  const key = newKey("dev")
  const rows = await query(
    "UPDATE devices SET key_hash = $1 WHERE id = $2 AND household_id = $3 RETURNING id",
    [hashKey(key), deviceId, id]
  )
  if (!rows.length) return NextResponse.json({ error: "Device not found" }, { status: 404 })
  return NextResponse.json({ id: deviceId, key })
})

// DELETE: remove a device and its readings
export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const { id, deviceId } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied
  const rows = await query("DELETE FROM devices WHERE id = $1 AND household_id = $2 RETURNING id", [deviceId, id])
  if (!rows.length) return NextResponse.json({ error: "Device not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
})
