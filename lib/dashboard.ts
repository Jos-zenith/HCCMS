import { query, queryOne } from "./db"
import { TREE_SPECIES } from "./species"
import { EMISSION_FACTORS, PM25_NAAQS_24H, PM25_WHO_24H, type ActivityKind } from "./emission-factors"
import { annualPotentialKg, careIndex, greenScore, oxygenFromCo2Kg, sequestration, storedCo2Kg } from "./carbon"
import { addDays, dayString, daysBetween } from "./days"
import type {
  ActivityRow,
  DailyBalance,
  DashboardData,
  DataFlag,
  DeviceInfo,
  LatestReading,
  SeriesPoint,
  Tip,
  TreeSummary,
} from "./dashboard-types"

export const TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Kolkata"
/** A device counts as online if it has reported within this window. */
const ONLINE_WINDOW_MS = 3 * 60_000
/** A leaf scan informs the care index for this many days. */
const LEAF_SCAN_VALID_DAYS = 14

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v))
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

interface DailyRow {
  device_id: string
  day: string
  t: number | null
  h: number | null
  s: number | null
  ph: number | null
  l: number | null
  co2: number | null
  pm: number | null
  n: number
}

interface PlausibilityRow {
  device_id: string
  n: number
  span_h: number
  t_sd: number | null
  night_light: number | null
  night_n: number
}

