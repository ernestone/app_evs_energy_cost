"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { AdminCopy } from "@/lib/admin-copy"
import type { AdminSummary, NamedCount } from "@/lib/metric-summary"
import { LAND } from "@/lib/world-land"

const BLUE = "#2563eb"
const TICK = { fill: "#64748b", fontSize: 12 }
const WIDTH = 640
const HEIGHT = 320

export function AdminCharts({
  summary,
  text,
}: {
  summary: AdminSummary
  text: Pick<
    AdminCopy,
    | "mapTitle"
    | "mapNote"
    | "yearTitle"
    | "monthTitle"
    | "kmTitle"
    | "modelsTitle"
    | "countryTitle"
    | "connectionTitle"
    | "languageTitle"
    | "currencyTitle"
    | "fuelTitle"
    | "phevTitle"
    | "horizonTitle"
    | "empty"
  >
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10" data-chart="map">
        <h2 className="px-1 font-heading text-lg font-semibold tracking-tight text-foreground">{text.mapTitle}</h2>
        <p className="px-1 pb-2 text-sm text-muted-foreground">{text.mapNote}</p>
        <ConnectionMap points={summary.map} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <CountBars title={text.yearTitle} data={summary.years} empty={text.empty} />
        <MonthLine title={text.monthTitle} data={summary.months} empty={text.empty} />
      </div>
      <CountBars title={text.kmTitle} data={summary.km} empty={text.empty} angled />
      <ModelBars title={text.modelsTitle} data={summary.models} empty={text.empty} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CountBars title={text.countryTitle} data={summary.countries} empty={text.empty} />
        <CountBars title={text.connectionTitle} data={summary.connections} empty={text.empty} />
        <CountBars title={text.languageTitle} data={summary.languages} empty={text.empty} />
        <CountBars title={text.currencyTitle} data={summary.currencies} empty={text.empty} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CountBars title={text.fuelTitle} data={summary.fuels} empty={text.empty} />
        <CountBars title={text.phevTitle} data={summary.phev} empty={text.empty} />
        <CountBars title={text.horizonTitle} data={summary.horizons} empty={text.empty} />
      </div>
    </div>
  )
}

function ConnectionMap({ points }: { points: AdminSummary["map"] }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" data-map className="h-auto w-full">
      <rect width={WIDTH} height={HEIGHT} fill="#e7f0ff" />
      {Array.from({ length: 5 }, (_, index) => {
        const y = (index / 4) * HEIGHT
        return <line key={`lat-${index}`} x1={0} x2={WIDTH} y1={y} y2={y} stroke="#cbd5e1" strokeWidth={0.6} />
      })}
      {Array.from({ length: 7 }, (_, index) => {
        const x = (index / 6) * WIDTH
        return <line key={`lon-${index}`} y1={0} y2={HEIGHT} x1={x} x2={x} stroke="#cbd5e1" strokeWidth={0.6} />
      })}
      {LAND.map((ring) => (
        <path key={ring[0].join(",")} d={ringPath(ring)} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.8} />
      ))}
      {points.map((point) => {
        const { x, y } = project(point.lon, point.lat)
        const radius = Math.min(28, 6 + 4 * Math.sqrt(point.count - 1))
        return (
          <g key={`${point.lat},${point.lon},${point.label}`}>
            <circle cx={x} cy={y} r={radius + 3} fill="#ffffff" />
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={BLUE}
              data-map-point=""
              data-count={point.count}
              data-lat={point.lat}
              data-lon={point.lon}
            >
              <title>{`${point.label} · ${point.count}`}</title>
            </circle>
          </g>
        )
      })}
    </svg>
  )
}

function project(lon: number, lat: number) {
  return {
    x: ((lon + 180) / 360) * WIDTH,
    y: ((90 - lat) / 180) * HEIGHT,
  }
}

function ringPath(ring: ReadonlyArray<readonly [number, number]>) {
  return `${ring
    .map(([lon, lat], index) => {
      const { x, y } = project(lon, lat)
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")} Z`
}

function CountBars({
  title,
  data,
  empty,
  angled = false,
}: {
  title: string
  data: NamedCount[]
  empty: string
  angled?: boolean
}) {
  const shown = data.some((item) => item.count > 0)
  return (
    <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h2 className="px-1 font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {shown ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: angled ? 16 : 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={TICK}
                interval={0}
                angle={angled ? -30 : 0}
                textAnchor={angled ? "end" : "middle"}
                height={angled ? 56 : 30}
              />
              <YAxis allowDecimals={false} tick={TICK} width={36} />
              <Tooltip />
              <Bar dataKey="count" name={title} fill={BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="px-1 py-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}

function MonthLine({ title, data, empty }: { title: string; data: NamedCount[]; empty: string }) {
  return (
    <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h2 className="px-1 font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {data.length ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={TICK} />
              <YAxis allowDecimals={false} tick={TICK} width={36} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name={title} stroke={BLUE} strokeWidth={2.5} dot={{ r: 4, fill: BLUE }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="px-1 py-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}

function ModelBars({ title, data, empty }: { title: string; data: NamedCount[]; empty: string }) {
  return (
    <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h2 className="px-1 font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {data.length ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={TICK} />
              <YAxis type="category" dataKey="name" width={168} tick={TICK} />
              <Tooltip />
              <Bar dataKey="count" name={title} fill={BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="px-1 py-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}
