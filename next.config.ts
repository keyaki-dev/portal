import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  outputFileTracingIncludes: {
    "/blog/**": ["./blog/**"],
    "/api/publish/**": ["./blog/**"],
  },
};

export default nextConfig;
