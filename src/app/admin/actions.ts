"use server"

import { redirect } from "next/navigation"
import { getAuth } from "@/auth"
import { isOwner, normalizeLogin } from "@/lib/access"
import { dispatchSnapshotUpdate } from "@/lib/data-update"
import { addAllow, removeAllow, storageConfigured } from "@/lib/metrics-store"

function langOf(formData: FormData) {
  return formData.get("lang") === "en" ? "en" : "es"
}

function adminPath(lang: string, note?: string) {
  const params = new URLSearchParams()
  if (lang === "en") params.set("lang", "en")
  if (note) params.set("note", note)
  const query = params.toString()
  return query ? `/admin?${query}` : "/admin"
}

async function sessionLogin() {
  const auth = getAuth()
  if (!auth) return null
  const session = await auth.auth()
  return session?.user?.login ?? null
}

export async function signInAdmin() {
  const auth = getAuth()
  if (!auth) redirect("/admin")
  await auth.signIn("github", { redirectTo: "/admin" })
}

export async function signOutAdmin() {
  const auth = getAuth()
  if (!auth) redirect("/admin")
  await auth.signOut({ redirectTo: "/admin" })
}

export async function addViewer(formData: FormData) {
  const lang = langOf(formData)
  const login = await sessionLogin()
  if (!isOwner(login)) redirect(adminPath(lang, "forbidden"))
  if (!storageConfigured()) redirect(adminPath(lang, "no-store"))
  const name = normalizeLogin(String(formData.get("login") ?? ""))
  if (!name || isOwner(name)) redirect(adminPath(lang, "bad-login"))
  await addAllow(name)
  redirect(adminPath(lang))
}

export async function removeViewer(formData: FormData) {
  const lang = langOf(formData)
  const login = await sessionLogin()
  if (!isOwner(login)) redirect(adminPath(lang, "forbidden"))
  if (!storageConfigured()) redirect(adminPath(lang, "no-store"))
  const name = normalizeLogin(String(formData.get("login") ?? ""))
  if (!name || isOwner(name)) redirect(adminPath(lang, "bad-login"))
  await removeAllow(name)
  redirect(adminPath(lang))
}

export async function launchUpdate(formData: FormData) {
  const lang = langOf(formData)
  const login = await sessionLogin()
  if (!isOwner(login)) redirect(adminPath(lang, "forbidden"))
  const result = await dispatchSnapshotUpdate()
  if (result === "missing") redirect(adminPath(lang, "no-token"))
  redirect(adminPath(lang, result === "ok" ? "started" : "failed"))
}
