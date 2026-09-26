import fs from "node:fs"
import path from "node:path"
import type { Side, Vehicle } from "./types"

interface Index {
  vehicles: Vehicle[]
  byId: Map<number, Vehicle>
  years: Record<Side, number[]>
  makes: Map<string, string[]>
  models: Map<string, string[]>
  trims: Map<string, { id: number; label: string }[]>
}

let index: Index | null = null

function load(): Index {
  if (index) return index
  const file = path.join(process.cwd(), "data/snapshot/vehicles.json")
  const vehicles = JSON.parse(fs.readFileSync(file, "utf8")) as Vehicle[]
  const byId = new Map<number, Vehicle>()
  const yearSets: Record<Side, Set<number>> = { ev: new Set(), ice: new Set() }
  const makeSets = new Map<string, Set<string>>()
  const modelSets = new Map<string, Set<string>>()
  const trimBuckets = new Map<string, { id: number; label: string }[]>()

  for (const vehicle of vehicles) {
    byId.set(vehicle.id, vehicle)
    yearSets[vehicle.side].add(vehicle.year)
    const makeKey = `${vehicle.side}|${vehicle.year}`
    const modelKey = `${makeKey}|${vehicle.make}`
    const trimKey = `${modelKey}|${vehicle.model}`
    add(makeSets, makeKey, vehicle.make)
    add(modelSets, modelKey, vehicle.model)
    const bucket = trimBuckets.get(trimKey) ?? []
    bucket.push({ id: vehicle.id, label: trimLabel(vehicle) })
    trimBuckets.set(trimKey, bucket)
  }

  const sort = (values: Iterable<string>) => [...values].sort((a, b) => a.localeCompare(b))
  index = {
    vehicles,
    byId,
    years: {
      ev: [...yearSets.ev].sort((a, b) => b - a),
      ice: [...yearSets.ice].sort((a, b) => b - a),
    },
    makes: mapSets(makeSets, sort),
    models: mapSets(modelSets, sort),
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

export function catalogYears(side: Side) {
  return load().years[side]
}

export function catalogMakes(side: Side, year: number) {
  return load().makes.get(`${side}|${year}`) ?? []
}

export function catalogModels(side: Side, year: number, make: string) {
  return load().models.get(`${side}|${year}|${make}`) ?? []
}

export function catalogTrims(side: Side, year: number, make: string, model: string) {
  return load().trims.get(`${side}|${year}|${make}|${model}`) ?? []
}

export function vehicleById(id: number) {
  return load().byId.get(id) ?? null
}
