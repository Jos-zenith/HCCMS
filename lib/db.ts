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

  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import("postgres")
    const sql = postgres(process.env.DATABASE_URL, {
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      ssl: process.env.DATABASE_SSL === "false" ? false : "prefer",
      onnotice: () => {},
    })
    await sql.unsafe(schema)
    return async (text, params) =>
      (await sql.unsafe(text, params as never[])) as unknown as Row[]
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
