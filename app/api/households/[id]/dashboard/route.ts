import { NextResponse } from "next/server"
import { isUuid } from "@/lib/auth"
import { getDashboard } from "@/lib/dashboard"
import { handle } from "@/lib/validate"

export const dynamic = "force-dynamic"

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const data = isUuid(id) ? await getDashboard(id) : null
  if (!data) return NextResponse.json({ error: "Household not found" }, { status: 404 })
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
})
