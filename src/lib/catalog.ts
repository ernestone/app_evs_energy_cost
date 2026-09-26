import fs from "node:fs"
import path from "node:path"
import type { Side, Vehicle } from "./types"

interface Index {
  vehicles: Vehicle[]
  byId: Map<number, Vehicle>
  makes: Record<Side, string[]>
  models: Map<string, string[]>
  years: Map<string, number[]>
  trims: Map<string, { id: number; label: string }[]>
}

let index: Index | null = null

function load(): Index {
  if (index) return index
  const file = path.join(process.cwd(), "data/snapshot/vehicles.json")
  const vehicles = JSON.parse(fs.readFileSync(file, "utf8")) as Vehicle[]
  const byId = new Map<number, Vehicle>()
  const makeSets: Record<Side, Set<string>> = { ev: new Set(), ice: new Set() }
  const modelSets = new Map<string, Set<string>>()
  const yearSets = new Map<string, Set<number>>()
  const trimBuckets = new Map<string, { id: number; label: string }[]>()

  for (const vehicle of vehicles) {
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
  }
  return index
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

export function catalogMakes(side: Side) {
  return load().makes[side]
}

export function catalogModels(side: Side, make: string) {
  return load().models.get(`${side}|${make}`) ?? []
}

export function catalogYears(side: Side, make: string, model: string) {
  return load().years.get(`${side}|${make}|${model}`) ?? []
}

export function catalogTrims(side: Side, make: string, model: string, year: number) {
  return load().trims.get(`${side}|${make}|${model}|${year}`) ?? []
}

export function vehicleById(id: number) {
  return load().byId.get(id) ?? null
}
