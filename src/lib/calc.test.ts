import assert from "node:assert/strict"
import test from "node:test"
import {
  breakeven,
  compare,
  cumulativeCost,
  DEFAULT_CITY_SHARE,
  electricityBlend,
  GAL_TO_L,
  kwhPer100Miles,
  L_PER_100KM_NUMERATOR,
  MI_TO_KM,
  mpgForSplit,
  resolveElectricShare,
  type DriveInput,
  type Prices,
} from "./calc.ts"
import { sameModel } from "./match.ts"
import type { Vehicle } from "./types.ts"

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "side" | "powertrain" | "fuel">): Vehicle {
  return {
    id: 1,
    year: 2024,
    make: "Test",
    model: "Car",
    version: "Car",
    trany: "Auto",
    drive: "FWD",
    vclass: "Car",
    cityMpg: null,
    hwyMpg: null,
    combMpg: null,
    cityE: null,
    hwyE: null,
    combE: null,
    cityUf: null,
    hwyUf: null,
    combUf: null,
    cdGalPer100Mi: 0,
    co2Gpm: null,
    rangeMi: null,
    rangeAMi: null,
    charge240: null,
    ...partial,
  }
}

const drive = (partial: Partial<DriveInput> = {}): DriveInput => ({
  kmYear: 12000,
  cityShare: DEFAULT_CITY_SHARE,
  phevMode: "epa",
  customElectricShare: null,
  upstream: false,
  ...partial,
})

const prices = (partial: Partial<Prices> = {}): Prices => ({
  gasolinePerLiter: 1.6,
  dieselPerLiter: 1.5,
  electricityPerKwh: 0.2,
  gridGPerKwh: 250,
  ...partial,
})

test("didactic electric and gasoline example from the plan", () => {
  const ev = vehicle({
    side: "ev",
    powertrain: "ev",
    fuel: "electricity",
    combE: 40,
    cityE: 38,
    hwyE: 41,
    rangeMi: 265,
  })
  const ice = vehicle({
    side: "ice",
    powertrain: "gasoline",
    fuel: "gasoline",
    combMpg: 30,
    cityMpg: 28,
    hwyMpg: 33,
    co2Gpm: null,
  })
  const result = compare(ev, ice, prices(), drive())
  assert.equal(result.ok, true)
  if (!result.ok) return
  const kwhPer100Km = 40 / MI_TO_KM
  assert.ok(Math.abs(result.ev.kwhEqPer100Km - kwhPer100Km) < 1e-9)
  assert.ok(Math.abs(result.ev.kwhYear - kwhPer100Km * 120) < 1e-6)
  assert.ok(Math.abs(result.ev.costYear - result.ev.kwhYear * 0.2) < 1e-6)
  assert.ok(Math.abs(result.ev.kwhYear - 2982.58) < 0.1)
  const lPer100 = L_PER_100KM_NUMERATOR / 30
  assert.ok(Math.abs(result.ice.litersYear - lPer100 * 120) < 1e-6)
  assert.ok(Math.abs(result.ice.costYear - result.ice.litersYear * 1.6) < 1e-6)
  assert.ok(Math.abs(result.ice.litersYear - 940.86) < 0.1)
  assert.equal(result.projection[4].ev, result.ev.costYear * 5)
  assert.equal(result.ev.boundary, "grid")
  assert.equal(result.ice.boundary, "tailpipe")
  assert.ok(Math.abs((result.ev.co2Tonnes ?? 0) - (result.ev.kwhYear * 250) / 1e6) < 1e-9)
})

test("city and highway split uses the harmonic mean for MPG", () => {
  const ice = vehicle({
    side: "ice",
    powertrain: "gasoline",
    fuel: "gasoline",
    cityMpg: 50,
    hwyMpg: 30,
    combMpg: 40,
  })
  const harmonic = mpgForSplit(ice, 0.7)
  assert.ok(harmonic != null)
  assert.ok(Math.abs((harmonic as number) - 1 / (0.7 / 50 + 0.3 / 30)) < 1e-9)
  assert.ok(Math.abs((harmonic as number) - 40) > 1)
  assert.equal(mpgForSplit(ice, DEFAULT_CITY_SHARE), 40)
})

test("electric split is a distance-weighted mean", () => {
  const ev = vehicle({
    side: "ev",
    powertrain: "ev",
    fuel: "electricity",
    cityE: 20,
    hwyE: 30,
    combE: 24,
  })
  assert.equal(kwhPer100Miles(ev, DEFAULT_CITY_SHARE), 24)
  assert.equal(kwhPer100Miles(ev, 0.2), 0.2 * 20 + 0.8 * 30)
})

