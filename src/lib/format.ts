import type { FxTable, Lang } from "./types"

const locale = (lang: Lang) => (lang === "es" ? "es-ES" : "en-GB")

export function formatNumber(value: number, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(locale(lang), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatMoney(value: number, currency: string, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency,
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

export function priceInput(value: number | null) {
  if (value == null) return ""
  const rounded = Math.round(value * 10_000) / 10_000
  return String(rounded)
}

export function parsePrice(value: string) {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return null
  const number = Number(trimmed)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}
