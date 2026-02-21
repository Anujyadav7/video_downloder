import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// Initialize the Cloudflare Dev Platform for Next.js (Local Development)
// Using .catch() instead of top-level 'await' to support CommonJS compilation compatibility
if (process.env.NODE_ENV === "development") {
  setupDevPlatform().catch((err) => {
    console.error("Cloudflare Dev Platform initialization failed:", err);
  });
}

const nextConfig: NextConfig = {
  /* config options here */
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
