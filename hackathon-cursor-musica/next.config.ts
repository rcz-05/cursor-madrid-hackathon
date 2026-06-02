import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't pick a stray parent
  // lockfile when inferring it.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
