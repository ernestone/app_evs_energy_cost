import type { Fuel, PhevMode, Vehicle } from "./types"

export const MI_TO_KM = 1.609344
export const GAL_TO_L = 3.785411784
/** 100 × US gallon in litres / mile in kilometres. L/100 km = this / MPG. */
export const L_PER_100KM_NUMERATOR = (100 * GAL_TO_L) / MI_TO_KM
export const KWH_PER_GAL = 33.7
export const GAS_G_PER_GAL = 8887
export const DIESEL_G_PER_GAL = 10180
/** EPA multiplies gasoline tailpipe CO₂ by 1.25. The surcharge is the extra 0.25. */
export const UPSTREAM_MULTIPLIER = 1.25
export const DEFAULT_KM_YEAR = 15000
export const DEFAULT_CITY_SHARE = 0.55
export const ICCT_LOW_CUT = 0.26
export const ICCT_HIGH_CUT = 0.56

const KWH_PER_L = KWH_PER_GAL / GAL_TO_L

export interface DriveInput {
  kmYear: number
  cityShare: number
  phevMode: PhevMode
  /** Null means half the official utility factor. */
  customElectricShare: number | null
  upstream: boolean
  /** Null keeps the published rate. A number, including zero, replaces L/100 km or kWh/100 km. */
  evKwhPer100?: number | null
  iceLitersPer100?: number | null
  iceKwhPer100?: number | null
  /**
   * The on-screen boxes are the consumption. Null means the box is empty, not "use the hidden catalog figure".
   * A selected model writes its figure into the box first.
   */
  consumptionFromBoxes?: boolean
  /** When set, kilometres are split between the fuel rate and the electric rate. They must sum to 100. */
  motorShares?: { fuel: number; electric: number } | null
}

export interface Prices {
  gasolinePerLiter: number | null
  dieselPerLiter: number | null
  electricityPerKwh: number | null
  gridGPerKwh: number | null
}

export type Boundary =
  | "tailpipe"
  | "tailpipe-upstream"
  | "grid"
  | "tailpipe-grid"
  | "tailpipe-upstream-grid"

export interface SideFigures {
  litersYear: number
  kwhYear: number
  costYear: number
  costMonth: number
  costPer100Km: number
  kwhEqPer100Km: number
  tailpipeTonnes: number
  upstreamTonnes: number
  gridTonnes: number
  co2Tonnes: number | null
  gPerKm: number | null
  boundary: Boundary
  co2Estimated: boolean
  co2FromFactor: boolean
  rangeKm: number | null
  electricRangeKm: number | null
  charge240: number | null
  electricShare: number | null
  officialUf: number | null
  premium: boolean
  ffv: boolean
  upstreamApplies: boolean
  upstreamSkippedDiesel: boolean
}

export interface ReadyComparison {
  ok: true
  ev: SideFigures
  ice: SideFigures
  projection: { year: number; ev: number; ice: number }[]
}

export interface BlockedComparison {
  ok: false
  missingPrices: Array<"gasoline" | "diesel" | "electricity">
  missingConsumption: Array<"ev" | "ice">
  invalidKm: boolean
  shareMismatch?: boolean
}

export type Comparison = ReadyComparison | BlockedComparison

export interface PowerShare {
  percent: number | null
  pricePerKwh: number | null
}

export type ElectricityBlend =
  | { ok: true; pricePerKwh: number; percentSum: number }
  | { ok: false; reason: "missing" | "sum"; percentSum: number }

/** Weighted average of kWh prices. Percents must add up to 100. The weights are not rescaled. */
export function electricityBlend(rows: PowerShare[]): ElectricityBlend {
  let percentSum = 0
  let priced = 0
  let complete = true
  for (const row of rows) {
    if (row.percent == null || row.pricePerKwh == null) {
      complete = false
      if (row.percent != null) percentSum += row.percent
      continue
    }
    percentSum += row.percent
    priced += (row.percent / 100) * row.pricePerKwh
  }
  if (!rows.length || !complete) return { ok: false, reason: "missing", percentSum }
  if (Math.abs(percentSum - 100) > 0.05) return { ok: false, reason: "sum", percentSum }
  return { ok: true, pricePerKwh: priced, percentSum }
}

