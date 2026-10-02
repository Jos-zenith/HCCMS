// Emission factors (kg CO2 per unit). Fuel factors are derived from IPCC 2006
// Guidelines Vol. 2 default net calorific values and CO2 emission factors.

export type ActivityKind = "electricity" | "lpg" | "petrol" | "diesel" | "cng"

export interface EmissionFactor {
  label: string
  unit: string
  kgCO2PerUnit: number
  source: string
}

const gridFactor = Number(process.env.NEXT_PUBLIC_GRID_EF_KG_PER_KWH) || 0.716

export const EMISSION_FACTORS: Record<ActivityKind, EmissionFactor> = {
  electricity: {
    label: "Electricity",
    unit: "kWh",
    kgCO2PerUnit: gridFactor,
    source: "CEA CO2 Baseline Database, Indian grid weighted average (override with NEXT_PUBLIC_GRID_EF_KG_PER_KWH)",
  },
  lpg: {
    label: "Cooking gas (LPG)",
    unit: "kg",
    // 47.3 TJ/Gg x 63,100 kg CO2/TJ
    kgCO2PerUnit: 2.985,
    source: "IPCC 2006, LPG: NCV 47.3 TJ/Gg, 63.1 t CO2/TJ (one 14.2 kg cylinder ≈ 42.4 kg CO2)",
  },
  petrol: {
    label: "Petrol",
    unit: "litre",
    // 44.3 TJ/Gg x 69,300 kg/TJ x 0.745 kg/L
    kgCO2PerUnit: 2.287,
    source: "IPCC 2006, motor gasoline: NCV 44.3 TJ/Gg, 69.3 t CO2/TJ, density 0.745 kg/L",
  },
  diesel: {
    label: "Diesel",
    unit: "litre",
    // 43.0 TJ/Gg x 74,100 kg/TJ x 0.832 kg/L
    kgCO2PerUnit: 2.651,
    source: "IPCC 2006, gas/diesel oil: NCV 43.0 TJ/Gg, 74.1 t CO2/TJ, density 0.832 kg/L",
  },
  cng: {
    label: "CNG",
    unit: "kg",
    // 48.0 TJ/Gg x 56,100 kg/TJ
    kgCO2PerUnit: 2.693,
    source: "IPCC 2006, natural gas: NCV 48.0 TJ/Gg, 56.1 t CO2/TJ",
  },
}

export const ACTIVITY_KINDS = Object.keys(EMISSION_FACTORS) as ActivityKind[]

// Air-quality reference limits
export const PM25_WHO_24H = 15 // µg/m³, WHO Global Air Quality Guidelines 2021
export const PM25_NAAQS_24H = 60 // µg/m³, India NAAQS 2009
export const CO2_OUTDOOR_BASELINE = 420 // ppm, current global background
