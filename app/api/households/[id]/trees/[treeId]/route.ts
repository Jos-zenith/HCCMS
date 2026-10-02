import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireHousehold } from "@/lib/auth"
import { parseTreeInput } from "@/lib/tree-input"
import { handle, readJson } from "@/lib/validate"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; treeId: string }> }

// PATCH: record a new trunk/height measurement, rename, or change device links.
// Measurements are appended to the tree's history; earlier ones are never overwritten.
export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const { id, treeId } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied

  const tree = await queryOne<{ dbh_cm: number; height_m: number }>(
    "SELECT dbh_cm, height_m FROM trees WHERE id = $1 AND household_id = $2",
    [treeId, id]
  )
  if (!tree) return NextResponse.json({ error: "Tree not found" }, { status: 404 })

  const t = await parseTreeInput(await readJson(request), id, true)
  const isMeasurement = t.dbh_cm !== undefined || t.height_m !== undefined
  if (isMeasurement) {
    t.dbh_cm ??= Number(tree.dbh_cm)
    t.height_m ??= Number(tree.height_m)
    t.measured_on ??= new Date().toISOString().slice(0, 10)
    await query(
      "INSERT INTO tree_measurements (tree_id, measured_on, dbh_cm, height_m) VALUES ($1, $2, $3, $4)",
      [treeId, t.measured_on, t.dbh_cm, t.height_m]
    )
  } else {
    delete t.measured_on
  }

  const entries = Object.entries(t)
  if (!entries.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  if (isMeasurement) {
    // Keep the cached dimensions equal to the most recent measurement
    const latest = await queryOne<{ measured_on: string }>(
      "SELECT to_char(max(measured_on), 'YYYY-MM-DD') AS measured_on FROM tree_measurements WHERE tree_id = $1",
      [treeId]
    )
    if (latest && t.measured_on! < latest.measured_on) {
      for (const k of ["dbh_cm", "height_m", "measured_on"] as const) delete t[k]
    }
  }

  const fields = Object.entries(t)
  if (fields.length) {
    await query(
      `UPDATE trees SET ${fields.map(([k], i) => `${k} = $${i + 3}`).join(", ")} WHERE id = $1 AND household_id = $2`,
      [treeId, id, ...fields.map(([, v]) => v)]
    )
  }
  return NextResponse.json({ ok: true })
})

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const { id, treeId } = await ctx.params
  const denied = await requireHousehold(request, id)
  if (denied) return denied
  const rows = await query("DELETE FROM trees WHERE id = $1 AND household_id = $2 RETURNING id", [treeId, id])
  if (!rows.length) return NextResponse.json({ error: "Tree not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
})
