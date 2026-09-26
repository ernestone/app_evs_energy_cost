export type Lang = "es" | "en"
export type Side = "ev" | "ice"
export type Powertrain = "ev" | "gasoline" | "diesel" | "hev" | "ffv" | "phev"
export type Fuel = "electricity" | "gasoline" | "premium" | "diesel"
export type PhevMode = "epa" | "custom" | "icct26" | "icct56"
export type Cycle = "EPA" | "WLTP"

export interface Vehicle {
  id: number
  year: number
  make: string
  model: string
  version: string
  trany: string
  drive: string
  vclass: string
  side: Side
  powertrain: Powertrain
  fuel: Fuel
  cityMpg: number | null
  hwyMpg: number | null
  combMpg: number | null
  cityE: number | null
  hwyE: number | null
  combE: number | null
  cityUf: number | null
  hwyUf: number | null
  combUf: number | null
  cdGalPer100Mi: number
  co2Gpm: number | null
  rangeMi: number | null
  rangeAMi: number | null
  charge240: number | null
  /** Absent on the EPA snapshot. The loader treats that as EPA. */
  cycle?: Cycle
  /** Country-catalog commercial name, when the list did not come from the EPA file. */
  listedName?: string
  wltp?: {
    lPer100km: number | null
    co2GPerKm: number | null
    kwhPer100km: number | null
    electricRangeKm: number | null
    /** Null when the source has no separate charge-sustaining column. */
    chargeSustainingLPer100km: null
    sourceUrl: string
    sourceName: string
    license: string
    licenseUrl: string
    figureYear: number
  }
}

export interface PricePoint {
  value: number | null
  date: string | null
  source: string
  url: string
  note: string
  eurPerLiter?: number
  nacPerKwh?: number
}

export interface Country {
  code: string
  name: { es: string; en: string }
  currency: string
  gasolinePerLiter: number | null
  dieselPerLiter: number | null
  electricityPerKwh: number | null
  gasoline: PricePoint
  diesel: PricePoint
  electricity: PricePoint
  grid: {
    gPerKwh: number
    year: number
    unit: string
    source: string
    url: string
    license: string
    licenseUrl: string
    note: string
  }
}

export interface FxTable {
  date: string
  base: "EUR"
  rates: Record<string, number>
  url: string
  provider: string
}

export interface SnapshotMeta {
  generatedAt: string
  epaFileDate: string
  vehicleCount: number
  modelYearMin: number
  modelYearMax: number
  trimmed: boolean
  trimmedNote: string
  fx: FxTable
  upstream: {
    multiplier: number
    surchargeShare: number
    appliesTo: string
    citation: string
    url: string
    notCountrySpecific: boolean
    notOfficialComparison: boolean
    diesel: string
  }
  phevIcct: {
    citation: string
    url: string
    lowCut: number
    highCut: number
    note: string
  }
  ukElectricity: string
  countryCatalog?: CountryCatalogMeta
}

export interface CountryCatalogMeta {
  generatedAt: string
  eu: {
    status: "ok"
    source: string
    url: string
    index: string
    retrieved: string
    years: string
    license: string
    licenseUrl: string
    regulation: string
    note: string
  }
  gb: {
    status: "failed"
    source: string
    url: string
    retrieved: string
    detail: string
  }
  us: {
    status: "ok"
    source: string
    url: string
    cycle: "EPA"
  }
}
