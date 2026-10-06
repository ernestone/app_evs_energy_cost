export const METRICS_MAX_BYTES = 12_000

const BODY_KEYS = [
  "country",
  "language",
  "displayCurrency",
  "kmYear",
  "cityShare",
  "kwhPer100",
  "litersPer100",
  "fuel",
  "phev",
  "phevShares",
  "electricity",
  "evModelId",
  "iceModelId",
  "evModelLabel",
  "iceModelLabel",
  "evPurchase",
  "icePurchase",
  "result",
] as const

export type MetricPayload = {
  country: string
  language: "es" | "en"
  displayCurrency: string
  kmYear: number
  cityShare: { city: number; highway: number } | null
  kwhPer100: number
  litersPer100: number
  fuel: "gasoline" | "diesel"
  phev: boolean
  phevShares: { fuel: number; electric: number } | null
  electricity: { label: string; percent: string; price: string }[]
  evModelId: number | null
  iceModelId: number | null
  evModelLabel: string | null
  iceModelLabel: string | null
  evPurchase: string
  icePurchase: string
  result: {
    costs: {
      monthEv: number
      monthIce: number
      yearEv: number
      yearIce: number
      horizonEv: number
      horizonIce: number
    }
    co2: {
      evTonnes: number | null
      iceTonnes: number | null
      evGPerKm: number | null
      iceGPerKm: number | null
    }
    savings: { month: number; year: number; horizon: number }
    horizon: 5 | 10 | 15 | 20
  }
}

export type ConnectionPoint = {
  country: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const got = Object.keys(value)
  return got.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNumOrNull(value: unknown): value is number | null {
  return value === null || isNum(value)
}

function shortText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max && !value.includes("\u0000")
}

function sharePair(value: unknown, keys: readonly [string, string]): { left: number; right: number } | null {
  if (!isRecord(value) || !exactKeys(value, keys)) return null
  const left = value[keys[0]]
  const right = value[keys[1]]
  if (!isNum(left) || !isNum(right) || left < 0 || right < 0 || left > 100 || right > 100) return null
  if (Math.abs(left + right - 100) > 0.05) return null
  return { left, right }
}

function modelId(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value))
}

/**
 * Reads the Vercel country, region, and city-level coordinates.
 * The IP itself is never read and is not part of the result.
 */
export function connectionFromHeaders(headers: Headers): ConnectionPoint {
  const countryRaw = headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? ""
  const regionRaw = headers.get("x-vercel-ip-country-region")?.trim().toUpperCase() ?? ""
  const latitude = coordinate(headers.get("x-vercel-ip-latitude"), -90, 90)
  const longitude = coordinate(headers.get("x-vercel-ip-longitude"), -180, 180)
  return {
    country: /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null,
    region: /^[A-Z0-9-]{1,8}$/.test(regionRaw) ? regionRaw : null,
    latitude: latitude != null && longitude != null ? latitude : null,
    longitude: latitude != null && longitude != null ? longitude : null,
  }
}

function coordinate(raw: string | null, min: number, max: number) {
  if (raw == null || !raw.trim()) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}

