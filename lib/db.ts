import { mkdirSync, readFileSync } from "node:fs"
import path from "node:path"

// Thin query layer over PostgreSQL.
//  - DATABASE_URL set   -> a Postgres server (Supabase, Neon, Railway, RDS, ...)
//  - DATABASE_URL unset -> embedded PGlite (Postgres compiled to WASM) persisted
//                          on disk in PGLITE_DIR, for single-server deployments.
// Both run the same SQL from db/schema.sql.

type Row = Record<string, unknown>
type Executor = (text: string, params: unknown[]) => Promise<Row[]>

const globalForDb = globalThis as unknown as { __hccmsDb?: Promise<Executor> }

async function connect(): Promise<Executor> {
  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8")

  const url = process.env.DATABASE_URL?.trim()
  if (url) {
    if (!/^postgres(ql)?:\/\/.+@.+/.test(url)) {
      throw new Error(
        "DATABASE_URL must be a full connection string such as " +
          "postgresql://USER:PASSWORD@HOST:5432/postgres (in Supabase: Project Settings → Database → Connection string). " +
          `The current value (${url.length} characters, starting "${url.slice(0, 4)}…") is not one.`
      )
    }
    const { default: postgres } = await import("postgres")
    const sql = postgres(url, {
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      ssl: process.env.DATABASE_SSL === "false" ? false : "prefer",
      // Transaction-mode poolers (Supabase port 6543, PgBouncer) don't support prepared statements
      prepare: false,
      onnotice: () => {},
    })
    try {
      await sql.unsafe(schema)
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { hostname?: string }
      if (e.code === "ENOTFOUND" && /^db\.[a-z0-9]+\.supabase\.co$/.test(e.hostname ?? "")) {
        throw new Error(
          `Cannot resolve ${e.hostname}: Supabase direct connections are IPv6-only and this host has no IPv6. ` +
            "Use the pooler connection string instead (Supabase → Connect → Transaction pooler), e.g. " +
            "postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
        )
      }
      throw err
    }
    return async (text, params) =>
      (await sql.unsafe(text, params as never[])) as unknown as Row[]
  }

  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is required on Vercel. Configure a managed PostgreSQL database in the project's environment variables and redeploy."
    )
  }

  const { PGlite } = await import("@electric-sql/pglite")
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite")
  mkdirSync(dir, { recursive: true })
  const db = new PGlite(dir)
  await db.exec(schema)
  return async (text, params) => (await db.query<Row>(text, params)).rows
}

function executor(): Promise<Executor> {
  if (!globalForDb.__hccmsDb) {
    globalForDb.__hccmsDb = connect().catch((err) => {
      globalForDb.__hccmsDb = undefined
      throw err
    })
  }
  return globalForDb.__hccmsDb
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const run = await executor()
  return (await run(text, params)) as T[]
}

export async function queryOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
