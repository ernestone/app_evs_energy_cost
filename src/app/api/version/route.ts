export const dynamic = "force-dynamic"

const noStore = "no-cache, no-store, max-age=0, must-revalidate"

export function GET() {
  return Response.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID ?? "" },
    { headers: { "Cache-Control": noStore } },
  )
}
