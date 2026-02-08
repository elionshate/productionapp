import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export', // Static export for Electron
  distDir: 'out',   // Output directory for static build
  images: {
    unoptimized: true, // Required for static export
  },
  // Enable strict mode for production-grade React
  reactStrictMode: true,
  // Disable powered by header for security
  poweredByHeader: false,
  // TypeScript checks during build
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
