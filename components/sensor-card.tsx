"use client"

import type { ReactNode } from "react"

export type SensorStatus = "optimal" | "warning" | "critical"

interface SensorCardProps {
  icon: ReactNode
  label: string
  value: string
  unit: string
  status: SensorStatus
  subtext?: string
  trend?: number[]
}

const STATUS = {
  optimal: { text: "Optimal", color: "text-primary", chip: "bg-primary/10 text-primary", stroke: "hsl(var(--primary))" },
  warning: { text: "Watch", color: "text-warning", chip: "bg-warning/10 text-warning", stroke: "hsl(var(--warning))" },
  critical: { text: "Critical", color: "text-destructive", chip: "bg-destructive/10 text-destructive", stroke: "hsl(var(--destructive))" },
} as const

export function SensorCard({ icon, label, value, unit, status, subtext, trend }: SensorCardProps) {
  const s = STATUS[status]
  return (
    <div className="panel group p-4 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className={s.color}>{icon}</span>
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.chip}`}>{s.text}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <span className="num text-3xl font-semibold">{value}</span>
          <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
        </div>
        {trend && trend.length > 1 && <Sparkline data={trend} stroke={s.stroke} />}
      </div>
      {subtext && <p className="mt-1.5 text-[11px] text-muted-foreground">{subtext}</p>}
    </div>
  )
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const w = 80
  const h = 28
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / span) * (h - 4),
  ])
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 overflow-visible opacity-80">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={stroke} opacity={0.08} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={stroke} />
    </svg>
  )
}
