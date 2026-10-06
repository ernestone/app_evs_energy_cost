import assert from "node:assert/strict"
import test from "node:test"
import { countryCentroid } from "./country-centroids.ts"
import { summarize, type SummaryRow } from "./metric-summary.ts"

function row(patch: Partial<SummaryRow> = {}): SummaryRow {
  return {
    createdAt: "2026-10-05T12:00:00.000Z",
    country: "ES",
    connectionCountry: "ES",
    latitude: 40.41,
    longitude: -3.71,
    language: "es",
    displayCurrency: "EUR",
    kmYear: 15000,
    fuel: "gasoline",
    phev: false,
    evModelLabel: null,
    iceModelLabel: null,
    result: { horizon: 5 },
    ...patch,
  }
}

test("repeated visits to the same place grow one point", () => {
  const summary = summarize(
    [row({ latitude: 40.41, longitude: -3.71 }), row({ latitude: 40.44, longitude: -3.74 })],
    "es",
  )
  assert.equal(summary.map.length, 1)
  assert.equal(summary.map[0].count, 2)
  assert.equal(summary.map[0].lat, 40.4)
  assert.equal(summary.map[0].lon, -3.7)
})

test("a missing coordinate falls back to the country and stacks there", () => {
  const summary = summarize(
    [
      row({ latitude: null, longitude: null }),
      row({ latitude: null, longitude: null }),
    ],
    "es",
  )
  const center = countryCentroid("ES")
  assert.equal(summary.map.length, 1)
  assert.equal(summary.map[0].count, 2)
  assert.equal(summary.map[0].lat, center?.lat)
  assert.equal(summary.map[0].lon, center?.lon)
})

test("fifteen thousand kilometres sit in the 15 to 20 bin, and years accumulate", () => {
  const summary = summarize(
    [
      row({ createdAt: "2025-06-01T00:00:00.000Z", kmYear: 15000 }),
      row({ createdAt: "2026-01-02T00:00:00.000Z", kmYear: 14999 }),
      row({ createdAt: "2026-03-02T00:00:00.000Z", kmYear: 15000, result: { horizon: 10 } }),
    ],
    "es",
  )
  assert.equal(summary.km.find((item) => item.name.startsWith("15"))?.count, 2)
  assert.equal(summary.km.find((item) => item.name.startsWith("10"))?.count, 1)
  assert.deepEqual(summary.years, [
    { name: "2025", count: 1 },
    { name: "2026", count: 3 },
  ])
  assert.deepEqual(summary.months.map((item) => item.name), ["2025-06", "2026-01", "2026-03"])
  assert.deepEqual(summary.horizons.map((item) => item.count), [2, 1, 0, 0])
  assert.equal(summary.models.length, 2)
})
