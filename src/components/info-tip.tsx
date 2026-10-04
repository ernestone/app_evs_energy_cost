"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  return (
    <span ref={root} className="relative inline-flex">
      <button
        type="button"
        className="grid size-5 shrink-0 place-items-center rounded-full border border-current text-[11px] font-semibold leading-none"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <span
          id={panelId}
          role="dialog"
          aria-label={label}
          className="absolute top-full left-0 z-30 mt-1 w-72 rounded-lg border border-border bg-popover p-3 text-sm leading-6 font-sans font-normal text-popover-foreground shadow-lg"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
