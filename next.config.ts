import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  outputFileTracingIncludes: {
    "/blog/**": ["./blog/**"],
    "/api/blog/**": ["./blog/**"],
    "/api/publish/**": ["./blog/**"],
  },
};

export default nextConfig;
