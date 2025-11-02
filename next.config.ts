import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Явно указываем использование старого PostCSS плагина для Tailwind CSS v3
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
