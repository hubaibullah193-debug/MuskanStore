// tests/unit/security-headers.test.ts
import { describe, it, expect } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

describe("buildSecurityHeaders", () => {
  const headers = buildSecurityHeaders();

  it("sets a Content-Security-Policy", () => {
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("allows Next.js inline scripts/styles (RSC hydration)", () => {
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("permits Supabase hosts for data + realtime", () => {
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("wss://*.supabase.co");
    expect(csp).toContain("connect-src");
  });

  it("permits payment-gateway form actions", () => {
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("https://www.jazzcash.com.pk");
    expect(csp).toContain("https://easypay.easypaisa.com.pk");
  });

  it("blocks framing (clickjacking) and object embeds", () => {
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("sets HSTS, nosniff, referrer policy, and X-Frame-Options", () => {
    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });
});
