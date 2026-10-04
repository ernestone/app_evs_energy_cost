import type { Lang, PhevMode, Vehicle } from "@/lib/types"

export const SESSION_DRAFT_KEY = "ev-comparator-inputs"

export interface PowerDraft {
  id: string
  label: string
  percent: string
  price: string
}

export interface SessionDraft {
  lang: Lang
  display: string
  countryCode: string
  gasoline: string
  diesel: string
  powerRows: PowerDraft[]
  evPurchase: string
  icePurchase: string
  evKwh: string
  evKwhEdited: boolean
  iceLiters: string
  iceLitersEdited: boolean
  iceKwh: string
  iceKwhEdited: boolean
  plugin: boolean
  fuelShare: string
  elecShare: string
  horizon: 5 | 10 | 15 | 20
  kmYear: string
  cityPct: number
  phevMode: PhevMode
  customShare: number | null
  upstream: boolean
  fuelPrice: "gasoline" | "diesel"
  ev: Vehicle | null
  ice: Vehicle | null
}

const HORIZONS = [5, 10, 15, 20] as const
const PHEV_MODES: PhevMode[] = ["epa", "custom", "icct26", "icct56"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function text(value: unknown) {
  return typeof value === "string" ? value : null
}

function flag(value: unknown) {
  return typeof value === "boolean" ? value : null
}

function powerRows(value: unknown): PowerDraft[] | null {
  if (!Array.isArray(value)) return null
  const rows: PowerDraft[] = []
  for (const row of value) {
    if (!isRecord(row)) return null
    const id = text(row.id)
    const label = text(row.label)
    const percent = text(row.percent)
    const price = text(row.price)
    if (id == null || label == null || percent == null || price == null) return null
    rows.push({ id, label, percent, price })
  }
  return rows
}

function vehicle(value: unknown, side: "ev" | "ice"): Vehicle | null {
  if (value == null) return null
  if (!isRecord(value)) return null
  if (value.side !== side || typeof value.id !== "number") return null
  return value as unknown as Vehicle
}

export function parseDraft(raw: string | null): SessionDraft | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(data)) return null
  const lang = data.lang === "es" || data.lang === "en" ? data.lang : null
  const display = text(data.display)
  const countryCode = text(data.countryCode)
  const gasoline = text(data.gasoline)
  const diesel = text(data.diesel)
  const rows = powerRows(data.powerRows)
  const evPurchase = text(data.evPurchase)
  const icePurchase = text(data.icePurchase)
  const evKwh = text(data.evKwh)
  const evKwhEdited = flag(data.evKwhEdited)
  const iceLiters = text(data.iceLiters)
  const iceLitersEdited = flag(data.iceLitersEdited)
  const iceKwh = text(data.iceKwh)
  const iceKwhEdited = flag(data.iceKwhEdited)
  const plugin = flag(data.plugin)
  const fuelShare = text(data.fuelShare)
  const elecShare = text(data.elecShare)
  const horizon = HORIZONS.find((item) => item === data.horizon) ?? null
  const kmYear = text(data.kmYear)
  const cityPct = typeof data.cityPct === "number" && data.cityPct >= 0 && data.cityPct <= 100 ? data.cityPct : null
  const phevMode = PHEV_MODES.find((item) => item === data.phevMode) ?? null
  const customShare = data.customShare == null || typeof data.customShare === "number" ? (data.customShare as number | null) : null
  const customOk = data.customShare == null || typeof data.customShare === "number"
  const upstream = flag(data.upstream)
  const fuelPrice = data.fuelPrice == null ? "gasoline" : data.fuelPrice === "gasoline" || data.fuelPrice === "diesel" ? data.fuelPrice : null
  if (
    !lang ||
    display == null ||
    countryCode == null ||
    gasoline == null ||
    diesel == null ||
    !rows ||
    evPurchase == null ||
    icePurchase == null ||
    evKwh == null ||
    evKwhEdited == null ||
    iceLiters == null ||
    iceLitersEdited == null ||
    iceKwh == null ||
    iceKwhEdited == null ||
    plugin == null ||
    fuelShare == null ||
    elecShare == null ||
    !horizon ||
    kmYear == null ||
    cityPct == null ||
    !phevMode ||
    !customOk ||
    upstream == null ||
    fuelPrice == null
  ) {
    return null
  }
  const ev = vehicle(data.ev, "ev")
  const ice = vehicle(data.ice, "ice")
  if (data.ev != null && !ev) return null
  if (data.ice != null && !ice) return null
  return {
    lang,
    display,
    countryCode,
    gasoline,
    diesel,
    powerRows: rows,
    evPurchase,
    icePurchase,
    evKwh,
    evKwhEdited,
    iceLiters,
    iceLitersEdited,
    iceKwh,
    iceKwhEdited,
    plugin,
    fuelShare,
    elecShare,
    horizon,
    kmYear,
    cityPct,
    phevMode,
    customShare,
    upstream,
    fuelPrice,
    ev,
    ice,
  }
}

export function readSessionDraft(): SessionDraft | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    return parseDraft(sessionStorage.getItem(SESSION_DRAFT_KEY))
  } catch {
    return null
  }
}

export function writeSessionDraft(draft: SessionDraft) {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Private mode can refuse storage. The comparison still works for this page.
  }
}
