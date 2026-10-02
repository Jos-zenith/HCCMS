import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { hashKey, newKey } from "@/lib/auth"
import { handle, numIn, readJson, str } from "@/lib/validate"

export const dynamic = "force-dynamic"

// GET: public directory of registered households
export const GET = handle(async () => {
  const rows = await query<{ id: string; name: string; city: string; locality: string | null; trees: number; devices: number }>(
    `SELECT h.id, h.name, h.city, h.locality,
            (SELECT count(*)::int FROM trees t WHERE t.household_id = h.id) AS trees,
            (SELECT count(*)::int FROM devices d WHERE d.household_id = h.id) AS devices
       FROM households h ORDER BY h.created_at DESC LIMIT 200`
  )
  return NextResponse.json({ households: rows })
})

// POST: register a household. The returned key is shown once and never stored in plain text.
export const POST = handle(async (request: Request) => {
  const body = await readJson(request)
  const name = str(body, "name", { required: true, max: 80 })
  const city = str(body, "city", { max: 60 }) ?? "Chennai"
  const locality = str(body, "locality", { max: 80 })
  const members = numIn(body, "members", 1, 50)

  const id = randomUUID()
  const key = newKey("hh")
  await query(
    "INSERT INTO households (id, name, city, locality, members, key_hash) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, name, city, locality, members, hashKey(key)]
  )
  return NextResponse.json({ id, key }, { status: 201 })
})
