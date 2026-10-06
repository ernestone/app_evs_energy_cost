import { connectionFromHeaders, METRICS_MAX_BYTES, parseMetricPayload } from "@/lib/metric-payload"
import { insertComparison, storageConfigured } from "@/lib/metrics-store"

export const dynamic = "force-dynamic"

export function GET() {
  return new Response(null, { status: 405 })
}

export async function POST(request: Request) {
  if (!storageConfigured()) return new Response(null, { status: 204 })
  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > METRICS_MAX_BYTES) {
    return Response.json({ error: "too large" }, { status: 413 })
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 })
  }
  const payload = parseMetricPayload(body)
  if (!payload) return Response.json({ error: "bad schema" }, { status: 400 })
  try {
    await insertComparison(payload, connectionFromHeaders(request.headers))
  } catch {
    return Response.json({ error: "store" }, { status: 500 })
  }
  return new Response(null, { status: 204 })
}