test("upstream surcharge is 25 percent of gasoline tailpipe and stays off diesel", () => {
  const ice = vehicle({
    side: "ice",
    powertrain: "gasoline",
    fuel: "gasoline",
    combMpg: 30,
    cityMpg: 28,
    hwyMpg: 33,
    co2Gpm: 300,
  })
  const ev = vehicle({ side: "ev", powertrain: "ev", fuel: "electricity", combE: 40, cityE: 40, hwyE: 40 })
  const off = compare(ev, ice, prices(), drive())
  const on = compare(ev, ice, prices(), drive({ upstream: true }))
  assert.equal(off.ok && on.ok, true)
  if (!off.ok || !on.ok) return
  assert.equal(off.ice.upstreamTonnes, 0)
  assert.ok(Math.abs(on.ice.upstreamTonnes - off.ice.tailpipeTonnes * 0.25) < 1e-9)
  assert.equal(on.ice.boundary, "tailpipe-upstream")
  const diesel = vehicle({
    side: "ice",
    powertrain: "diesel",
    fuel: "diesel",
    combMpg: 30,
    cityMpg: 28,
    hwyMpg: 33,
    co2Gpm: 340,
  })
  const dieselOn = compare(ev, diesel, prices(), drive({ upstream: true }))
  assert.equal(dieselOn.ok, true)
  if (!dieselOn.ok) return
  assert.equal(dieselOn.ice.upstreamTonnes, 0)
  assert.equal(dieselOn.ice.upstreamSkippedDiesel, true)
})

