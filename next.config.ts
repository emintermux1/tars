import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/\\$TARS", destination: "/token" },
      { source: "/tars", destination: "/token" },
    ];
  },
};

export default nextConfig;
