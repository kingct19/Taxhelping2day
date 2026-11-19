import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {serverActions:{bodySizeLimit:"16mb"}},
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