export type Breakeven =
  | { status: "already" }
  | { status: "equal" }
  | { status: "never" }
  | { status: "at"; years: number; months: number; exactYears: number }

/**
 * cost(t) = purchase + annualEnergy * t.
 * A higher electric energy bill never counts as catching up.
 * t = 0 compares the purchase prices.
 */
export function breakeven(
  purchaseEv: number,
  purchaseIce: number,
  annualEv: number,
  annualIce: number,
): Breakeven {
  const moneyGap = 0.005
  if (annualEv > annualIce + moneyGap) return { status: "never" }
  if (Math.abs(annualEv - annualIce) <= moneyGap) {
    if (purchaseEv < purchaseIce - moneyGap) return { status: "already" }
    if (purchaseEv > purchaseIce + moneyGap) return { status: "never" }
    return { status: "equal" }
  }
  const exactYears = (purchaseEv - purchaseIce) / (annualIce - annualEv)
  if (exactYears <= 0.0001) return { status: "already" }
  let years = Math.floor(exactYears)
  let months = Math.round((exactYears - years) * 12)
  if (months === 12) {
    years += 1
    months = 0
  }
  return { status: "at", years, months, exactYears }
}

export function cumulativeCost(
  purchaseEv: number,
  purchaseIce: number,
  annualEv: number,
  annualIce: number,
  point: Breakeven,
) {
  const horizon =
    point.status === "at" ? Math.max(5, Math.ceil(point.exactYears) + 1) : point.status === "never" ? 10 : 8
  const rows: { t: number; ev: number; ice: number }[] = []
  for (let year = 0; year <= horizon; year += 1) {
    rows.push({ t: year, ev: purchaseEv + annualEv * year, ice: purchaseIce + annualIce * year })
  }
  if (point.status === "at" && Math.abs(point.exactYears - Math.round(point.exactYears)) > 0.02) {
    const t = point.exactYears
    const cost = purchaseEv + annualEv * t
    rows.push({ t, ev: cost, ice: cost })
    rows.sort((a, b) => a.t - b.t)
  }
  const mark =
    point.status === "at"
      ? { t: point.exactYears, cost: purchaseEv + annualEv * point.exactYears }
      : point.status === "already"
        ? { t: 0, cost: purchaseEv }
        : null
  return { rows, mark }
}

/** Spend from year 0 through `horizon`. Purchase is added only when both prices are numbers. */
export function spendProjection(
  purchaseEv: number | null,
  purchaseIce: number | null,
  annualEv: number,
  annualIce: number,
  horizon: number,
) {
  const includesPurchase = purchaseEv != null && purchaseIce != null
  const buyEv = includesPurchase ? purchaseEv : 0
  const buyIce = includesPurchase ? purchaseIce : 0
  const point = includesPurchase ? breakeven(purchaseEv, purchaseIce, annualEv, annualIce) : null
  const rows: { t: number; ev: number; ice: number }[] = []
  for (let year = 0; year <= horizon; year += 1) {
    rows.push({ t: year, ev: buyEv + annualEv * year, ice: buyIce + annualIce * year })
  }
  if (point?.status === "at" && point.exactYears > 0 && point.exactYears < horizon && Math.abs(point.exactYears - Math.round(point.exactYears)) > 0.02) {
    const cost = buyEv + annualEv * point.exactYears
    rows.push({ t: point.exactYears, ev: cost, ice: cost })
    rows.sort((a, b) => a.t - b.t)
  }
  const mark =
    point?.status === "at" && point.exactYears <= horizon
      ? { t: point.exactYears, cost: buyEv + annualEv * point.exactYears }
      : point?.status === "already"
        ? { t: 0, cost: buyEv }
        : null
  return { rows, mark, includesPurchase, point }
}

