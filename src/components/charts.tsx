"use client"

import type { ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { InfoTip } from "@/components/info-tip"
import type { Copy } from "@/lib/i18n"
import type { Lang } from "@/lib/types"
import { formatMoney, formatNumber } from "@/lib/format"

const EV = "#2563eb"
const ICE = "#ea580c"

export function BreakevenChart({
  copy,
  lang,
  currency,
  rows,
  mark,
  evSeries,
  iceSeries,
  money,
  title,
  note,
  evColor = EV,
  iceColor = ICE,
}: {
  copy: Copy
  lang: Lang
  currency: string
  rows: { t: number; ev: number; ice: number }[]
  mark: { t: number; cost: number } | null
  evSeries: string
  iceSeries: string
  money: (value: number) => string
  title?: string
  note?: string
  evColor?: string
  iceColor?: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <h3 className="flex items-center gap-2 px-1 font-heading text-lg font-semibold tracking-tight text-foreground">
        <span>
          {title ?? copy.breakevenTitle} <span className="text-sm font-sans font-normal text-muted-foreground">({currency})</span>
        </span>
        <InfoTip label={copy.infoAbout(title ?? copy.breakevenTitle)}>{note ?? copy.breakevenNote}</InfoTip>
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, "dataMax"]}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(value) => formatNumber(Number(value), lang, 0)}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} width={56} />
            <Tooltip
              formatter={(value) => money(Number(value))}
              labelFormatter={(value) => `${formatNumber(Number(value), lang, 1)} ${copy.perYear}`}
            />
            <Legend />
            <Line type="monotone" dataKey="ev" name={evSeries} stroke={evColor} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="ice" name={iceSeries} stroke={iceColor} strokeWidth={2.5} dot={false} />
            {mark ? <ReferenceDot x={mark.t} y={mark.cost} r={5} fill="#1c1915" stroke="#fff" /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function MoneyCharts({
  copy,
  lang,
  currency,
  year,
  month,
  per100,
  evSeries,
  iceSeries,
  evColor = EV,
  iceColor = ICE,
}: {
  copy: Copy
  lang: Lang
  currency: string
  year: { ev: number; ice: number }
  month: { ev: number; ice: number }
  per100: { ev: number; ice: number }
  evSeries: string
  iceSeries: string
  evColor?: string
  iceColor?: string
}) {
  const money = (value: number) => formatMoney(value, currency, lang, Math.abs(value) >= 100 ? 0 : 2)
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title={copy.perYearChart} unit={currency}>
          <Bars
            data={[{ name: copy.perYear, ev: year.ev, ice: year.ice }]}
            evSeries={evSeries}
            iceSeries={iceSeries}
            evColor={evColor}
            iceColor={iceColor}
            format={money}
          />
        </ChartCard>
        <ChartCard title={copy.perMonth} unit={currency}>
          <Bars
            data={[{ name: copy.perMonth, ev: month.ev, ice: month.ice }]}
            evSeries={evSeries}
            iceSeries={iceSeries}
            format={money}
            evColor={evColor}
            iceColor={iceColor}
          />
        </ChartCard>
      </div>
      <ChartCard title={copy.per100} unit={currency}>
        <Bars
          data={[{ name: "100 km", ev: per100.ev, ice: per100.ice }]}
          evSeries={evSeries}
          iceSeries={iceSeries}
          evColor={evColor}
          iceColor={iceColor}
          format={(value) => formatNumber(value, lang, 2)}
        />
      </ChartCard>
    </div>
  )
}

export function EnergyChart({
  copy,
  lang,
  energy,
  evSeries,
  iceSeries,
  evColor = EV,
  iceColor = ICE,
}: {
  copy: Copy
  lang: Lang
  energy: { ev: number; ice: number }
  evSeries: string
  iceSeries: string
  evColor?: string
  iceColor?: string
}) {
  return (
    <ChartCard title={copy.energyTitle} unit={copy.energyUnit}>
      <Bars
        data={[{ name: "100 km", ev: energy.ev, ice: energy.ice }]}
        evSeries={evSeries}
        iceSeries={iceSeries}
        evColor={evColor}
        iceColor={iceColor}
        format={(value) => formatNumber(value, lang, 1)}
      />
    </ChartCard>
  )
}

export function EmissionCharts({
  copy,
  lang,
  co2,
  gPerKm,
  evBoundary,
  iceBoundary,
  evSeries,
  iceSeries,
  control,
  evColor = EV,
  iceColor = ICE,
}: {
  copy: Copy
  lang: Lang
  co2: { ev: number | null; ice: number | null }
  gPerKm: { ev: number | null; ice: number | null }
  evBoundary: string
  iceBoundary: string
  evSeries: string
  iceSeries: string
  control?: ReactNode
  evColor?: string
  iceColor?: string
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <ChartCard title={`${copy.co2Title} ${copy.co2Year}`} unit={copy.tonnes}>
        {control}
        <Bars
          data={[
            {
              name: copy.co2Year,
              ev: co2.ev ?? 0,
              ice: co2.ice ?? 0,
            },
          ]}
          evSeries={evSeries}
          iceSeries={iceSeries}
          format={(value) => formatNumber(value, lang, 2)}
          evColor={evColor}
          iceColor={iceColor}
        />
        <InfoTip label={copy.infoAbout(copy.co2Title)}>
          {evSeries}: {evBoundary}. {iceSeries}: {iceBoundary}.
        </InfoTip>
      </ChartCard>
      <div className="grid content-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-sm font-medium">{copy.gPerKm}</p>
        <Figure label={evSeries} value={gPerKm.ev} lang={lang} />
        <Figure label={iceSeries} value={gPerKm.ice} lang={lang} />
      </div>
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
      <h3 className="px-1 font-heading text-lg font-semibold tracking-tight text-foreground">
        {title} <span className="text-sm font-sans text-muted-foreground">({unit})</span>
      </h3>
      {children}
    </section>
  )
}

function Bars({
  data,
  evSeries,
  iceSeries,
  format,
  evColor = EV,
  iceColor = ICE,
}: {
  data: { name: string; ev: number; ice: number }[]
  evSeries: string
  iceSeries: string
  format: (value: number) => string
  evColor?: string
  iceColor?: string
}) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} width={56} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
          <Bar dataKey="ev" name={evSeries} fill={evColor} radius={[4, 4, 0, 0]} />
          <Bar dataKey="ice" name={iceSeries} fill={iceColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
