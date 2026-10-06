import fs from "node:fs"
import path from "node:path"
import type { ConnectionPoint, MetricPayload } from "./metric-payload"
import type { SummaryRow } from "./metric-summary"

/** Column list for a stored comparison. The IP is not one of them. */
export const COMPARISON_COLUMNS = [
  "id",
  "created_at",
  "country",
  "connection_country",
  "connection_region",
  "latitude",
  "longitude",
  "language",
  "display_currency",
  "km_year",
  "city_share",
  "highway_share",
  "kwh_per_100",
  "liters_per_100",
  "fuel",
  "phev",
  "fuel_share",
  "electric_share",
  "electricity_rows",
  "ev_model_id",
  "ice_model_id",
  "ev_model_label",
  "ice_model_label",
  "ev_purchase",
  "ice_purchase",
  "result_json",
] as const

const INSERT_COLUMNS = COMPARISON_COLUMNS.filter((column) => column !== "id")

export type StoredComparison = SummaryRow & {
  id: number
  connectionRegion: string | null
  cityShare: number | null
  highwayShare: number | null
  kwhPer100: number
  litersPer100: number
  fuelShare: number | null
  electricShare: number | null
  electricity: MetricPayload["electricity"]
  evModelId: number | null
  iceModelId: number | null
  evPurchase: string
  icePurchase: string
  result: MetricPayload["result"]
}

type SqlDb = {
  exec(sql: string): void
  prepare(sql: string): {
    all(...params: unknown[]): Record<string, unknown>[]
    run(...params: unknown[]): unknown
  }
  close(): void
}

type Runner = {
  all(sql: string, params: unknown[]): Promise<Record<string, unknown>[]>
  run(sql: string, params: unknown[]): Promise<void>
  close(): Promise<void>
}

let opened: { url: string; runner: Runner } | null = null

export function storageConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export async function resetMetricsStore() {
  if (opened) await opened.runner.close()
  opened = null
}

export async function insertComparison(payload: MetricPayload, connection: ConnectionPoint) {
  const runner = await db()
  if (!runner) return
  const cutoff = new Date()
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12)
  await runner.run("DELETE FROM comparisons WHERE created_at < ?", [cutoff.toISOString()])
  const values = [
    new Date().toISOString(),
    payload.country,
    connection.country,
    connection.region,
    connection.latitude,
    connection.longitude,
    payload.language,
    payload.displayCurrency,
    payload.kmYear,
    payload.cityShare?.city ?? null,
    payload.cityShare?.highway ?? null,
    payload.kwhPer100,
    payload.litersPer100,
    payload.fuel,
    payload.phev ? 1 : 0,
    payload.phevShares?.fuel ?? null,
    payload.phevShares?.electric ?? null,
    JSON.stringify(payload.electricity),
    payload.evModelId,
    payload.iceModelId,
    payload.evModelLabel,
    payload.iceModelLabel,
    payload.evPurchase,
    payload.icePurchase,
    JSON.stringify(payload.result),
  ]
  const marks = INSERT_COLUMNS.map(() => "?").join(", ")
  await runner.run(`INSERT INTO comparisons (${INSERT_COLUMNS.join(", ")}) VALUES (${marks})`, values)
}

export async function listComparisons(limit = 10_000): Promise<StoredComparison[]> {
  const runner = await db()
  if (!runner) return []
  const rows = await runner.all(
    `SELECT ${COMPARISON_COLUMNS.join(", ")} FROM comparisons ORDER BY created_at DESC LIMIT ?`,
    [limit],
  )
  return rows.flatMap((row) => {
    const parsed = parseRow(row)
    return parsed ? [parsed] : []
  })
}

export async function listAllowlist(): Promise<string[]> {
  const runner = await db()
  if (!runner) return []
  const rows = await runner.all("SELECT login FROM allowlist ORDER BY login", [])
  return rows.map((row) => String(row.login))
}

export async function addAllow(login: string) {
  const runner = await db()
  if (!runner) return
  const existing = await runner.all("SELECT login FROM allowlist WHERE login = ?", [login])
  if (existing.length) return
  await runner.run("INSERT INTO allowlist (login, created_at) VALUES (?, ?)", [login, new Date().toISOString()])
}

export async function removeAllow(login: string) {
  const runner = await db()
  if (!runner) return
  await runner.run("DELETE FROM allowlist WHERE login = ?", [login])
}

async function db(): Promise<Runner | null> {
  const url = process.env.DATABASE_URL?.trim() ?? ""
  if (!url) return null
  if (opened?.url === url) return opened.runner
  if (opened) await opened.runner.close()
  const runner = url.startsWith("file:") ? await openSqlite(url) : await openPostgres(url)
  opened = { url, runner }
  return runner
}

