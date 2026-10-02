import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { queryOne } from "./db"

export function newKey(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`
}

export function newDeviceId(kind: string): string {
  return `${kind}-${randomBytes(4).toString("hex")}`
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function readKey(request: Request, header: string): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim()
  return request.headers.get(header)
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Household owner key, sent by the dashboard's management screens. Returns an error response or null. */
export async function requireHousehold(request: Request, householdId: string) {
  if (!isUuid(householdId)) {
    return NextResponse.json({ error: "Household not found" }, { status: 404 })
  }
  const key = readKey(request, "x-household-key")
  if (!key) return NextResponse.json({ error: "Missing household key" }, { status: 401 })
  const row = await queryOne<{ key_hash: string }>(
    "SELECT key_hash FROM households WHERE id = $1",
    [householdId]
  )
  if (!row) return NextResponse.json({ error: "Household not found" }, { status: 404 })
  if (!safeEqual(row.key_hash, hashKey(key))) {
    return NextResponse.json({ error: "Invalid household key" }, { status: 403 })
  }
  return null
}

export interface AuthedDevice {
  id: string
  household_id: string
  kind: "tree" | "vehicle" | "camera"
}

/** Device key, sent by the ESP32 firmware. */
export async function authenticateDevice(
  request: Request
): Promise<AuthedDevice | NextResponse> {
  const key = readKey(request, "x-device-key")
  if (!key) return NextResponse.json({ error: "Missing device key" }, { status: 401 })
  const device = await queryOne<AuthedDevice>(
    "SELECT id, household_id, kind FROM devices WHERE key_hash = $1",
    [hashKey(key)]
  )
  if (!device) return NextResponse.json({ error: "Unknown device key" }, { status: 401 })
  return device
}
