/**
 * Content Security Policy for the site.
 *
 * The policy is built per request in proxy.ts, because a nonce is needed to
 * allow the inline scripts of Next.js and of the theme script.
 */

/**
 * Builds the policy for one request.
 *
 * `nonce` is the value of the `x-nonce` request header: Next.js reads the
 * nonce from the `Content-Security-Policy` request header and puts it on every
 * script and style it renders.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives: string[] = [
    `default-src 'self'`,
    // 'strict-dynamic' lets the scripts that carry the nonce load the
    // scripts they need, so the allowlist of hosts stays short.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // Next.js injects inline styles for the styles of the framework; in
    // development React also needs 'unsafe-eval' for the styles.
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com${
      isDev ? " 'unsafe-inline'" : ""
    }`,
    `img-src 'self' blob: data: https://cdn.jsdelivr.net`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    // Pyodide is loaded from the CDN and talks to it while it starts.
    `connect-src 'self' https://cdn.jsdelivr.net https://appwrite.ravva.su`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `media-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'self'`,
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** The headers that do not depend on the request. */
export const SECURITY_HEADERS = [
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
