// Shapes returned by GET /api/households/[id]/dashboard (safe to import in client code)

import type { ActivityKind } from "./emission-factors"
import type { FactorDetail, GreenScore } from "./carbon"

export type DeviceKind = "tree" | "vehicle" | "camera"

export interface DeviceInfo {
  id: string
  kind: DeviceKind
  name: string
  lastSeenAt: string | null
  online: boolean
}

export interface LatestReading {
  recordedAt: string
  temperatureC: number | null
  humidityPct: number | null
  soilMoisturePct: number | null
  soilPh: number | null
  lightPct: number | null
  co2Ppm: number | null
  pm25: number | null
}

export interface SeriesPoint extends LatestReading {
  deviceId: string
}

export interface TreeSummary {
  id: string
  name: string
  speciesKey: string
  speciesName: string
  scientificName: string
  dbhCm: number
  heightM: number
  measuredOn: string
  measurementCount: number
  remeasureDue: boolean
  sensorDeviceId: string | null
  cameraDeviceId: string | null
  co2StoredKg: number
  annualPotentialKg: number
  /** Growth proven by successive trunk measurements */
  measuredGrowthKg: number
  /** Provisional growth since the last measurement */
  estimatedGrowthKg: number
  flags: string[]
  care: { index: number; details: FactorDetail[]; day: string } | null
  latestLeafScan: { capturedAt: string; greenRatio: number; vari: number; coverage: number } | null
}

export interface ActivityRow {
  id: string
  kind: ActivityKind
  quantity: number
  periodStart: string
  periodEnd: string
  note: string | null
  co2Kg: number
}

export interface DailyBalance {
  day: string
  sequesteredKg: number
  emittedKg: number | null
}

export interface Tip {
  level: "good" | "info" | "warn"
  text: string
}

export interface DataFlag {
  deviceId: string
  message: string
}

export interface DashboardData {
  generatedAt: string
  timezone: string
  household: { id: string; name: string; city: string; locality: string | null; members: number | null; createdAt: string }
  devices: DeviceInfo[]
  latest: Record<string, LatestReading>
  series24h: SeriesPoint[]
  trees: TreeSummary[]
  activities: ActivityRow[]
  totals: {
    co2StoredKg: number
    creditsMeasuredTco2e: number
    creditsEstimatedTco2e: number
    sequestered30dKg: number
    oxygen30dKg: number
    emitted30dKg: number | null
    emissionCoverageDays: number
    emittedByKind30d: Partial<Record<ActivityKind, number>>
    netBalance30dKg: number | null
    avgPm25_30d: number | null
    avgCo2_30d: number | null
  }
  daily: DailyBalance[]
  score: GreenScore
  dataFlags: DataFlag[]
  tips: Tip[]
}
