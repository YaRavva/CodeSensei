import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Явно указываем использование старого PostCSS плагина для Tailwind CSS v3
  experimental: {
    optimizePackageImports: [],
  },
  // Добавляем настройки для обработки чанков
  webpack: (config, { isServer }) => {
    // Избегаем попыток собрать node:* модули в клиентском бандле
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'node:child_process': false,
        child_process: false,
        'node:fs': false,
        fs: false,
        'node:net': false,
        net: false,
      } as any;
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        child_process: false,
        fs: false,
        net: false,
      };
      
      // Добавляем правило для обработки pyodide
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        // Исключаем pyodide из сборки, так как он загружается динамически
        'pyodide',
      ];
    }
    
    // Добавляем правило для обработки mjs файлов
    config.module = config.module || { rules: [] };
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  // Добавляем настройки для обработки ошибок загрузки чанков
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
  // Увеличиваем таймаут для загрузки чанков
  staticPageGenerationTimeout: 60,
};

export default nextConfig;