export function parseMetricPayload(value: unknown): MetricPayload | null {
  if (!isRecord(value) || !exactKeys(value, BODY_KEYS)) return null
  if (typeof value.country !== "string" || !/^[A-Z]{2}$/.test(value.country)) return null
  if (value.language !== "es" && value.language !== "en") return null
  if (typeof value.displayCurrency !== "string" || !/^[A-Z]{3}$/.test(value.displayCurrency)) return null
  if (!isNum(value.kmYear) || value.kmYear <= 0 || value.kmYear > 1_000_000) return null
  if (!isNum(value.kwhPer100) || value.kwhPer100 < 0 || value.kwhPer100 > 500) return null
  if (!isNum(value.litersPer100) || value.litersPer100 < 0 || value.litersPer100 > 200) return null
  if (value.fuel !== "gasoline" && value.fuel !== "diesel") return null
  if (typeof value.phev !== "boolean") return null
  if (!shortText(value.evPurchase, 40) || !shortText(value.icePurchase, 40)) return null

  let cityShare: MetricPayload["cityShare"] = null
  if (value.cityShare !== null) {
    const pair = sharePair(value.cityShare, ["city", "highway"])
    if (!pair) return null
    cityShare = { city: pair.left, highway: pair.right }
  }

  let phevShares: MetricPayload["phevShares"] = null
  if (value.phev) {
    const pair = sharePair(value.phevShares, ["fuel", "electric"])
    if (!pair) return null
    phevShares = { fuel: pair.left, electric: pair.right }
  } else if (value.phevShares !== null) {
    return null
  }

  if (!Array.isArray(value.electricity) || value.electricity.length < 1 || value.electricity.length > 12) return null
  const electricity: MetricPayload["electricity"] = []
  for (const row of value.electricity) {
    if (!isRecord(row) || !exactKeys(row, ["label", "percent", "price"])) return null
    if (!shortText(row.label, 40) || !shortText(row.percent, 12) || !shortText(row.price, 24)) return null
    electricity.push({ label: row.label, percent: row.percent, price: row.price })
  }

  if (!modelId(value.evModelId) || !modelId(value.iceModelId)) return null
  if (!coupleModel(value.evModelId, value.evModelLabel) || !coupleModel(value.iceModelId, value.iceModelLabel)) return null

  const result = parseResult(value.result)
  if (!result) return null

  return {
    country: value.country,
    language: value.language,
    displayCurrency: value.displayCurrency,
    kmYear: value.kmYear,
    cityShare,
    kwhPer100: value.kwhPer100,
    litersPer100: value.litersPer100,
    fuel: value.fuel,
    phev: value.phev,
    phevShares,
    electricity,
    evModelId: value.evModelId,
    iceModelId: value.iceModelId,
    evModelLabel: value.evModelLabel as string | null,
    iceModelLabel: value.iceModelLabel as string | null,
    evPurchase: value.evPurchase,
    icePurchase: value.icePurchase,
    result,
  }
}

function coupleModel(id: number | null, label: unknown) {
  if (id == null) return label === null
  return shortText(label, 160) && label.trim().length > 0
}

function parseResult(value: unknown): MetricPayload["result"] | null {
  if (!isRecord(value) || !exactKeys(value, ["costs", "co2", "savings", "horizon"])) return null
  if (value.horizon !== 5 && value.horizon !== 10 && value.horizon !== 15 && value.horizon !== 20) return null
  if (!isRecord(value.costs) || !exactKeys(value.costs, ["monthEv", "monthIce", "yearEv", "yearIce", "horizonEv", "horizonIce"])) return null
  if (!isRecord(value.co2) || !exactKeys(value.co2, ["evTonnes", "iceTonnes", "evGPerKm", "iceGPerKm"])) return null
  if (!isRecord(value.savings) || !exactKeys(value.savings, ["month", "year", "horizon"])) return null
  const costs = value.costs
  const co2 = value.co2
  const savings = value.savings
  if (![costs.monthEv, costs.monthIce, costs.yearEv, costs.yearIce, costs.horizonEv, costs.horizonIce, savings.month, savings.year, savings.horizon].every(isNum)) {
    return null
  }
  if (![co2.evTonnes, co2.iceTonnes, co2.evGPerKm, co2.iceGPerKm].every(isNumOrNull)) return null
  return {
    costs: {
      monthEv: costs.monthEv as number,
      monthIce: costs.monthIce as number,
      yearEv: costs.yearEv as number,
      yearIce: costs.yearIce as number,
      horizonEv: costs.horizonEv as number,
      horizonIce: costs.horizonIce as number,
    },
    co2: {
      evTonnes: co2.evTonnes as number | null,
      iceTonnes: co2.iceTonnes as number | null,
      evGPerKm: co2.evGPerKm as number | null,
      iceGPerKm: co2.iceGPerKm as number | null,
    },
    savings: {
      month: savings.month as number,
      year: savings.year as number,
      horizon: savings.horizon as number,
    },
    horizon: value.horizon,
  }
}
