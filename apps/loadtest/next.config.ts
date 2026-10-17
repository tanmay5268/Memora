import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace SDK ships raw TypeScript from its `exports` map.
  transpilePackages: ["@workspace/memorasdk"],
};

export default nextConfig;
