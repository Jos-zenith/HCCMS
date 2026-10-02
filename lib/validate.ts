import { NextResponse } from "next/server"

export class ValidationError extends Error {}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Body must be valid JSON")
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Body must be a JSON object")
  }
  return body as Record<string, unknown>
}

export function str(body: Record<string, unknown>, key: string, opts: { required?: boolean; max?: number } = {}) {
  const v = body[key]
  if (v === undefined || v === null || v === "") {
    if (opts.required) throw new ValidationError(`${key} is required`)
    return null
  }
  if (typeof v !== "string") throw new ValidationError(`${key} must be a string`)
  const t = v.trim()
  if (opts.max && t.length > opts.max) throw new ValidationError(`${key} must be at most ${opts.max} characters`)
  if (opts.required && !t) throw new ValidationError(`${key} is required`)
  return t || null
}

export function numIn(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  opts: { required?: boolean } = {}
) {
  const raw = body[key]
  if (raw === undefined || raw === null || raw === "") {
    if (opts.required) throw new ValidationError(`${key} is required`)
    return null
  }
  const v = typeof raw === "string" ? Number(raw) : raw
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ValidationError(`${key} must be a number`)
  if (v < min || v > max) throw new ValidationError(`${key} must be between ${min} and ${max}`)
  return v
}

export function dateStr(body: Record<string, unknown>, key: string, opts: { required?: boolean } = {}) {
  const v = str(body, key, opts)
  if (v === null) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    throw new ValidationError(`${key} must be a date (YYYY-MM-DD)`)
  }
  return v
}

/** Wraps a route handler: validation errors -> 400, anything else -> 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      console.error(err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