async function openSqlite(url: string): Promise<Runner> {
  const file = path.resolve(process.cwd(), url.replace(/^file:/, ""))
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const mod = (await import("node:sqlite")) as { DatabaseSync: new (filename: string) => SqlDb }
  const database = new mod.DatabaseSync(file)
  database.exec(`CREATE TABLE IF NOT EXISTS comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    country TEXT NOT NULL,
    connection_country TEXT,
    connection_region TEXT,
    latitude REAL,
    longitude REAL,
    language TEXT NOT NULL,
    display_currency TEXT NOT NULL,
    km_year REAL NOT NULL,
    city_share REAL,
    highway_share REAL,
    kwh_per_100 REAL NOT NULL,
    liters_per_100 REAL NOT NULL,
    fuel TEXT NOT NULL,
    phev INTEGER NOT NULL,
    fuel_share REAL,
    electric_share REAL,
    electricity_rows TEXT NOT NULL,
    ev_model_id INTEGER,
    ice_model_id INTEGER,
    ev_model_label TEXT,
    ice_model_label TEXT,
    ev_purchase TEXT NOT NULL,
    ice_purchase TEXT NOT NULL,
    result_json TEXT NOT NULL
  )`)
  database.exec(`CREATE TABLE IF NOT EXISTS allowlist (
    login TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  )`)
  return {
    all(sql, params) {
      return Promise.resolve(database.prepare(sql).all(...params))
    },
    run(sql, params) {
      database.prepare(sql).run(...params)
      return Promise.resolve()
    },
    close() {
      database.close()
      return Promise.resolve()
    },
  }
}

async function openPostgres(url: string): Promise<Runner> {
  const postgres = (await import("postgres")).default
  const sql = postgres(url, { max: 1 })
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS comparisons (
    id bigserial PRIMARY KEY,
    created_at text NOT NULL,
    country text NOT NULL,
    connection_country text,
    connection_region text,
    latitude double precision,
    longitude double precision,
    language text NOT NULL,
    display_currency text NOT NULL,
    km_year double precision NOT NULL,
    city_share double precision,
    highway_share double precision,
    kwh_per_100 double precision NOT NULL,
    liters_per_100 double precision NOT NULL,
    fuel text NOT NULL,
    phev integer NOT NULL,
    fuel_share double precision,
    electric_share double precision,
    electricity_rows text NOT NULL,
    ev_model_id integer,
    ice_model_id integer,
    ev_model_label text,
    ice_model_label text,
    ev_purchase text NOT NULL,
    ice_purchase text NOT NULL,
    result_json text NOT NULL
  )`)
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS allowlist (
    login text PRIMARY KEY,
    created_at text NOT NULL
  )`)
  return {
    async all(statement, params) {
      const rows = await sql.unsafe(toPostgres(statement), params as never[])
      return rows as unknown as Record<string, unknown>[]
    },
    async run(statement, params) {
      await sql.unsafe(toPostgres(statement), params as never[])
    },
    close() {
      return sql.end()
    },
  }
}

function toPostgres(statement: string) {
  let index = 0
  return statement.replace(/\?/g, () => {
    index += 1
    return `$${index}`
  })
}

function parseRow(row: Record<string, unknown>): StoredComparison | null {
  try {
    const result = JSON.parse(String(row.result_json)) as MetricPayload["result"]
    const electricity = JSON.parse(String(row.electricity_rows)) as MetricPayload["electricity"]
    return {
      id: Number(row.id),
      createdAt: String(row.created_at),
      country: String(row.country),
      connectionCountry: textOrNull(row.connection_country),
      connectionRegion: textOrNull(row.connection_region),
      latitude: numberOrNull(row.latitude),
      longitude: numberOrNull(row.longitude),
      language: String(row.language),
      displayCurrency: String(row.display_currency),
      kmYear: Number(row.km_year),
      cityShare: numberOrNull(row.city_share),
      highwayShare: numberOrNull(row.highway_share),
      kwhPer100: Number(row.kwh_per_100),
      litersPer100: Number(row.liters_per_100),
      fuel: String(row.fuel),
      phev: Number(row.phev) === 1,
      fuelShare: numberOrNull(row.fuel_share),
      electricShare: numberOrNull(row.electric_share),
      electricity,
      evModelId: numberOrNull(row.ev_model_id),
      iceModelId: numberOrNull(row.ice_model_id),
      evModelLabel: textOrNull(row.ev_model_label),
      iceModelLabel: textOrNull(row.ice_model_label),
      evPurchase: String(row.ev_purchase),
      icePurchase: String(row.ice_purchase),
      result,
    }
  } catch {
    return null
  }
}

function textOrNull(value: unknown) {
  return value == null ? null : String(value)
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