export async function getDashboard(householdId: string): Promise<DashboardData | null> {
  const household = await queryOne<{
    id: string; name: string; city: string; locality: string | null; members: number | null; created_at: Date
  }>("SELECT id, name, city, locality, members, created_at FROM households WHERE id = $1", [householdId])
  if (!household) return null

  const now = new Date()
  const today = dayString(now, TIMEZONE)
  const since30 = addDays(today, -29)
  const since60 = addDays(today, -59)
  const since7 = addDays(today, -6)

  const [deviceRows, treeRows, measurementRows, dailyRows, scanRows, activityRows, latestRows, seriesRows, plausibilityRows] =
    await Promise.all([
      query<{ id: string; kind: DeviceInfo["kind"]; name: string; last_seen_at: Date | null }>(
        "SELECT id, kind, name, last_seen_at FROM devices WHERE household_id = $1 ORDER BY created_at",
        [householdId]
      ),
      query<{ id: string; name: string; species_key: string; dbh_cm: number; height_m: number; sensor_device_id: string | null; camera_device_id: string | null; registered_on: string }>(
        `SELECT id, name, species_key, dbh_cm, height_m, sensor_device_id, camera_device_id,
                to_char(created_at AT TIME ZONE $2, 'YYYY-MM-DD') AS registered_on
           FROM trees WHERE household_id = $1 ORDER BY created_at`,
        [householdId, TIMEZONE]
      ),
      query<{ tree_id: string; measured_on: string; dbh_cm: number; height_m: number }>(
        `SELECT m.tree_id, to_char(m.measured_on, 'YYYY-MM-DD') AS measured_on, m.dbh_cm, m.height_m
           FROM tree_measurements m JOIN trees t ON t.id = m.tree_id
          WHERE t.household_id = $1 ORDER BY m.measured_on, m.id`,
        [householdId]
      ),
      query<DailyRow>(
        `SELECT r.device_id, to_char(r.recorded_at AT TIME ZONE $2, 'YYYY-MM-DD') AS day,
                avg(r.temperature_c) AS t, avg(r.humidity_pct) AS h, avg(r.soil_moisture_pct) AS s,
                avg(r.soil_ph) AS ph, max(r.light_pct) AS l, avg(r.co2_ppm) AS co2, avg(r.pm25_ugm3) AS pm,
                count(*)::int AS n
           FROM readings r JOIN devices d ON d.id = r.device_id
          WHERE d.household_id = $1 AND r.recorded_at >= now() - interval '31 days'
          GROUP BY 1, 2`,
        [householdId, TIMEZONE]
      ),
      query<{ tree_id: string; day: string; captured_at: Date; green_ratio: number; vari: number; vegetation_coverage: number }>(
        `SELECT s.tree_id, to_char(s.captured_at AT TIME ZONE $2, 'YYYY-MM-DD') AS day, s.captured_at,
                s.green_ratio, s.vari, s.vegetation_coverage
           FROM leaf_scans s JOIN trees t ON t.id = s.tree_id
          WHERE t.household_id = $1 AND s.captured_at >= now() - interval '45 days'
          ORDER BY s.captured_at`,
        [householdId, TIMEZONE]
      ),
      query<{ id: string; kind: ActivityKind; quantity: number; period_start: string; period_end: string; note: string | null }>(
        `SELECT id, kind, quantity, to_char(period_start, 'YYYY-MM-DD') AS period_start,
                to_char(period_end, 'YYYY-MM-DD') AS period_end, note
           FROM activities WHERE household_id = $1 ORDER BY period_end DESC, created_at DESC`,
        [householdId]
      ),
      query<Record<string, unknown>>(
        `SELECT DISTINCT ON (r.device_id) r.device_id, r.recorded_at, r.temperature_c, r.humidity_pct,
                r.soil_moisture_pct, r.soil_ph, r.light_pct, r.co2_ppm, r.pm25_ugm3
           FROM readings r JOIN devices d ON d.id = r.device_id
          WHERE d.household_id = $1
          ORDER BY r.device_id, r.recorded_at DESC`,
        [householdId]
      ),
      query<Record<string, unknown>>(
        `SELECT r.device_id,
                to_timestamp(floor(extract(epoch FROM r.recorded_at) / 600) * 600) AS recorded_at,
                avg(r.temperature_c) AS temperature_c, avg(r.humidity_pct) AS humidity_pct,
                avg(r.soil_moisture_pct) AS soil_moisture_pct, avg(r.soil_ph) AS soil_ph,
                avg(r.light_pct) AS light_pct, avg(r.co2_ppm) AS co2_ppm, avg(r.pm25_ugm3) AS pm25_ugm3
           FROM readings r JOIN devices d ON d.id = r.device_id
          WHERE d.household_id = $1 AND r.recorded_at >= now() - interval '24 hours'
          GROUP BY 1, 2
          ORDER BY 2`,
        [householdId]
      ),
      // Plausibility checks on tree modules over the last 24 h
      query<PlausibilityRow>(
        `SELECT r.device_id, count(*)::int AS n,
                extract(epoch FROM max(r.recorded_at) - min(r.recorded_at)) / 3600 AS span_h,
                stddev_samp(r.temperature_c) AS t_sd,
                avg(r.light_pct) FILTER (WHERE extract(hour FROM r.recorded_at AT TIME ZONE $2) >= 20
                                            OR extract(hour FROM r.recorded_at AT TIME ZONE $2) < 5) AS night_light,
                (count(*) FILTER (WHERE extract(hour FROM r.recorded_at AT TIME ZONE $2) >= 20
                                     OR extract(hour FROM r.recorded_at AT TIME ZONE $2) < 5))::int AS night_n
           FROM readings r JOIN devices d ON d.id = r.device_id
          WHERE d.household_id = $1 AND d.kind = 'tree' AND r.recorded_at >= now() - interval '24 hours'
          GROUP BY r.device_id`,
        [householdId, TIMEZONE]
      ),
    ])

  // ---- Devices & readings --------------------------------------------------
  const devices: DeviceInfo[] = deviceRows.map((d) => ({
    id: d.id,
    kind: d.kind,
    name: d.name,
    lastSeenAt: d.last_seen_at ? iso(d.last_seen_at) : null,
    online: !!d.last_seen_at && now.getTime() - new Date(d.last_seen_at).getTime() < ONLINE_WINDOW_MS,
  }))
  const toReading = (r: Record<string, unknown>): LatestReading => ({
    recordedAt: iso(r.recorded_at),
    temperatureC: num(r.temperature_c),
    humidityPct: num(r.humidity_pct),
    soilMoisturePct: num(r.soil_moisture_pct),
    soilPh: num(r.soil_ph),
    lightPct: num(r.light_pct),
    co2Ppm: num(r.co2_ppm),
    pm25: num(r.pm25_ugm3),
  })
  const latest: Record<string, LatestReading> = {}
  for (const r of latestRows) latest[String(r.device_id)] = toReading(r)
  const series24h: SeriesPoint[] = seriesRows.map((r) => ({ deviceId: String(r.device_id), ...toReading(r) }))

  const dailyByDevice = new Map<string, Map<string, DailyRow>>()
  for (const row of dailyRows) {
    if (!dailyByDevice.has(row.device_id)) dailyByDevice.set(row.device_id, new Map())
    dailyByDevice.get(row.device_id)!.set(row.day, row)
  }

  // ---- Sensor plausibility (anti-tamper) -----------------------------------
  const dataFlags: DataFlag[] = []
  for (const p of plausibilityRows) {
    if (p.night_n >= 30 && p.night_light !== null && Number(p.night_light) > 15) {
      dataFlags.push({ deviceId: p.device_id, message: `Bright light recorded at night (avg ${Number(p.night_light).toFixed(0)}%). An outdoor tree module should read near zero after dark.` })
    }
    if (p.n >= 60 && Number(p.span_h) >= 6 && p.t_sd !== null && Number(p.t_sd) < 0.3) {
      dataFlags.push({ deviceId: p.device_id, message: "Temperature has barely changed over the last day. Outdoor readings normally swing several degrees; the module may be indoors or faulty." })
    }
  }
  const flaggedDevices = new Set(dataFlags.map((f) => f.deviceId))

  // ---- Trees: stock and growth from measurements; care from sensors ---------
  const seqByDay = new Map<string, number>()
  const care7d: number[] = []

  const trees: TreeSummary[] = treeRows.map((t) => {
    const species = TREE_SPECIES[t.species_key]
    const dbh = Number(t.dbh_cm)
    const height = Number(t.height_m)
    const history = measurementRows
      .filter((m) => m.tree_id === t.id)
      .map((m) => ({ measuredOn: m.measured_on, dbhCm: Number(m.dbh_cm), heightM: Number(m.height_m) }))
    const seq = sequestration(species, history, today, t.registered_on)
    for (const [day, kg] of seq.perDay) if (day >= since60) seqByDay.set(day, (seqByDay.get(day) ?? 0) + kg)

    const scans = scanRows.filter((s) => s.tree_id === t.id)
    const leafFor = (day: string) => {
      for (let i = scans.length - 1; i >= 0; i--) {
        if (scans[i].day <= day) return daysBetween(scans[i].day, day) <= LEAF_SCAN_VALID_DAYS ? Number(scans[i].green_ratio) : null
      }
      return null
    }

    let care: TreeSummary["care"] = null
    const days = t.sensor_device_id ? dailyByDevice.get(t.sensor_device_id) : undefined
    if (days) {
      for (const day of [...days.keys()].sort()) {
        const row = days.get(day)!
        const c = careIndex({
          temperatureC: num(row.t),
          humidityPct: num(row.h),
          soilMoisturePct: num(row.s),
          soilPh: num(row.ph),
          maxLightPct: num(row.l),
          leafGreenRatio: leafFor(day),
        })
        if (c.index === null) continue
        if (day >= since7) care7d.push(c.index)
        care = { index: c.index, details: c.details, day }
      }
    }

    const lastScan = scans[scans.length - 1]
    return {
      id: t.id,
      name: t.name,
      speciesKey: t.species_key,
      speciesName: species.name,
      scientificName: species.scientificName,
      dbhCm: dbh,
      heightM: height,
      measuredOn: seq.lastMeasuredOn,
      measurementCount: history.length,
      remeasureDue: seq.remeasureDue,
      sensorDeviceId: t.sensor_device_id,
      cameraDeviceId: t.camera_device_id,
      co2StoredKg: storedCo2Kg(species, dbh, height),
      annualPotentialKg: annualPotentialKg(species, dbh, height),
      measuredGrowthKg: seq.measuredKg,
      estimatedGrowthKg: seq.estimatedKg,
      flags: seq.flags,
      care,
      latestLeafScan: lastScan
        ? { capturedAt: iso(lastScan.captured_at), greenRatio: Number(lastScan.green_ratio), vari: Number(lastScan.vari), coverage: Number(lastScan.vegetation_coverage) }
        : null,
    }
  })

  // ---- Emissions from bills (spread evenly over each bill period) -----------
  const activities: ActivityRow[] = activityRows.map((a) => ({
    id: a.id,
    kind: a.kind,
    quantity: Number(a.quantity),
    periodStart: a.period_start,
    periodEnd: a.period_end,
    note: a.note,
    co2Kg: Number(a.quantity) * EMISSION_FACTORS[a.kind].kgCO2PerUnit,
  }))
  const emitByDay = new Map<string, number>()
  const emitByKind30: Partial<Record<ActivityKind, number>> = {}
  for (const a of activities) {
    const perDay = a.co2Kg / (daysBetween(a.periodStart, a.periodEnd) + 1)
    const from = a.periodStart > since60 ? a.periodStart : since60
    const to = a.periodEnd < today ? a.periodEnd : today
    for (let d = from; d <= to; d = addDays(d, 1)) {
      emitByDay.set(d, (emitByDay.get(d) ?? 0) + perDay)
      if (d >= since30) emitByKind30[a.kind] = (emitByKind30[a.kind] ?? 0) + perDay
    }
  }
  const windowSum = (start: string, end: string) => {
    let sum = 0
    let covered = 0
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (emitByDay.has(d)) {
        sum += emitByDay.get(d)!
        covered++
      }
    }
    return { sum, covered }
  }
  const cur = windowSum(since30, today)
  const prev = windowSum(since60, addDays(since30, -1))
  // Scale partial coverage up to 30 days so a half-logged month is not read as half the emissions.
  const emitted30 = cur.covered > 0 ? (cur.sum / cur.covered) * 30 : null
  const emittedPrev30 = prev.covered >= 15 ? (prev.sum / prev.covered) * 30 : null

  // ---- Ambient air (shown, not scored) -------------------------------------
  const vehicleIds = new Set(devices.filter((d) => d.kind === "vehicle").map((d) => d.id))
  const airDays = dailyRows.filter((r) => vehicleIds.has(r.device_id) && r.day >= since30)
  const mean = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }

  // ---- Totals, score, daily series ------------------------------------------
  let sequestered30 = 0
  for (const [d, kg] of seqByDay) if (d >= since30) sequestered30 += kg

  const daily: DailyBalance[] = []
  for (let d = since30; d <= today; d = addDays(d, 1)) {
    daily.push({ day: d, sequesteredKg: seqByDay.get(d) ?? 0, emittedKg: emitByDay.get(d) ?? null })
  }

  const treeSensorIds = new Set(trees.map((t) => t.sensorDeviceId).filter(Boolean))
  const score = greenScore({
    sequestered30dKg: sequestered30,
    emitted30dKg: emitted30,
    emittedPrev30dKg: emittedPrev30,
    careIndex7d: care7d.length ? care7d.reduce((a, b) => a + b, 0) / care7d.length : null,
    careFlagged: [...flaggedDevices].some((id) => treeSensorIds.has(id)),
  })

  const totals: DashboardData["totals"] = {
    co2StoredKg: trees.reduce((a, t) => a + t.co2StoredKg, 0),
    creditsMeasuredTco2e: trees.reduce((a, t) => a + t.measuredGrowthKg, 0) / 1000,
    creditsEstimatedTco2e: trees.reduce((a, t) => a + t.estimatedGrowthKg, 0) / 1000,
    sequestered30dKg: sequestered30,
    oxygen30dKg: oxygenFromCo2Kg(sequestered30),
    emitted30dKg: emitted30,
    emissionCoverageDays: cur.covered,
    emittedByKind30d: emitByKind30,
    netBalance30dKg: emitted30 === null ? null : emitted30 - sequestered30,
    avgPm25_30d: mean(airDays.map((r) => num(r.pm))),
    avgCo2_30d: mean(airDays.map((r) => num(r.co2))),
  }

  return {
    generatedAt: now.toISOString(),
    timezone: TIMEZONE,
    household: {
      id: household.id,
      name: household.name,
      city: household.city,
      locality: household.locality,
      members: household.members === null ? null : Number(household.members),
      createdAt: iso(household.created_at),
    },
    devices,
    latest,
    series24h,
    trees,
    activities,
    totals,
    daily,
    score,
    dataFlags,
    tips: buildTips({ devices, latest, trees, totals, dataFlags }),
  }
}

