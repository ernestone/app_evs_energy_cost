import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

const AUTH_ENV = ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_SECRET"] as const

export function missingAuthEnv() {
  return AUTH_ENV.filter((name) => !process.env[name]?.trim())
}

type AuthKit = ReturnType<typeof NextAuth>

let kit: AuthKit | null = null

/**
 * Auth.js is created only when the three AUTH_* variables are set.
 * There is no password login and no bypass when they are missing.
 */
export function getAuth(): AuthKit | null {
  if (missingAuthEnv().length) return null
  if (kit) return kit
  kit = NextAuth({
    trustHost: true,
    session: { strategy: "jwt" },
    providers: [
      GitHub({
        profile(profile) {
          return {
            id: String(profile.id),
            name: profile.name ?? profile.login,
            email: profile.email,
            image: profile.avatar_url,
            login: profile.login,
          }
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user && "login" in user && typeof user.login === "string" && user.login.trim()) {
          token.login = user.login
        }
        return token
      },
      session({ session, token }) {
        if (session.user) session.user.login = typeof token.login === "string" ? token.login : undefined
        return session
      },
    },
  })
  return kit
}
