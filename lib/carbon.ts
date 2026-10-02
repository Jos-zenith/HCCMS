import { DBH_INCREMENT_CM, type TreeSpecies } from "./species"
import { addDays, daysBetween } from "./days"

const CO2_PER_C = 44 / 12
const O2_PER_CO2 = 32 / 44
/** Root-to-shoot ratio for below-ground biomass (Cairns et al. 1997, IPCC 2006 tropical default) */
const ROOT_SHOOT_RATIO = 0.24
/** Measured diameter growth faster than this multiple of the species' class rate is capped and flagged. */
const MAX_GROWTH_MULTIPLE = 3
/** After this many days without a new measurement, estimated growth stops accruing. */
export const ESTIMATE_WINDOW_DAYS = 365
/** Show a re-measure reminder after this many days. */
export const REMEASURE_AFTER_DAYS = 180

/**
 * Chave et al. (2014) pantropical allometric model:
 *   AGB (kg) = 0.0673 × (ρ × D² × H)^0.976
 * ρ wood density g/cm³, D trunk diameter at breast height cm, H height m.
 */
export function chaveAgbKg(woodDensity: number, dbhCm: number, heightM: number): number {
  return 0.0673 * Math.pow(woodDensity * dbhCm * dbhCm * heightM, 0.976)
}

/** CO2 equivalent of all carbon in the tree: (AGB + roots) × carbon fraction × 44/12. */
export function storedCo2Kg(species: TreeSpecies, dbhCm: number, heightM: number): number {
  const agb = chaveAgbKg(species.woodDensity, dbhCm, heightM)
  return agb * (1 + ROOT_SHOOT_RATIO) * species.carbonFraction * CO2_PER_C
}

/** Stock gained by one year of diameter growth at the species' class rate (height held constant). */
export function annualPotentialKg(species: TreeSpecies, dbhCm: number, heightM: number): number {
  return storedCo2Kg(species, dbhCm + DBH_INCREMENT_CM[species.growthRate], heightM) - storedCo2Kg(species, dbhCm, heightM)
}

export function oxygenFromCo2Kg(co2Kg: number): number {
  return co2Kg * O2_PER_CO2
}

// ---------------------------------------------------------------------------
// Sequestration from measurement history
// ---------------------------------------------------------------------------

export interface Measurement {
  measuredOn: string
  dbhCm: number
  heightM: number
}

export interface SequestrationResult {
  /** Growth proven by successive trunk measurements (kg CO2) */
  measuredKg: number
  /** Provisional growth since the last measurement at the species' class rate (kg CO2) */
  estimatedKg: number
  /** kg CO2 credited to each calendar day (measured growth spread over its interval, then estimate) */
  perDay: Map<string, number>
  flags: string[]
  lastMeasuredOn: string
  remeasureDue: boolean
}

/**
 * Carbon is credited only from growth, never from the stock a tree already had
 * when registered:
 *  - between two measurements: Δ stored CO2, spread evenly over the interval,
 *    capped at MAX_GROWTH_MULTIPLE × the species' normal diameter growth;
 *  - after the latest measurement: the species' class rate, for at most
 *    ESTIMATE_WINDOW_DAYS, marked as estimated until the next measurement.
 * Measurement dates before the tree was registered are treated as the
 * registration day, so backdating cannot create credit for past time.
 */
export function sequestration(
  species: TreeSpecies,
  history: Measurement[],
  today: string,
  registeredOn: string
): SequestrationResult {
  const ms = history
    .map((m) => (m.measuredOn < registeredOn ? { ...m, measuredOn: registeredOn } : m))
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
  const perDay = new Map<string, number>()
  const flags: string[] = []
  const credit = (from: string, days: number, kgPerDay: number) => {
    for (let i = 1; i <= days; i++) {
      const d = addDays(from, i)
      if (d > today) break
      perDay.set(d, (perDay.get(d) ?? 0) + kgPerDay)
    }
  }

  let measuredKg = 0
  for (let i = 1; i < ms.length; i++) {
    const a = ms[i - 1]
    const b = ms[i]
    const days = daysBetween(a.measuredOn, b.measuredOn)
    if (days <= 0) continue
    let gain = storedCo2Kg(species, b.dbhCm, b.heightM) - storedCo2Kg(species, a.dbhCm, a.heightM)
    if (gain < 0) {
      flags.push(`Measurement on ${b.measuredOn} is smaller than the previous one; no growth credited for that interval.`)
      gain = 0
    }
    const maxDbh = a.dbhCm + (MAX_GROWTH_MULTIPLE * DBH_INCREMENT_CM[species.growthRate] * days) / 365
    const maxGain = storedCo2Kg(species, maxDbh, Math.max(a.heightM, b.heightM)) - storedCo2Kg(species, a.dbhCm, a.heightM)
    if (gain > maxGain) {
      flags.push(`Growth up to ${b.measuredOn} exceeds ${MAX_GROWTH_MULTIPLE}× the normal rate for this species; capped.`)
      gain = maxGain
    }
    measuredKg += gain
    credit(a.measuredOn, days, gain / days)
  }

  const last = ms[ms.length - 1]
  const since = daysBetween(last.measuredOn, today)
  const estDays = Math.max(0, Math.min(since, ESTIMATE_WINDOW_DAYS))
  const estPerDay = annualPotentialKg(species, last.dbhCm, last.heightM) / 365
  credit(last.measuredOn, estDays, estPerDay)
  if (since > ESTIMATE_WINDOW_DAYS) {
    flags.push(`Last measured ${since} days ago; estimated growth has stopped accruing. Re-measure the trunk to continue.`)
  }

  return {
    measuredKg,
    estimatedKg: estDays * estPerDay,
    perDay,
    flags,
    lastMeasuredOn: last.measuredOn,
    remeasureDue: since >= REMEASURE_AFTER_DAYS,
  }
}

