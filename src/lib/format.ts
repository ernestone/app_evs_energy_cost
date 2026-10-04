import type { FxTable, Lang } from "./types"

const locale = (lang: Lang) => (lang === "es" ? "es-ES" : "en-GB")

export function formatNumber(value: number, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(locale(lang), {
    useGrouping: true,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatMoney(value: number, currency: string, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency,
    useGrouping: true,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatDate(value: string, lang: Lang) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null
  if (!date || Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function crossRate(fx: FxTable, source: string, display: string) {
  const from = fx.rates[source]
  const to = fx.rates[display]
  if (!from || !to) return null
  return to / from
}

export function convertMoney(amount: number, fx: FxTable, source: string, display: string) {
  const rate = crossRate(fx, source, display)
  if (rate == null) return null
  return amount * rate
}

/** Editable field text: locale decimal mark and thousands separator, up to 4 decimal places. */
export function priceInput(value: number | null, lang: Lang = "en") {
  if (value == null) return ""
  const rounded = Math.round(value * 10_000) / 10_000
  return new Intl.NumberFormat(locale(lang), {
    useGrouping: true,
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(rounded)
}

/**
 * Read a typed number. Spanish groups with "." and uses "," for decimals.
 * English groups with "," and uses "." for decimals. A string that already
 * contains both marks uses whichever mark is rightmost as the decimal.
 */
export function parsePrice(value: string, lang: Lang = "en") {
  const trimmed = value.trim().replace(/[\s\u00a0\u202f]/g, "")
  if (!trimmed) return null
  const normalized = normalizeNumeric(trimmed, lang)
  if (normalized == null) return null
  const number = Number(normalized)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}

/** Old drafts stored a dot decimal and no thousands separator. */
export function parseLegacyPrice(value: string) {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return null
  const number = Number(trimmed)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}

export function upgradeLegacyInput(value: string, lang: Lang) {
  if (!value.trim()) return value
  const legacy = parseLegacyPrice(value)
  if (legacy == null) return value
  return priceInput(legacy, lang)
}

export function relocalizeInput(value: string, from: Lang, to: Lang) {
  if (from === to) return value
  const trimmed = value.trim()
  if (!trimmed || /[.,]$/.test(trimmed)) return value
  const parsed = parsePrice(trimmed, from)
  if (parsed == null) return value
  return priceInput(parsed, to)
}

function normalizeNumeric(raw: string, lang: Lang): string | null {
  if (!/^\d[\d.,]*\d$|^\d$/.test(raw)) return null
  const hasDot = raw.includes(".")
  const hasComma = raw.includes(",")
  if (hasDot && hasComma) {
    const lastDot = raw.lastIndexOf(".")
    const lastComma = raw.lastIndexOf(",")
    const decimal = lastComma > lastDot ? "," : "."
    const group = decimal === "," ? "." : ","
    const head = raw.slice(0, raw.lastIndexOf(decimal))
    const frac = raw.slice(raw.lastIndexOf(decimal) + 1)
    if (!/^\d+$/.test(frac) || !groupedInt(head, group)) return null
    return `${head.split(group).join("")}.${frac}`
  }
  const group = lang === "es" ? "." : ","
  const decimal = lang === "es" ? "," : "."
  if (raw.includes(group) && groupedInt(raw, group)) return raw.split(group).join("")
  if (raw.includes(decimal) && !raw.includes(group)) {
    const parts = raw.split(decimal)
    if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null
    return `${parts[0]}.${parts[1]}`
  }
  // A single mark that is not a thousands group stays a decimal: "0.2669" in Spanish.
  const mark = raw.includes(".") ? "." : raw.includes(",") ? "," : ""
  if (mark) {
    const parts = raw.split(mark)
    if (parts.length === 2 && /^\d+$/.test(parts[0] ?? "") && /^\d+$/.test(parts[1] ?? "") && !groupedInt(raw, mark)) {
      return `${parts[0]}.${parts[1]}`
    }
    return null
  }
  return /^\d+$/.test(raw) ? raw : null
}

function groupedInt(value: string, group: string) {
  const parts = value.split(group)
  if (parts.length < 2) return /^\d+$/.test(value)
  if (!/^\d{1,3}$/.test(parts[0] ?? "")) return false
  return parts.slice(1).every((part) => /^\d{3}$/.test(part))
}
