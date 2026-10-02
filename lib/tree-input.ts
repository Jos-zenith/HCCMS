import { queryOne } from "./db"
import { TREE_SPECIES } from "./species"
import { dateStr, numIn, str, ValidationError } from "./validate"

export interface TreeInput {
  name?: string
  species_key?: string
  dbh_cm?: number
  height_m?: number
  sensor_device_id?: string | null
  camera_device_id?: string | null
  measured_on?: string
}

async function checkDevice(householdId: string, deviceId: string | null, kind: string, field: string) {
  if (deviceId === null) return
  const d = await queryOne<{ kind: string }>(
    "SELECT kind FROM devices WHERE id = $1 AND household_id = $2",
    [deviceId, householdId]
  )
  if (!d) throw new ValidationError(`${field}: device not found in this household`)
  if (d.kind !== kind) throw new ValidationError(`${field} must be a ${kind} module`)
}

/**
 * Parses tree fields. Trunk size may be given as diameter (dbh_cm) or as
 * girth/circumference at 1.3 m (girth_cm), which is easier to measure with a tape.
 */
export async function parseTreeInput(
  body: Record<string, unknown>,
  householdId: string,
  partial: boolean
): Promise<TreeInput> {
  const out: TreeInput = {}
  const req = { required: !partial }

  const name = str(body, "name", { ...req, max: 60 })
  if (name !== null) out.name = name

  const species = str(body, "species_key", req)
  if (species !== null) {
    if (!TREE_SPECIES[species]) throw new ValidationError("Unknown species_key")
    out.species_key = species
  }

  const girth = numIn(body, "girth_cm", 3, 2000)
  const dbh = girth !== null ? girth / Math.PI : numIn(body, "dbh_cm", 1, 600)
  if (dbh === null && !partial) throw new ValidationError("dbh_cm or girth_cm is required")
  if (dbh !== null) out.dbh_cm = Math.round(dbh * 10) / 10

  const height = numIn(body, "height_m", 0.3, 120, req)
  if (height !== null) out.height_m = height

  for (const [field, kind] of [["sensor_device_id", "tree"], ["camera_device_id", "camera"]] as const) {
    if (field in body) {
      const v = str(body, field)
      await checkDevice(householdId, v, kind, field)
      out[field] = v
    }
  }

  const measured = dateStr(body, "measured_on")
  if (measured !== null) {
    if (Date.parse(measured) > Date.now() + 86_400_000) throw new ValidationError("measured_on cannot be in the future")
    out.measured_on = measured
  }

  return out
}
