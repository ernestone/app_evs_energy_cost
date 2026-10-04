export type Look = "clara" | "tinta" | "contraste"
export type Origin = "official" | "model" | "typed"

export function lookPalette(look: Look) {
  if (look === "tinta") return { ev: "#44403c", ice: "#78716c", savings: "#1d4ed8" }
  if (look === "contraste") return { ev: "#1e3a8a", ice: "#9a3412", savings: "#0a0a0a" }
  return { ev: "#2563eb", ice: "#ea580c", savings: "#0f172a" }
}

export function originClass(look: Look, origin: Origin) {
  if (look === "contraste") {
    if (origin === "official") return "border-l-[6px] border-l-[#1d4ed8] bg-white"
    if (origin === "model") return "border-l-[6px] border-l-[#0f766e] bg-white"
    return "border-2 border-[#0f172a] bg-white"
  }
  if (look === "tinta") {
    if (origin === "official") return "bg-[#eceff1]"
    if (origin === "model") return "bg-[#f8efd8]"
    return "bg-white"
  }
  if (origin === "official") return "bg-[#e7f0ff]"
  if (origin === "model") return "bg-[#e5f6ea]"
  return "bg-white"
}
