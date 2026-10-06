import type { NextRequest } from "next/server"
import { getAuth, missingAuthEnv } from "@/auth"

export const dynamic = "force-dynamic"

async function handle(request: NextRequest, method: "GET" | "POST") {
  const auth = getAuth()
  if (!auth) {
    return Response.json({ missing: missingAuthEnv() }, { status: 503 })
  }
  return auth.handlers[method](request)
}

export function GET(request: NextRequest) {
  return handle(request, "GET")
}

export function POST(request: NextRequest) {
  return handle(request, "POST")
}
