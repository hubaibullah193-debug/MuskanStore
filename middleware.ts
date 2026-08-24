import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { verifySupabaseToken } from "@/lib/auth/verify";

/**
 * Authentication & Authorization Middleware
 * Protects routes by verifying JWT and role
 *
 * Protected routes:
 * - /checkout/* (authenticated customer)
 * - /account/* (authenticated customer)
 * - /order-confirmation/* (guest + valid token OR authenticated)
 * - /orders/* (authenticated customer)
 * - /admin/* (authenticated admin only)
 *
 * Public routes:
 * - / /products /product/* /auth/* /order-tracking/* /api/*
 */

const ADMIN_ROUTES = ["/admin"];
const CUSTOMER_PROTECTED_ROUTES = ["/checkout", "/account", "/orders"];
const PUBLIC_ROUTES = ["/", "/products", "/product", "/auth", "/api", "/order-tracking"];

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Verify authentication for protected routes
  const userId = await verifyUserId(request);

  // Admin routes require admin role
  if (isAdminRoute(pathname)) {
    const role = userId ? await getUserRole(userId) : null;
    if (!userId || role !== "admin") {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Customer protected routes require authentication only
  if (isCustomerProtectedRoute(pathname)) {
    if (!userId) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
