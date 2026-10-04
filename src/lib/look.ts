export type Origin = "official" | "model" | "typed"

export function originClass(origin: Origin) {
  if (origin === "official") return "bg-[#e7f0ff]"
  if (origin === "model") return "bg-[#e5f6ea]"
  return "bg-white"
}
