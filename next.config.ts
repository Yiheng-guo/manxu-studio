import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "sharp"],
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
