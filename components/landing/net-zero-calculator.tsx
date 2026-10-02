"use client"

import { useMemo, useState } from "react"
import { Car, Flame, Lightbulb, Sparkles, TreePine, Zap } from "lucide-react"
import { annualPotentialKg } from "@/lib/carbon"
import { EMISSION_FACTORS } from "@/lib/emission-factors"
import { TREE_SPECIES } from "@/lib/species"

const TREE_SIZES = [
  { key: "sapling", label: "Sapling", girth: 30, height: 4, scale: 0.55 },
  { key: "young", label: "Young", girth: 70, height: 8, scale: 0.78 },
  { key: "mature", label: "Mature", girth: 120, height: 12, scale: 1 },
] as const

const MAX_ICONS = 60

export function NetZeroCalculator() {
  const [units, setUnits] = useState(200)
  const [lpgWeeks, setLpgWeeks] = useState(6)
  const [petrol, setPetrol] = useState(15)
  const [trees, setTrees] = useState(1)
  const [size, setSize] = useState<(typeof TREE_SIZES)[number]["key"]>("mature")

  const r = useMemo(() => {
    const sz = TREE_SIZES.find((s) => s.key === size)!
    const perTree = annualPotentialKg(TREE_SPECIES.neem, sz.girth / Math.PI, sz.height) / 12
    const electricity = units * EMISSION_FACTORS.electricity.kgCO2PerUnit
    const lpg = ((14.2 * 52) / 12 / lpgWeeks) * EMISSION_FACTORS.lpg.kgCO2PerUnit
    const fuel = petrol * EMISSION_FACTORS.petrol.kgCO2PerUnit
    const emitted = electricity + lpg + fuel
    const growth = perTree * trees
    const needed = Math.ceil(emitted / perTree)
    const saving50 = 50 * EMISSION_FACTORS.electricity.kgCO2PerUnit
    return {
      sz, perTree, electricity, lpg, fuel, emitted, growth, needed,
      offset: Math.min(growth / emitted, 1),
      yearlyTonnes: (emitted * 12) / 1000,
      treesSavedBy50Units: saving50 / perTree,
    }
  }, [units, lpgWeeks, petrol, trees, size])

  const pct = Math.round(r.offset * 100)
  const shownIcons = Math.min(Math.max(r.needed, trees), MAX_ICONS)

  return (
    <div className="panel relative overflow-hidden p-5 md:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-gold" /> Try it with your home
          </p>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">live · real formulas</span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Slider icon={<Zap className="h-4 w-4 text-gold" />} label="Electricity" value={units} unit="units / month" min={50} max={600} step={10} onChange={setUnits} />
          <Slider icon={<Flame className="h-4 w-4 text-warning" />} label="LPG refill every" value={lpgWeeks} unit="weeks" min={3} max={12} step={1} onChange={setLpgWeeks} />
          <Slider icon={<Car className="h-4 w-4 text-destructive" />} label="Petrol" value={petrol} unit="litres / month" min={0} max={100} step={5} onChange={setPetrol} />
          <Slider icon={<TreePine className="h-4 w-4 text-primary" />} label="Your neem trees" value={trees} unit={trees === 1 ? "tree" : "trees"} min={0} max={20} step={1} onChange={setTrees} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tree size">
          {TREE_SIZES.map((s) => (
            <button
              key={s.key}
              role="radio"
              aria-checked={size === s.key}
              onClick={() => setSize(s.key)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${size === s.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {s.label} · {s.girth} cm girth
            </button>
          ))}
        </div>

        {/* Balance */}
        <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-5">
          <OffsetRing pct={pct} />
          <div>
            <p className="text-sm text-muted-foreground">Your trees offset</p>
            <p className="num text-3xl font-semibold">
              {pct}% <span className="text-base font-normal text-muted-foreground">of {Math.round(r.emitted)} kg CO₂ / month</span>
            </p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="bg-gold" style={{ width: `${(r.electricity / r.emitted) * 100}%` }} title="Electricity" />
              <div className="bg-warning" style={{ width: `${(r.lpg / r.emitted) * 100}%` }} title="LPG" />
              <div className="bg-destructive" style={{ width: `${(r.fuel / r.emitted) * 100}%` }} title="Petrol" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {Math.round(r.electricity)} kg power · {Math.round(r.lpg)} kg gas · {Math.round(r.fuel)} kg petrol · {r.yearlyTonnes.toFixed(1)} t a year
            </p>
          </div>
        </div>

        {/* Forest */}
        <div className="mt-6 rounded-xl border border-border/70 bg-background/40 p-4">
          <p className="text-sm">
            {r.offset >= 1 ? (
              <span className="font-semibold text-primary">You&apos;re net zero! Your trees out-grow your emissions.</span>
            ) : (
              <>
                To reach net zero you&apos;d need <span className="num font-semibold text-primary">{r.needed}</span> {r.sz.label.toLowerCase()} neem trees.
                You have <span className="num font-semibold">{trees}</span>.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
            {Array.from({ length: shownIcons }).map((_, i) => (
              <TreeIcon key={i} filled={i < trees} scale={r.sz.scale} delay={i * 12} />
            ))}
            {r.needed > MAX_ICONS && <span className="self-end text-xs text-muted-foreground">+{r.needed - MAX_ICONS}</span>}
          </div>
          {r.offset < 1 && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <span>Using 50 fewer units a month cuts as much CO₂ as <span className="text-foreground">{r.treesSavedBy50Units.toFixed(1)}</span> of these trees grow.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Slider({ icon, label, value, unit, min, max, step, onChange }: {
  icon: React.ReactNode; label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        <span><span className="num text-sm font-semibold text-foreground">{value}</span> {unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-2 w-full"
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </label>
  )
}

function OffsetRing({ pct }: { pct: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${(Math.max(pct, 1) / 100) * c} ${c}`}
        className="transition-[stroke-dasharray] duration-500"
      />
    </svg>
  )
}

function TreeIcon({ filled, scale, delay }: { filled: boolean; scale: number; delay: number }) {
  const s = Math.round(22 * scale + 6)
  return (
    <svg
      viewBox="0 0 24 24"
      width={s}
      height={s}
      className="tree-pop"
      style={{ animationDelay: `${delay}ms` }}
    >
      <path d="M12 2 4 13h4l-3 5h14l-3-5h4z" fill={filled ? "hsl(var(--primary))" : "none"} stroke={filled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.45)"} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 18v4" stroke={filled ? "hsl(30 40% 45%)" : "hsl(var(--muted-foreground) / 0.45)"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
