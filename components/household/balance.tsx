"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"
import type { DashboardData } from "@/lib/dashboard-types"
import { EMISSION_FACTORS, type ActivityKind } from "@/lib/emission-factors"
import { Panel, PanelTitle } from "@/components/ui"
import { massText } from "@/lib/format"

const C = { green: "hsl(152 64% 50%)", red: "hsl(8 85% 62%)", grid: "hsl(150 14% 14%)", tick: "hsl(145 8% 52%)" }

const KIND_COLOR: Record<ActivityKind, string> = {
  electricity: "hsl(42 92% 60%)",
  lpg: "hsl(20 85% 60%)",
  petrol: "hsl(8 85% 62%)",
  diesel: "hsl(340 70% 60%)",
  cng: "hsl(200 70% 60%)",
}

export function BalanceChart({ data }: { data: DashboardData }) {
  const rows = data.daily.map((d) => ({
    day: d.day.slice(5),
    "Tree growth": Number(d.sequesteredKg.toFixed(3)),
    Emitted: d.emittedKg === null ? null : Number(d.emittedKg.toFixed(2)),
  }))
  return (
    <Panel className="lg:col-span-2">
      <PanelTitle eyebrow="Carbon balance" title="Tree growth vs emissions, per day (kg CO₂)" />
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barGap={1}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.tick }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={{ fontSize: 11, fill: C.tick }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(150 14% 12% / 0.6)" }}
            contentStyle={{ background: "hsl(150 22% 8%)", border: "1px solid hsl(150 14% 15%)", borderRadius: 10, fontSize: 12 }}
            formatter={(v: number) => `${v} kg`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Emitted" fill={C.red} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Tree growth" fill={C.green} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Bills are spread evenly across their billing period. Tree growth comes from trunk measurements (spread over each interval) plus the species estimate since the last one.
      </p>
    </Panel>
  )
}

export function EmissionsBreakdown({ data }: { data: DashboardData }) {
  const entries = Object.entries(data.totals.emittedByKind30d) as [ActivityKind, number][]
  const total = entries.reduce((s, [, v]) => s + v, 0)
  return (
    <Panel>
      <PanelTitle eyebrow="Household emissions · self-reported" title="Sources, last 30 days" />
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bills cover the last 30 days.</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full">
            {entries.map(([k, v]) => (
              <div key={k} style={{ width: `${(v / total) * 100}%`, background: KIND_COLOR[k] }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2.5">
            {entries
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
                  <span>{EMISSION_FACTORS[k].label}</span>
                  <span className="num ml-auto font-medium">{massText(v)}</span>
                  <span className="num w-10 text-right text-xs text-muted-foreground">{Math.round((v / total) * 100)}%</span>
                </li>
              ))}
          </ul>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Bills cover {data.totals.emissionCoverageDays} of the last 30 days
            {data.totals.emissionCoverageDays < 30 && "; the 30-day total is scaled from covered days"}.
          </p>
        </>
      )}
    </Panel>
  )
}

export function ScoreBreakdown({ data }: { data: DashboardData }) {
  return (
    <Panel>
      <PanelTitle eyebrow="Green Score" title="What drives your score" />
      <ul className="space-y-4">
        {data.score.components.map((c) => (
          <li key={c.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {c.label} <span className="text-xs font-normal text-muted-foreground">· {c.weight}%</span>
              </span>
              <span className="num font-semibold">{c.value === null ? "–" : Math.round(c.value * 100)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              {c.value !== null && (
                <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary" style={{ width: `${c.value * 100}%` }} />
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{c.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function Tips({ data }: { data: DashboardData }) {
  if (data.tips.length === 0) return null
  const icon = { good: CheckCircle2, info: Info, warn: AlertTriangle }
  const tone = { good: "text-primary", info: "text-muted-foreground", warn: "text-warning" }
  return (
    <Panel>
      <PanelTitle eyebrow="Tips" title="What to do next" />
      <ul className="space-y-3">
        {data.tips.map((t, i) => {
          const Icon = icon[t.level]
          return (
            <li key={i} className="flex gap-2.5 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone[t.level]}`} />
              <span>{t.text}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
