"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Charts } from "@/components/charts"
import { VehiclePicker } from "@/components/vehicle-picker"
import { compare, DEFAULT_CITY_SHARE, DEFAULT_KM_YEAR, resolveElectricShare } from "@/lib/calc"
import { crossRate, formatDate, formatMoney, formatNumber, parsePrice, priceInput } from "@/lib/format"
import { copy, type Copy } from "@/lib/i18n"
import type { Country, FxTable, Lang, SnapshotMeta, Vehicle } from "@/lib/types"

const DISPLAY = ["EUR", "USD", "GBP", "CZK", "DKK", "HUF", "PLN", "RON", "SEK"]
const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function Comparator({
  countries,
  fx,
  meta,
}: {
  countries: Country[]
  fx: FxTable
  meta: SnapshotMeta
}) {
  const [lang, setLang] = useState<Lang>("es")
  const text = copy(lang)
  const [display, setDisplay] = useState("EUR")
  const [countryCode, setCountryCode] = useState("")
  const country = countries.find((item) => item.code === countryCode) ?? null
  const [gasoline, setGasoline] = useState("")
  const [diesel, setDiesel] = useState("")
  const [electricity, setElectricity] = useState("")
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
    setElectricity(priceInput(country.electricityPerKwh))
    setDisplay(country.currency)
  }, [country])

  const km = Number(kmYear)
  const result = compare(
    ev,
    ice,
    {
      gasolinePerLiter: parsePrice(gasoline),
      dieselPerLiter: parsePrice(diesel),
      electricityPerKwh: parsePrice(electricity),
      gridGPerKwh: country?.grid.gPerKwh ?? null,
    },
    {
      kmYear: km,
      cityShare: cityPct / 100,
      phevMode,
      customElectricShare: customShare,
      upstream,
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

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-heading text-3xl tracking-tight">{text.name}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{text.tagline}</p>
            <p className="mt-1 max-w-xl text-sm leading-6">{text.notTco}</p>
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

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.92fr)] lg:items-start">
        <div className="grid gap-5">
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
                  <PriceField
                    label={`${text.electricity} (${sourceCurrency} ${text.perKwh})`}
                    value={electricity}
                    official={country.electricityPerKwh}
                    onChange={setElectricity}
                    onReset={() => setElectricity(priceInput(country.electricityPerKwh))}
                    text={text}
                    date={country.electricity.date}
                    lang={lang}
                  />
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
            <VehiclePicker side="ev" copy={text} selected={ev} onSelect={setEv} />
          </Step>

          <Step n={3} title={text.steps.ice}>
            <p className="text-sm text-muted-foreground">{text.iceNote}</p>
            <VehiclePicker side="ice" copy={text} selected={ice} onSelect={(vehicle) => {
              setIce(vehicle)
              setPhevMode("epa")
              setCustomShare(null)
            }} />
            {ice?.fuel === "premium" ? <Notice>{text.premiumWarn}</Notice> : null}
            {ice?.powertrain === "ffv" ? <Notice>{text.ffvNote}</Notice> : null}
            {ice?.powertrain === "phev" && shareInfo ? (
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
                onValueChange={(value) => setCityPct(Array.isArray(value) ? value[0] : value)}
              />
              <p className="text-sm leading-6 text-muted-foreground">{text.splitNote}</p>
              {cityPct !== 55 ? <p className="text-sm">{text.splitChanged}</p> : null}
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

        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <Results
            text={text}
            lang={lang}
            result={result}
            display={display}
            sourceCurrency={sourceCurrency}
            rate={rate}
            fxDate={fx.date}
            shown={shown}
            moneyDigits={moneyDigits}
            ev={ev}
            ice={ice}
            country={country}
          />
        </aside>
      </main>

      <section className="mx-auto max-w-6xl px-4 pb-12" id="sources">
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
  )
}

function Results({
  text,
  lang,
  result,
  display,
  sourceCurrency,
  rate,
  fxDate,
  shown,
  moneyDigits,
  ev,
  ice,
  country,
}: {
  text: Copy
  lang: Lang
  result: ReturnType<typeof compare>
  display: string
  sourceCurrency: string
  rate: number | null
  fxDate: string
  shown: (amount: number) => number
  moneyDigits: (amount: number) => number
  ev: Vehicle | null
  ice: Vehicle | null
  country: Country | null
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
  if (!result.ok) {
    return (
      <Panel title={text.steps.results}>
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
  return (
    <Panel title={text.steps.results}>
      <p className="text-sm leading-6">{text.noWinner}</p>
      <p className="text-xs text-muted-foreground">
        {text.fxLine} {formatDate(fxDate, lang)}
        {display === sourceCurrency ? "" : ` · 1 ${sourceCurrency} = ${rate == null ? "—" : formatNumber(rate, lang, 4)} ${display}`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Quantity text={text} lang={lang} title={text.evSeries} name={`${ev.year} ${ev.make} ${ev.version}`} liters={null} kwh={result.ev.kwhYear} rangeKm={result.ev.rangeKm} electricRangeKm={null} charge={result.ev.charge240} estimated={false} />
        <Quantity text={text} lang={lang} title={text.iceSeries} name={`${ice.year} ${ice.make} ${ice.version}`} liters={result.ice.litersYear} kwh={result.ice.kwhYear || null} rangeKm={result.ice.rangeKm} electricRangeKm={result.ice.electricRangeKm} charge={result.ice.charge240} estimated={result.ice.co2Estimated} />
      </div>
      <Charts
        copy={text}
        lang={lang}
        currency={display}
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

function upstreamOn(result: { ice: { upstreamSkippedDiesel: boolean } }) {
  return result.ice.upstreamSkippedDiesel
}

function Quantity({
  text,
  lang,
  title,
  name,
  liters,
  kwh,
  rangeKm,
  electricRangeKm,
  charge,
  estimated,
}: {
  text: Copy
  lang: Lang
  title: string
  name: string
  liters: number | null
  kwh: number | null
  rangeKm: number | null
  electricRangeKm: number | null
  charge: number | null
  estimated: boolean
}) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm font-medium leading-5">{name}</p>
      {liters != null ? (
        <p className="mt-2 font-heading text-2xl">{formatNumber(liters, lang, 0)} <span className="font-sans text-sm">{text.litersYear}</span></p>
      ) : null}
      {kwh != null ? (
        <p className="mt-2 font-heading text-2xl">{formatNumber(kwh, lang, 0)} <span className="font-sans text-sm">{text.kwhYear}</span></p>
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
    <section className="grid gap-3 rounded-2xl bg-card/70 p-4 ring-1 ring-foreground/10">
      <h2 className="flex items-center gap-2 font-heading text-2xl">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl bg-[#ebe4d4] p-4 ring-1 ring-foreground/10">
      <h2 className="flex items-center gap-2 font-heading text-2xl">
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
