import fs from "node:fs"
import path from "node:path"
import { modelKeys, normName } from "./match"
import type { CountryCatalogMeta, Fuel, Powertrain, Side, Vehicle } from "./types"

interface Index {
  vehicles: Vehicle[]
  byId: Map<number, Vehicle>
  makes: Record<Side, string[]>
  models: Map<string, string[]>
  years: Map<string, number[]>
  trims: Map<string, { id: number; label: string }[]>
  epaByKey: Map<string, Vehicle[]>
}

interface CountryModel {
  country: string
  make: string
  model: string
  side: Side
  powertrain: Powertrain
  fuel: Fuel
  year: number
  lPer100km: number | null
  co2GPerKm: number | null
  kwhPer100km: number | null
  electricRangeKm: number | null
  chargeSustainingLPer100km: null
  registrations: number
}

interface CountryFile extends CountryCatalogMeta {
  modelCount: number
  models: CountryModel[]
}

export interface CatalogModelOption {
  id: string
  label: string
  powertrain: Powertrain
  fuel: Fuel
}

export interface CatalogFailure {
  status: "failed"
  source: string
  url: string
  detail: string
}

let index: Index | null = null
let countryFile: CountryFile | null = null
const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
])

function load(): Index {
  if (index) return index
  const file = path.join(process.cwd(), "data/snapshot/vehicles.json")
  const vehicles = JSON.parse(fs.readFileSync(file, "utf8")) as Vehicle[]
  const byId = new Map<number, Vehicle>()
  const makeSets: Record<Side, Set<string>> = { ev: new Set(), ice: new Set() }
  const modelSets = new Map<string, Set<string>>()
  const yearSets = new Map<string, Set<number>>()
  const trimBuckets = new Map<string, { id: number; label: string }[]>()
  const epaByKey = new Map<string, Vehicle[]>()

  for (const vehicle of vehicles) {
    vehicle.cycle = "EPA"
    byId.set(vehicle.id, vehicle)
    makeSets[vehicle.side].add(vehicle.make)
    const modelKey = `${vehicle.side}|${vehicle.make}`
    const yearKey = `${modelKey}|${vehicle.model}`
    const trimKey = `${yearKey}|${vehicle.year}`
    add(modelSets, modelKey, vehicle.model)
    const years = yearSets.get(yearKey) ?? new Set<number>()
    years.add(vehicle.year)
    yearSets.set(yearKey, years)
    const bucket = trimBuckets.get(trimKey) ?? []
    bucket.push({ id: vehicle.id, label: trimLabel(vehicle) })
    trimBuckets.set(trimKey, bucket)
    const epaKey = `${vehicle.side}|${vehicle.powertrain}|${normName(vehicle.make)}|${normName(vehicle.model)}`
    const list = epaByKey.get(epaKey) ?? []
    list.push(vehicle)
    epaByKey.set(epaKey, list)
  }

  const sort = (values: Iterable<string>) => [...values].sort((a, b) => a.localeCompare(b))
  const years = new Map<string, number[]>()
  for (const [key, values] of yearSets) years.set(key, [...values].sort((a, b) => b - a))
  index = {
    vehicles,
    byId,
    makes: { ev: sort(makeSets.ev), ice: sort(makeSets.ice) },
    models: mapSets(modelSets, sort),
    years,
    trims: trimBuckets,
    epaByKey,
  }
  return index
}

function loadCountry(): CountryFile {
  if (countryFile) return countryFile
  const file = path.join(process.cwd(), "data/snapshot/country-catalog.json")
  countryFile = JSON.parse(fs.readFileSync(file, "utf8")) as CountryFile
  return countryFile
}

function add(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>()
  set.add(value)
  map.set(key, set)
}

function mapSets(source: Map<string, Set<string>>, sort: (values: Iterable<string>) => string[]) {
  const out = new Map<string, string[]>()
  for (const [key, values] of source) out.set(key, sort(values))
  return out
}

export function trimLabel(vehicle: Vehicle) {
  return [vehicle.version, vehicle.trany, vehicle.drive].filter(Boolean).join(" · ")
}

export function displayMake(raw: string) {
  return raw
    .split(/([^A-Za-z0-9]+)/)
    .map((part) => {
      if (!/[A-Za-z]/.test(part)) return part
      if (part.length <= 3) return part.toUpperCase()
      return part[0]!.toUpperCase() + part.slice(1).toLowerCase()
    })
    .join("")
}

export function countryCatalogMeta() {
  const file = loadCountry()
  const { models: _models, modelCount: _count, ...meta } = file
  return meta
}

export function catalogFailure(country: string): CatalogFailure | null {
  if (country === "US" || EU.has(country)) return null
  if (country === "GB") {
    const gb = loadCountry().gb
    return { status: "failed", source: gb.source, url: gb.url, detail: gb.detail }
  }
  return {
    status: "failed",
    source: "country catalog",
    url: "",
    detail: "This country is outside the EU-27, United States, and United Kingdom snapshot.",
  }
}

