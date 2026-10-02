export interface TreeSpecies {
  name: string
  scientificName: string
  /** Basic wood density, g/cm³ (Global Wood Density Database, Zanne et al. 2009) */
  woodDensity: number
  /** Fraction of dry biomass that is carbon (IPCC 2006 default 0.47) */
  carbonFraction: number
  /** Typical mature trunk diameter at breast height, cm (form default only) */
  typicalDbh: number
  /** Typical mature height, m (form default only) */
  typicalHeight: number
  growthRate: GrowthRate
  /** True if the BarkVisionAI model can recognise this species from a bark photo */
  inBarkModel?: boolean
}

export type GrowthRate = "Very slow" | "Slow" | "Medium" | "Fast" | "Very fast"

/**
 * Mean annual DBH increment (cm/yr) by growth class, used to estimate yearly
 * sequestration until the household records a second trunk measurement.
 * Conservative values for urban tropical trees (cf. Nowak 1994; Stephenson et al. 2014).
 */
export const DBH_INCREMENT_CM: Record<GrowthRate, number> = {
  "Very slow": 0.3,
  Slow: 0.5,
  Medium: 0.8,
  Fast: 1.2,
  "Very fast": 1.6,
}

const CF = 0.47

export const TREE_SPECIES: Record<string, TreeSpecies> = {
  // Common household / avenue trees in Chennai and Tamil Nadu
  neem: { name: "Neem", scientificName: "Azadirachta indica", woodDensity: 0.69, carbonFraction: CF, typicalDbh: 40, typicalHeight: 15, growthRate: "Fast" },
  mango: { name: "Mango", scientificName: "Mangifera indica", woodDensity: 0.55, carbonFraction: CF, typicalDbh: 45, typicalHeight: 15, growthRate: "Medium" },
  pongamia: { name: "Pongamia (Pungai)", scientificName: "Millettia pinnata", woodDensity: 0.65, carbonFraction: CF, typicalDbh: 35, typicalHeight: 12, growthRate: "Fast" },
  banyan: { name: "Banyan", scientificName: "Ficus benghalensis", woodDensity: 0.45, carbonFraction: CF, typicalDbh: 80, typicalHeight: 20, growthRate: "Medium" },
  peepal: { name: "Peepal", scientificName: "Ficus religiosa", woodDensity: 0.45, carbonFraction: CF, typicalDbh: 60, typicalHeight: 18, growthRate: "Fast" },
  teak: { name: "Teak", scientificName: "Tectona grandis", woodDensity: 0.55, carbonFraction: CF, typicalDbh: 35, typicalHeight: 20, growthRate: "Medium" },
  rain_tree: { name: "Rain tree", scientificName: "Samanea saman", woodDensity: 0.49, carbonFraction: CF, typicalDbh: 70, typicalHeight: 20, growthRate: "Fast" },
  tamarind: { name: "Tamarind", scientificName: "Tamarindus indica", woodDensity: 0.82, carbonFraction: CF, typicalDbh: 50, typicalHeight: 18, growthRate: "Slow" },
  indian_almond: { name: "Indian almond", scientificName: "Terminalia catappa", woodDensity: 0.55, carbonFraction: CF, typicalDbh: 40, typicalHeight: 15, growthRate: "Fast" },
  jackfruit: { name: "Jackfruit", scientificName: "Artocarpus heterophyllus", woodDensity: 0.6, carbonFraction: CF, typicalDbh: 40, typicalHeight: 15, growthRate: "Medium" },

  // Species recognised by the BarkVisionAI ResNet50 model (inference/)
  aesculus_indica: { name: "Indian horse chestnut", scientificName: "Aesculus indica", woodDensity: 0.5, carbonFraction: CF, typicalDbh: 45, typicalHeight: 22, growthRate: "Medium", inBarkModel: true },
  buchanania_lanzan: { name: "Chironji", scientificName: "Buchanania lanzan", woodDensity: 0.58, carbonFraction: CF, typicalDbh: 30, typicalHeight: 12, growthRate: "Slow", inBarkModel: true },
  cedrus_deodara: { name: "Deodar cedar", scientificName: "Cedrus deodara", woodDensity: 0.5, carbonFraction: CF, typicalDbh: 55, typicalHeight: 35, growthRate: "Medium", inBarkModel: true },
  eucalyptus: { name: "Eucalyptus", scientificName: "Eucalyptus globulus", woodDensity: 0.62, carbonFraction: CF, typicalDbh: 30, typicalHeight: 30, growthRate: "Very fast", inBarkModel: true },
  madhuca_longifolia: { name: "Mahua (Iluppai)", scientificName: "Madhuca longifolia", woodDensity: 0.88, carbonFraction: CF, typicalDbh: 50, typicalHeight: 18, growthRate: "Medium", inBarkModel: true },
  mangifera_sylvatica: { name: "Wild mango", scientificName: "Mangifera sylvatica", woodDensity: 0.55, carbonFraction: CF, typicalDbh: 45, typicalHeight: 25, growthRate: "Medium", inBarkModel: true },
  phyllanthus_emblica: { name: "Amla (Nellikai)", scientificName: "Phyllanthus emblica", woodDensity: 0.8, carbonFraction: CF, typicalDbh: 25, typicalHeight: 10, growthRate: "Medium", inBarkModel: true },
  pinus_roxburghii: { name: "Chir pine", scientificName: "Pinus roxburghii", woodDensity: 0.49, carbonFraction: CF, typicalDbh: 40, typicalHeight: 30, growthRate: "Fast", inBarkModel: true },
  quercus_leucotrichophora: { name: "Banj oak", scientificName: "Quercus leucotrichophora", woodDensity: 0.82, carbonFraction: CF, typicalDbh: 45, typicalHeight: 20, growthRate: "Slow", inBarkModel: true },
  rhododendron_arboreum: { name: "Burans", scientificName: "Rhododendron arboreum", woodDensity: 0.64, carbonFraction: CF, typicalDbh: 30, typicalHeight: 12, growthRate: "Slow", inBarkModel: true },
  senegalia_catechu: { name: "Khair", scientificName: "Senegalia catechu", woodDensity: 0.88, carbonFraction: CF, typicalDbh: 25, typicalHeight: 12, growthRate: "Medium", inBarkModel: true },
  shorea_robusta: { name: "Sal", scientificName: "Shorea robusta", woodDensity: 0.72, carbonFraction: CF, typicalDbh: 50, typicalHeight: 30, growthRate: "Slow", inBarkModel: true },
  taxus_baccata: { name: "Himalayan yew", scientificName: "Taxus baccata", woodDensity: 0.64, carbonFraction: CF, typicalDbh: 35, typicalHeight: 15, growthRate: "Very slow", inBarkModel: true },
}

export function findSpeciesKey(scientificName: string): string | undefined {
  const target = scientificName.trim().toLowerCase()
  return Object.keys(TREE_SPECIES).find(
    (k) => TREE_SPECIES[k].scientificName.toLowerCase() === target
  )
}
