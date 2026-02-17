import type { NextConfig } from "next";

// @ts-ignore
const nextConfig: NextConfig = {
  /* config options here */
  images: { unoptimized: true },
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static', '@ffmpeg-installer/ffmpeg', 'ffprobe-static'],
};

export default nextConfig;
