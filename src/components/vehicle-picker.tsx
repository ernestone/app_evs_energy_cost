"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { SearchSelect } from "@/components/search-select"
import type { Copy } from "@/lib/i18n"
import type { Side, Vehicle } from "@/lib/types"

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface ModelOption {
  id: string
  label: string
  powertrain?: keyof Copy["powertrain"]
}

interface Failure {
  source: string
  url: string
  detail: string
}

interface EpaResolution {
  resolution: "epa"
  catalogName: string
  epaMake: string
  epaModel: string
  namesDiffer: boolean
  years: number[]
  sourceUrl: string
  sourceName: string
}

interface WltpResolution {
  resolution: "wltp"
  vehicle: Vehicle
}

export function VehiclePicker({
  side,
  country,
  copy,
  selected,
  onSelect,
}: {
  side: Side
  country: string
  copy: Copy
  selected: Vehicle | null
  onSelect: (vehicle: Vehicle | null) => void
}) {
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [years, setYears] = useState<number[]>([])
  const [trims, setTrims] = useState<{ id: number; label: string }[]>([])
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [year, setYear] = useState("")
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [epaNote, setEpaNote] = useState<EpaResolution | null>(null)
  const epaNoteRef = useRef<EpaResolution | null>(null)

  useEffect(() => {
    if (!country) return
    let cancel = false
    setLoading(true)
    setFailure(null)
    fetch(`/api/catalog?side=${side}&country=${encodeURIComponent(country)}`)
      .then((response) => response.json())
      .then((data: { makes: string[]; failure: Failure | null }) => {
        if (cancel) return
        setMakes(data.makes ?? [])
        setFailure(data.failure)
      })
      .catch(() => {
        if (!cancel) setMakes([])
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [side, country])

  useEffect(() => {
    if (!country || !make) return
    let cancel = false
    fetch(`/api/catalog?side=${side}&country=${encodeURIComponent(country)}&make=${encodeURIComponent(make)}`)
      .then((response) => response.json())
      .then((data: { models: ModelOption[] }) => {
        if (!cancel) setModels(data.models ?? [])
      })
    return () => {
      cancel = true
    }
  }, [side, country, make])

  useEffect(() => {
    if (!country || !make || !model || country !== "US") return
    let cancel = false
    fetch(
      `/api/catalog?side=${side}&country=US&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
    )
      .then((response) => response.json())
      .then((data: { years: number[] }) => {
        if (cancel) return
        const next = data.years ?? []
        setYears(next)
        setYear(next.length === 1 ? String(next[0]) : "")
      })
    return () => {
      cancel = true
    }
  }, [side, country, make, model])

  useEffect(() => {
    if (!make || !model || !year) return
    let cancel = false
    const yearCountry = country === "US" ? "US" : country
    fetch(
      `/api/catalog?side=${side}&country=${encodeURIComponent(yearCountry)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`,
    )
      .then((response) => response.json())
      .then((data: { trims: { id: number; label: string }[] }) => {
        if (!cancel) setTrims(data.trims ?? [])
      })
    return () => {
      cancel = true
    }
  }, [side, country, make, model, year])

  useEffect(() => {
    if (trims.length !== 1) return
    if (selected?.id === trims[0].id) return
    void chooseTrim(String(trims[0].id))
  }, [trims, selected])

  const makeOptions = useMemo(() => makes.map((item) => ({ value: item, label: item })), [makes])
  const modelOptions = useMemo(
    () => models.map((item) => ({ value: item.id, label: modelLabel(item, models, copy) })),
    [models, copy],
  )

  async function chooseTrim(id: string) {
    if (!id) {
      onSelect(null)
      return
    }
    const response = await fetch(`/api/vehicle/${id}`)
    if (!response.ok) return
    const vehicle = (await response.json()) as Vehicle
    onSelect({
      ...vehicle,
      cycle: "EPA",
      listedName: epaNoteRef.current?.catalogName,
    })
  }

  async function chooseModel(id: string) {
    setModel(id)
    setYear("")
    setYears([])
    setTrims([])
    setEpaNote(null)
    epaNoteRef.current = null
    onSelect(null)
    if (!id || country === "US") return
    const response = await fetch(
      `/api/catalog?side=${side}&country=${encodeURIComponent(country)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(id)}&resolve=1`,
    )
    if (!response.ok) return
    const data = (await response.json()) as EpaResolution | WltpResolution
    if (data.resolution === "wltp") {
      onSelect(data.vehicle)
      return
    }
    setEpaNote(data)
    epaNoteRef.current = data
    setYears(data.years)
    setYear(data.years.length === 1 ? String(data.years[0]) : "")
  }

  return (
    <div className="grid gap-3">
      {!country ? <p className="text-sm leading-6 text-muted-foreground">{copy.needCountry}</p> : null}
      {failure ? (
        <p className="text-sm leading-6">
          {copy.catalogFailed}{" "}
          <a className="underline" href={failure.url}>
            {failure.source}
          </a>
          . {failure.detail}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <SearchSelect
          label={copy.make}
          value={make}
          options={makeOptions}
          placeholder={copy.choose}
          empty={copy.noMakeMatch}
          disabled={!country || Boolean(failure)}
          onChange={(next) => {
            setMake(next)
            setModel("")
            setYear("")
            setYears([])
            setModels([])
            setTrims([])
            setEpaNote(null)
            epaNoteRef.current = null
            onSelect(null)
          }}
        />
        <SearchSelect
          label={copy.model}
          value={model}
          options={modelOptions}
          placeholder={copy.choose}
          empty={copy.noModelMatch}
          disabled={!make}
          onChange={(next) => void chooseModel(next)}
        />
      </div>
      {years.length > 1 || trims.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {years.length > 1 ? (
            <Field label={copy.yearWord}>
              <select
                className={fieldClass}
                value={year}
                aria-label={copy.yearWord}
                onChange={(event) => {
                  setYear(event.target.value)
                  setTrims([])
                  onSelect(null)
                }}
              >
                <option value="">{copy.choose}</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {trims.length > 1 ? (
            <Field label={copy.version}>
              <select
                className={fieldClass}
                value={selected?.cycle === "EPA" ? selected.id : ""}
                aria-label={copy.version}
                onChange={(event) => void chooseTrim(event.target.value)}
              >
                <option value="">{copy.choose}</option>
                {trims.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-muted-foreground">{copy.loading}</p> : null}
      {epaNote ? (
        <p className="text-sm leading-6">
          {epaNote.namesDiffer
            ? copy.epaNames(epaNote.catalogName, `${epaNote.epaMake} ${epaNote.epaModel}`)
            : copy.epaTrimNote}
        </p>
      ) : null}
      {selected?.cycle === "WLTP" && selected.wltp ? (
        <p className="text-sm leading-6">
          <span className="font-medium">WLTP</span> · {selected.year} {selected.listedName}.{" "}
          <a className="underline" href={selected.wltp.sourceUrl}>
            {selected.wltp.sourceName}
          </a>
          . {selected.wltp.license}. {copy.wltpCombinedOnly}
          {selected.powertrain === "phev" ? ` ${copy.wltpPhevNoCs}` : ""}
        </p>
      ) : null}
      {selected?.cycle === "EPA" ? (
        <p className="text-sm text-foreground">
          <span className="font-medium">
            EPA · {selected.year} {selected.make} {selected.version}
          </span>
          {selected.listedName && selected.listedName.toUpperCase() !== `${selected.make} ${selected.model}`.toUpperCase() ? (
            <span className="mt-1 block text-muted-foreground">{copy.listedAs(selected.listedName)}</span>
          ) : null}
          {selected.year < 2013 ? <span className="mt-1 block text-amber-900">{copy.estimated}</span> : null}
        </p>
      ) : null}
    </div>
  )
}

function modelLabel(item: ModelOption, all: ModelOption[], copy: Copy) {
  const twins = all.filter((other) => other.label === item.label).length
  if (twins < 2 || !item.powertrain) return item.label
  return `${item.label} · ${copy.powertrain[item.powertrain]}`
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
