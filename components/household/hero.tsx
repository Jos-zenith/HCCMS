"use client"

import { ArrowDownRight, ArrowUpRight, Coins, Leaf, Trees, Wind } from "lucide-react"
import type { DashboardData } from "@/lib/dashboard-types"
import { formatMass, massText } from "@/lib/format"

const TIER_STYLE = {
  Platinum: "bg-slate-200 text-slate-900",
  Gold: "bg-gold text-black",
  Silver: "bg-slate-400 text-slate-950",
  Bronze: "bg-orange-700 text-orange-50",
} as const

export function Hero({ data }: { data: DashboardData }) {
  const { totals, score, household } = data
  const net = totals.netBalance30dKg
  const absorbing = net !== null && net <= 0
  const netMass = net !== null ? formatMass(Math.abs(net)) : null
  const stored = formatMass(totals.co2StoredKg)

  return (
    <section id="impact" className="panel relative overflow-hidden p-6 md:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow text-primary/90">
            {household.name} · {[household.locality, household.city].filter(Boolean).join(", ")}
          </p>

          {netMass ? (
            <>
              <h1 className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                {absorbing ? "Your trees out-grew your home’s reported emissions by" : "Your home emitted more than your trees absorbed, by"}
              </h1>
              <p className="num mt-2 flex items-baseline gap-3">
                <span className={`text-6xl font-semibold md:text-8xl ${absorbing ? "bg-gradient-to-br from-primary via-emerald-300 to-teal-300 bg-clip-text text-transparent" : "text-foreground"}`}>
                  {netMass.value}
                </span>
                <span className="text-xl font-medium text-muted-foreground md:text-2xl">{netMass.unit} CO₂ · last 30 days</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                Your trees are storing
              </h1>
              <p className="num mt-2 flex items-baseline gap-3">
                <span className="bg-gradient-to-br from-primary via-emerald-300 to-teal-300 bg-clip-text text-6xl font-semibold text-transparent md:text-8xl">
                  {stored.value}
                </span>
                <span className="text-xl font-medium text-muted-foreground md:text-2xl">{stored.unit} CO₂</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">Log a bill to see your net carbon balance.</p>
            </>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            <Stat icon={<Trees className="h-4 w-4" />} label="Stored in your trees" value={massText(totals.co2StoredKg)} />
            <Stat icon={<Leaf className="h-4 w-4" />} label="Tree growth, last 30 days" value={massText(totals.sequestered30dKg)} />
            <Stat
              icon={absorbing ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              label={totals.emitted30dKg === null ? "Emitted (no bills yet)" : "Emitted, last 30 days"}
              value={totals.emitted30dKg === null ? "–" : massText(totals.emitted30dKg)}
              tone={totals.emitted30dKg === null ? undefined : "warn"}
            />
            <Stat icon={<Wind className="h-4 w-4" />} label="O₂ released, 30 days" value={massText(totals.oxygen30dKg)} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-gold">
              <Coins className="h-4 w-4" />
              <span className="num font-semibold">{totals.creditsMeasuredTco2e.toFixed(4)}</span> tCO₂e from measured growth
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-muted-foreground">
              + <span className="num font-semibold text-foreground">{totals.creditsEstimatedTco2e.toFixed(4)}</span> tCO₂e estimated, pending re-measurement
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Unverified estimates for awareness and community programmes. Not tradable carbon credits.
          </p>
        </div>

        <ScoreRing score={score.score} tier={score.tier} />
      </div>
    </section>
  )
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3 sm:p-4">
      <span className={tone === "warn" ? "text-warning" : "text-primary"}>{icon}</span>
      <dt className="mt-2 text-[11px] text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 text-lg font-semibold sm:text-xl">{value}</dd>
    </div>
  )
}

function ScoreRing({ score, tier }: { score: number | null; tier: keyof typeof TIER_STYLE | null }) {
  const r = 84
  const c = 2 * Math.PI * r
  return (
    <div className="mx-auto flex flex-col items-center">
      <div className="relative h-52 w-52 md:h-56 md:w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(152 64% 50%)" />
              <stop offset="100%" stopColor="hsl(175 70% 55%)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
          {score !== null && (
            <circle
              cx="100" cy="100" r={r} fill="none" stroke="url(#ring)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * c} ${c}`}
              className="transition-[stroke-dasharray] duration-1000 ease-out"
              style={{ filter: "drop-shadow(0 0 10px hsl(152 64% 50% / 0.45))" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-6xl font-semibold">{score ?? "–"}</span>
          <span className="text-xs text-muted-foreground">Green Score / 100</span>
        </div>
      </div>
      {tier ? (
        <span className={`mt-3 rounded-lg px-3 py-1 text-sm font-bold ${TIER_STYLE[tier]}`}>{tier} tier</span>
      ) : (
        <span className="mt-3 max-w-[14rem] text-center text-xs text-muted-foreground">Score unlocks once a bill is logged</span>
      )}
    </div>
  )
}
