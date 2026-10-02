import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireHousehold } from "@/lib/auth"
import { parseTreeInput } from "@/lib/tree-input"
import { handle, readJson } from "@/lib/validate"

export const dynamic = "force-dynamic"

export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied

  const t = await parseTreeInput(await readJson(request), id, false)
  const treeId = randomUUID()
  await query(
    `INSERT INTO trees (id, household_id, name, species_key, dbh_cm, height_m, sensor_device_id, camera_device_id, measured_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::date, CURRENT_DATE))`,
    [treeId, id, t.name, t.species_key, t.dbh_cm, t.height_m, t.sensor_device_id ?? null, t.camera_device_id ?? null, t.measured_on ?? null]
  )
  // Baseline measurement: the stock at registration is never credited, only later growth
  await query(
    `INSERT INTO tree_measurements (tree_id, measured_on, dbh_cm, height_m)
     VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4)`,
    [treeId, t.measured_on ?? null, t.dbh_cm, t.height_m]
  )
  return NextResponse.json({ id: treeId }, { status: 201 })
})
