import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireHousehold } from "@/lib/auth"
import { ACTIVITY_KINDS, type ActivityKind } from "@/lib/emission-factors"
import { dateStr, handle, numIn, readJson, str, ValidationError } from "@/lib/validate"

export const dynamic = "force-dynamic"

// POST: log an emission activity from a bill or receipt (electricity kWh, LPG kg, fuel litres...)
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied

  const body = await readJson(request)
  const kind = str(body, "kind", { required: true }) as ActivityKind
  if (!ACTIVITY_KINDS.includes(kind)) throw new ValidationError(`kind must be one of ${ACTIVITY_KINDS.join(", ")}`)
  const quantity = numIn(body, "quantity", 0.01, 100_000, { required: true })
  const start = dateStr(body, "period_start", { required: true })!
  const end = dateStr(body, "period_end", { required: true })!
  if (end < start) throw new ValidationError("period_end must be on or after period_start")
  if (Date.parse(end) - Date.parse(start) > 366 * 86_400_000) throw new ValidationError("Period can be at most one year")
  const note = str(body, "note", { max: 120 })

  const activityId = randomUUID()
  await query(
    "INSERT INTO activities (id, household_id, kind, quantity, period_start, period_end, note) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [activityId, id, kind, quantity, start, end, note]
  )
  return NextResponse.json({ id: activityId }, { status: 201 })
})
