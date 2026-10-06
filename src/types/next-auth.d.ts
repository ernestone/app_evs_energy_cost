import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    login?: string
  }
  interface Session {
    user: DefaultSession["user"] & { login?: string }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    login?: string
  }
}
