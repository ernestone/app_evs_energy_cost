"use client"

import type { ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Copy } from "@/lib/i18n"
import type { Lang } from "@/lib/types"
import { formatNumber } from "@/lib/format"

const EV = "#0f6e6b"
const ICE = "#c45c28"

export function Charts({
  copy,
  lang,
  currency,
  year,
  month,
  per100,
  energy,
  co2,
  gPerKm,
  projection,
  evBoundary,
  iceBoundary,
}: {
  copy: Copy
  lang: Lang
  currency: string
  year: { ev: number; ice: number }
  month: { ev: number; ice: number }
  per100: { ev: number; ice: number }
  energy: { ev: number; ice: number }
  co2: { ev: number | null; ice: number | null }
  gPerKm: { ev: number | null; ice: number | null }
  projection: { year: number; ev: number; ice: number }[]
  evBoundary: string
  iceBoundary: string
}) {
  const money = (value: number) => formatNumber(value, lang, value >= 100 ? 0 : 2)
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title={`${copy.steps.results}: ${copy.perYear}`} unit={currency}>
          <Bars
            data={[{ name: copy.perYear, ev: year.ev, ice: year.ice }]}
            copy={copy}
            format={money}
          />
        </ChartCard>
        <ChartCard title={copy.perMonth} unit={currency}>
          <Bars
            data={[{ name: copy.perMonth, ev: month.ev, ice: month.ice }]}
            copy={copy}
            format={money}
          />
        </ChartCard>
      </div>
      <ChartCard title={`${copy.per100}`} unit={currency}>
        <Bars
          data={[{ name: "100 km", ev: per100.ev, ice: per100.ice }]}
          copy={copy}
          format={(value) => formatNumber(value, lang, 2)}
        />
      </ChartCard>
      <ChartCard title={copy.energyTitle} unit={copy.energyUnit}>
        <Bars
          data={[{ name: "100 km", ev: energy.ev, ice: energy.ice }]}
          copy={copy}
          format={(value) => formatNumber(value, lang, 1)}
        />
      </ChartCard>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
        <ChartCard title={`${copy.co2Title} ${copy.co2Year}`} unit={copy.tonnes}>
          <Bars
            data={[
              {
                name: copy.co2Year,
                ev: co2.ev ?? 0,
                ice: co2.ice ?? 0,
              },
            ]}
            copy={copy}
            format={(value) => formatNumber(value, lang, 2)}
          />
          <p className="px-1 text-xs leading-5 text-muted-foreground">
            {copy.evSeries}: {evBoundary}. {copy.iceSeries}: {iceBoundary}.
          </p>
        </ChartCard>
        <div className="grid content-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium">{copy.gPerKm}</p>
          <Figure label={copy.evSeries} value={gPerKm.ev} lang={lang} />
          <Figure label={copy.iceSeries} value={gPerKm.ice} lang={lang} />
        </div>
      </div>
      <ChartCard title={copy.projectionTitle} unit={currency}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e0d5c0" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#5e574c", fontSize: 12 }} />
              <YAxis tick={{ fill: "#5e574c", fontSize: 12 }} width={56} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="ev" name={copy.evSeries} stroke={EV} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="ice" name={copy.iceSeries} stroke={ICE} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="px-1 text-xs leading-5 text-muted-foreground">{copy.projectionNote}</p>
      </ChartCard>
    </div>
  )
}

function Figure({ label, value, lang }: { label: string; value: number | null; lang: Lang }) {
  return (
    <p className="text-sm">
      <span className="block text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl text-foreground">
        {value == null ? "—" : formatNumber(value, lang, 0)}
      </span>
    </p>
  )
}

function ChartCard({ title, unit, children }: { title: string; unit: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h3 className="px-1 font-heading text-lg text-foreground">
        {title} <span className="text-sm font-sans text-muted-foreground">({unit})</span>
      </h3>
      {children}
    </section>
  )
}

function Bars({
  data,
  copy,
  format,
}: {
  data: { name: string; ev: number; ice: number }[]
  copy: Copy
  format: (value: number) => string
}) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e0d5c0" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#5e574c", fontSize: 12 }} />
          <YAxis tick={{ fill: "#5e574c", fontSize: 12 }} width={56} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
          <Bar dataKey="ev" name={copy.evSeries} fill={EV} radius={[4, 4, 0, 0]} />
          <Bar dataKey="ice" name={copy.iceSeries} fill={ICE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
