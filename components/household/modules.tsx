"use client"

import Link from "next/link"
import { AlertTriangle, Camera, Car, Cpu, Droplets, FlaskRound, Sprout, Sun, Thermometer, Wind } from "lucide-react"
import type { DashboardData, DeviceInfo, LatestReading, SeriesPoint } from "@/lib/dashboard-types"
import { SensorCard, type SensorStatus } from "@/components/sensor-card"
import { EmptyState, Panel } from "@/components/ui"
import { fmt, timeAgo } from "@/lib/format"
import { PM25_NAAQS_24H, PM25_WHO_24H } from "@/lib/emission-factors"

function band(v: number, ok: [number, number], watch: [number, number]): SensorStatus {
  if (v >= ok[0] && v <= ok[1]) return "optimal"
  if (v >= watch[0] && v <= watch[1]) return "warning"
  return "critical"
}

type Metric = {
  key: keyof LatestReading
  label: string
  unit: string
  digits: number
  icon: React.ReactNode
  status: (v: number) => SensorStatus
  hint: string
}

const TREE_METRICS: Metric[] = [
  { key: "temperatureC", label: "Temperature", unit: "°C", digits: 1, icon: <Thermometer className="h-4 w-4" />, status: (v) => band(v, [20, 34], [10, 40]), hint: "Ideal 20–34 °C" },
  { key: "humidityPct", label: "Humidity", unit: "%", digits: 0, icon: <Droplets className="h-4 w-4" />, status: (v) => band(v, [40, 85], [20, 95]), hint: "Ideal 40–85 %" },
  { key: "soilMoisturePct", label: "Soil moisture", unit: "%", digits: 0, icon: <Sprout className="h-4 w-4" />, status: (v) => band(v, [25, 70], [15, 85]), hint: "Ideal 25–70 %" },
  { key: "soilPh", label: "Soil pH", unit: "", digits: 1, icon: <FlaskRound className="h-4 w-4" />, status: (v) => band(v, [5.5, 7.5], [4.5, 8.5]), hint: "Ideal 5.5–7.5" },
  { key: "lightPct", label: "Sunlight", unit: "%", digits: 0, icon: <Sun className="h-4 w-4" />, status: () => "optimal", hint: "LDR, % of full scale" },
]

const AIR_METRICS: Metric[] = [
  { key: "pm25", label: "PM2.5", unit: "µg/m³", digits: 0, icon: <Wind className="h-4 w-4" />, status: (v) => (v <= PM25_WHO_24H ? "optimal" : v <= PM25_NAAQS_24H ? "warning" : "critical"), hint: `Ambient · WHO ${PM25_WHO_24H} · NAAQS ${PM25_NAAQS_24H}` },
  { key: "co2Ppm", label: "CO₂ (indicative)", unit: "ppm", digits: 0, icon: <Car className="h-4 w-4" />, status: (v) => band(v, [0, 1000], [0, 2000]), hint: "MQ135: trend only, not emissions" },
  { key: "temperatureC", label: "Temperature", unit: "°C", digits: 1, icon: <Thermometer className="h-4 w-4" />, status: (v) => band(v, [0, 38], [0, 42]), hint: "Ambient" },
  { key: "humidityPct", label: "Humidity", unit: "%", digits: 0, icon: <Droplets className="h-4 w-4" />, status: () => "optimal", hint: "Ambient" },
]

const KIND_ICON = { tree: Sprout, vehicle: Car, camera: Camera }

export function Modules({ data, householdId }: { data: DashboardData; householdId: string }) {
  if (data.devices.length === 0) {
    return (
      <Panel>
        <EmptyState icon={<Cpu className="h-5 w-5" />} title="No sensor modules connected">
          <Link href={`/h/${householdId}/manage`} className="text-primary underline-offset-4 hover:underline">
            Add a tree or vehicle module
          </Link>{" "}
          to start streaming readings.
        </EmptyState>
      </Panel>
    )
  }
  return (
    <div className="space-y-6">
      {data.devices.map((d) => (
        <DeviceBlock key={d.id} device={d} latest={data.latest[d.id]} series={data.series24h.filter((p) => p.deviceId === d.id)} data={data} />
      ))}
    </div>
  )
}

function DeviceBlock({ device, latest, series, data }: { device: DeviceInfo; latest?: LatestReading; series: SeriesPoint[]; data: DashboardData }) {
  const Icon = KIND_ICON[device.kind]
  const metrics = device.kind === "tree" ? TREE_METRICS : device.kind === "vehicle" ? AIR_METRICS : []
  const tree = device.kind === "camera" ? data.trees.find((t) => t.cameraDeviceId === device.id) : undefined
  const flags = data.dataFlags.filter((f) => f.deviceId === device.id)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-medium">{device.name}</p>
          <p className="text-xs text-muted-foreground">
            {device.id} · last report {timeAgo(device.lastSeenAt)}
          </p>
        </div>
        <span
          className={`ml-auto flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            device.online ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {device.online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${device.online ? "bg-primary" : "bg-muted-foreground"}`} />
          </span>
          {device.online ? "Live" : "Offline"}
        </span>
      </div>

      {flags.map((f) => (
        <p key={f.message} className="mb-3 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><span className="font-semibold">Data check failed.</span> {f.message} Tree care is excluded from the Green Score until this clears.</span>
        </p>
      ))}

      {device.kind === "camera" ? (
        <Panel className="!p-4">
          {tree?.latestLeafScan ? (
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Green foliage share (indicative) · {tree.name}</p>
                <p className="num text-3xl font-semibold">{(tree.latestLeafScan.greenRatio * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">VARI</p>
                <p className="num text-xl font-semibold">{tree.latestLeafScan.vari.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Captured {timeAgo(tree.latestLeafScan.capturedAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tree ? `Waiting for the first canopy photo of ${tree.name}.` : "Link this camera to a tree on the manage page."}
            </p>
          )}
        </Panel>
      ) : !latest ? (
        <Panel className="!p-4">
          <p className="text-sm text-muted-foreground">No readings received yet. Flash the device key into the firmware and power it on.</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((m) => {
            const v = latest[m.key] as number | null
            if (v === null) return null
            return (
              <SensorCard
                key={m.key}
                icon={m.icon}
                label={m.label}
                value={fmt(v, m.digits)}
                unit={m.unit}
                status={m.status(v)}
                subtext={m.hint}
                trend={series.map((p) => p[m.key] as number | null).filter((x): x is number => x !== null).slice(-36)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
