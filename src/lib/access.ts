/** GitHub login that may change the allowlist and start a data update. */
export function ownerLogin(): string {
  const configured = process.env.ADMIN_GITHUB_LOGIN
  if (configured === undefined) return "ernestone"
  return configured.trim()
}

/**
 * A missing or blank login is never the owner, even when the configured owner is also blank.
 * Comparison is case-insensitive, matching GitHub.
 */
export function isOwner(login: string | null | undefined): boolean {
  const owner = ownerLogin()
  const name = login?.trim() ?? ""
  if (!owner || !name) return false
  return name.toLowerCase() === owner.toLowerCase()
}

export function normalizeLogin(login: string): string | null {
  const name = login.trim().toLowerCase()
  if (!/^[a-z0-9-]{1,39}$/.test(name)) return null
  return name
}
