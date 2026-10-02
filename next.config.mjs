/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PGlite ships its own WASM/data files; load it from node_modules instead of bundling
  serverExternalPackages: ["@electric-sql/pglite"],
  // db/schema.sql is read at runtime by lib/db.ts
  outputFileTracingIncludes: { "/**": ["./db/schema.sql"] },
}

export default nextConfig
