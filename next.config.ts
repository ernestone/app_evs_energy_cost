import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The server is bound on 0.0.0.0 and advertised as localhost. Browsers that
  // open 127.0.0.1 are otherwise blocked from the dev runtime and the page
  // stays as static HTML.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
