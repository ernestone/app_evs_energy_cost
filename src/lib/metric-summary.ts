import { adminCopy } from "./admin-copy.ts"
import { countryCentroid } from "./country-centroids.ts"
import type { MetricPayload } from "./metric-payload"
import type { Lang } from "./types"

export type SummaryRow = {
  createdAt: string
  country: string
  connectionCountry: string | null
  latitude: number | null
  longitude: number | null
  language: string
  displayCurrency: string
  kmYear: number
  fuel: string
  phev: boolean
  evModelLabel: string | null
  iceModelLabel: string | null
  result: Pick<MetricPayload["result"], "horizon">
}

export type NamedCount = { name: string; count: number }

export type MapPoint = {
  lat: number
  lon: number
  count: number
  label: string
}

export type AdminSummary = {
  total: number
  map: MapPoint[]
  years: NamedCount[]
  months: NamedCount[]
  km: NamedCount[]
  models: NamedCount[]
  countries: NamedCount[]
  connections: NamedCount[]
  languages: NamedCount[]
  currencies: NamedCount[]
  fuels: NamedCount[]
  phev: NamedCount[]
  horizons: NamedCount[]
}

const KM_EDGES = [0, 5000, 10000, 15000, 20000, 30000]

export function summarize(rows: SummaryRow[], lang: Lang): AdminSummary {
  const text = adminCopy(lang)
  const kmLabels = lang === "es"
    ? ["< 5.000", "5.000–10.000", "10.000–15.000", "15.000–20.000", "20.000–30.000", "≥ 30.000"]
    : ["< 5,000", "5,000–10,000", "10,000–15,000", "15,000–20,000", "20,000–30,000", "≥ 30,000"]
  const years = new Map<string, number>()
  const months = new Map<string, number>()
  const km = kmLabels.map((name) => ({ name, count: 0 }))
  const models = new Map<string, number>()
  const countries = new Map<string, number>()
  const connections = new Map<string, number>()
  const languages = new Map<string, number>()
  const currencies = new Map<string, number>()
  const fuels = new Map<string, number>([
    [text.gasoline, 0],
    [text.diesel, 0],
  ])
  const phev = new Map<string, number>([
    [text.on, 0],
    [text.off, 0],
  ])
  const horizons = new Map<string, number>([
    ["5", 0],
    ["10", 0],
    ["15", 0],
    ["20", 0],
  ])
  const places = new Map<string, MapPoint>()

  for (const row of rows) {
    const year = row.createdAt.slice(0, 4)
    const month = row.createdAt.slice(0, 7)
    if (/^\d{4}$/.test(year)) years.set(year, (years.get(year) ?? 0) + 1)
    if (/^\d{4}-\d{2}$/.test(month)) months.set(month, (months.get(month) ?? 0) + 1)
    km[kmBucket(row.kmYear)].count += 1
    bump(countries, row.country)
    bump(connections, row.connectionCountry ?? text.unknown)
    bump(languages, row.language)
    bump(currencies, row.displayCurrency)
    bump(fuels, row.fuel === "diesel" ? text.diesel : text.gasoline)
    bump(phev, row.phev ? text.on : text.off)
    bump(horizons, String(row.result.horizon))
    bump(models, `${text.electric} · ${row.evModelLabel ?? text.noModel}`)
    bump(models, `${text.combustion} · ${row.iceModelLabel ?? text.noModel}`)
    addPlace(places, row, text.countryPoint)
  }

  return {
    total: rows.length,
    map: [...places.values()].sort((a, b) => b.count - a.count).slice(0, 400),
    years: cumulative(years),
    months: named(months).sort((a, b) => a.name.localeCompare(b.name)),
    km,
    models: top(models, 8),
    countries: top(countries, 12),
    connections: top(connections, 12),
    languages: top(languages, 8),
    currencies: top(currencies, 8),
    fuels: named(fuels),
    phev: named(phev),
    horizons: ["5", "10", "15", "20"].map((name) => ({ name, count: horizons.get(name) ?? 0 })),
  }
}

function addPlace(places: Map<string, MapPoint>, row: SummaryRow, countryWord: string) {
  let lat = row.latitude
  let lon = row.longitude
  let key = ""
  let label = row.connectionCountry ?? ""
  if (lat == null || lon == null) {
    const center = countryCentroid(row.connectionCountry)
    if (!center) return
    lat = center.lat
    lon = center.lon
    key = `country:${row.connectionCountry}`
    label = `${row.connectionCountry} · ${countryWord}`
  } else {
    lat = Number(lat.toFixed(1))
    lon = Number(lon.toFixed(1))
    key = `${lat.toFixed(1)},${lon.toFixed(1)}`
    label = row.connectionCountry ?? key
  }
  const existing = places.get(key)
  if (existing) existing.count += 1
  else places.set(key, { lat, lon, count: 1, label })
}

function kmBucket(kmYear: number) {
  for (let index = KM_EDGES.length - 1; index >= 0; index -= 1) {
    if (kmYear >= KM_EDGES[index]) return index
  }
  return 0
}

function bump(bucket: Map<string, number>, name: string) {
  bucket.set(name, (bucket.get(name) ?? 0) + 1)
}

function named(bucket: Map<string, number>): NamedCount[] {
  return [...bucket.entries()].map(([name, count]) => ({ name, count }))
}

function top(bucket: Map<string, number>, limit: number) {
  return named(bucket)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

function cumulative(bucket: Map<string, number>): NamedCount[] {
  const years = [...bucket.keys()].sort()
  let running = 0
  return years.map((name) => {
    running += bucket.get(name) ?? 0
    return { name, count: running }
  })
}
