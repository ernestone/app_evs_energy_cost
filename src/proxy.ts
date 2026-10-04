import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const noStore = "no-cache, no-store, max-age=0, must-revalidate"

export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const path = request.nextUrl.pathname
  if (path === "/" || path === "/api/version") {
    response.headers.set("Cache-Control", noStore)
  }
  return response
}

export const config = {
  matcher: ["/", "/api/version"],
}
