import { headers } from "next/headers"
import { Comparator } from "@/components/comparator"

export const dynamic = "force-dynamic"
import { countryCatalogMeta } from "@/lib/catalog"
import { countryFromRequest, languageFromAcceptLanguage } from "@/lib/locale"
import type { Country, FxTable, SnapshotMeta } from "@/lib/types"
import countries from "../../data/snapshot/countries.json"
import fx from "../../data/snapshot/fx.json"
import meta from "../../data/snapshot/meta.json"

export default async function HomePage() {
  const requestHeaders = await headers()
  const list = countries as Country[]
  return (
    <Comparator
      countries={list}
      fx={fx as FxTable}
      meta={meta as SnapshotMeta}
      catalog={countryCatalogMeta()}
      initialLang={languageFromAcceptLanguage(requestHeaders.get("accept-language"))}
      initialCountry={countryFromRequest(requestHeaders.get("x-vercel-ip-country"), list.map((country) => country.code))}
    />
  )
}
