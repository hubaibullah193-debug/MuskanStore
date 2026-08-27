import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/auth/verify";
import { buildSecurityHeaders } from "@/lib/security/headers";

/**
 * Authentication & Authorization Middleware
 * Protects routes by verifying JWT and role
 *
 * Protected routes:
 * - /account/* (authenticated customer)
 * - /orders/* (authenticated customer)
 * - /admin/* (authenticated admin only)
 *
 * Public routes (no auth needed, including guest checkout + token-based tracking):
 * - / /products /product/* /auth/* /api/* /order-confirmation/* /track-order
 * - /checkout (guests provide email; logged-in users detected via cookie)
 */

const ADMIN_ROUTES = ["/admin"];
const CUSTOMER_PROTECTED_ROUTES = ["/account", "/orders"];
const PUBLIC_ROUTES = ["/", "/products", "/product", "/auth", "/api", "/track-order", "/order-confirmation"];

/**
 * Attach the standard security headers to a response. Centralised so every
 * middleware exit point applies the same policy.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = buildSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Extract and verify JWT from Authorization header or cookies
 */
/**
 * Verify the request's auth token and return the user id (subject).
 * Uses local JWT verification against the project's JWKS, so it works in the
 * Edge runtime without a database round-trip. Returns null if unauthenticated.
 */
async function verifyUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.replace("Bearer ", "");

    if (!token) {
      token = request.cookies.get("auth-token")?.value;
    }

    if (!token) {
      return null;
    }

    const payload = await verifySupabaseToken(token);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Look up the user's role from the database. Only needed for admin routes,
 * kept separate so customer route protection does not depend on a DB call.
 */
async function getUserRole(userId: string): Promise<string | null> {
  try {
    // Lazily load the service-role client. It is only needed for admin route
    // authorization, so keeping it out of the static Edge bundle avoids pulling
    // the full Supabase Node client (and its incompatible deps) into every
    // request. The JWT is still verified locally via jose in verifySupabaseToken.
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const { data } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    return data?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if route is protected
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

function isCustomerProtectedRoute(pathname: string): boolean {
  return CUSTOMER_PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.some((route) => route !== "/" && pathname.startsWith(route));
}

/**
 * Middleware handler
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and webhooks
  if (
    pathname.includes("/_next") ||
    pathname.includes("/api/webhooks") ||
    pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Admin API routes require admin role (return JSON, not a redirect)
  if (pathname.startsWith("/api/admin")) {
    const apiUserId = await verifyUserId(request);
    const apiRole = apiUserId ? await getUserRole(apiUserId) : null;
    if (!apiUserId || apiRole !== "admin") {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Verify authentication for protected routes
  const userId = await verifyUserId(request);

  // Admin routes require admin role
  if (isAdminRoute(pathname)) {
    const role = userId ? await getUserRole(userId) : null;
    if (!userId || role !== "admin") {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // Customer protected routes require authentication only
  if (isCustomerProtectedRoute(pathname)) {
    if (!userId) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
