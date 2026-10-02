"use client"

import Link from "next/link"
import { AlertTriangle, Ruler, TreePine } from "lucide-react"
import type { TreeSummary } from "@/lib/dashboard-types"
import { EmptyState, Panel } from "@/components/ui"
import { massText } from "@/lib/format"

export function Trees({ trees, householdId }: { trees: TreeSummary[]; householdId: string }) {
  if (trees.length === 0) {
    return (
      <Panel>
        <EmptyState icon={<TreePine className="h-5 w-5" />} title="No trees registered">
          <Link href={`/h/${householdId}/manage#trees`} className="text-primary underline-offset-4 hover:underline">
            Add a tree
          </Link>{" "}
          with its trunk girth and height to calculate stored carbon.
        </EmptyState>
      </Panel>
    )
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {trees.map((t) => (
        <TreeCard key={t.id} tree={t} householdId={householdId} />
      ))}
    </div>
  )
}

function TreeCard({ tree: t, householdId }: { tree: TreeSummary; householdId: string }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t.speciesName}</p>
          <h3 className="mt-1 text-lg font-semibold">{t.name}</h3>
          <p className="text-xs italic text-muted-foreground">{t.scientificName}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Trunk Ø · height</p>
          <p className="num text-sm font-medium">
            {t.dbhCm} cm · {t.heightM} m
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t.measurementCount} measurement{t.measurementCount === 1 ? "" : "s"} · last {t.measuredOn}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Figure label="CO₂ stored" value={massText(t.co2StoredKg)} hint="baseline, not credited" />
        <Figure label="Measured growth" value={massText(t.measuredGrowthKg)} hint="between trunk measurements" accent />
        <Figure label="Estimated growth" value={massText(t.estimatedGrowthKg)} hint={`since last measure · ${massText(t.annualPotentialKg)}/yr`} />
      </div>

      {t.remeasureDue && (
        <Link
          href={`/h/${householdId}/manage#trees`}
          className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/15"
        >
          <Ruler className="h-3.5 w-3.5" /> Re-measure the trunk girth to convert estimated growth into measured growth
        </Link>
      )}
      {t.flags.map((f) => (
        <p key={f} className="mt-2 flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {f}
        </p>
      ))}

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Tree care</span>
          <span className="num font-semibold text-primary">{t.care ? `${Math.round(t.care.index * 100)}` : "–"}</span>
        </div>
        {t.care ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              How well soil, light and climate stayed in healthy ranges on {t.care.day}. Guides care; does not change carbon.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {t.care.details.map((d) => (
                <li key={d.key}>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="num">{Math.round(d.factor * 100)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${d.factor >= 0.95 ? "bg-primary" : d.factor >= 0.6 ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${d.factor * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {t.sensorDeviceId ? "Waiting for the tree module's first readings." : "Link a tree module to track care conditions."}
          </p>
        )}
      </div>
    </Panel>
  )
}

function Figure({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? "border border-primary/25 bg-primary/10" : "bg-secondary/70"}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${accent ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  )
}
