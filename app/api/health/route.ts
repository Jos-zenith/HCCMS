import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { inferenceHealth } from "@/lib/inference"

export const dynamic = "force-dynamic"

// GET: liveness for the dashboard, database and inference server
export async function GET() {
  let database = { ok: false, detail: "" }
  try {
    await query("SELECT 1")
    database = { ok: true, detail: process.env.DATABASE_URL ? "postgres" : "embedded pglite" }
  } catch (err) {
    database = { ok: false, detail: (err as Error).message }
  }
  const inference = await inferenceHealth()
  return NextResponse.json(
    { status: database.ok ? "ok" : "error", database, inference },
    { status: database.ok ? 200 : 503 }
  )
}
