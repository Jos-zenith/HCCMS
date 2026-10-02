import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireHousehold } from "@/lib/auth"
import { handle } from "@/lib/validate"

export const dynamic = "force-dynamic"

export const DELETE = handle(
  async (request: Request, ctx: { params: Promise<{ id: string; activityId: string }> }) => {
    const { id, activityId } = await ctx.params
    const denied = await requireHousehold(request, id)
    if (denied) return denied
    const rows = await query(
      "DELETE FROM activities WHERE id = $1 AND household_id = $2 RETURNING id",
      [activityId, id]
    )
    if (!rows.length) return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  }
)
