"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { BreakevenChart, Charts } from "@/components/charts"
import { VehiclePicker } from "@/components/vehicle-picker"
import { breakeven, compare, cumulativeCost, DEFAULT_CITY_SHARE, DEFAULT_KM_YEAR, electricityBlend, ratesPer100, resolveElectricShare, type ElectricityBlend } from "@/lib/calc"
import { crossRate, formatDate, formatMoney, formatNumber, parsePrice, priceInput } from "@/lib/format"
import { copy, type Copy } from "@/lib/i18n"
import type { Country, CountryCatalogMeta, FxTable, Lang, SnapshotMeta, Vehicle } from "@/lib/types"

const DISPLAY = ["EUR", "USD", "GBP", "CZK", "DKK", "HUF", "PLN", "RON", "SEK"]
const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type PowerRow = { id: string; label: string; percent: string; price: string }

function editedRate(edited: boolean, raw: string) {
  if (!edited) return { override: null as number | null, invalid: false }
  const parsed = parsePrice(raw)
  if (parsed == null) return { override: null, invalid: true }
  return { override: parsed, invalid: false }
}

export function Comparator({
  countries,
  fx,
  meta,
  catalog,
}: {
  countries: Country[]
  fx: FxTable
  meta: SnapshotMeta
  catalog: CountryCatalogMeta
}) {
  const [lang, setLang] = useState<Lang>("es")
  const langRef = useRef(lang)
  langRef.current = lang
  const text = copy(lang)
  const [display, setDisplay] = useState("EUR")
  const [countryCode, setCountryCode] = useState("")
  const country = countries.find((item) => item.code === countryCode) ?? null
  const [gasoline, setGasoline] = useState("")
  const [diesel, setDiesel] = useState("")
  const [powerRows, setPowerRows] = useState<PowerRow[]>([])
  const [evPurchase, setEvPurchase] = useState("")
  const [icePurchase, setIcePurchase] = useState("")
  const [evKwh, setEvKwh] = useState("")
  const [evKwhEdited, setEvKwhEdited] = useState(false)
  const [iceLiters, setIceLiters] = useState("")
  const [iceLitersEdited, setIceLitersEdited] = useState(false)
  const [iceKwh, setIceKwh] = useState("")
  const [iceKwhEdited, setIceKwhEdited] = useState(false)
  const [ev, setEv] = useState<Vehicle | null>(null)
  const [ice, setIce] = useState<Vehicle | null>(null)
  const [kmYear, setKmYear] = useState(String(DEFAULT_KM_YEAR))
  const [cityPct, setCityPct] = useState(55)
  const [phevMode, setPhevMode] = useState<"epa" | "custom" | "icct26" | "icct56">("epa")
  const [customShare, setCustomShare] = useState<number | null>(null)
  const [upstream, setUpstream] = useState(false)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    if (!country) return
    setGasoline(priceInput(country.gasolinePerLiter))
    setDiesel(priceInput(country.dieselPerLiter))
    setPowerRows([
      {
        id: "home",
        label: langRef.current === "es" ? "Casa" : "Home",
        percent: "100",
        price: priceInput(country.electricityPerKwh),
      },
    ])
    setEvPurchase("")
    setIcePurchase("")
    setEvKwh("")
    setEvKwhEdited(false)
    setIceLiters("")
    setIceLitersEdited(false)
    setIceKwh("")
    setIceKwhEdited(false)
    setDisplay(country.currency)
    setEv(null)
    setIce(null)
  }, [country])

  useEffect(() => {
    setPowerRows((rows) =>
      rows.map((row) => {
        if (row.label !== "Casa" && row.label !== "Home") return row
        return { ...row, label: lang === "es" ? "Casa" : "Home" }
      }),
    )
  }, [lang])

  const km = Number(kmYear)
  const rateInput = {
    kmYear: 100,
    cityShare: cityPct / 100,
    phevMode,
    customElectricShare: customShare,
    upstream,
  }
  const evOfficialKwh = ev ? ratesPer100(ev, rateInput)?.kwhPer100 ?? null : null
  const iceOfficial = ice ? ratesPer100(ice, rateInput) : null
  const iceOfficialLiters = iceOfficial?.litersPer100 ?? null
  const iceOfficialKwh = iceOfficial?.kwhPer100 ?? null
  const showIceKwh = ice?.powertrain === "phev" || (iceOfficialKwh ?? 0) > 0

  useEffect(() => {
    setEvKwhEdited(false)
  }, [ev?.id])

  useEffect(() => {
    setIceLitersEdited(false)
    setIceKwhEdited(false)
  }, [ice?.id])

  useEffect(() => {
    if (!evKwhEdited) setEvKwh(priceInput(evOfficialKwh))
  }, [evOfficialKwh, evKwhEdited])

  useEffect(() => {
    if (!iceLitersEdited) setIceLiters(priceInput(iceOfficialLiters))
  }, [iceOfficialLiters, iceLitersEdited])

  useEffect(() => {
    if (!iceKwhEdited) setIceKwh(priceInput(iceOfficialKwh))
  }, [iceOfficialKwh, iceKwhEdited])

  const evRate = editedRate(evKwhEdited, evKwh)
  const iceFuelRate = editedRate(iceLitersEdited, iceLiters)
  const iceElecRate = editedRate(iceKwhEdited, iceKwh)
  const consumptionInvalid = Boolean(ev && ice && (evRate.invalid || iceFuelRate.invalid || (showIceKwh && iceElecRate.invalid)))
  const blend = electricityBlend(
    powerRows.map((row) => ({ percent: parsePrice(row.percent), pricePerKwh: parsePrice(row.price) })),
  )
  const result = compare(
    ev,
    ice,
    {
      gasolinePerLiter: parsePrice(gasoline),
      dieselPerLiter: parsePrice(diesel),
      electricityPerKwh: blend.ok ? blend.pricePerKwh : null,
      gridGPerKwh: country?.grid.gPerKwh ?? null,
    },
    {
      kmYear: km,
      cityShare: cityPct / 100,
      phevMode,
      customElectricShare: customShare,
      upstream,
      evKwhPer100: evRate.override,
      iceLitersPer100: iceFuelRate.override,
      iceKwhPer100: showIceKwh ? iceElecRate.override : null,
    },
  )

  const sourceCurrency = country?.currency ?? "EUR"
  const rate = crossRate(fx, sourceCurrency, display)
  const shown = (amount: number) => (rate == null ? amount : amount * rate)
  const moneyDigits = (amount: number) => (Math.abs(shown(amount)) >= 100 ? 0 : 2)

  const ordered = useMemo(
    () => [...countries].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang)),
    [countries, lang],
  )

  const shareInfo = ice?.powertrain === "phev" ? resolveElectricShare(ice, {
    kmYear: km,
    cityShare: cityPct / 100,
    phevMode,
    customElectricShare: customShare,
    upstream,
  }) : null

  function updatePower(id: string, patch: Partial<Pick<PowerRow, "label" | "percent" | "price">>) {
    setPowerRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  return (
    <div className="bg-background text-foreground lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <header className="shrink-0 border-b border-border/80">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-2xl font-semibold tracking-tight">{text.name}</p>
            <p className="max-w-2xl text-sm leading-5 text-muted-foreground">{text.tagline}</p>
            <p className="max-w-2xl text-sm leading-5">{text.notTco}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-lg bg-card p-0.5 ring-1 ring-foreground/10">
              <Button type="button" size="sm" variant={lang === "es" ? "default" : "ghost"} onClick={() => setLang("es")}>
                {text.langEs}
              </Button>
              <Button type="button" size="sm" variant={lang === "en" ? "default" : "ghost"} onClick={() => setLang("en")}>
                {text.langEn}
              </Button>
            </div>
            <label className="grid gap-1 text-xs text-muted-foreground">
              {text.currencyLabel}
              <select className={fieldClass} value={display} onChange={(event) => setDisplay(event.target.value)}>
                {[...new Set([sourceCurrency, ...DISPLAY])].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[92rem] flex-col gap-4 px-4 py-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(22rem,0.88fr)_minmax(0,1.12fr)] lg:overflow-hidden lg:py-3">
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
        <div className="order-1 grid content-start gap-4 lg:order-none">
          <Step n={1} title={text.steps.country}>
            <p className="text-sm text-muted-foreground">{text.countryHint}</p>
            <select
              className={fieldClass}
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
            >
              <option value="">{text.chooseCountry}</option>
              {ordered.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name[lang]}
                </option>
              ))}
            </select>
            {country ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <PriceField
                    label={`${text.gasoline} (${sourceCurrency} ${text.perLiter})`}
                    value={gasoline}
                    official={country.gasolinePerLiter}
                    onChange={setGasoline}
                    onReset={() => setGasoline(priceInput(country.gasolinePerLiter))}
                    text={text}
                    date={country.gasoline.date}
                    lang={lang}
                  />
                  <PriceField
                    label={`${text.diesel} (${sourceCurrency} ${text.perLiter})`}
                    value={diesel}
                    official={country.dieselPerLiter}
                    onChange={setDiesel}
                    onReset={() => setDiesel(priceInput(country.dieselPerLiter))}
                    text={text}
                    date={country.diesel.date}
                    lang={lang}
                  />
                </div>
                <div className="grid gap-2">
                  <div>
                    <p className="text-sm font-medium">{text.powerBlend}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{text.powerBlendHelp}</p>
                  </div>
                  {powerRows.map((row) => (
                    <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_5rem_minmax(0,1fr)_auto] sm:items-end">
                      <label className="grid gap-1 text-sm">
                        {text.powerLabel}
                        <Input
                          value={row.label}
                          aria-label={text.powerLabel}
                          onChange={(event) => updatePower(row.id, { label: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        {text.powerPercent}
                        <Input
                          inputMode="decimal"
                          value={row.percent}
                          aria-label={text.powerPercent}
                          onChange={(event) => updatePower(row.id, { percent: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        {`${text.electricity} (${sourceCurrency} ${text.perKwh})`}
                        <Input
                          inputMode="decimal"
                          value={row.price}
                          aria-label={text.electricity}
                          onChange={(event) => updatePower(row.id, { price: event.target.value })}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={powerRows.length === 1}
                        onClick={() => setPowerRows((rows) => rows.filter((item) => item.id !== row.id))}
                      >
                        {text.removePower}
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPowerRows((rows) => [...rows, { id: `row-${rows.length}-${Date.now()}`, label: "", percent: "", price: "" }])
                      }
                    >
                      {text.addPower}
                    </Button>
                    <p className="text-sm">{text.percentSum(formatNumber(blend.percentSum, lang, 1))}</p>
                  </div>
                  {blend.ok ? (
                    <p className="text-sm">
                      {formatNumber(blend.pricePerKwh, lang, 4)} {sourceCurrency} {text.perKwh}
                    </p>
                  ) : blend.reason === "sum" ? (
                    <Alert>
                      <AlertTitle>{text.powerBlend}</AlertTitle>
                      <AlertDescription>{text.percentMismatch}</AlertDescription>
                    </Alert>
                  ) : null}
                  {country.electricity.date ? (
                    <p className="text-xs text-muted-foreground">
                      {text.homePower}: {formatDate(country.electricity.date, lang)}. {country.electricity.note}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm leading-6">
                  {text.gridLabel}:{" "}
                  <strong>
                    {formatNumber(country.grid.gPerKwh, lang, 1)} {text.gridUnit}
                  </strong>{" "}
                  · {country.grid.year}. {country.grid.note}
                </p>
              </>
            ) : null}
          </Step>

          <Step n={2} title={text.steps.ev}>
            <p className="text-sm text-muted-foreground">{text.catalogNote}</p>
            <VehiclePicker key={`ev-${countryCode}`} side="ev" country={countryCode} copy={text} selected={ev} onSelect={setEv} />
            {ev ? (
              <ConsumptionField
                label={text.kwhPer100}
                ariaLabel={`${text.kwhPer100} ${text.evSeries}`}
                hint={text.consumptionHint}
                value={evKwh}
                official={evOfficialKwh}
                edited={evKwhEdited}
                invalid={evRate.invalid}
                invalidText={text.consumptionInvalid}
                yours={text.yours}
                officialLabel={text.official}
                resetLabel={text.reset}
                onChange={(value) => {
                  setEvKwhEdited(true)
                  setEvKwh(value)
                }}
                onReset={() => setEvKwhEdited(false)}
              />
            ) : null}
            <PurchaseField
              label={`${text.purchase} (${sourceCurrency})`}
              ariaLabel={`${text.purchase} ${text.evSeries}`}
              hint={text.purchaseHint}
              value={evPurchase}
              invalid={evPurchase.trim() !== "" && parsePrice(evPurchase) == null}
              invalidText={text.purchaseInvalid}
              onChange={setEvPurchase}
            />
          </Step>

          <Step n={3} title={text.steps.ice}>
            <p className="text-sm text-muted-foreground">{text.iceNote}</p>
            <VehiclePicker key={`ice-${countryCode}`} side="ice" country={countryCode} copy={text} selected={ice} onSelect={(vehicle) => {
              setIce(vehicle)
              setPhevMode("epa")
              setCustomShare(null)
            }} />
            {ice ? (
              <div className="grid gap-3">
                <ConsumptionField
                  label={text.litersPer100}
                  ariaLabel={`${text.litersPer100} ${text.iceSeries}`}
                  hint={text.consumptionHint}
                  value={iceLiters}
                  official={iceOfficialLiters}
                  edited={iceLitersEdited}
                  invalid={iceFuelRate.invalid}
                  invalidText={text.consumptionInvalid}
                  yours={text.yours}
                  officialLabel={text.official}
                  resetLabel={text.reset}
                  onChange={(value) => {
                    setIceLitersEdited(true)
                    setIceLiters(value)
                  }}
                  onReset={() => setIceLitersEdited(false)}
                />
                {showIceKwh ? (
                  <ConsumptionField
                    label={text.kwhPer100}
                    ariaLabel={`${text.kwhPer100} ${text.iceSeries}`}
                    hint={text.consumptionHint}
                    value={iceKwh}
                    official={iceOfficialKwh}
                    edited={iceKwhEdited}
                    invalid={iceElecRate.invalid}
                    invalidText={text.consumptionInvalid}
                    yours={text.yours}
                    officialLabel={text.official}
                    resetLabel={text.reset}
                    onChange={(value) => {
                      setIceKwhEdited(true)
                      setIceKwh(value)
                    }}
                    onReset={() => setIceKwhEdited(false)}
                  />
                ) : null}
              </div>
            ) : null}
            <PurchaseField
              label={`${text.purchase} (${sourceCurrency})`}
              ariaLabel={`${text.purchase} ${text.iceSeries}`}
              hint={text.purchaseHint}
              value={icePurchase}
              invalid={icePurchase.trim() !== "" && parsePrice(icePurchase) == null}
              invalidText={text.purchaseInvalid}
              onChange={setIcePurchase}
            />
            {ice?.fuel === "premium" ? <Notice>{text.premiumWarn}</Notice> : null}
            {ice?.powertrain === "ffv" ? <Notice>{text.ffvNote}</Notice> : null}
            {ice?.powertrain === "phev" && ice.cycle !== "WLTP" && shareInfo ? (
              <div className="grid gap-3 rounded-lg bg-secondary/60 p-3">
                <p className="text-sm font-medium">{text.phevTitle}</p>
                <select className={fieldClass} value={phevMode} onChange={(event) => setPhevMode(event.target.value as typeof phevMode)}>
                  <option value="epa">{text.phevEpa}</option>
                  <option value="custom">{text.phevCustom}</option>
                  <option value="icct26">{text.phevIcct26}</option>
                  <option value="icct56">{text.phevIcct56}</option>
                </select>
                <p className="text-sm">
                  {text.officialUf}: {formatNumber(shareInfo.official * 100, lang, 1)} %.{" "}
                  {text.phevShare}: {formatNumber(shareInfo.share * 100, lang, 1)} %.
                </p>
                {phevMode === "custom" ? (
                  <div className="grid gap-2">
                    <Label>{text.phevShare}</Label>
                    <Slider
                      min={0}
                      max={100}
                      value={[Math.round(shareInfo.share * 100)]}
                      onValueChange={(value) => setCustomShare((Array.isArray(value) ? value[0] : value) / 100)}
                    />
                  </div>
                ) : null}
                <p className="text-sm leading-6 text-muted-foreground">{text.phevAssumption}</p>
              </div>
            ) : null}
          </Step>

          <Step n={4} title={text.steps.distance}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                {text.kmYear}
                <Input
                  inputMode="decimal"
                  value={kmYear}
                  onChange={(event) => {
                    const next = event.target.value
                    setKmYear(next)
                  }}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                {text.kmMonth}
                <Input
                  inputMode="decimal"
                  value={Number.isFinite(km) ? String(Math.round((km / 12) * 10) / 10) : ""}
                  onChange={(event) => {
                    const month = Number(event.target.value.replace(",", "."))
                    if (Number.isFinite(month)) setKmYear(String(Math.round(month * 12)))
                  }}
                />
              </label>
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span>
                  {text.city} {cityPct}%
                </span>
                <span>
                  {text.highway} {100 - cityPct}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                value={[cityPct]}
                disabled={ev?.cycle === "WLTP" && ice?.cycle === "WLTP"}
                onValueChange={(value) => setCityPct(Array.isArray(value) ? value[0] : value)}
              />
              <p className="text-sm leading-6 text-muted-foreground">{text.splitNote}</p>
              {ev?.cycle === "WLTP" || ice?.cycle === "WLTP" ? (
                <p className="text-sm leading-6 text-muted-foreground">{text.splitSkipped}</p>
              ) : null}
              {cityPct !== 55 && (ev?.cycle !== "WLTP" || ice?.cycle !== "WLTP") ? <p className="text-sm">{text.splitChanged}</p> : null}
            </div>
            <div className="flex items-start gap-3">
              <Switch checked={upstream} onCheckedChange={setUpstream} id="upstream" />
              <div>
                <Label htmlFor="upstream">{text.upstream}</Label>
                <p className="text-sm leading-6 text-muted-foreground">{text.upstreamHelp}</p>
              </div>
            </div>
          </Step>
        </div>

        <section className="order-3 pb-8 lg:order-none lg:pb-2" id="sources">
        <Step n={6} title={text.steps.sources}>
          <p className="text-sm leading-6">{text.sourcesIntro}</p>
          <ul className="grid gap-2 text-sm leading-6">
            <li>
              <a className="underline" href="https://www.fueleconomy.gov/feg/ws/index.shtml">
                {text.epa}
              </a>
              . {meta.epaFileDate}. {text.vehiclesKept} {meta.modelYearMin}–{meta.modelYearMax}, {meta.vehicleCount}.
            </li>
            <li>
              <a className="underline" href={catalog.eu.url}>{text.eea}</a> {catalog.eu.retrieved}. {catalog.eu.license}.{" "}
              <a className="underline" href={catalog.eu.licenseUrl}>{catalog.eu.license}</a>. {catalog.eu.index}. {catalog.eu.years}.
            </li>
            <li>
              <a className="underline" href={catalog.gb.url}>{text.vcaFailed}</a> {catalog.gb.detail}
            </li>
            <li>
              <a className="underline" href="https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en">
                {text.oil}
              </a>
            </li>
            <li>
              <a className="underline" href="https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table">
                {text.eurostat}
              </a>
            </li>
            <li>
              <a className="underline" href="https://www.eia.gov/petroleum/gasdiesel/">{text.eia}</a>
            </li>
            <li>
              <a className="underline" href="https://www.gov.uk/government/statistics/weekly-road-fuel-prices">
                {text.desnzFuel}
              </a>
            </li>
            <li>
              <a className="underline" href="https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics">
                {text.desnzPower}
              </a>
            </li>
            <li>
              <a className="underline" href="https://ember-energy.org/data/yearly-electricity-data/">{text.ember}</a>{" "}
              <a className="underline" href="https://ember-energy.org/creative-commons/">CC BY 4.0</a>.
            </li>
            <li>
              <a className="underline" href={meta.upstream.url}>{meta.upstream.citation}</a>
            </li>
            <li>
              <a className="underline" href={meta.phevIcct.url}>{meta.phevIcct.citation}</a> {meta.phevIcct.note}
            </li>
          </ul>
          {country ? (
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              <li>{country.gasoline.note}</li>
              <li>{country.diesel.note}</li>
              <li>{country.electricity.note}</li>
            </ul>
          ) : null}
          <div>
            <h3 className="font-heading text-xl">{text.assumptionsTitle}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {text.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm leading-6">
            {text.fxLine}: {fx.provider}, {formatDate(fx.date, lang)}. {text.fxSource}{" "}
            {display === sourceCurrency
              ? text.sameCurrency
              : `${text.sourcePricesStay} ${sourceCurrency}. 1 ${sourceCurrency} = ${rate == null ? "—" : formatNumber(rate, lang, 4)} ${display}.`}
          </p>
        </Step>
        </section>
        </div>

        <aside className="order-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pl-1">
          <Results
            text={text}
            lang={lang}
            result={result}
            blend={blend}
            consumptionInvalid={consumptionInvalid}
            evPurchase={evPurchase}
            icePurchase={icePurchase}
            display={display}
            sourceCurrency={sourceCurrency}
            rate={rate}
            fxDate={fx.date}
            shown={shown}
            moneyDigits={moneyDigits}
            ev={ev}
            ice={ice}
            country={country}
            kmYear={km}
            catalog={catalog}
          />
        </aside>
      </main>
    </div>
  )
}

function Results({
  text,
  lang,
  result,
  blend,
  consumptionInvalid,
  evPurchase,
  icePurchase,
  display,
  sourceCurrency,
  rate,
  fxDate,
  shown,
  moneyDigits,
  ev,
  ice,
  country,
  kmYear,
  catalog,
}: {
  text: Copy
  lang: Lang
  result: ReturnType<typeof compare>
  blend: ElectricityBlend
  consumptionInvalid: boolean
  evPurchase: string
  icePurchase: string
  display: string
  sourceCurrency: string
  rate: number | null
  fxDate: string
  shown: (amount: number) => number
  moneyDigits: (amount: number) => number
  ev: Vehicle | null
  ice: Vehicle | null
  country: Country | null
  kmYear: number
  catalog: CountryCatalogMeta
}) {
  if (!country || !ev || !ice) {
    return (
      <Panel title={text.steps.results}>
        <Alert>
          <AlertTitle>{text.emptyTitle}</AlertTitle>
          <AlertDescription>{text.emptyBody}</AlertDescription>
        </Alert>
      </Panel>
    )
  }
  if (consumptionInvalid) {
    return (
      <Panel title={text.steps.results}>
        <Choice text={text} ev={ev} ice={ice} />
        <Alert>
          <AlertTitle>{text.consumption}</AlertTitle>
          <AlertDescription>{text.consumptionInvalid}</AlertDescription>
        </Alert>
      </Panel>
    )
  }
  if (!blend.ok && blend.reason === "sum") {
    return (
      <Panel title={text.steps.results}>
        <Choice text={text} ev={ev} ice={ice} />
        <Alert>
          <AlertTitle>{text.powerBlend}</AlertTitle>
          <AlertDescription>
            {text.percentSum(formatNumber(blend.percentSum, lang, 1))} {text.percentMismatch}
          </AlertDescription>
        </Alert>
      </Panel>
    )
  }
  if (!result.ok) {
    return (
      <Panel title={text.steps.results}>
        <Choice text={text} ev={ev} ice={ice} />
        {result.invalidKm ? <Alert><AlertDescription>{text.invalidKm}</AlertDescription></Alert> : null}
        {result.missingPrices.length ? (
          <Alert>
            <AlertTitle>{text.missingPriceTitle}</AlertTitle>
            <AlertDescription>
              {text.missingPriceBody} {result.missingPrices.join(", ")}.
            </AlertDescription>
          </Alert>
        ) : null}
        {result.missingConsumption.length ? (
          <Alert>
            <AlertTitle>{text.missingUseTitle}</AlertTitle>
            <AlertDescription>
              {text.missingUseBody} ({result.missingConsumption.join(", ")}).
            </AlertDescription>
          </Alert>
        ) : null}
      </Panel>
    )
  }

  const money = (amount: number) => formatMoney(shown(amount), display, lang, moneyDigits(amount))
  const evPrice = parsePrice(evPurchase)
  const icePrice = parsePrice(icePurchase)
  const purchaseInvalid =
    (evPurchase.trim() !== "" && evPrice == null) || (icePurchase.trim() !== "" && icePrice == null)
  const purchaseReady = evPrice != null && icePrice != null
  return (
    <Panel title={text.steps.results}>
      <Choice text={text} ev={ev} ice={ice} />
      {purchaseInvalid ? (
        <Alert>
          <AlertDescription>{text.purchaseInvalid}</AlertDescription>
        </Alert>
      ) : purchaseReady ? (
        <BreakevenBlock
          text={text}
          lang={lang}
          currency={display}
          evPrice={evPrice}
          icePrice={icePrice}
          annualEv={result.ev.costYear}
          annualIce={result.ice.costYear}
          shown={shown}
          evSeries={`${text.evSeries} (${cycleOf(ev)})`}
          iceSeries={`${text.iceSeries} (${cycleOf(ice)})`}
        />
      ) : (
        <Alert>
          <AlertTitle>{text.breakevenTitle}</AlertTitle>
          <AlertDescription>{text.purchaseNeeded}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm leading-6">{text.noWinner}</p>
      <p className="text-xs text-muted-foreground">
        {text.fxLine} {formatDate(fxDate, lang)}
        {display === sourceCurrency ? "" : ` · 1 ${sourceCurrency} = ${rate == null ? "—" : formatNumber(rate, lang, 4)} ${display}`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Quantity text={text} lang={lang} title={text.evSeries} vehicle={ev} liters={null} kwh={result.ev.kwhYear} litersPer100={null} kwhPer100={per100(result.ev.kwhYear, kmYear)} gramsPerKm={result.ev.gPerKm} rangeKm={result.ev.rangeKm} electricRangeKm={null} charge={result.ev.charge240} estimated={false} catalog={catalog} />
        <Quantity text={text} lang={lang} title={text.iceSeries} vehicle={ice} liters={result.ice.litersYear} kwh={result.ice.kwhYear || null} litersPer100={per100(result.ice.litersYear, kmYear)} kwhPer100={result.ice.kwhYear > 0 ? per100(result.ice.kwhYear, kmYear) : null} gramsPerKm={result.ice.gPerKm} rangeKm={result.ice.rangeKm} electricRangeKm={result.ice.electricRangeKm} charge={result.ice.charge240} estimated={result.ice.co2Estimated} catalog={catalog} />
      </div>
      <Charts
        copy={text}
        lang={lang}
        currency={display}
        evSeries={`${text.evSeries} (${cycleOf(ev)})`}
        iceSeries={`${text.iceSeries} (${cycleOf(ice)})`}
        year={{ ev: shown(result.ev.costYear), ice: shown(result.ice.costYear) }}
        month={{ ev: shown(result.ev.costMonth), ice: shown(result.ice.costMonth) }}
        per100={{ ev: shown(result.ev.costPer100Km), ice: shown(result.ice.costPer100Km) }}
        energy={{ ev: result.ev.kwhEqPer100Km, ice: result.ice.kwhEqPer100Km }}
        co2={{ ev: result.ev.co2Tonnes, ice: result.ice.co2Tonnes }}
        gPerKm={{ ev: result.ev.gPerKm, ice: result.ice.gPerKm }}
        projection={result.projection.map((row) => ({ year: row.year, ev: shown(row.ev), ice: shown(row.ice) }))}
        evBoundary={text.boundary(result.ev.boundary)}
        iceBoundary={text.boundary(result.ice.boundary)}
      />
      <p className="text-sm">
        {text.evSeries} {money(result.ev.costYear)} {text.perYear} · {money(result.ev.costMonth)} {text.perMonth}
      </p>
      <p className="text-sm">
        {text.iceSeries} {money(result.ice.costYear)} {text.perYear} · {money(result.ice.costMonth)} {text.perMonth}
      </p>
      {result.ice.upstreamSkippedDiesel && upstreamOn(result) ? (
        <p className="text-sm text-muted-foreground">{text.upstreamHelp}</p>
      ) : null}
    </Panel>
  )
}

function Choice({ text, ev, ice }: { text: Copy; ev: Vehicle; ice: Vehicle }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <p className="rounded-lg bg-card px-3 py-2 text-sm leading-5 ring-1 ring-foreground/10">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{text.evSeries}</span>
        <span className="font-medium">{ev.year} {ev.make} {ev.version}</span>
      </p>
      <p className="rounded-lg bg-card px-3 py-2 text-sm leading-5 ring-1 ring-foreground/10">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{text.iceSeries}</span>
        <span className="font-medium">{ice.year} {ice.make} {ice.version}</span>
      </p>
    </div>
  )
}

function BreakevenBlock({
  text,
  lang,
  currency,
  evPrice,
  icePrice,
  annualEv,
  annualIce,
  shown,
  evSeries,
  iceSeries,
}: {
  text: Copy
  lang: Lang
  currency: string
  evPrice: number
  icePrice: number
  annualEv: number
  annualIce: number
  shown: (amount: number) => number
  evSeries: string
  iceSeries: string
}) {
  const point = breakeven(evPrice, icePrice, annualEv, annualIce)
  const series = cumulativeCost(evPrice, icePrice, annualEv, annualIce, point)
  const sentence =
    point.status === "already"
      ? text.breakevenAlready
      : point.status === "equal"
        ? text.breakevenEqual
        : point.status === "never"
          ? text.breakevenNever
          : text.breakevenAt(text.duration(point.years, point.months))
  const money = (value: number) => formatMoney(value, currency, lang, Math.abs(value) >= 100 ? 0 : 2)
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium leading-6">{sentence}</p>
      <BreakevenChart
        copy={text}
        lang={lang}
        currency={currency}
        evSeries={evSeries}
        iceSeries={iceSeries}
        rows={series.rows.map((row) => ({ t: row.t, ev: shown(row.ev), ice: shown(row.ice) }))}
        mark={series.mark ? { t: series.mark.t, cost: shown(series.mark.cost) } : null}
        money={money}
      />
    </div>
  )
}

function ConsumptionField({
  label,
  ariaLabel,
  hint,
  value,
  official,
  edited,
  invalid,
  invalidText,
  yours,
  officialLabel,
  resetLabel,
  onChange,
  onReset,
}: {
  label: string
  ariaLabel: string
  hint: string
  value: string
  official: number | null
  edited: boolean
  invalid: boolean
  invalidText: string
  yours: string
  officialLabel: string
  resetLabel: string
  onChange: (value: string) => void
  onReset: () => void
}) {
  const parsed = parsePrice(value)
  const shownOfficial = official == null ? null : Number(priceInput(official))
  const changed = edited && (shownOfficial == null || parsed == null || Math.abs(parsed - shownOfficial) > 1e-9)
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center justify-between gap-2">
        {label}
        <Badge variant="secondary">{changed || official == null ? yours : officialLabel}</Badge>
      </span>
      <Input aria-label={ariaLabel} inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="flex items-center justify-between gap-2 text-xs leading-5 text-muted-foreground">
        <span>{hint}</span>
        {changed && official != null ? (
          <button type="button" className="shrink-0 underline" onClick={onReset}>
            {resetLabel}
          </button>
        ) : null}
      </span>
      {invalid ? <span className="text-sm text-red-700">{invalidText}</span> : null}
    </label>
  )
}

function PurchaseField({
  label,
  ariaLabel,
  hint,
  value,
  invalid,
  invalidText,
  onChange,
}: {
  label: string
  ariaLabel: string
  hint: string
  value: string
  invalid: boolean
  invalidText: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <Input aria-label={ariaLabel} inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="text-xs leading-5 text-muted-foreground">{hint}</span>
      {invalid ? <span className="text-sm text-amber-950">{invalidText}</span> : null}
    </label>
  )
}

function upstreamOn(result: { ice: { upstreamSkippedDiesel: boolean } }) {
  return result.ice.upstreamSkippedDiesel
}

function per100(total: number, kmYear: number) {
  return kmYear > 0 ? total / (kmYear / 100) : null
}

function cycleOf(vehicle: Vehicle) {
  return vehicle.cycle === "WLTP" ? "WLTP" : "EPA"
}

function Quantity({
  text,
  lang,
  title,
  vehicle,
  liters,
  kwh,
  litersPer100,
  kwhPer100,
  gramsPerKm,
  rangeKm,
  electricRangeKm,
  charge,
  estimated,
  catalog,
}: {
  text: Copy
  lang: Lang
  title: string
  vehicle: Vehicle
  liters: number | null
  kwh: number | null
  litersPer100: number | null
  kwhPer100: number | null
  gramsPerKm: number | null
  rangeKm: number | null
  electricRangeKm: number | null
  charge: number | null
  estimated: boolean
  catalog: CountryCatalogMeta
}) {
  const cycle = cycleOf(vehicle)
  const sourceUrl = vehicle.wltp?.sourceUrl ?? catalog.us.url
  const sourceName = vehicle.wltp?.sourceName ?? catalog.us.source
  const litersRate = litersPer100 ?? vehicle.wltp?.lPer100km ?? null
  const kwhRate = kwhPer100 ?? vehicle.wltp?.kwhPer100km ?? null
  const co2Rate = gramsPerKm ?? vehicle.wltp?.co2GPerKm ?? null
  const rate = [
    litersRate != null && litersRate > 0 ? `${formatNumber(litersRate, lang, 1)} L/100 km` : null,
    kwhRate != null && (vehicle.side === "ev" || kwhRate > 0) ? `${formatNumber(kwhRate, lang, 1)} kWh/100 km` : null,
    co2Rate != null ? `${formatNumber(co2Rate, lang, 0)} g/km` : null,
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm font-medium leading-5">
        {vehicle.year} {vehicle.make} {vehicle.version}
      </p>
      <p className="mt-1 text-sm">
        <Badge variant="secondary">{cycle}</Badge>{" "}
        <a className="underline" href={sourceUrl}>
          {sourceName}
        </a>
        {vehicle.wltp ? ` · ${vehicle.wltp.license}` : null}
      </p>
      {rate ? <p className="mt-1 text-sm leading-5">{rate} · {cycle}</p> : null}
      {liters != null ? (
        <p className="mt-2 font-heading text-2xl">{formatNumber(liters, lang, 0)} <span className="font-sans text-sm">{text.litersYear} · {cycle}</span></p>
      ) : null}
      {kwh != null ? (
        <p className="mt-2 font-heading text-2xl">{formatNumber(kwh, lang, 0)} <span className="font-sans text-sm">{text.kwhYear} · {cycle}</span></p>
      ) : null}
      <p className="mt-1 text-sm text-muted-foreground">
        {text.range}: {rangeKm == null ? text.noRange : `${formatNumber(rangeKm, lang, 0)} km`}
      </p>
      {electricRangeKm != null ? (
        <p className="text-sm text-muted-foreground">
          {text.electricRange}: {formatNumber(electricRangeKm, lang, 0)} km
        </p>
      ) : null}
      {charge != null ? (
        <p className="text-sm text-muted-foreground">
          {text.charge}: {formatNumber(charge, lang, 1)}
        </p>
      ) : null}
      {estimated ? <Badge className="mt-2" variant="secondary">{text.estimated}</Badge> : null}
    </div>
  )
}

function PriceField({
  label,
  value,
  official,
  onChange,
  onReset,
  text,
  date,
  lang,
}: {
  label: string
  value: string
  official: number | null
  onChange: (value: string) => void
  onReset: () => void
  text: Copy
  date: string | null
  lang: Lang
}) {
  const parsed = parsePrice(value)
  const shownOfficial = official == null ? null : Number(priceInput(official))
  const edited = shownOfficial == null ? parsed != null : parsed == null || Math.abs(parsed - shownOfficial) > 1e-9
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center justify-between gap-2">
        {label}
        <Badge variant="secondary">{edited || official == null ? text.yours : text.official}</Badge>
      </span>
      <Input value={value} inputMode="decimal" onChange={(event) => onChange(event.target.value)} placeholder={official == null ? text.missingOfficial : undefined} />
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{date ? formatDate(date, lang) : text.missingOfficial}</span>
        {edited && official != null ? (
          <button type="button" className="underline" onClick={onReset}>
            {text.reset}
          </button>
        ) : null}
      </span>
    </label>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">5</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">{children}</p>
}
