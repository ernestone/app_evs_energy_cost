import type { Metadata } from "next"
import Link from "next/link"
import { AdminCharts } from "@/components/admin-charts"
import { getAuth, missingAuthEnv } from "@/auth"
import { addViewer, launchUpdate, removeViewer, signInAdmin, signOutAdmin } from "@/app/admin/actions"
import { isOwner, normalizeLogin } from "@/lib/access"
import { adminCopy } from "@/lib/admin-copy"
import { dataUpdateRepo, workflowState } from "@/lib/data-update"
import { formatDate, formatNumber } from "@/lib/format"
import { listAllowlist, listComparisons, storageConfigured } from "@/lib/metrics-store"
import { summarize } from "@/lib/metric-summary"
import type { Lang } from "@/lib/types"
import meta from "../../../data/snapshot/meta.json"

export const dynamic = "force-dynamic"

const primary = "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
const quiet = "rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-foreground/10"
const field = "h-9 rounded-lg border border-input bg-card px-2.5 text-sm"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const query = await searchParams
  const lang = query.lang === "en" ? "en" : "es"
  return { title: adminCopy(lang).title }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; note?: string }>
}) {
  const query = await searchParams
  const lang: Lang = query.lang === "en" ? "en" : "es"
  const text = adminCopy(lang)
  const missing = missingAuthEnv()
  const note = noteText(text, query.note)
  const snapshot = formatDate(String(meta.generatedAt).slice(0, 10), lang)

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{text.title}</h1>
            <Link className="text-sm text-muted-foreground underline" href="/">{text.back}</Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className={lang === "es" ? primary : quiet} href="/admin">Español</Link>
            <Link className={lang === "en" ? primary : quiet} href="/admin?lang=en">English</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4">
        {note ? <p className="rounded-xl bg-[#e7f0ff] px-3 py-2 text-sm" data-admin-note>{note}</p> : null}
        {missing.length ? (
          <p className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10" data-auth-missing>
            {text.missingAuth(missing.join(", "))}
          </p>
        ) : (
          <Access lang={lang} snapshot={snapshot} />
        )}
      </div>
    </main>
  )
}

async function Access({ lang, snapshot }: { lang: Lang; snapshot: string }) {
  const text = adminCopy(lang)
  const auth = getAuth()
  const session = auth ? await auth.auth() : null
  const login = session?.user?.login ?? ""
  if (!login) {
    return (
      <form action={signInAdmin}>
        <p className="mb-3 text-sm">{text.signedOut}</p>
        <button type="submit" className={primary}>{text.signIn}</button>
      </form>
    )
  }
  const owner = isOwner(login)
  const viewers = storageConfigured() ? await listAllowlist() : []
  const name = normalizeLogin(login)
  const allowed = owner || (name != null && viewers.includes(name))
  if (!allowed) {
    return (
      <div className="grid gap-3">
        <p data-no-access>{text.noAccess}</p>
        <p className="text-sm text-muted-foreground">{text.session(login)}</p>
        <form action={signOutAdmin}>
          <button type="submit" className={quiet}>{text.signOut}</button>
        </form>
      </div>
    )
  }

  const rows = await listComparisons()
  const summary = summarize(rows, lang)
  const recent = rows.slice(0, 20)
  const state = owner ? await workflowState() : null

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {text.session(login)} · {owner ? text.roleOwner : text.roleViewer}
          {summary.total ? ` · ${text.stored(summary.total)}` : ""}
        </p>
        <form action={signOutAdmin}>
          <button type="submit" className={quiet}>{text.signOut}</button>
        </form>
      </div>
      {storageConfigured() ? null : <p className="text-sm">{text.noStore}</p>}
      <AdminCharts
        summary={summary}
        text={{
          mapTitle: text.mapTitle,
          mapNote: text.mapNote,
          yearTitle: text.yearTitle,
          monthTitle: text.monthTitle,
          kmTitle: text.kmTitle,
          modelsTitle: text.modelsTitle,
          countryTitle: text.countryTitle,
          connectionTitle: text.connectionTitle,
          languageTitle: text.languageTitle,
          currencyTitle: text.currencyTitle,
          fuelTitle: text.fuelTitle,
          phevTitle: text.phevTitle,
          horizonTitle: text.horizonTitle,
          empty: text.empty,
        }}
      />
      <section className="grid gap-2" data-recent>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{text.recent}</h2>
        {recent.length ? (
          <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
            <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {[text.when, text.selected, text.connection, text.region, text.language, text.currency, text.km, text.fuel, "PHEV", text.horizon, text.purchaseEv, text.purchaseIce, text.models].map((label) => (
                    <th key={label} className="px-2 py-2 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="px-2 py-2 whitespace-nowrap">{formatDate(row.createdAt.slice(0, 10), lang)}</td>
                    <td className="px-2 py-2">{row.country}</td>
                    <td className="px-2 py-2">{row.connectionCountry ?? "—"}</td>
                    <td className="px-2 py-2">{row.connectionRegion ?? "—"}</td>
                    <td className="px-2 py-2">{row.language}</td>
                    <td className="px-2 py-2">{row.displayCurrency}</td>
                    <td className="px-2 py-2">{formatNumber(row.kmYear, lang, 0)}</td>
                    <td className="px-2 py-2">{row.fuel === "diesel" ? text.diesel : text.gasoline}</td>
                    <td className="px-2 py-2">{row.phev ? text.on : text.off}</td>
                    <td className="px-2 py-2">{row.result.horizon}</td>
                    <td className="px-2 py-2" data-purchase-ev>{row.evPurchase || "—"}</td>
                    <td className="px-2 py-2" data-purchase-ice>{row.icePurchase || "—"}</td>
                    <td className="px-2 py-2">{[row.evModelLabel, row.iceModelLabel].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{text.empty}</p>
        )}
      </section>
      <section className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-allowlist>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{text.allowTitle}</h2>
        <p className="text-sm text-muted-foreground">{text.allowHint}</p>
        <ul className="grid gap-2 text-sm">
          {viewers.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3">
              <span>{name}</span>
              {owner ? (
                <form action={removeViewer}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="login" value={name} />
                  <button type="submit" className={quiet}>{text.remove}</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {owner ? (
          <form action={addViewer} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="lang" value={lang} />
            <input className={field} name="login" aria-label={text.loginLabel} placeholder={text.loginLabel} />
            <button type="submit" className={primary}>{text.add}</button>
          </form>
        ) : null}
      </section>
      <section className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-data-update>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{text.updateTitle}</h2>
        <p className="text-sm">{text.snapshot(snapshot)}</p>
        {owner ? (
          <>
            <p className="text-sm text-muted-foreground">{text.repo(dataUpdateRepo())}</p>
            {state?.kind === "running" ? <p className="text-sm">{text.running}</p> : null}
            {state?.kind === "idle" ? <p className="text-sm">{text.idle}</p> : null}
            {state?.kind === "error" ? <p className="text-sm">{text.updateError}</p> : null}
            {state?.kind === "missing" ? (
              <button type="button" className={primary} disabled data-missing-token>{text.missingToken}</button>
            ) : (
              <form action={launchUpdate}>
                <input type="hidden" name="lang" value={lang} />
                <button type="submit" className={primary}>{text.launch}</button>
              </form>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}

function noteText(text: ReturnType<typeof adminCopy>, note: string | undefined) {
  if (note === "no-token") return text.missingToken
  if (note === "started") return text.started
  if (note === "failed") return text.failed
  if (note === "bad-login") return text.badLogin
  if (note === "forbidden") return text.forbidden
  if (note === "no-store") return text.noStore
  return ""
}
