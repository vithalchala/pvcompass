import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin tracing to this project; a lockfile higher up the tree confuses inference.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
