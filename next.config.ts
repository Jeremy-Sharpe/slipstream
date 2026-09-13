import type { NextConfig } from "next";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://slipstream-api.3-104-149-193.sslip.io").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiBaseUrl}/api/v1/:path*` },
      { source: "/ready", destination: `${apiBaseUrl}/ready` },
    ];
  },
};

export default nextConfig;
