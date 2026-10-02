import { NextResponse } from "next/server"
import { requireHousehold } from "@/lib/auth"
import { handle } from "@/lib/validate"

export const dynamic = "force-dynamic"

// POST: check a household key before the dashboard unlocks management screens
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const denied = await requireHousehold(request, id)
  return denied ?? NextResponse.json({ ok: true })
})
