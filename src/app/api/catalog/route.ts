import { NextRequest, NextResponse } from "next/server"
import { catalogMakes, catalogModels, catalogTrims, catalogYears } from "@/lib/catalog"
import type { Side } from "@/lib/types"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const side = params.get("side")
  if (side !== "ev" && side !== "ice") {
    return NextResponse.json({ error: "side" }, { status: 400 })
  }
  const typed = side as Side
  const make = params.get("make")
  if (!make) return NextResponse.json({ makes: catalogMakes(typed) })
  const model = params.get("model")
  if (!model) return NextResponse.json({ models: catalogModels(typed, make) })
  const year = params.get("year")
  if (!year) return NextResponse.json({ years: catalogYears(typed, make, model) })
  return NextResponse.json({ trims: catalogTrims(typed, make, model, Number(year)) })
}
