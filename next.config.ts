import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "docuseal.com" },
      { protocol: "https", hostname: "*.docuseal.com" },
    ],
  },
  serverExternalPackages: ["unpdf"],
  experimental: {serverActions:{bodySizeLimit:"16mb"}},
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