// ---------------------------------------------------------------------------
// Tree care index (from sensors) — informs care tips and the Green Score only,
// never the carbon figures.
// ---------------------------------------------------------------------------

export interface DailyConditions {
  temperatureC: number | null
  humidityPct: number | null
  soilMoisturePct: number | null
  soilPh: number | null
  /** Brightest light reading of the day, % of sensor range */
  maxLightPct: number | null
  /** Share of green (vs yellow/brown) leaf pixels from the latest leaf scan, 0-1 */
  leafGreenRatio: number | null
}

export interface FactorDetail {
  key: keyof DailyConditions
  label: string
  factor: number
}

/** 1 inside the optimal band, falling linearly to 0 at the tolerance edges. */
function band(value: number, optLo: number, optHi: number, tolLo: number, tolHi: number) {
  if (value >= optLo && value <= optHi) return 1
  if (value < optLo) return value <= tolLo ? 0 : (value - tolLo) / (optLo - tolLo)
  return value >= tolHi ? 0 : (tolHi - value) / (tolHi - optHi)
}

/**
 * How well-kept the tree's surroundings were on a day: the mean of per-sensor
 * scores against care ranges for tropical urban trees. Missing sensors are skipped.
 */
export function careIndex(c: DailyConditions): { index: number | null; details: FactorDetail[] } {
  const details: FactorDetail[] = []
  if (c.temperatureC !== null) details.push({ key: "temperatureC", label: "Temperature", factor: band(c.temperatureC, 20, 34, 10, 45) })
  if (c.humidityPct !== null) details.push({ key: "humidityPct", label: "Humidity", factor: band(c.humidityPct, 40, 85, 15, 100) })
  if (c.soilMoisturePct !== null) details.push({ key: "soilMoisturePct", label: "Soil moisture", factor: band(c.soilMoisturePct, 25, 70, 5, 95) })
  if (c.soilPh !== null) details.push({ key: "soilPh", label: "Soil pH", factor: band(c.soilPh, 5.5, 7.5, 4, 9) })
  if (c.maxLightPct !== null) details.push({ key: "maxLightPct", label: "Sunlight", factor: band(c.maxLightPct, 50, 100, 10, 100) })
  if (c.leafGreenRatio !== null) details.push({ key: "leafGreenRatio", label: "Leaf colour", factor: band(c.leafGreenRatio, 0.8, 1, 0.3, 1) })
  const index = details.length ? details.reduce((s, d) => s + d.factor, 0) / details.length : null
  return { index, details }
}

// ---------------------------------------------------------------------------
// Green Score
// ---------------------------------------------------------------------------

export interface ScoreComponent {
  key: "offset" | "care" | "trend"
  label: string
  weight: number
  /** 0-1, or null when there is not enough (or untrustworthy) data */
  value: number | null
  detail: string
}

export interface GreenScore {
  score: number | null
  tier: "Platinum" | "Gold" | "Silver" | "Bronze" | null
  components: ScoreComponent[]
}

/**
 * Scores only what the household controls. Ambient air quality (PM2.5) is shown
 * on the dashboard but deliberately excluded: a static sensor mostly measures
 * the neighbourhood, not the household.
 */
export function greenScore(input: {
  sequestered30dKg: number
  emitted30dKg: number | null
  emittedPrev30dKg: number | null
  careIndex7d: number | null
  careFlagged: boolean
}): GreenScore {
  const { sequestered30dKg, emitted30dKg, emittedPrev30dKg, careIndex7d, careFlagged } = input

  const offset = emitted30dKg === null ? null : emitted30dKg === 0 ? 1 : Math.min(sequestered30dKg / emitted30dKg, 1)

  let trend: number | null = null
  if (emitted30dKg !== null && emittedPrev30dKg !== null && emittedPrev30dKg > 0) {
    const change = (emitted30dKg - emittedPrev30dKg) / emittedPrev30dKg // -0.2 => 20% cut
    trend = Math.min(Math.max(0.5 - change * 2.5, 0), 1)
  }

  const care = careFlagged ? null : careIndex7d

  const components: ScoreComponent[] = [
    {
      key: "offset",
      label: "Emission offset",
      weight: 55,
      value: offset,
      detail: offset === null ? "Log an electricity, LPG or fuel bill" : "Tree growth ÷ self-reported household emissions, last 30 days",
    },
    {
      key: "care",
      label: "Tree care",
      weight: 30,
      value: care,
      detail: careFlagged
        ? "Withheld: sensor data failed plausibility checks"
        : care === null
          ? "Connect a tree module"
          : "Soil, light and climate kept in healthy ranges, last 7 days",
    },
    {
      key: "trend",
      label: "Emission trend",
      weight: 15,
      value: trend,
      detail: trend === null ? "Needs two months of bills" : "Change vs previous 30 days",
    },
  ]

  if (offset === null) return { score: null, tier: null, components }
  const available = components.filter((c) => c.value !== null)
  const totalWeight = available.reduce((s, c) => s + c.weight, 0)
  const score = Math.round((available.reduce((s, c) => s + (c.value as number) * c.weight, 0) / totalWeight) * 100)
  const tier = score >= 85 ? "Platinum" : score >= 70 ? "Gold" : score >= 50 ? "Silver" : "Bronze"
  return { score, tier, components }
}