function buildTips(d: {
  devices: DeviceInfo[]
  latest: Record<string, LatestReading>
  trees: TreeSummary[]
  totals: DashboardData["totals"]
  dataFlags: DataFlag[]
}): Tip[] {
  const tips: Tip[] = []
  for (const f of d.dataFlags) tips.push({ level: "warn", text: f.message })
  if (d.trees.length === 0) tips.push({ level: "info", text: "Register your first tree with its trunk girth and height to start measuring carbon." })
  for (const t of d.trees) {
    for (const f of t.flags) tips.push({ level: "warn", text: `${t.name}: ${f}` })
    if (t.remeasureDue) tips.push({ level: "info", text: `${t.name} was last measured on ${t.measuredOn}. Re-measure the trunk girth to turn estimated growth into measured growth.` })
    if (t.measurementCount === 1 && !t.remeasureDue) tips.push({ level: "info", text: `${t.name}'s growth is estimated until its next trunk measurement (recommended every 6 months).` })
    const r = t.sensorDeviceId ? d.latest[t.sensorDeviceId] : undefined
    if (r?.soilMoisturePct != null && r.soilMoisturePct < 25)
      tips.push({ level: "warn", text: `Soil around ${t.name} is dry (${r.soilMoisturePct.toFixed(0)}%). Water in the early morning to cut evaporation.` })
    if (r?.soilMoisturePct != null && r.soilMoisturePct > 80)
      tips.push({ level: "warn", text: `Soil around ${t.name} is waterlogged (${r.soilMoisturePct.toFixed(0)}%). Check drainage to protect roots.` })
    if (r?.soilPh != null && (r.soilPh < 5.5 || r.soilPh > 7.5))
      tips.push({ level: "warn", text: `Soil pH at ${t.name} is ${r.soilPh.toFixed(1)}. Most trees prefer 5.5–7.5; add compost to buffer it.` })
    if (t.latestLeafScan && t.latestLeafScan.greenRatio < 0.7)
      tips.push({ level: "warn", text: `Latest leaf scan of ${t.name} shows ${(100 - t.latestLeafScan.greenRatio * 100).toFixed(0)}% non-green foliage, a possible sign of water or nutrient stress.` })
  }
  for (const dev of d.devices) {
    if (!dev.online) tips.push({ level: "info", text: `${dev.name} is offline${dev.lastSeenAt ? ` since ${new Date(dev.lastSeenAt).toLocaleString("en-IN", { timeZone: TIMEZONE })}` : " (never reported)"}.` })
  }
  if (d.totals.avgPm25_30d !== null) {
    if (d.totals.avgPm25_30d > PM25_NAAQS_24H)
      tips.push({ level: "warn", text: `Ambient PM2.5 averages ${d.totals.avgPm25_30d.toFixed(0)} µg/m³, above India's ${PM25_NAAQS_24H} µg/m³ standard. Limit outdoor exertion on bad days and avoid idling vehicles.` })
    else if (d.totals.avgPm25_30d > PM25_WHO_24H)
      tips.push({ level: "info", text: `Ambient PM2.5 averages ${d.totals.avgPm25_30d.toFixed(0)} µg/m³: within NAAQS but above the WHO ${PM25_WHO_24H} µg/m³ guideline.` })
  }
  if (d.totals.emitted30dKg === null)
    tips.push({ level: "info", text: "Log this month's electricity bill (kWh) and LPG refills to calculate your net carbon balance." })
  else if (d.totals.netBalance30dKg !== null && d.totals.netBalance30dKg <= 0)
    tips.push({ level: "good", text: "Your trees grew more carbon than your household reported emitting in the last 30 days." })
  else if (d.totals.emittedByKind30d.electricity && d.totals.emitted30dKg && d.totals.emittedByKind30d.electricity / d.totals.emitted30dKg > 0.5)
    tips.push({ level: "info", text: "Electricity is your largest source. Every 1 °C higher on the AC saves about 6% electricity (BEE); 24 °C is the recommended setting." })
  return tips
}
