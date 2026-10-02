"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { Settings } from "lucide-react"
import type { DashboardData } from "@/lib/dashboard-types"
import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/household/hero"
import { Modules } from "@/components/household/modules"
import { Trees } from "@/components/household/trees"
import { BalanceChart, EmissionsBreakdown, ScoreBreakdown, Tips } from "@/components/household/balance"
import { SectionHeading } from "@/components/ui"
import { timeAgo } from "@/lib/format"

const REFRESH_MS = 10_000

const NAV = [
  { href: "#impact", label: "Impact" },
  { href: "#sensors", label: "Live sensors" },
  { href: "#trees", label: "Trees" },
  { href: "#balance", label: "Balance" },
]

export default function HouseholdDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/households/${id}/dashboard`, { cache: "no-store" })
        const body = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(body.error ?? `Failed to load (${res.status})`)
        setData(body)
        setError("")
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    }
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [id])

  const anyLive = data?.devices.some((d) => d.online)

  return (
    <div className="min-h-screen">
      <SiteHeader
        nav={NAV}
        right={
          <>
            {data && (
              <span
                className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex ${
                  anyLive ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${anyLive ? "animate-pulse bg-primary" : "bg-muted-foreground"}`} />
                {anyLive ? "Live" : "No live modules"} · updated {timeAgo(data.generatedAt)}
              </span>
            )}
            <Link
              href={`/h/${id}/manage`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/70"
            >
              <Settings className="h-4 w-4" /> Manage
            </Link>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 md:px-6 md:py-10">
        {error && !data ? (
          <div className="panel p-10 text-center">
            <p className="font-medium">{error}</p>
            <Link href="/" className="mt-2 inline-block text-sm text-primary hover:underline">Back to households</Link>
          </div>
        ) : !data ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
            <div className="panel h-96 animate-pulse" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel h-32 animate-pulse" />)}
            </div>
          </div>
        ) : (
          <>
            {error && <p className="rounded-lg bg-warning/10 px-4 py-2 text-sm text-warning">Refresh failed: {error}. Showing last data.</p>}
            <Hero data={data} />

            <section className="space-y-5">
              <SectionHeading id="sensors" eyebrow="Live sensors" title="Modules around your home">
                <p className="text-sm text-muted-foreground">Refreshes every {REFRESH_MS / 1000}s</p>
              </SectionHeading>
              <Modules data={data} householdId={id} />
            </section>

            <section className="space-y-5">
              <SectionHeading id="trees" eyebrow="Green offset" title="Your trees" />
              <Trees trees={data.trees} householdId={id} />
            </section>

            <section className="space-y-5">
              <SectionHeading id="balance" eyebrow="Net emissions" title="Carbon balance & score" />
              <div className="grid gap-6 lg:grid-cols-3">
                <BalanceChart data={data} />
                <EmissionsBreakdown data={data} />
                <ScoreBreakdown data={data} />
                <div className="lg:col-span-2">
                  <Tips data={data} />
                </div>
              </div>
            </section>

            <footer className="border-t border-border pb-2 pt-6 text-center text-xs text-muted-foreground">
              Biomass by Chave et al. (2014); emission factors from CEA and IPCC 2006. Credits are self-reported
              estimates for awareness and local incentive programmes, not verified offsets.
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
