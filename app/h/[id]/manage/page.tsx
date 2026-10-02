"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Camera, Copy, KeyRound, Loader2, RefreshCw, Trash2 } from "lucide-react"
import type { DashboardData, DeviceKind } from "@/lib/dashboard-types"
import { TREE_SPECIES } from "@/lib/species"
import { ACTIVITY_KINDS, EMISSION_FACTORS, type ActivityKind } from "@/lib/emission-factors"
import { api, useHouseholdKey } from "@/lib/household-client"
import { massText, timeAgo } from "@/lib/format"
import { SiteHeader } from "@/components/site-header"
import { Button, ErrorText, Field, Input, Panel, PanelTitle, Select } from "@/components/ui"

export default function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const isNew = useSearchParams().get("new") === "1"
  const { key, ready, save, clear } = useHouseholdKey(id)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadError, setLoadError] = useState("")

  const reload = useCallback(async () => {
    try {
      setData(await api<DashboardData>(`/api/households/${id}/dashboard`))
    } catch (err) {
      setLoadError((err as Error).message)
    }
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <Link href={`/h/${id}`} className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/70">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        }
      />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-10">
        <div>
          <p className="eyebrow">Manage</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data?.household.name ?? "Household"}</h1>
        </div>
        <ErrorText>{loadError}</ErrorText>

        {!ready ? null : !key ? (
          <Unlock id={id} onUnlock={save} />
        ) : !data ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <>
            {isNew && <NewHouseholdKey householdKey={key} />}
            <Devices id={id} hk={key} data={data} reload={reload} />
            <TreesManager id={id} hk={key} data={data} reload={reload} />
            <Activities id={id} hk={key} data={data} reload={reload} />
            <div className="flex justify-end">
              <Button variant="ghost" onClick={clear}>
                <KeyRound className="h-4 w-4" /> Forget key on this browser
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

type SectionProps = { id: string; hk: string; data: DashboardData; reload: () => Promise<void> }

function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError("")
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      type="button"
      variant="secondary"
      className="!px-2.5 !py-1.5 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
    >
      <Copy className="h-3.5 w-3.5" /> {done ? "Copied" : "Copy"}
    </Button>
  )
}

function Unlock({ id, onUnlock }: { id: string; onUnlock: (k: string) => void }) {
  const { busy, error, run } = useAction()
  return (
    <Panel>
      <PanelTitle eyebrow="Owner access" title="Enter your household key" />
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const k = String(new FormData(e.currentTarget).get("key") ?? "").trim()
          run(async () => {
            await api(`/api/households/${id}/session`, { method: "POST", householdKey: k })
            onUnlock(k)
          })
        }}
      >
        <Input name="key" required placeholder="hh_…" autoComplete="off" />
        <Button type="submit" loading={busy}>Unlock</Button>
      </form>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
    </Panel>
  )
}

