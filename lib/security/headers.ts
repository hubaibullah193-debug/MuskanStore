// lib/security/headers.ts
// Builds production security headers.
//
// The CSP is intentionally permissive enough to keep Next.js (App Router
// hydration uses inline scripts/styles), Supabase (REST + Realtime websockets
// + auth), and the payment-gateway redirects working, while still blocking
// framing (clickjacking), mixed content, and unwanted third-party contexts.

const SUPABASE_HOSTS = [
  "https://*.supabase.co",
  "https://*.supabase.in",
  "wss://*.supabase.co",
  "wss://*.supabase.in",
];

const PAYMENT_HOSTS = [
  "https://www.jazzcash.com.pk",
  "https://sandbox.jazzcash.com.pk",
  "https://easypay.easypaisa.com.pk",
  "https://easypaystg.easypaisa.com.pk",
];

export function buildSecurityHeaders(): Record<string, string> {
  const csp = [
    "default-src 'self'",
    // Next.js App Router injects inline scripts for RSC hydration, so
    // 'unsafe-inline' is required for the app to function in production.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
    `connect-src 'self' ${SUPABASE_HOSTS.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    `form-action 'self' ${PAYMENT_HOSTS.join(" ")}`,
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    // Enforce HTTPS for 2 years, including subdomains.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Defense-in-depth clickjacking protection (CSP frame-ancestors also set).
    "X-Frame-Options": "DENY",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  };
}
