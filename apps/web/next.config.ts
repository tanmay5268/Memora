import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui","@workspace/memorasdk"],
  serverExternalPackages: ["@workspace/db"],
}

export default nextConfig