export function catalogMakes(side: Side, country = "US") {
  if (country === "US") return load().makes[side]
  if (catalogFailure(country)) return []
  const names = new Set<string>()
  for (const row of loadCountry().models) {
    if (row.country === country && row.side === side) names.add(displayMake(row.make))
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function catalogModels(side: Side, make: string, country = "US"): CatalogModelOption[] | string[] {
  if (country === "US") return load().models.get(`${side}|${make}`) ?? []
  if (catalogFailure(country)) return []
  const rows = rowsFor(country, side, make)
  return rows
    .map((row) => ({
      id: modelId(row),
      label: row.model,
      powertrain: row.powertrain,
      fuel: row.fuel,
    }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.powertrain.localeCompare(b.powertrain))
}

export function catalogYears(side: Side, make: string, model: string, country = "US") {
  if (country !== "US") {
    const row = findRow(country, side, model)
    if (!row) return []
    const matches = epaMatches(row)
    if (!matches.length) return []
    return [...new Set(matches.map((vehicle) => vehicle.year))].sort((a, b) => b - a)
  }
  return load().years.get(`${side}|${make}|${model}`) ?? []
}

export function catalogTrims(side: Side, make: string, model: string, year: number, country = "US") {
  if (country !== "US") {
    const row = findRow(country, side, model)
    if (!row) return []
    const matches = epaMatches(row).filter((vehicle) => vehicle.year === year)
    return matches.map((vehicle) => ({ id: vehicle.id, label: trimLabel(vehicle) }))
  }
  return load().trims.get(`${side}|${make}|${model}|${year}`) ?? []
}

export function vehicleById(id: number) {
  const vehicle = load().byId.get(id) ?? null
  if (!vehicle) return null
  return { ...vehicle, cycle: "EPA" as const }
}

export function resolveCountryModel(country: string, side: Side, id: string) {
  const row = findRow(country, side, id)
  if (!row) return null
  const matches = epaMatches(row)
  const meta = loadCountry()
  if (matches.length) {
    const epaModel = matches[0]!.model
    const epaMake = matches[0]!.make
    return {
      resolution: "epa" as const,
      catalogName: row.model,
      make: displayMake(row.make),
      epaMake,
      epaModel,
      namesDiffer: normName(row.model) !== normName(epaModel) && !modelKeys(row.make, row.model).includes(normName(epaModel))
        ? true
        : normName(row.model) !== normName(epaModel),
      years: [...new Set(matches.map((vehicle) => vehicle.year))].sort((a, b) => b - a),
      sourceUrl: meta.us.url,
      sourceName: meta.us.source,
    }
  }
  return {
    resolution: "wltp" as const,
    vehicle: wltpVehicle(row, meta),
  }
}

function rowsFor(country: string, side: Side, make: string) {
  const target = normName(make)
  return loadCountry().models.filter(
    (row) => row.country === country && row.side === side && normName(displayMake(row.make)) === target,
  )
}

function findRow(country: string, side: Side, id: string) {
  return loadCountry().models.find((row) => row.country === country && row.side === side && modelId(row) === id) ?? null
}

function modelId(row: CountryModel) {
  return `${row.make}\u001f${row.model}\u001f${row.powertrain}`
}

function epaMatches(row: CountryModel) {
  const keys = modelKeys(row.make, row.model)
  const found: Vehicle[] = []
  const seen = new Set<number>()
  for (const key of keys) {
    const list = load().epaByKey.get(`${row.side}|${row.powertrain}|${normName(row.make)}|${key}`) ?? []
    for (const vehicle of list) {
      if (seen.has(vehicle.id)) continue
      seen.add(vehicle.id)
      found.push(vehicle)
    }
  }
  return found
}

function wltpVehicle(row: CountryModel, meta: CountryFile): Vehicle {
  let hash = 0
  const key = `${row.country}|${modelId(row)}`
  for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0
  const id = -Math.abs(hash) || -1
  return {
    id,
    year: row.year,
    make: displayMake(row.make),
    model: row.model,
    version: row.model,
    trany: "",
    drive: "",
    vclass: "",
    side: row.side,
    powertrain: row.powertrain,
    fuel: row.fuel,
    cityMpg: null,
    hwyMpg: null,
    combMpg: null,
    cityE: null,
    hwyE: null,
    combE: null,
    cityUf: null,
    hwyUf: null,
    combUf: null,
    cdGalPer100Mi: 0,
    co2Gpm: null,
    rangeMi: null,
    rangeAMi: null,
    charge240: null,
    cycle: "WLTP",
    listedName: row.model,
    wltp: {
      lPer100km: row.lPer100km,
      co2GPerKm: row.co2GPerKm,
      kwhPer100km: row.kwhPer100km,
      electricRangeKm: row.electricRangeKm,
      chargeSustainingLPer100km: null,
      sourceUrl: meta.eu.url,
      sourceName: meta.eu.source,
      license: meta.eu.license,
      licenseUrl: meta.eu.licenseUrl,
      figureYear: row.year,
    },
  }
}
