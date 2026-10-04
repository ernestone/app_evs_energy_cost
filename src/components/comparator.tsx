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
import { InfoTip } from "@/components/info-tip"
import { VehiclePicker } from "@/components/vehicle-picker"
import { compare, DEFAULT_CITY_SHARE, DEFAULT_KM_YEAR, electricityBlend, ratesPer100, resolveElectricShare, spendProjection, type ElectricityBlend } from "@/lib/calc"
import { crossRate, formatDate, formatMoney, formatNumber, parsePrice, priceInput } from "@/lib/format"
import { copy, type Copy } from "@/lib/i18n"
import { lookPalette, originClass, type Look, type Origin } from "@/lib/look"
import { readSessionDraft, writeSessionDraft } from "@/lib/session-draft"
import type { Country, CountryCatalogMeta, FxTable, Lang, SnapshotMeta, Vehicle } from "@/lib/types"

const DISPLAY = ["EUR", "USD", "GBP", "CZK", "DKK", "HUF", "PLN", "RON", "SEK"]
const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type PowerRow = { id: string; label: string; percent: string; price: string }

function boxRate(raw: string) {
  if (!raw.trim()) return { value: null as number | null, invalid: false }
  const parsed = parsePrice(raw)
  if (parsed == null) return { value: null, invalid: true }
  return { value: parsed, invalid: false }
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
  const [modelsOpen, setModelsOpen] = useState(false)
  const [look, setLook] = useState<Look>("clara")
  const [plugin, setPlugin] = useState(false)
  const [fuelShare, setFuelShare] = useState("50")
  const [elecShare, setElecShare] = useState("50")
  const [horizon, setHorizon] = useState(5)
  const [ev, setEv] = useState<Vehicle | null>(null)
  const [ice, setIce] = useState<Vehicle | null>(null)
  const [kmYear, setKmYear] = useState(String(DEFAULT_KM_YEAR))
  const [cityPct, setCityPct] = useState(55)
  const [phevMode, setPhevMode] = useState<"epa" | "custom" | "icct26" | "icct56">("epa")
  const [customShare, setCustomShare] = useState<number | null>(null)
  const [upstream, setUpstream] = useState(false)
  const [fuelPrice, setFuelPrice] = useState<"gasoline" | "diesel">("gasoline")
  const [draftReady, setDraftReady] = useState(false)
  const skipCountryDefaults = useRef(false)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    const draft = readSessionDraft()
    if (draft) {
      if (draft.countryCode) skipCountryDefaults.current = true
      setLang(draft.lang)
      setDisplay(draft.display)
      setCountryCode(draft.countryCode)
      setGasoline(draft.gasoline)
      setDiesel(draft.diesel)
      setPowerRows(draft.powerRows)
      setEvPurchase(draft.evPurchase)
      setIcePurchase(draft.icePurchase)
      setEvKwh(draft.evKwh)
      setEvKwhEdited(draft.evKwhEdited)
      setIceLiters(draft.iceLiters)
      setIceLitersEdited(draft.iceLitersEdited)
      setIceKwh(draft.iceKwh)
      setIceKwhEdited(draft.iceKwhEdited)
      setPlugin(draft.plugin)
      setFuelShare(draft.fuelShare)
      setElecShare(draft.elecShare)
      setHorizon(draft.horizon)
      setKmYear(draft.kmYear)
      setCityPct(draft.cityPct)
      setPhevMode(draft.phevMode)
      setCustomShare(draft.customShare)
      setUpstream(draft.upstream)
      setFuelPrice(draft.fuelPrice)
      setEv(draft.ev)
      setIce(draft.ice)
    }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!country) return
    if (skipCountryDefaults.current) {
      skipCountryDefaults.current = false
      return
    }
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
    setModelsOpen(false)
    setPlugin(false)
    setFuelShare("50")
    setElecShare("50")
    setFuelPrice("gasoline")
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

  useEffect(() => {
    if (!draftReady) return
    writeSessionDraft({
      lang,
      display,
      countryCode,
      gasoline,
      diesel,
      powerRows,
      evPurchase,
      icePurchase,
      evKwh,
      evKwhEdited,
      iceLiters,
      iceLitersEdited,
      iceKwh,
      iceKwhEdited,
      plugin,
      fuelShare,
      elecShare,
      horizon: horizon === 10 || horizon === 15 || horizon === 20 ? horizon : 5,
      kmYear,
      cityPct,
      phevMode,
      customShare,
      upstream,
      fuelPrice,
      ev,
      ice,
    })
  }, [
    draftReady,
    lang,
    display,
    countryCode,
    gasoline,
    diesel,
    powerRows,
    evPurchase,
    icePurchase,
    evKwh,
    evKwhEdited,
    iceLiters,
    iceLitersEdited,
    iceKwh,
    iceKwhEdited,
    plugin,
    fuelShare,
    elecShare,
    horizon,
    kmYear,
    cityPct,
    phevMode,
    customShare,
    upstream,
    fuelPrice,
    ev,
    ice,
  ])

  useEffect(() => {
    if (!draftReady || evKwhEdited) return
    const next = priceInput(evOfficialKwh)
    if (next === "" && ev) return
    setEvKwh(next)
  }, [draftReady, evOfficialKwh, evKwhEdited, ev])

  useEffect(() => {
    if (!draftReady || iceLitersEdited) return
    const next = priceInput(iceOfficialLiters)
    if (next === "" && ice) return
    setIceLiters(next)
  }, [draftReady, iceOfficialLiters, iceLitersEdited, ice])

  useEffect(() => {
    if (!draftReady || iceKwhEdited) return
    const next = priceInput(iceOfficialKwh)
    if (next === "" && ice) return
    setIceKwh(next)
  }, [draftReady, iceOfficialKwh, iceKwhEdited, ice])

  const evBox = boxRate(evKwh)
  const iceFuelBox = boxRate(iceLiters)
  const iceKwhBox = boxRate(iceKwh)
  const fuelShareBox = boxRate(fuelShare)
  const elecShareBox = boxRate(elecShare)
  const shareSum = (fuelShareBox.value ?? 0) + (elecShareBox.value ?? 0)
  const sharesInvalid = plugin && (fuelShareBox.invalid || elecShareBox.invalid || fuelShareBox.value == null || elecShareBox.value == null || Math.abs(shareSum - 100) > 0.05)
  const consumptionInvalid = Boolean(country && (evBox.invalid || iceFuelBox.invalid || (plugin && iceKwhBox.invalid)))
  const sharesReady = plugin && !sharesInvalid && fuelShareBox.value != null && elecShareBox.value != null
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
      consumptionFromBoxes: true,
      evKwhPer100: evBox.value,
      iceLitersPer100: iceFuelBox.value,
      iceKwhPer100: plugin ? iceKwhBox.value : null,
      motorShares: sharesReady ? { fuel: fuelShareBox.value as number, electric: elecShareBox.value as number } : null,
      fuelPrice,
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

  const evFromEpa = Boolean(ev && ev.cycle !== "WLTP" && !evKwhEdited && evOfficialKwh != null)
  const iceFromEpa = Boolean(ice && ice.cycle !== "WLTP" && !iceLitersEdited && iceOfficialLiters != null)
  const pluginFromEpa = Boolean(plugin && ice && ice.cycle !== "WLTP" && !iceKwhEdited && iceOfficialKwh != null)
  const epaShareAfter = pluginFromEpa ? "plugin" : iceFromEpa ? "ice" : evFromEpa ? "ev" : null

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

  function chooseEv(vehicle: Vehicle | null) {
    setEvKwhEdited(false)
    setEv(vehicle)
  }

  function chooseIce(vehicle: Vehicle | null) {
    setIceLitersEdited(false)
    setIceKwhEdited(false)
    setPhevMode("epa")
    setCustomShare(null)
    setIce(vehicle)
    if (vehicle) setFuelPrice(vehicle.fuel === "diesel" ? "diesel" : "gasoline")
  }

  return (
    <div data-style={look} className="bg-background text-foreground lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <header className="shrink-0 border-b border-border/80">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-2xl font-semibold tracking-tight">{text.name}</p>
            <p className="max-w-2xl text-sm leading-5 text-muted-foreground">{text.tagline}</p>
            <p className="max-w-2xl text-sm leading-5">{text.notTco}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-lg bg-card p-0.5 ring-1 ring-foreground/10" role="group" aria-label={text.styleLabel}>
              {(["clara", "tinta", "contraste"] as const).map((name) => (
                <Button key={name} type="button" size="sm" variant={look === name ? "default" : "ghost"} aria-pressed={look === name} onClick={() => setLook(name)}>
                  {name === "clara" ? "Clara" : name === "tinta" ? "Tinta" : "Contraste"}
                </Button>
              ))}
            </div>
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
          <Group title={text.steps.country} info={<InfoTip label={text.infoAbout(text.steps.country)}>{text.countryHint}</InfoTip>}>
            <select
              className={fieldClass}
              value={countryCode}
              aria-label={text.steps.country}
              onChange={(event) => setCountryCode(event.target.value)}
            >
              <option value="">{text.chooseCountry}</option>
              {ordered.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name[lang]}
                </option>
              ))}
            </select>
          </Group>

          {country ? (
            <Group title={text.steps.prices}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PriceField
                    label={`${text.gasoline} (${sourceCurrency} ${text.perLiter})`}
                    value={gasoline}
                    official={country.gasolinePerLiter}
                    onChange={setGasoline}
                    onReset={() => setGasoline(priceInput(country.gasolinePerLiter))}
                    text={text}
                    date={country.gasoline.date}
                    note={country.gasoline.note}
                    lang={lang}
                    look={look}
                  />
                  <PriceField
                    label={`${text.diesel} (${sourceCurrency} ${text.perLiter})`}
                    value={diesel}
                    official={country.dieselPerLiter}
                    onChange={setDiesel}
                    onReset={() => setDiesel(priceInput(country.dieselPerLiter))}
                    text={text}
                    date={country.diesel.date}
                    note={country.diesel.note}
                    lang={lang}
                    look={look}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{text.powerBlend}</p>
                    <InfoTip label={text.infoAbout(text.powerBlend)}>
                      {text.powerBlendHelp}
                      {country.electricity.date ? ` ${text.homePower}: ${formatDate(country.electricity.date, lang)}. ${country.electricity.note}` : ""}
                    </InfoTip>
                  </div>
                  {powerRows.map((row) => (
                    <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_5rem_minmax(0,1fr)_auto] sm:items-end">
                      <label className="grid gap-1 text-sm">
                        {text.powerLabel}
                        <Input
                          value={row.label}
                          aria-label={text.powerLabel}
                          className={originClass(look, "typed")}
                          onChange={(event) => updatePower(row.id, { label: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        {text.powerPercent}
                        <Input
                          inputMode="decimal"
                          value={row.percent}
                          aria-label={text.powerPercent}
                          className={originClass(look, "typed")}
                          onChange={(event) => updatePower(row.id, { percent: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        {`${text.electricity} (${sourceCurrency} ${text.perKwh})`}
                        <Input
                          inputMode="decimal"
                          value={row.price}
                          aria-label={text.electricity}
                          data-origin={row.price === priceInput(country.electricityPerKwh) ? "official" : "typed"}
                          className={originClass(look, row.price === priceInput(country.electricityPerKwh) ? "official" : "typed")}
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
                </div>
                <p className="flex items-center gap-2 text-sm leading-6">
                  <span className={`rounded-md px-2 py-1 ${originClass(look, "official")}`}>
                    {text.gridLabel}:{" "}
                    <strong>
                      {formatNumber(country.grid.gPerKwh, lang, 1)} {text.gridUnit}
                    </strong>
                  </span>
                  <InfoTip label={text.infoAbout(text.gridLabel)}>
                    {country.grid.year}. {country.grid.note}
                  </InfoTip>
                </p>
            </Group>
          ) : null}

          <Group title={text.steps.use}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                {text.kmYear}
                <Input
                  inputMode="decimal"
                  aria-label={text.kmYear}
                  value={kmYear}
                  className={originClass(look, "typed")}
                  onChange={(event) => setKmYear(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                {text.kmMonth}
                <Input
                  inputMode="decimal"
                  aria-label={text.kmMonth}
                  value={Number.isFinite(km) ? String(Math.round((km / 12) * 10) / 10) : ""}
                  className={originClass(look, "typed")}
                  onChange={(event) => {
                    const month = Number(event.target.value.replace(",", "."))
                    if (Number.isFinite(month)) setKmYear(String(Math.round(month * 12)))
                  }}
                />
              </label>
            </div>
            {country ? (
              <div className="grid gap-3">
                <ConsumptionField
                  label={`${text.kwhPer100} · ${text.evSeries}`}
                  ariaLabel={`${text.kwhPer100} ${text.evSeries}`}
                  hint={text.consumptionHint}
                  value={evKwh}
                  official={evOfficialKwh}
                  edited={evKwhEdited}
                  invalid={evBox.invalid}
                  invalidText={text.consumptionInvalid}
                  resetLabel={text.reset}
                  look={look}
                  onChange={(value) => {
                    setEvKwhEdited(true)
                    setEvKwh(value)
                  }}
                  onReset={() => setEvKwhEdited(false)}
                />
                {epaShareAfter === "ev" ? (
                  <CityShare cityPct={cityPct} onChange={setCityPct} text={text} mixedWltp={ice?.cycle === "WLTP"} />
                ) : null}
                <div className="grid gap-3 rounded-xl border border-border bg-card p-3">
                  <ConsumptionField
                    label={`${text.litersPer100} · ${text.iceSeries}`}
                    ariaLabel={`${text.litersPer100} ${text.iceSeries}`}
                    hint={text.consumptionHint}
                    value={iceLiters}
                    official={iceOfficialLiters}
                    edited={iceLitersEdited}
                    invalid={iceFuelBox.invalid}
                    invalidText={text.consumptionInvalid}
                    resetLabel={text.reset}
                    look={look}
                    onChange={(value) => {
                      setIceLitersEdited(true)
                      setIceLiters(value)
                    }}
                    onReset={() => setIceLitersEdited(false)}
                  />
                  {epaShareAfter === "ice" ? (
                    <CityShare cityPct={cityPct} onChange={setCityPct} text={text} mixedWltp={ev?.cycle === "WLTP"} />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{text.fuelChoice}</span>
                    {(["gasoline", "diesel"] as const).map((kind) => (
                      <Button
                        key={kind}
                        type="button"
                        size="sm"
                        variant={fuelPrice === kind ? "default" : "outline"}
                        aria-pressed={fuelPrice === kind}
                        onClick={() => setFuelPrice(kind)}
                      >
                        {kind === "diesel" ? text.diesel : text.gasoline}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm leading-6">
                    {text.fuelInUse(fuelPrice, fuelPriceLabel(fuelPrice === "diesel" ? diesel : gasoline, sourceCurrency, lang, text.perLiter))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="plugin" checked={plugin} onCheckedChange={setPlugin} />
                  <Label htmlFor="plugin">{text.pluginToggle}</Label>
                  <InfoTip label={text.infoAbout(text.pluginToggle)}>{text.pluginHelp}</InfoTip>
                </div>
                {plugin ? (
                  <div className="grid gap-3">
                    <ConsumptionField
                      label={`${text.kwhPer100} · ${text.iceSeries}`}
                      ariaLabel={`${text.kwhPer100} ${text.iceSeries}`}
                      hint={text.pluginHelp}
                      value={iceKwh}
                      official={iceOfficialKwh}
                      edited={iceKwhEdited}
                      invalid={iceKwhBox.invalid}
                      invalidText={text.consumptionInvalid}
                      resetLabel={text.reset}
                      look={look}
                      onChange={(value) => {
                        setIceKwhEdited(true)
                        setIceKwh(value)
                      }}
                      onReset={() => setIceKwhEdited(false)}
                    />
                    {epaShareAfter === "plugin" ? (
                      <CityShare cityPct={cityPct} onChange={setCityPct} text={text} mixedWltp={ev?.cycle === "WLTP"} />
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        {text.fuelShare}
                        <Input
                          inputMode="decimal"
                          aria-label={text.fuelShare}
                          value={fuelShare}
                          className={originClass(look, "typed")}
                          onChange={(event) => setFuelShare(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        {text.electricShare}
                        <Input
                          inputMode="decimal"
                          aria-label={text.electricShare}
                          value={elecShare}
                          className={originClass(look, "typed")}
                          onChange={(event) => setElecShare(event.target.value)}
                        />
                      </label>
                    </div>
                    <p className="text-sm">{text.percentSum(formatNumber(shareSum, lang, 1))}</p>
                    {sharesInvalid ? (
                      <Alert>
                        <AlertTitle>{text.pluginToggle}</AlertTitle>
                        <AlertDescription>{text.percentMismatch}</AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <PurchaseField
                    label={`${text.purchase} · ${text.evSeries} (${sourceCurrency})`}
                    ariaLabel={`${text.purchase} ${text.evSeries}`}
                    hint={text.purchaseHint}
                    value={evPurchase}
                    invalid={evPurchase.trim() !== "" && parsePrice(evPurchase) == null}
                    invalidText={text.purchaseInvalid}
                    look={look}
                    onChange={setEvPurchase}
                  />
                  <PurchaseField
                    label={`${text.purchase} · ${text.iceSeries} (${sourceCurrency})`}
                    ariaLabel={`${text.purchase} ${text.iceSeries}`}
                    hint={text.purchaseHint}
                    value={icePurchase}
                    invalid={icePurchase.trim() !== "" && parsePrice(icePurchase) == null}
                    invalidText={text.purchaseInvalid}
                    look={look}
                    onChange={setIcePurchase}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={upstream} onCheckedChange={setUpstream} id="upstream" />
                  <Label htmlFor="upstream">{text.upstream}</Label>
                  <InfoTip label={text.infoAbout(text.upstream)}>{text.upstreamHelp}</InfoTip>
                </div>
              </div>
            ) : null}
          </Group>

          <Group title={text.steps.models} info={<InfoTip label={text.infoAbout(text.steps.models)}>{text.modelOptional}</InfoTip>}>
            <Button type="button" variant="outline" size="sm" aria-expanded={modelsOpen} onClick={() => setModelsOpen((open) => !open)}>
              {modelsOpen ? text.hideModels : text.showModels}
            </Button>
            {ev && !modelsOpen ? (
              <p className="text-sm">
                {text.evSeries}: {ev.year} {ev.make} {ev.version}{" "}
                <button type="button" className="underline" onClick={() => chooseEv(null)}>
                  {text.clearModel}
                </button>
              </p>
            ) : null}
            {ice && !modelsOpen ? (
              <p className="text-sm">
                {text.iceSeries}: {ice.year} {ice.make} {ice.version}{" "}
                <button type="button" className="underline" onClick={() => chooseIce(null)}>
                  {text.clearModel}
                </button>
              </p>
            ) : null}
            {modelsOpen ? (
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <p className="text-sm font-medium">{text.steps.ev}</p>
                  <VehiclePicker key={`ev-${countryCode}`} side="ev" country={countryCode} copy={text} selected={ev} onSelect={chooseEv} />
                </div>
                <div className="grid gap-3">
                  <p className="text-sm font-medium">{text.steps.ice}</p>
                  <VehiclePicker key={`ice-${countryCode}`} side="ice" country={countryCode} copy={text} selected={ice} onSelect={chooseIce} />
                  {ice?.fuel === "premium" ? <Notice>{text.premiumWarn}</Notice> : null}
                  {ice?.powertrain === "ffv" ? <Notice>{text.ffvNote}</Notice> : null}
                  {ice?.powertrain === "phev" && ice.cycle !== "WLTP" && shareInfo ? (
                    <div className="grid gap-3 rounded-lg bg-secondary/60 p-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {text.phevTitle}
                        <InfoTip label={text.infoAbout(text.phevTitle)}>{text.phevAssumption}</InfoTip>
                      </p>
                      <select className={fieldClass} value={phevMode} onChange={(event) => setPhevMode(event.target.value as typeof phevMode)}>
                        <option value="epa">{text.phevEpa}</option>
                        <option value="custom">{text.phevCustom}</option>
                        <option value="icct26">{text.phevIcct26}</option>
                        <option value="icct56">{text.phevIcct56}</option>
                      </select>
                      <p className="text-sm">
                        {text.officialUf}: {formatNumber(shareInfo.official * 100, lang, 1)} %. {text.phevShare}:{" "}
                        {formatNumber(shareInfo.share * 100, lang, 1)} %.
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
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Group>
        </div>

        <section className="order-3 pb-8 lg:order-none lg:pb-2" id="sources">
        <Group title={text.steps.sources}>
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
        </Group>
        </section>
        </div>

        <aside className="order-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pl-1">
          <Results
            text={text}
            lang={lang}
            result={result}
            blend={blend}
            consumptionInvalid={consumptionInvalid}
            sharesInvalid={sharesInvalid}
            shareSum={shareSum}
            horizon={horizon}
            onHorizon={setHorizon}
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
            look={look}
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
  sharesInvalid,
  shareSum,
  horizon,
  onHorizon,
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
  look,
}: {
  text: Copy
  lang: Lang
  result: ReturnType<typeof compare>
  blend: ElectricityBlend
  consumptionInvalid: boolean
  sharesInvalid: boolean
  shareSum: number
  horizon: number
  onHorizon: (years: number) => void
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
  look: Look
}) {
  const palette = lookPalette(look)
  if (!country) {
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
  if (sharesInvalid) {
    return (
      <Panel title={text.steps.results}>
        <Choice text={text} ev={ev} ice={ice} />
        <Alert>
          <AlertTitle>{text.pluginToggle}</AlertTitle>
          <AlertDescription>
            {text.percentSum(formatNumber(shareSum, lang, 1))} {text.percentMismatch}
          </AlertDescription>
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
      <SavingsBoxes
        text={text}
        lang={lang}
        currency={display}
        horizon={horizon}
        purchaseReady={purchaseReady}
        evPrice={evPrice}
        icePrice={icePrice}
        annualEv={result.ev.costYear}
        annualIce={result.ice.costYear}
        monthEv={result.ev.costMonth}
        monthIce={result.ice.costMonth}
        shown={shown}
        savingsColor={palette.savings}
      />
      <Choice text={text} ev={ev} ice={ice} />
      {purchaseInvalid ? <Alert><AlertDescription>{text.purchaseInvalid}</AlertDescription></Alert> : null}
      <SpendBlock
        text={text}
        lang={lang}
        currency={display}
        horizon={horizon}
        onHorizon={onHorizon}
        purchaseReady={purchaseReady}
        evPrice={evPrice}
        icePrice={icePrice}
        annualEv={result.ev.costYear}
        annualIce={result.ice.costYear}
        shown={shown}
        evSeries={text.evSeries}
        iceSeries={text.iceSeries}
        evColor={palette.ev}
        iceColor={palette.ice}
      />
      <p className="text-sm leading-6">{text.noWinner}</p>
      <p className="text-xs text-muted-foreground">
        {text.fxLine} {formatDate(fxDate, lang)}
        {display === sourceCurrency ? "" : ` · 1 ${sourceCurrency} = ${rate == null ? "—" : formatNumber(rate, lang, 4)} ${display}`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ev ? (
          <Quantity text={text} lang={lang} title={text.evSeries} vehicle={ev} liters={null} kwh={result.ev.kwhYear} litersPer100={null} kwhPer100={per100(result.ev.kwhYear, kmYear)} gramsPerKm={result.ev.gPerKm} rangeKm={result.ev.rangeKm} electricRangeKm={null} charge={result.ev.charge240} estimated={false} catalog={catalog} />
        ) : (
          <PlainUse text={text} lang={lang} title={text.evSeries} rate={per100(result.ev.kwhYear, kmYear)} unit="kWh/100 km" year={result.ev.kwhYear} yearUnit={text.kwhYear} />
        )}
        {ice ? (
          <Quantity text={text} lang={lang} title={text.iceSeries} vehicle={ice} liters={result.ice.litersYear} kwh={result.ice.kwhYear || null} litersPer100={per100(result.ice.litersYear, kmYear)} kwhPer100={result.ice.kwhYear > 0 ? per100(result.ice.kwhYear, kmYear) : null} gramsPerKm={result.ice.gPerKm} rangeKm={result.ice.rangeKm} electricRangeKm={result.ice.electricRangeKm} charge={result.ice.charge240} estimated={result.ice.co2Estimated} catalog={catalog} />
        ) : (
          <PlainUse text={text} lang={lang} title={text.iceSeries} rate={per100(result.ice.litersYear, kmYear)} unit="L/100 km" year={result.ice.litersYear} yearUnit={text.litersYear} />
        )}
      </div>
      <Charts
        copy={text}
        lang={lang}
        currency={display}
        evSeries={ev ? `${text.evSeries} (${cycleOf(ev)})` : text.evSeries}
        iceSeries={ice ? `${text.iceSeries} (${cycleOf(ice)})` : text.iceSeries}
        year={{ ev: shown(result.ev.costYear), ice: shown(result.ice.costYear) }}
        month={{ ev: shown(result.ev.costMonth), ice: shown(result.ice.costMonth) }}
        per100={{ ev: shown(result.ev.costPer100Km), ice: shown(result.ice.costPer100Km) }}
        energy={{ ev: result.ev.kwhEqPer100Km, ice: result.ice.kwhEqPer100Km }}
        co2={{ ev: result.ev.co2Tonnes, ice: result.ice.co2Tonnes }}
        gPerKm={{ ev: result.ev.gPerKm, ice: result.ice.gPerKm }}
        evBoundary={text.boundary(result.ev.boundary)}
        iceBoundary={text.boundary(result.ice.boundary)}
        evColor={palette.ev}
        iceColor={palette.ice}
      />
      <p className="text-sm">
        {text.evSeries} {money(result.ev.costYear)} {text.perYear} · {money(result.ev.costMonth)} {text.perMonth}
      </p>
      <p className="text-sm">
        {text.iceSeries} {money(result.ice.costYear)} {text.perYear} · {money(result.ice.costMonth)} {text.perMonth}
      </p>
      {result.ice.upstreamSkippedDiesel && upstreamOn(result) ? (
        <p className="flex items-center gap-2 text-sm">
          {text.upstream}
          <InfoTip label={text.infoAbout(text.upstream)}>{text.upstreamHelp}</InfoTip>
        </p>
      ) : null}
    </Panel>
  )
}

function Choice({ text, ev, ice }: { text: Copy; ev: Vehicle | null; ice: Vehicle | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-5">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{text.evSeries}</span>
        <span className="font-medium">{ev ? `${ev.year} ${ev.make} ${ev.version}` : text.noModel}</span>
      </p>
      <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-5">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{text.iceSeries}</span>
        <span className="font-medium">{ice ? `${ice.year} ${ice.make} ${ice.version}` : text.noModel}</span>
      </p>
    </div>
  )
}

function SavingsBoxes({
  text,
  lang,
  currency,
  horizon,
  purchaseReady,
  evPrice,
  icePrice,
  annualEv,
  annualIce,
  monthEv,
  monthIce,
  shown,
  savingsColor,
}: {
  text: Copy
  lang: Lang
  currency: string
  horizon: number
  purchaseReady: boolean
  evPrice: number | null
  icePrice: number | null
  annualEv: number
  annualIce: number
  monthEv: number
  monthIce: number
  shown: (amount: number) => number
  savingsColor: string
}) {
  const series = spendProjection(purchaseReady ? evPrice : null, purchaseReady ? icePrice : null, annualEv, annualIce, horizon)
  const atHorizon = series.rows.find((row) => row.t === horizon) ?? series.rows[series.rows.length - 1]
  const money = (amount: number) => formatMoney(amount, currency, lang, Math.abs(amount) >= 100 ? 0 : 2)
  const figures = [
    { key: "month", amount: shown(monthIce - monthEv), label: (extra: boolean) => (extra ? text.extraMonth : text.savingsMonth) },
    { key: "year", amount: shown(annualIce - annualEv), label: (extra: boolean) => (extra ? text.extraYear : text.savingsYear) },
    {
      key: "horizon",
      amount: shown((atHorizon?.ice ?? 0) - (atHorizon?.ev ?? 0)),
      label: (extra: boolean) => (extra ? text.extraHorizon(horizon) : text.savingsHorizon(horizon)),
    },
  ]
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {figures.map((figure) => {
          const extra = figure.amount < -0.005
          return (
            <article key={figure.key} className="rounded-xl border border-border bg-card px-4 py-4" data-saving={figure.key}>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {figure.label(extra)}
                {figure.key === "horizon" ? (
                  <InfoTip label={text.infoAbout(figure.label(extra))}>
                    {series.includesPurchase ? text.savingsWithPurchase : text.savingsWithoutPurchase}
                  </InfoTip>
                ) : null}
              </p>
              <p data-figure className="mt-2 font-heading text-4xl font-semibold tracking-tight" style={{ color: savingsColor }}>
                {money(figure.amount)}
              </p>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function CityShare({
  cityPct,
  onChange,
  text,
  mixedWltp,
}: {
  cityPct: number
  onChange: (value: number) => void
  text: Copy
  mixedWltp: boolean
}) {
  return (
    <div className="grid gap-2" data-epa-share>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>
          {text.city} {cityPct}%
        </span>
        <span className="flex items-center gap-2">
          {text.highway} {100 - cityPct}%
          <InfoTip label={text.infoAbout(text.city)}>{text.splitNote}</InfoTip>
        </span>
      </div>
      <Slider min={0} max={100} value={[cityPct]} onValueChange={(value) => onChange(Array.isArray(value) ? value[0] : value)} />
      {mixedWltp ? <p className="text-sm leading-6">{text.splitSkipped}</p> : null}
      {cityPct !== 55 ? <p className="text-sm">{text.splitChanged}</p> : null}
    </div>
  )
}

function fuelPriceLabel(raw: string, currency: string, lang: Lang, perLiter: string) {
  const parsed = parsePrice(raw)
  if (parsed == null) return "—"
  return `${formatNumber(parsed, lang, 3)} ${currency} ${perLiter}`
}

function SpendBlock({
  text,
  lang,
  currency,
  horizon,
  onHorizon,
  purchaseReady,
  evPrice,
  icePrice,
  annualEv,
  annualIce,
  shown,
  evSeries,
  iceSeries,
  evColor,
  iceColor,
}: {
  text: Copy
  lang: Lang
  currency: string
  horizon: number
  onHorizon: (years: number) => void
  purchaseReady: boolean
  evPrice: number | null
  icePrice: number | null
  annualEv: number
  annualIce: number
  shown: (amount: number) => number
  evSeries: string
  iceSeries: string
  evColor: string
  iceColor: string
}) {
  const series = spendProjection(purchaseReady ? evPrice : null, purchaseReady ? icePrice : null, annualEv, annualIce, horizon)
  const point = series.point
  const sentence = !series.includesPurchase
    ? text.projectionEnergyOnly
    : point?.status === "already"
      ? text.breakevenAlready
      : point?.status === "equal"
        ? text.breakevenEqual
        : point?.status === "never"
          ? text.breakevenNever
          : point?.status === "at"
            ? text.breakevenAt(text.duration(point.years, point.months))
            : text.projectionEnergyOnly
  const money = (value: number) => formatMoney(value, currency, lang, Math.abs(value) >= 100 ? 0 : 2)
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{text.horizonLabel}</span>
        {[5, 10, 15, 20].map((years) => (
          <Button key={years} type="button" size="sm" variant={horizon === years ? "default" : "outline"} aria-pressed={horizon === years} onClick={() => onHorizon(years)}>
            {years} {text.yearsWord}
          </Button>
        ))}
      </div>
      <p className="text-sm font-medium leading-6">{sentence}</p>
      <BreakevenChart
        copy={text}
        lang={lang}
        currency={currency}
        title={text.projectionTitle}
        note={series.includesPurchase ? text.breakevenNote : text.projectionNote}
        evSeries={evSeries}
        iceSeries={iceSeries}
        rows={series.rows.map((row) => ({ t: row.t, ev: shown(row.ev), ice: shown(row.ice) }))}
        mark={series.mark ? { t: series.mark.t, cost: shown(series.mark.cost) } : null}
        money={money}
        evColor={evColor}
        iceColor={iceColor}
      />
    </div>
  )
}

function PlainUse({
  text,
  lang,
  title,
  rate,
  unit,
  year,
  yearUnit,
}: {
  text: Copy
  lang: Lang
  title: string
  rate: number | null
  unit: string
  year: number
  yearUnit: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm font-medium">{text.noModel}</p>
      <p className="mt-1 text-sm">{rate == null ? "—" : `${formatNumber(rate, lang, 1)} ${unit}`}</p>
      <p className="mt-2 font-heading text-2xl font-semibold">{formatNumber(year, lang, 0)} <span className="font-sans text-sm font-normal">{yearUnit}</span></p>
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
  resetLabel,
  look,
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
  resetLabel: string
  look: Look
  onChange: (value: string) => void
  onReset: () => void
}) {
  const origin = consumptionOrigin(value, official, edited)
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center gap-2">
        {label}
        <InfoTip label={ariaLabel}>{hint}</InfoTip>
      </span>
      <Input
        aria-label={ariaLabel}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        data-origin={origin}
        className={originClass(look, origin)}
        onChange={(event) => onChange(event.target.value)}
      />
      {edited && official != null ? (
        <button type="button" className="justify-self-start text-xs underline" onClick={onReset}>
          {resetLabel}
        </button>
      ) : null}
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
  look,
  onChange,
}: {
  label: string
  ariaLabel: string
  hint: string
  value: string
  invalid: boolean
  invalidText: string
  look: Look
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center gap-2">
        {label}
        <InfoTip label={ariaLabel}>{hint}</InfoTip>
      </span>
      <Input
        aria-label={ariaLabel}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        data-origin="typed"
        className={originClass(look, "typed")}
        onChange={(event) => onChange(event.target.value)}
      />
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
  note,
  lang,
  look,
}: {
  label: string
  value: string
  official: number | null
  onChange: (value: string) => void
  onReset: () => void
  text: Copy
  date: string | null
  note: string
  lang: Lang
  look: Look
}) {
  const origin = priceOrigin(value, official)
  const source = [date ? formatDate(date, lang) : text.missingOfficial, note].filter(Boolean).join(". ")
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center gap-2">
        {label}
        <InfoTip label={text.infoAbout(label)}>{source}</InfoTip>
      </span>
      <Input
        value={value}
        inputMode="decimal"
        data-origin={origin}
        className={originClass(look, origin)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={official == null ? text.missingOfficial : undefined}
      />
      {origin === "typed" && official != null ? (
        <button type="button" className="justify-self-start text-xs underline" onClick={onReset}>
          {text.reset}
        </button>
      ) : null}
    </label>
  )
}

function Group({ title, info, children }: { title: string; info?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
        {title}
        {info}
      </h2>
      {children}
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function consumptionOrigin(value: string, official: number | null, edited: boolean): Origin {
  if (official == null || edited) return "typed"
  return valueOrigin(value, official, true)
}

function priceOrigin(value: string, official: number | null): Origin {
  return valueOrigin(value, official, false)
}

function valueOrigin(value: string, official: number | null, fromModel: boolean): Origin {
  const parsed = parsePrice(value)
  if (official == null) return "typed"
  const shown = Number(priceInput(official))
  const matches = parsed != null && Math.abs(parsed - shown) < 1e-9
  if (!matches) return "typed"
  return fromModel ? "model" : "official"
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">{children}</p>
}