function nearOfficialSplit(cityShare: number) {
  return Math.abs(cityShare - DEFAULT_CITY_SHARE) < 0.0005
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function mpgForSplit(vehicle: Vehicle, cityShare: number): number | null {
  if (nearOfficialSplit(cityShare) && vehicle.combMpg && vehicle.combMpg > 0) return vehicle.combMpg
  if (cityShare >= 0.999) return positive(vehicle.cityMpg)
  if (cityShare <= 0.001) return positive(vehicle.hwyMpg)
  const city = vehicle.cityMpg
  const hwy = vehicle.hwyMpg
  if (!city || !hwy || city <= 0 || hwy <= 0) return null
  return 1 / (cityShare / city + (1 - cityShare) / hwy)
}

export function kwhPer100Miles(vehicle: Vehicle, cityShare: number): number | null {
  if (nearOfficialSplit(cityShare) && vehicle.combE && vehicle.combE > 0) return vehicle.combE
  if (cityShare >= 0.999) return positive(vehicle.cityE)
  if (cityShare <= 0.001) return positive(vehicle.hwyE)
  if (vehicle.cityE == null || vehicle.hwyE == null || vehicle.cityE <= 0 || vehicle.hwyE <= 0) return null
  return cityShare * vehicle.cityE + (1 - cityShare) * vehicle.hwyE
}

export function utilityFactor(vehicle: Vehicle, cityShare: number): number | null {
  if (nearOfficialSplit(cityShare) && vehicle.combUf != null) return vehicle.combUf
  if (vehicle.cityUf == null || vehicle.hwyUf == null) return vehicle.combUf
  if (cityShare >= 0.999) return vehicle.cityUf
  if (cityShare <= 0.001) return vehicle.hwyUf
  return cityShare * vehicle.cityUf + (1 - cityShare) * vehicle.hwyUf
}

export function resolveElectricShare(vehicle: Vehicle, input: DriveInput) {
  const official = utilityFactor(vehicle, input.cityShare)
  if (official == null) return null
  if (input.phevMode === "epa") return { share: clamp01(official), official }
  if (input.phevMode === "icct26") return { share: clamp01(official * (1 - ICCT_LOW_CUT)), official }
  if (input.phevMode === "icct56") return { share: clamp01(official * (1 - ICCT_HIGH_CUT)), official }
  const custom = input.customElectricShare == null ? official * 0.5 : input.customElectricShare
  return { share: clamp01(custom), official }
}

function positive(value: number | null): number | null {
  return value != null && value > 0 ? value : null
}

function blank(): SideFigures {
  return {
    litersYear: 0,
    kwhYear: 0,
    costYear: 0,
    costMonth: 0,
    costPer100Km: 0,
    kwhEqPer100Km: 0,
    tailpipeTonnes: 0,
    upstreamTonnes: 0,
    gridTonnes: 0,
    co2Tonnes: 0,
    gPerKm: 0,
    boundary: "tailpipe",
    co2Estimated: false,
    co2FromFactor: false,
    rangeKm: null,
    electricRangeKm: null,
    charge240: null,
    electricShare: null,
    officialUf: null,
    premium: false,
    ffv: false,
    upstreamApplies: false,
    upstreamSkippedDiesel: false,
  }
}

function money(side: SideFigures, kmYear: number) {
  side.costMonth = side.costYear / 12
  side.costPer100Km = side.costYear / (kmYear / 100)
  const tonnes = side.tailpipeTonnes + side.upstreamTonnes + side.gridTonnes
  const gridKnown = side.co2Tonnes !== null || side.gridTonnes === 0
  if (side.co2Tonnes === null) return
  side.co2Tonnes = tonnes
  side.gPerKm = (tonnes * 1_000_000) / kmYear
  void gridKnown
}

export function compare(
  ev: Vehicle | null,
  ice: Vehicle | null,
  prices: Prices,
  input: DriveInput,
): Comparison {
  const fromBoxes = input.consumptionFromBoxes === true
  if (!fromBoxes && (!ev || !ice || ev.side !== "ev" || ice.side !== "ice")) {
    return { ok: false, missingPrices: [], missingConsumption: [], invalidKm: false }
  }
  if (!(input.kmYear > 0) || input.cityShare < 0 || input.cityShare > 1) {
    return { ok: false, missingPrices: [], missingConsumption: [], invalidKm: true }
  }
  const shares = input.motorShares ?? null
  if (shares && Math.abs(shares.fuel + shares.electric - 100) > 0.05) {
    return { ok: false, missingPrices: [], missingConsumption: [], invalidKm: false, shareMismatch: true }
  }

  let evUse = ev ? measureEv(ev, input) : null
  let iceUse = ice ? measureIce(ice, input) : null
  const evKwh = input.evKwhPer100 ?? null
  const iceLiters = input.iceLitersPer100 ?? null
  const iceKwh = input.iceKwhPer100 ?? null
  if (fromBoxes) {
    if (evKwh == null) evUse = null
    else evUse = applyConsumption(evUse ?? blankMeasured(input.kmYear), input.kmYear, null, evKwh)
    if (iceLiters == null || (shares && iceKwh == null)) iceUse = null
    else {
      iceUse = applyConsumption(iceUse ?? blankMeasured(input.kmYear), input.kmYear, iceLiters, shares ? iceKwh : null, shares)
      if (!shares) iceUse = { ...iceUse, kwhYear: 0, gallons: iceUse.litersYear / GAL_TO_L }
    }
  } else {
    if (evKwh != null) evUse = applyConsumption(evUse ?? blankMeasured(input.kmYear), input.kmYear, null, evKwh)
    if (iceLiters != null || iceKwh != null) {
      iceUse = applyConsumption(iceUse ?? blankMeasured(input.kmYear), input.kmYear, iceLiters, iceKwh)
    }
  }
  const evVehicle = ev ?? (evUse ? typedVehicle("ev") : null)
  const iceVehicle = ice ?? (iceUse ? typedVehicle(shares ? "phev" : "gasoline") : null)
  const missingConsumption: Array<"ev" | "ice"> = []
  if (!evUse) missingConsumption.push("ev")
  if (!iceUse) missingConsumption.push("ice")

  const missingPrices = new Set<"gasoline" | "diesel" | "electricity">()
  if (evUse && prices.electricityPerKwh == null) missingPrices.add("electricity")
  if (iceUse) {
    if (iceUse.kwhYear > 0 && prices.electricityPerKwh == null) missingPrices.add("electricity")
    if (iceUse.litersYear > 0) {
      const fuelKind = iceVehicle?.fuel === "diesel" ? "diesel" : "gasoline"
      missingPrices.add(fuelKind)
      const fuel = fuelKind === "diesel" ? prices.dieselPerLiter : prices.gasolinePerLiter
      if (fuel != null) missingPrices.delete(fuelKind)
    }
  }

  if (missingConsumption.length || missingPrices.size) {
    return {
      ok: false,
      missingPrices: [...missingPrices],
      missingConsumption,
      invalidKm: false,
    }
  }

  const readyEv = priceEv(evVehicle!, evUse!, prices, input)
  const readyIce = priceIce(iceVehicle!, iceUse!, prices, input)
  return {
    ok: true,
    ev: readyEv,
    ice: readyIce,
    projection: [1, 2, 3, 4, 5].map((year) => ({
      year,
      ev: readyEv.costYear * year,
      ice: readyIce.costYear * year,
    })),
  }
}

interface Measured {
  litersYear: number
  kwhYear: number
  gallons: number
  miles: number
  electricShare: number | null
  officialUf: number | null
  usePublishedCo2: boolean
  officialLitersPer100: number
  litersScaled: boolean
}

function asMeasured(partial: Omit<Measured, "officialLitersPer100" | "litersScaled">): Measured {
  return { ...partial, officialLitersPer100: 0, litersScaled: false }
}

/** Published litres and kWh per 100 km for the current split. Null when the listing has no figure. */
export function ratesPer100(vehicle: Vehicle, input: DriveInput) {
  const probe = { ...input, kmYear: 100, evKwhPer100: null, iceLitersPer100: null, iceKwhPer100: null }
  const measured = vehicle.side === "ev" ? measureEv(vehicle, probe) : measureIce(vehicle, probe)
  if (!measured) return null
  return {
    litersPer100: vehicle.side === "ice" ? measured.litersYear : null,
    kwhPer100: vehicle.side === "ev" || measured.kwhYear > 0 ? measured.kwhYear : null,
  }
}

function applyConsumption(
  measured: Measured,
  kmYear: number,
  litersPer100: number | null,
  kwhPer100: number | null,
  weights?: { fuel: number; electric: number } | null,
) {
  const per100 = kmYear / 100
  const officialLiters = per100 > 0 ? measured.litersYear / per100 : 0
  const next = { ...measured, officialLitersPer100: officialLiters, litersScaled: false }
  const fuelWeight = weights ? weights.fuel / 100 : 1
  const electricWeight = weights ? weights.electric / 100 : 1
  if (litersPer100 != null) {
    next.litersYear = per100 * litersPer100 * fuelWeight
    next.gallons = next.litersYear / GAL_TO_L
    next.litersScaled = Math.abs(litersPer100 * fuelWeight - officialLiters) > 0.0001
  }
  if (kwhPer100 != null) next.kwhYear = per100 * kwhPer100 * electricWeight
  return next
}

function typedVehicle(kind: "ev" | "gasoline" | "phev"): Vehicle {
  return {
    id: 0,
    year: 2024,
    make: "",
    model: "",
    version: "",
    trany: "",
    drive: "",
    vclass: "",
    side: kind === "ev" ? "ev" : "ice",
    powertrain: kind === "ev" ? "ev" : kind === "phev" ? "phev" : "gasoline",
    fuel: kind === "ev" ? "electricity" : "gasoline",
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
    cycle: "EPA",
  }
}

function blankMeasured(kmYear: number): Measured {
  return asMeasured({
    litersYear: 0,
    kwhYear: 0,
    gallons: 0,
    miles: kmYear / MI_TO_KM,
    electricShare: null,
    officialUf: null,
    usePublishedCo2: false,
  })
}

function measureEv(vehicle: Vehicle, input: DriveInput): Measured | null {
  if (vehicle.cycle === "WLTP") {
    const per100 = vehicle.wltp?.kwhPer100km
    if (per100 == null || per100 <= 0) return null
    return asMeasured({
      litersYear: 0,
      kwhYear: (input.kmYear / 100) * per100,
      gallons: 0,
      miles: input.kmYear / MI_TO_KM,
      electricShare: null,
      officialUf: null,
      usePublishedCo2: false,
    })
  }
  const per100Mi = kwhPer100Miles(vehicle, input.cityShare)
  if (per100Mi == null) return null
  const miles = input.kmYear / MI_TO_KM
  return asMeasured({
    litersYear: 0,
    kwhYear: (miles / 100) * per100Mi,
    gallons: 0,
    miles,
    electricShare: null,
    officialUf: null,
    usePublishedCo2: false,
  })
}

function measureIce(vehicle: Vehicle, input: DriveInput): Measured | null {
  if (vehicle.cycle === "WLTP") return measureWltpIce(vehicle, input)
  const miles = input.kmYear / MI_TO_KM
  if (vehicle.powertrain !== "phev") {
    const mpg = mpgForSplit(vehicle, input.cityShare)
    if (mpg == null) return null
    const gallons = miles / mpg
    return asMeasured({
      litersYear: gallons * GAL_TO_L,
      kwhYear: 0,
      gallons,
      miles,
      electricShare: null,
      officialUf: null,
      usePublishedCo2: nearOfficialSplit(input.cityShare) && vehicle.co2Gpm != null,
    })
  }

  const resolved = resolveElectricShare(vehicle, input)
  if (!resolved) return null
  const share = resolved.share
  const mpg = mpgForSplit(vehicle, input.cityShare)
  if (share < 0.999 && mpg == null) return null
  const per100Mi = share > 0.001 ? kwhPer100Miles(vehicle, input.cityShare) : 0
  if (share > 0.001 && per100Mi == null) return null
  const gallons =
    (share < 0.999 ? (miles * (1 - share)) / (mpg as number) : 0) +
    ((miles * share) / 100) * (vehicle.cdGalPer100Mi || 0)
  return asMeasured({
    litersYear: gallons * GAL_TO_L,
    kwhYear: ((miles * share) / 100) * (per100Mi || 0),
    gallons,
    miles,
    electricShare: share,
    officialUf: resolved.official,
    usePublishedCo2:
      input.phevMode === "epa" &&
      nearOfficialSplit(input.cityShare) &&
      vehicle.co2Gpm != null,
  })
}

function measureWltpIce(vehicle: Vehicle, input: DriveInput): Measured | null {
  const wltp = vehicle.wltp
  if (!wltp) return null
  const liters = wltp.lPer100km != null ? (input.kmYear / 100) * wltp.lPer100km : 0
  const kwh =
    vehicle.powertrain === "phev" && wltp.kwhPer100km != null
      ? (input.kmYear / 100) * wltp.kwhPer100km
      : 0
  if (vehicle.powertrain === "phev") {
    if (wltp.lPer100km == null && wltp.kwhPer100km == null) return null
  } else if (wltp.lPer100km == null) {
    return null
  }
  return asMeasured({
    litersYear: liters,
    kwhYear: kwh,
    gallons: liters / GAL_TO_L,
    miles: input.kmYear / MI_TO_KM,
    electricShare: null,
    officialUf: null,
    usePublishedCo2: wltp.co2GPerKm != null,
  })
}

function priceEv(vehicle: Vehicle, measured: Measured, prices: Prices, input: DriveInput): SideFigures {
  const side = blank()
  const price = prices.electricityPerKwh ?? 0
  side.kwhYear = measured.kwhYear
  side.kwhEqPer100Km = measured.kwhYear / (input.kmYear / 100)
  side.costYear = measured.kwhYear * price
  side.rangeKm = vehicle.cycle === "WLTP" ? vehicle.wltp?.electricRangeKm ?? null : vehicle.rangeMi ? vehicle.rangeMi * MI_TO_KM : null
  side.charge240 = vehicle.cycle === "WLTP" ? null : vehicle.charge240
  if (prices.gridGPerKwh == null) {
    side.co2Tonnes = null
    side.gPerKm = null
    side.boundary = "grid"
  } else {
    side.gridTonnes = (measured.kwhYear * prices.gridGPerKwh) / 1_000_000
    side.boundary = "grid"
    side.co2Tonnes = 0
    money(side, input.kmYear)
  }
  side.costMonth = side.costYear / 12
  side.costPer100Km = side.costYear / (input.kmYear / 100)
  return side
}

function priceIce(vehicle: Vehicle, measured: Measured, prices: Prices, input: DriveInput): SideFigures {
  const side = blank()
  const fuelPrice = vehicle.fuel === "diesel" ? prices.dieselPerLiter ?? 0 : prices.gasolinePerLiter ?? 0
  const elecPrice = prices.electricityPerKwh ?? 0
  side.litersYear = measured.litersYear
  side.kwhYear = measured.kwhYear
  side.electricShare = measured.electricShare
  side.officialUf = measured.officialUf
  side.premium = vehicle.fuel === "premium"
  side.ffv = vehicle.powertrain === "ffv"
  side.rangeKm = vehicle.cycle === "WLTP" ? null : vehicle.rangeMi ? vehicle.rangeMi * MI_TO_KM : null
  side.electricRangeKm =
    vehicle.cycle === "WLTP"
      ? vehicle.powertrain === "phev"
        ? vehicle.wltp?.electricRangeKm ?? null
        : null
      : vehicle.rangeAMi
        ? vehicle.rangeAMi * MI_TO_KM
        : null
  side.charge240 = vehicle.cycle === "WLTP" ? null : vehicle.powertrain === "phev" ? vehicle.charge240 : null
  side.costYear = measured.litersYear * fuelPrice + measured.kwhYear * elecPrice
  const litersPer100 = measured.litersYear / (input.kmYear / 100)
  const kwhPer100 = measured.kwhYear / (input.kmYear / 100)
  side.kwhEqPer100Km = kwhPer100 + litersPer100 * KWH_PER_L

  let grams = 0
  if (vehicle.cycle === "WLTP") {
    if (vehicle.wltp?.co2GPerKm != null) grams = vehicle.wltp.co2GPerKm * input.kmYear
  } else if (measured.usePublishedCo2 && vehicle.co2Gpm != null) {
    grams = vehicle.co2Gpm * measured.miles
  } else if (measured.gallons > 0) {
    grams = measured.gallons * (vehicle.fuel === "diesel" ? DIESEL_G_PER_GAL : GAS_G_PER_GAL)
    side.co2FromFactor = true
  } else if (measured.litersScaled && measured.officialLitersPer100 > 0) {
    grams = 0
  }
  if (measured.litersScaled && measured.officialLitersPer100 > 0 && grams > 0 && !side.co2FromFactor) {
    const now = measured.litersYear / (input.kmYear / 100)
    grams *= now / measured.officialLitersPer100
  }
  side.tailpipeTonnes = grams / 1_000_000
  side.co2Estimated = vehicle.cycle === "WLTP" ? false : vehicle.year < 2013
  const gasolineLike = vehicle.fuel === "gasoline" || vehicle.fuel === "premium"
  if (input.upstream && gasolineLike && grams > 0) {
    side.upstreamTonnes = (grams * (UPSTREAM_MULTIPLIER - 1)) / 1_000_000
    side.upstreamApplies = true
  }
  if (input.upstream && vehicle.fuel === "diesel") side.upstreamSkippedDiesel = true

  if (vehicle.cycle === "WLTP" && vehicle.wltp?.co2GPerKm == null) {
    side.co2Tonnes = null
    side.gPerKm = null
    side.costMonth = side.costYear / 12
    side.costPer100Km = side.costYear / (input.kmYear / 100)
    return side
  }

  const wantsGrid = measured.kwhYear > 0
  if (wantsGrid && prices.gridGPerKwh == null) {
    side.co2Tonnes = null
    side.gPerKm = null
  } else {
    if (wantsGrid && prices.gridGPerKwh != null) {
      side.gridTonnes = (measured.kwhYear * prices.gridGPerKwh) / 1_000_000
    }
    side.co2Tonnes = 0
    money(side, input.kmYear)
  }
  side.costMonth = side.costYear / 12
  side.costPer100Km = side.costYear / (input.kmYear / 100)
  const hasTailpipe = grams > 0
  const hasGrid = side.gridTonnes > 0
  if (hasGrid && hasTailpipe) side.boundary = side.upstreamApplies ? "tailpipe-upstream-grid" : "tailpipe-grid"
  else if (hasGrid) side.boundary = "grid"
  else side.boundary = side.upstreamApplies ? "tailpipe-upstream" : "tailpipe"
  return side
}
