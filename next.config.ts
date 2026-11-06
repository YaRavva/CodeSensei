import type { NextConfig } from "next";

/**
 * The security headers.
 *
 * They are written out here, and not imported from `lib/security/csp.ts`, on
 * purpose: the deployment platform compiles this file on its own and runs it
 * as a plain Node module, so an import would turn into a runtime `require`
 * of a file that is not in the deployment.
 *
 * The Content Security Policy is not here: it needs a nonce that is different
 * for every request, so it is built in `proxy.ts` (see `lib/security/csp.ts`).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Two years, with subdomains. The preload directive asks the browser to
  // remember the rule for the domain, so the first visit is protected too.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  turbopack: {},
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
        "node:child_process": false,
        child_process: false,
        "node:fs": false,
        fs: false,
        "node:net": false,
        net: false,
        // Игнорируем загрузку проблемных модулей для Monaco Editor
        stackframe: false,
        "error-stack-parser": false,
      } as any;
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        child_process: false,
        fs: false,
        net: false,
        stackframe: false,
        "error-stack-parser": false,
      };

      // Добавляем правило для обработки pyodide
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        // Исключаем pyodide из сборки, так как он загружается динамически
        "pyodide",
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

    // Игнорируем ошибки загрузки модулей Monaco Editor
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /monaco-editor/ },
      { module: /stackframe/ },
      { module: /error-stack-parser/ },
    ];

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
