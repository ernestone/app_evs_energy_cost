import { execSync } from "node:child_process"
import type { NextConfig } from "next"

function deploymentId() {
  const fromVercel = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA
  if (fromVercel) return fromVercel
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "local"
  }
}

const deployment = deploymentId()
const noStore = "no-cache, no-store, max-age=0, must-revalidate"

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // The server is bound on 0.0.0.0 and advertised as localhost. Browsers that
  // open 127.0.0.1 are otherwise blocked from the dev runtime and the page
  // stays as static HTML.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  generateBuildId: async () => deployment,
  env: {
    NEXT_PUBLIC_BUILD_ID: deployment,
  },
  async headers() {
    return [
      { source: "/", headers: [{ key: "Cache-Control", value: noStore }] },
      { source: "/api/version", headers: [{ key: "Cache-Control", value: noStore }] },
    ]
  },
}

export default nextConfig
