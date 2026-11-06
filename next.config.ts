import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: false,
  // Pin the Turbopack workspace root to this project. Without it, a stray
  // lockfile in a parent directory can make Next resolve modules from there
  // and fail to find dependencies such as tailwindcss.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