function NewHouseholdKey({ householdKey }: { householdKey: string }) {
  return (
    <Panel className="border-gold/40 bg-gold/5">
      <p className="font-semibold text-gold">Save your household key</p>
      <p className="mt-1 text-sm text-muted-foreground">
        It is stored in this browser and needed to manage the household from any other device. It cannot be recovered.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="num flex-1 overflow-x-auto rounded-lg bg-background/60 px-3 py-2 text-sm">{householdKey}</code>
        <CopyButton text={householdKey} />
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

const DEVICE_LABEL: Record<DeviceKind, string> = { tree: "Tree module", vehicle: "Vehicle & ambient air module", camera: "Leaf camera (ESP32-CAM)" }
const FIRMWARE: Record<DeviceKind, string> = {
  tree: "hardware/tree_module/tree_module.ino",
  vehicle: "hardware/vehicle_module/vehicle_module.ino",
  camera: "hardware/leaf_camera/leaf_camera.ino",
}

function Devices({ id, hk, data, reload }: SectionProps) {
  const { busy, error, run } = useAction()
  const [issued, setIssued] = useState<{ id: string; kind: DeviceKind; key: string } | null>(null)
  const origin = typeof window === "undefined" ? "" : window.location.origin

  return (
    <Panel id="devices">
      <PanelTitle eyebrow="Hardware" title="Sensor modules" />
      {data.devices.length > 0 && (
        <ul className="mb-5 divide-y divide-border rounded-xl border border-border">
          {data.devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className={`h-2 w-2 rounded-full ${d.online ? "bg-primary" : "bg-muted-foreground"}`} />
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{DEVICE_LABEL[d.kind]} · {d.id} · last report {timeAgo(d.lastSeenAt)}</p>
              </div>
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost" className="!px-2.5 text-xs" disabled={busy}
                  onClick={() => run(async () => {
                    if (!confirm(`Issue a new key for ${d.name}? The old key stops working immediately.`)) return
                    const r = await api<{ key: string }>(`/api/households/${id}/devices/${d.id}`, { method: "POST", householdKey: hk })
                    setIssued({ id: d.id, kind: d.kind, key: r.key })
                  })}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> New key
                </Button>
                <Button
                  variant="danger" className="!px-2.5 text-xs" disabled={busy}
                  onClick={() => run(async () => {
                    if (!confirm(`Delete ${d.name} and all its readings?`)) return
                    await api(`/api/households/${id}/devices/${d.id}`, { method: "DELETE", householdKey: hk })
                    await reload()
                  })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {issued && (
        <div className="mb-5 rounded-xl border border-gold/40 bg-gold/5 p-4">
          <p className="text-sm font-semibold text-gold">Device key for {issued.id} (shown once)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste these lines into <code>{FIRMWARE[issued.kind]}</code> and upload it to the board.
          </p>
          <pre className="num mt-3 overflow-x-auto rounded-lg bg-background/70 p-3 text-xs">{`const char* SERVER_URL = "${origin}";
const char* DEVICE_KEY = "${issued.key}";`}</pre>
          <div className="mt-2 flex gap-2">
            <CopyButton text={`const char* SERVER_URL = "${origin}";\nconst char* DEVICE_KEY = "${issued.key}";`} />
            <Button variant="ghost" className="text-xs" onClick={() => setIssued(null)}>Done</Button>
          </div>
        </div>
      )}

      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          const formEl = e.currentTarget
          run(async () => {
            const r = await api<{ id: string; kind: DeviceKind; key: string }>(`/api/households/${id}/devices`, {
              method: "POST",
              householdKey: hk,
              body: JSON.stringify({ kind: f.get("kind"), name: f.get("name") || undefined }),
            })
            setIssued(r)
            formEl.reset()
            await reload()
          })
        }}
      >
        <Field label="Module type">
          <Select name="kind" defaultValue="tree">
            {(Object.keys(DEVICE_LABEL) as DeviceKind[]).map((k) => <option key={k} value={k}>{DEVICE_LABEL[k]}</option>)}
          </Select>
        </Field>
        <Field label="Name">
          <Input name="name" maxLength={60} placeholder="e.g. Front-yard neem" />
        </Field>
        <div className="flex items-end"><Button type="submit" loading={busy} className="w-full">Add module</Button></div>
      </form>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function TreesManager({ id, hk, data, reload }: SectionProps) {
  const { busy, error, run } = useAction()
  const [species, setSpecies] = useState("neem")
  const [identify, setIdentify] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: "" })
  const sensors = data.devices.filter((d) => d.kind === "tree")
  const cameras = data.devices.filter((d) => d.kind === "camera")
  const speciesOptions = useMemo(
    () => Object.entries(TREE_SPECIES).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    []
  )

  async function onBark(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setIdentify({ busy: true, msg: "" })
    try {
      const form = new FormData()
      form.append("image", file)
      const res = await fetch("/api/identify-tree", { method: "POST", body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      const top = body.candidates[0]
      if (top?.key) setSpecies(top.key)
      setIdentify({
        busy: false,
        msg: body.candidates.map((c: { name: string; confidence: number }) => `${c.name} ${(c.confidence * 100).toFixed(0)}%`).join(" · "),
      })
    } catch (err) {
      setIdentify({ busy: false, msg: `Identification failed: ${(err as Error).message}` })
    }
  }

  return (
    <Panel id="trees">
      <PanelTitle eyebrow="Green offset" title="Trees" />

      {data.trees.length > 0 && (
        <ul className="mb-6 space-y-3">
          {data.trees.map((t) => (
            <li key={t.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.speciesName} · Ø {t.dbhCm} cm · {t.heightM} m · {t.measurementCount} measurement{t.measurementCount === 1 ? "" : "s"}, last {t.measuredOn}
                  </p>
                </div>
                <Button
                  variant="danger" className="ml-auto !px-2.5 text-xs" disabled={busy}
                  onClick={() => run(async () => {
                    if (!confirm(`Delete ${t.name}?`)) return
                    await api(`/api/households/${id}/trees/${t.id}`, { method: "DELETE", householdKey: hk })
                    await reload()
                  })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <form
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  run(async () => {
                    await api(`/api/households/${id}/trees/${t.id}`, {
                      method: "PATCH",
                      householdKey: hk,
                      body: JSON.stringify({
                        girth_cm: f.get("girth_cm") || undefined,
                        height_m: f.get("height_m") || undefined,
                        sensor_device_id: f.get("sensor_device_id") || null,
                        camera_device_id: f.get("camera_device_id") || null,
                        measured_on: f.get("measured_on") || undefined,
                      }),
                    })
                    await reload()
                  })
                }}
              >
                <Input name="girth_cm" type="number" step="0.5" min={3} placeholder="New girth (cm)" />
                <Input name="height_m" type="number" step="0.1" min={0.3} placeholder="New height (m)" />
                <Input name="measured_on" type="date" title="Measured on" defaultValue={new Date().toISOString().slice(0, 10)} />
                <Select name="sensor_device_id" defaultValue={t.sensorDeviceId ?? ""}>
                  <option value="">No tree module</option>
                  {sensors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
                <Select name="camera_device_id" defaultValue={t.cameraDeviceId ?? ""}>
                  <option value="">No camera</option>
                  {cameras.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
                <Button type="submit" variant="secondary" disabled={busy}>Save</Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          const formEl = e.currentTarget
          run(async () => {
            await api(`/api/households/${id}/trees`, {
              method: "POST",
              householdKey: hk,
              body: JSON.stringify({
                name: f.get("name"),
                species_key: species,
                girth_cm: f.get("girth_cm"),
                height_m: f.get("height_m"),
                sensor_device_id: f.get("sensor_device_id") || null,
                camera_device_id: f.get("camera_device_id") || null,
              }),
            })
            formEl.reset()
            await reload()
          })
        }}
      >
        <Field label="Tree name">
          <Input name="name" required maxLength={60} placeholder="e.g. Neem by the gate" />
        </Field>
        <Field label="Species" hint={identify.msg || "Not sure? Identify it from a bark photo."}>
          <div className="flex gap-2">
            <Select value={species} onChange={(e) => setSpecies(e.target.value)}>
              {speciesOptions.map(([k, s]) => (
                <option key={k} value={k}>{s.name} ({s.scientificName})</option>
              ))}
            </Select>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-sm hover:bg-secondary/70">
              {identify.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Bark
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onBark} />
            </label>
          </div>
        </Field>
        <Field label="Trunk girth at 1.3 m (cm)" hint="Wrap a measuring tape around the trunk at chest height.">
          <Input name="girth_cm" type="number" step="0.5" min={3} max={2000} required />
        </Field>
        <Field label="Height (m)" hint="Estimate with a clinometer app, or count building floors (~3 m each).">
          <Input name="height_m" type="number" step="0.1" min={0.3} max={120} required />
        </Field>
        <Field label="Tree module">
          <Select name="sensor_device_id" defaultValue="">
            <option value="">None yet</option>
            {sensors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Leaf camera">
          <Select name="camera_device_id" defaultValue="">
            <option value="">None</option>
            {cameras.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={busy}>Add tree</Button>
        </div>
      </form>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function monthBounds() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { start: f(first), end: f(last) }
}

function Activities({ id, hk, data, reload }: SectionProps) {
  const { busy, error, run } = useAction()
  const [kind, setKind] = useState<ActivityKind>("electricity")
  const [qty, setQty] = useState("")
  const def = monthBounds()
  const factor = EMISSION_FACTORS[kind]

  return (
    <Panel id="activities">
      <PanelTitle eyebrow="Household emissions · self-reported" title="Bills & fuel" />
      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          run(async () => {
            await api(`/api/households/${id}/activities`, {
              method: "POST",
              householdKey: hk,
              body: JSON.stringify({
                kind,
                quantity: qty,
                period_start: f.get("period_start"),
                period_end: f.get("period_end"),
                note: f.get("note") || null,
              }),
            })
            setQty("")
            await reload()
          })
        }}
      >
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)}>
            {ACTIVITY_KINDS.map((k) => <option key={k} value={k}>{EMISSION_FACTORS[k].label}</option>)}
          </Select>
        </Field>
        <Field label={`Quantity (${factor.unit})`} hint={qty ? `= ${massText(Number(qty) * factor.kgCO2PerUnit)} CO₂` : `${factor.kgCO2PerUnit} kg CO₂ per ${factor.unit}`}>
          <Input type="number" step="0.01" min={0.01} required value={qty} onChange={(e) => setQty(e.target.value)} placeholder={kind === "electricity" ? "Units on bill" : ""} />
        </Field>
        <Field label="From">
          <Input name="period_start" type="date" required defaultValue={def.start} />
        </Field>
        <Field label="To">
          <Input name="period_end" type="date" required defaultValue={def.end} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={busy} className="w-full">Log</Button>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <Input name="note" maxLength={120} placeholder="Note (optional), e.g. TNEB bill Sept" />
        </div>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">{factor.source}</p>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>

      {data.activities.length > 0 && (
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
          {data.activities.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium">{EMISSION_FACTORS[a.kind].label}</span>
              <span className="num text-muted-foreground">{a.quantity} {EMISSION_FACTORS[a.kind].unit}</span>
              <span className="text-xs text-muted-foreground">{a.periodStart} → {a.periodEnd}{a.note ? ` · ${a.note}` : ""}</span>
              <span className="num ml-auto font-medium">{massText(a.co2Kg)}</span>
              <Button
                variant="danger" className="!px-2 text-xs" disabled={busy}
                onClick={() => run(async () => {
                  await api(`/api/households/${id}/activities/${a.id}`, { method: "DELETE", householdKey: hk })
                  await reload()
                })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
