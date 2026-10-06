import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import type { MetricPayload } from "./metric-payload.ts"
import { COMPARISON_COLUMNS, insertComparison, listComparisons, resetMetricsStore } from "./metrics-store.ts"

function sample(): MetricPayload {
  return {
    country: "ES",
    language: "es",
    displayCurrency: "EUR",
    kmYear: 15000,
    cityShare: null,
    kwhPer100: 16,
    litersPer100: 6,
    fuel: "gasoline",
    phev: false,
    phevShares: null,
    electricity: [{ label: "Casa", percent: "100", price: "0,2669" }],
    evModelId: null,
    iceModelId: null,
    evModelLabel: null,
    iceModelLabel: null,
    evPurchase: "20000",
    icePurchase: "18000",
    result: {
      costs: { monthEv: 1, monthIce: 2, yearEv: 12, yearIce: 24, horizonEv: 60, horizonIce: 120 },
      co2: { evTonnes: 0.2, iceTonnes: 1.1, evGPerKm: 12, iceGPerKm: 70 },
      savings: { month: 1, year: 12, horizon: 60 },
      horizon: 5,
    },
  }
}

test("sqlite stores the connection point and has no ip column", async () => {
  const previous = process.env.DATABASE_URL
  const file = path.join(os.tmpdir(), `metrics-${process.pid}-${Date.now()}.sqlite`)
  process.env.DATABASE_URL = `file:${file}`
  await resetMetricsStore()
  try {
    await insertComparison(sample(), { country: "ES", region: "MD", latitude: 40.4, longitude: -3.7 })
    const rows = await listComparisons()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].connectionCountry, "ES")
    assert.equal(rows[0].connectionRegion, "MD")
    assert.equal(rows[0].latitude, 40.4)
    assert.equal(rows[0].longitude, -3.7)
    assert.equal(rows[0].evPurchase, "20000")
    assert.equal(rows[0].icePurchase, "18000")
    assert.equal((COMPARISON_COLUMNS as readonly string[]).includes("ip"), false)
    assert.equal(COMPARISON_COLUMNS.join(" ").includes("user_agent"), false)
    assert.equal("ip" in rows[0], false)
  } finally {
    await resetMetricsStore()
    if (previous === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previous
    fs.rmSync(file, { force: true })
  }
})
