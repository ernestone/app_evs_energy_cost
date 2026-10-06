import assert from "node:assert/strict"
import test from "node:test"
import { copy } from "./i18n.ts"
import { connectionFromHeaders, parseMetricPayload } from "./metric-payload.ts"

function valid() {
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

test("the public body cannot carry an ip or a connection point", () => {
  assert.ok(parseMetricPayload(valid()))
  assert.equal(parseMetricPayload({ ...valid(), ip: "203.0.113.9" }), null)
  assert.equal(parseMetricPayload({ ...valid(), latitude: 40.4 }), null)
  assert.equal(parseMetricPayload({ ...valid(), connectionCountry: "ES" }), null)
})

test("connection headers are the country, the region and the city point", () => {
  const headers = new Headers({
    "x-vercel-ip-country": "es",
    "x-vercel-ip-country-region": "md",
    "x-vercel-ip-latitude": "40.4",
    "x-vercel-ip-longitude": "-3.7",
    "x-forwarded-for": "203.0.113.9",
    "x-real-ip": "203.0.113.9",
  })
  assert.deepEqual(connectionFromHeaders(headers), {
    country: "ES",
    region: "MD",
    latitude: 40.4,
    longitude: -3.7,
  })
  const partial = new Headers({ "x-vercel-ip-latitude": "40.4", "x-vercel-ip-country": "ES" })
  assert.deepEqual(connectionFromHeaders(partial), {
    country: "ES",
    region: null,
    latitude: null,
    longitude: null,
  })
})

test("the notice names the approximate point and still excludes the ip", () => {
  for (const lang of ["es", "en"] as const) {
    const notice = copy(lang).metricsNotice
    assert.match(notice, /IP/)
    assert.match(notice, lang === "es" ? /punto aproximado/ : /approximate point/)
    assert.match(notice, lang === "es" ? /sin nombre/ : /no name/)
    assert.doesNotMatch(notice, /guardamos la IP|store the IP|we store the IP/i)
  }
})
