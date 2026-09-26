import { NextResponse } from "next/server"
import { vehicleById } from "@/lib/catalog"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const vehicle = vehicleById(Number(id))
  if (!vehicle) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json(vehicle)
}
