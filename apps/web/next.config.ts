import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  serverExternalPackages: ["@workspace/db"],
}

export default nextConfig
