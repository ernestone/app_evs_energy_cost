"use client"

import { useEffect } from "react"

const VERSION_CHECK_MS = 3 * 60 * 1000

export function DeployRefresh() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID
    if (!mine) return
    let pending = false

    async function check() {
      if (pending || document.visibilityState !== "visible") return
      pending = true
      try {
        const response = await fetch("/api/version", { cache: "no-store" })
        if (!response.ok) return
        const body = (await response.json()) as { id?: unknown }
        if (typeof body.id === "string" && body.id && body.id !== mine) window.location.reload()
      } catch {
        // A failed check leaves the open tab as it is.
      } finally {
        pending = false
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void check()
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    window.addEventListener("pageshow", onVisible)
    const timer = window.setInterval(() => void check(), VERSION_CHECK_MS)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
      window.removeEventListener("pageshow", onVisible)
      window.clearInterval(timer)
    }
  }, [])

  return null
}
