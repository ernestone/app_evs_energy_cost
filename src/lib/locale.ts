import type { Lang } from "./types"

function primaryLanguage(tag: string) {
  const language = tag.trim().toLowerCase().split(";")[0]?.split("-")[0] ?? ""
  return language === "*" ? "" : language
}

export function languageFromTag(tag: string): Lang {
  return primaryLanguage(tag) === "es" ? "es" : "en"
}

export function languageFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header?.trim()) return "en"
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";").map((piece) => piece.trim())
      const qParam = params.find((param) => param.toLowerCase().startsWith("q="))
      const q = qParam ? Number(qParam.slice(2)) : 1
      return { tag, q: Number.isFinite(q) ? q : 0, index }
    })
    .filter((item) => item.tag && item.q > 0)
  ranked.sort((a, b) => b.q - a.q || a.index - b.index)
  return languageFromTag(ranked[0]?.tag ?? "")
}

export function languageFromList(languages: readonly string[] | undefined): Lang {
  const first = languages?.find((tag) => tag.trim())
  return languageFromTag(first ?? "")
}

export function countryFromRequest(code: string | null | undefined, catalog: readonly string[]) {
  if (!code?.trim()) return ""
  const normalized = code.trim().toUpperCase()
  return catalog.includes(normalized) ? normalized : ""
}
