import type { NextConfig } from "next"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(__dirname, "../../.env") })

const nextConfig: NextConfig = {
  transpilePackages: ["@shipflow/db"],
}

export default nextConfig