test("plug-in hybrid official mode uses the utility factor and the realistic default is half", () => {
  const phev = vehicle({
    side: "ice",
    powertrain: "phev",
    fuel: "premium",
    combMpg: 29.4601,
    cityMpg: 29.1529,
    hwyMpg: 29.8444,
    combE: 46,
    cityE: 45,
    hwyE: 47,
    combUf: 0.427,
    cityUf: 0.436,
    hwyUf: 0.415,
    co2Gpm: 175,
    cdGalPer100Mi: 0,
  })
  const ev = vehicle({ side: "ev", powertrain: "ev", fuel: "electricity", combE: 30, cityE: 30, hwyE: 30 })
  const official = resolveElectricShare(phev, drive())
  assert.equal(official?.share, 0.427)
  const custom = resolveElectricShare(phev, drive({ phevMode: "custom" }))
  assert.ok(custom && Math.abs(custom.share - 0.427 / 2) < 1e-12)
  const low = resolveElectricShare(phev, drive({ phevMode: "icct26" }))
  assert.ok(low && Math.abs(low.share - 0.427 * 0.74) < 1e-12)
  const result = compare(ev, phev, prices(), drive({ kmYear: MI_TO_KM * 100 }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  const miles = 100
  assert.ok(Math.abs(result.ice.kwhYear - miles * 0.427 * 0.46) < 1e-6)
  assert.ok(Math.abs(result.ice.litersYear - (miles * (1 - 0.427)) / 29.4601 * GAL_TO_L) < 1e-6)
  assert.ok(Math.abs(result.ice.tailpipeTonnes - (175 * miles) / 1e6) < 1e-9)
  assert.equal(result.ice.premium, true)
  assert.equal(result.ice.boundary, "tailpipe-grid")
})

test("missing prices and missing consumption block the result", () => {
  const ev = vehicle({ side: "ev", powertrain: "ev", fuel: "electricity", combE: 40, cityE: 40, hwyE: 40 })
  const ice = vehicle({ side: "ice", powertrain: "gasoline", fuel: "gasoline", combMpg: 30, cityMpg: 28, hwyMpg: 33 })
  const blocked = compare(ev, ice, prices({ electricityPerKwh: null }), drive())
  assert.equal(blocked.ok, false)
  if (blocked.ok) return
  assert.deepEqual(blocked.missingPrices, ["electricity"])
  const noMpg = compare(
    ev,
    vehicle({ side: "ice", powertrain: "gasoline", fuel: "gasoline" }),
    prices(),
    drive(),
  )
  assert.equal(noMpg.ok, false)
  if (noMpg.ok) return
  assert.deepEqual(noMpg.missingConsumption, ["ice"])
  const empty = compare(null, ice, prices(), drive())
  assert.equal(empty.ok, false)
})

test("model years before 2013 are marked as estimated CO2", () => {
  const ev = vehicle({ side: "ev", powertrain: "ev", fuel: "electricity", combE: 40, cityE: 40, hwyE: 40 })
  const old = vehicle({
    side: "ice",
    powertrain: "gasoline",
    fuel: "gasoline",
    year: 2008,
    combMpg: 25,
    cityMpg: 22,
    hwyMpg: 30,
    co2Gpm: 355,
  })
  const result = compare(ev, old, prices(), drive())
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.ice.co2Estimated, true)
  assert.equal(result.ev.co2Estimated, false)
})

test("WLTP combined ignores the city split and does not invent EPA miles", () => {
  const ev = vehicle({
    side: "ev",
    powertrain: "ev",
    fuel: "electricity",
    cycle: "WLTP",
    wltp: {
      lPer100km: null,
      co2GPerKm: 0,
      kwhPer100km: 16.6,
      electricRangeKm: 435,
      chargeSustainingLPer100km: null,
      sourceUrl: "https://co2cars.apps.eea.europa.eu/",
      sourceName: "EEA",
      license: "CC BY 2.5 DK",
      licenseUrl: "http://creativecommons.org/licenses/by/2.5/dk/deed.en_GB",
      figureYear: 2024,
    },
  })
  const ice = vehicle({
    side: "ice",
    powertrain: "hev",
    fuel: "gasoline",
    cycle: "WLTP",
    year: 2025,
    wltp: {
      lPer100km: 6.3,
      co2GPerKm: 143,
      kwhPer100km: null,
      electricRangeKm: null,
      chargeSustainingLPer100km: null,
      sourceUrl: "https://co2cars.apps.eea.europa.eu/",
      sourceName: "EEA",
      license: "CC BY 2.5 DK",
      licenseUrl: "http://creativecommons.org/licenses/by/2.5/dk/deed.en_GB",
      figureYear: 2025,
    },
  })
  const city = compare(ev, ice, prices({ gasolinePerLiter: 1.5, electricityPerKwh: 0.2 }), drive({ kmYear: 15000, cityShare: 0.55 }))
  const highway = compare(ev, ice, prices({ gasolinePerLiter: 1.5, electricityPerKwh: 0.2 }), drive({ kmYear: 15000, cityShare: 0.1 }))
  assert.equal(city.ok, true)
  assert.equal(highway.ok, true)
  if (!city.ok || !highway.ok) return
  assert.equal(city.ice.litersYear, 945)
  assert.equal(highway.ice.litersYear, 945)
  assert.equal(city.ev.kwhYear, 2490)
  assert.equal(city.ice.tailpipeTonnes, (143 * 15000) / 1_000_000)
  assert.equal(city.ice.co2FromFactor, false)
  assert.equal(city.ice.co2Estimated, false)
  assert.equal(city.ev.rangeKm, 435)
})

test("electricity blend is a weighted average and rejects a percent total other than 100", () => {
  const ok = electricityBlend([
    { percent: 70, pricePerKwh: 0.2 },
    { percent: 30, pricePerKwh: 0.1 },
  ])
  assert.equal(ok.ok, true)
  if (!ok.ok) return
  assert.ok(Math.abs(ok.pricePerKwh - 0.17) < 1e-9)
  const off = electricityBlend([
    { percent: 70, pricePerKwh: 0.2 },
    { percent: 40, pricePerKwh: 0.1 },
  ])
  assert.equal(off.ok, false)
  if (off.ok) return
  assert.equal(off.reason, "sum")
  assert.equal(off.percentSum, 110)
  const missing = electricityBlend([{ percent: 100, pricePerKwh: null }])
  assert.equal(missing.ok, false)
})

test("breakeven uses purchase plus frozen annual energy and refuses a higher electric bill", () => {
  const at = breakeven(40000, 30000, 400, 1400)
  assert.equal(at.status, "at")
  if (at.status !== "at") return
  assert.equal(at.years, 10)
  assert.equal(at.months, 0)
  assert.equal(at.exactYears, 10)
  const series = cumulativeCost(40000, 30000, 400, 1400, at)
  const atTen = series.rows.find((row) => row.t === 10)
  assert.equal(atTen?.ev, 44000)
  assert.equal(atTen?.ice, 44000)
  assert.deepEqual(breakeven(20000, 30000, 400, 1400), { status: "already" })
  assert.equal(breakeven(40000, 30000, 2000, 1400).status, "never")
  assert.equal(breakeven(30000, 30000, 500, 500).status, "equal")
})

test("Qashqai is not the EPA Rogue Sport", () => {
  assert.equal(sameModel("NISSAN", "NISSAN QASHQAI", "Nissan", "Rogue Sport"), false)
  assert.equal(sameModel("NISSAN", "QASHQAI", "Nissan", "Rogue"), false)
  assert.equal(sameModel("TESLA", "TESLA MODEL 3", "Tesla", "Model 3"), true)
  assert.equal(sameModel("NISSAN", "ROGUE", "Nissan", "Rogue"), true)
  assert.equal(sameModel("NISSAN", "ROGUE SPORT", "Nissan", "Rogue"), false)
})
