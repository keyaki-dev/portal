import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  outputFileTracingIncludes: {
    "/blog/**": ["./blog/**"],
    "/api/publish/**": ["./blog/**"],
    "/documents/**": ["./documents/**"],
    "/api/raw/**": ["./documents/**"],
  },
};

export default nextConfig;
