import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  outputFileTracingIncludes: {
    "/blog/**": ["./blog/**"],
    "/api/publish/**": ["./blog/**"],
    "/documents/**": ["./.docs-cache/**"],
    "/api/raw/**": ["./.docs-cache/**"],
  },
};

export default nextConfig;
