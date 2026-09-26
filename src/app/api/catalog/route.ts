import { NextRequest, NextResponse } from "next/server"
import {
  catalogFailure,
  catalogMakes,
  catalogModels,
  catalogTrims,
  catalogYears,
  resolveCountryModel,
  type CatalogModelOption,
} from "@/lib/catalog"
import type { Side } from "@/lib/types"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const side = params.get("side")
  if (side !== "ev" && side !== "ice") {
    return NextResponse.json({ error: "side" }, { status: 400 })
  }
  const typed = side as Side
  const country = params.get("country") || "US"
  const failure = catalogFailure(country)
  const make = params.get("make")
  if (!make) {
    return NextResponse.json({
      makes: failure ? [] : catalogMakes(typed, country),
      failure,
    })
  }
  const model = params.get("model")
  if (!model) {
    const models = catalogModels(typed, make, country)
    const options: CatalogModelOption[] =
      country === "US"
        ? (models as string[]).map((item) => ({ id: item, label: item, powertrain: "gasoline", fuel: "gasoline" }))
        : (models as CatalogModelOption[])
    return NextResponse.json({ models: options, failure })
  }
  if (params.get("resolve") === "1") {
    const resolved = resolveCountryModel(country, typed, model)
    if (!resolved) return NextResponse.json({ error: "not-found" }, { status: 404 })
    return NextResponse.json(resolved)
  }
  const year = params.get("year")
  if (!year) return NextResponse.json({ years: catalogYears(typed, make, model, country) })
  return NextResponse.json({ trims: catalogTrims(typed, make, model, Number(year), country) })
}
