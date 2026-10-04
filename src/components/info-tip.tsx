"use client"

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

export function InfoTip({ label, children, panelClassName }: { label: string; children: ReactNode; panelClassName?: string }) {
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  const root = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const button = root.current?.querySelector("button")
      const dialog = panel.current
      if (!button || !dialog) return
      const rect = button.getBoundingClientRect()
      const margin = 8
      const width = dialog.offsetWidth
      const height = dialog.offsetHeight
      let left = rect.left
      if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - width)
      let top = rect.bottom + 4
      if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 4)
      setBox({ top, left })
    }
    place()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node
      if (root.current?.contains(target) || panel.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    window.addEventListener("resize", place)
    document.addEventListener("scroll", place, true)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
      window.removeEventListener("resize", place)
      document.removeEventListener("scroll", place, true)
    }
  }, [open])

  return (
    <span ref={root} className="inline-flex">
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
      {open
        ? createPortal(
            <div
              ref={panel}
              id={panelId}
              role="dialog"
              aria-label={label}
              style={{ position: "fixed", top: box?.top ?? -9999, left: box?.left ?? 0, zIndex: 80 }}
              className={`rounded-lg border border-border bg-popover p-3 text-sm leading-6 font-sans font-normal text-popover-foreground shadow-lg ${panelClassName ?? "w-72"}`}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
