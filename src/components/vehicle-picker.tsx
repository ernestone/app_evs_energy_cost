"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Copy } from "@/lib/i18n"
import type { Side, Vehicle } from "@/lib/types"

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function VehiclePicker({
  side,
  copy,
  selected,
  onSelect,
}: {
  side: Side
  copy: Copy
  selected: Vehicle | null
  onSelect: (vehicle: Vehicle | null) => void
}) {
  const [years, setYears] = useState<number[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [trims, setTrims] = useState<{ id: number; label: string }[]>([])
  const [year, setYear] = useState("")
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancel = false
    fetch(`/api/catalog?side=${side}`)
      .then((response) => response.json())
      .then((data: { years: number[] }) => {
        if (!cancel) setYears(data.years)
      })
      .catch(() => {
        if (!cancel) setYears([])
      })
    return () => {
      cancel = true
    }
  }, [side])

  useEffect(() => {
    if (!year) return
    let cancel = false
    setLoading(true)
    fetch(`/api/catalog?side=${side}&year=${year}`)
      .then((response) => response.json())
      .then((data: { makes: string[] }) => {
        if (!cancel) setMakes(data.makes)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [side, year])

  useEffect(() => {
    if (!year || !make) return
    let cancel = false
    fetch(`/api/catalog?side=${side}&year=${year}&make=${encodeURIComponent(make)}`)
      .then((response) => response.json())
      .then((data: { models: string[] }) => {
        if (!cancel) setModels(data.models)
      })
    return () => {
      cancel = true
    }
  }, [side, year, make])

  useEffect(() => {
    if (!year || !make || !model) return
    let cancel = false
    fetch(
      `/api/catalog?side=${side}&year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
    )
      .then((response) => response.json())
      .then((data: { trims: { id: number; label: string }[] }) => {
        if (!cancel) setTrims(data.trims)
      })
    return () => {
      cancel = true
    }
  }, [side, year, make, model])

  const needle = query.trim().toLowerCase()
  const shownMakes = useMemo(
    () => makes.filter((item) => item.toLowerCase().includes(needle)),
    [makes, needle],
  )
  const shownModels = useMemo(
    () => models.filter((item) => item.toLowerCase().includes(needle)),
    [models, needle],
  )
  const shownTrims = useMemo(
    () => trims.filter((item) => item.label.toLowerCase().includes(needle)),
    [trims, needle],
  )

  async function chooseTrim(id: string) {
    if (!id) {
      onSelect(null)
      return
    }
    const response = await fetch(`/api/vehicle/${id}`)
    if (!response.ok) return
    onSelect((await response.json()) as Vehicle)
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={copy.yearWord}>
          <select
            className={fieldClass}
            value={year}
            onChange={(event) => {
              setYear(event.target.value)
              setMake("")
              setModel("")
              setModels([])
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
        <Field label={copy.make}>
          <select
            className={fieldClass}
            value={make}
            disabled={!year}
            onChange={(event) => {
              setMake(event.target.value)
              setModel("")
              setTrims([])
              onSelect(null)
            }}
          >
            <option value="">{copy.choose}</option>
            {shownMakes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.model}>
          <select
            className={fieldClass}
            value={model}
            disabled={!make}
            onChange={(event) => {
              setModel(event.target.value)
              onSelect(null)
            }}
          >
            <option value="">{copy.choose}</option>
            {shownModels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={copy.filter}>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.filter} />
      </Field>
      <Field label={copy.version}>
        <select
          className={fieldClass}
          value={selected?.id ?? ""}
          disabled={!model}
          onChange={(event) => void chooseTrim(event.target.value)}
        >
          <option value="">{copy.choose}</option>
          {shownTrims.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      {loading ? <p className="text-sm text-muted-foreground">{copy.loading}</p> : null}
      {selected ? (
        <p className="text-sm text-foreground">
          <span className="font-medium">
            {selected.year} {selected.make} {selected.version}
          </span>
          {selected.year < 2013 ? (
            <span className="mt-1 block text-amber-900">{copy.estimated}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
