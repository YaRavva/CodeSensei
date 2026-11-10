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
    // 'wasm-unsafe-eval' is required in production: Pyodide compiles the Python
    // interpreter as WebAssembly, and without it the runtime fails with
    // "WebAssembly.instantiateStreaming(): ... violates the following Content
    // Security policy directive" and code execution never starts.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net 'wasm-unsafe-eval'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // Next.js injects inline styles for the styles of the framework; in
    // development React also needs 'unsafe-eval' for the styles.
    // 'unsafe-inline' is required in production as well: Monaco Editor creates
    // its own <style> elements at runtime (tokenizer colors, bracket guides,
    // decorations) and cannot attach the per-request nonce to them. Without it
    // CSP blocks those styles and the editor renders without layout, text or
    // decorations. script-src stays strict (nonce + 'strict-dynamic'), so
    // injected CSS cannot execute script.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
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
