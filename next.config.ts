import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the Cloud Run container (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
