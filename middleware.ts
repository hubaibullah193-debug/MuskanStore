import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { jwtVerify } from "jose";

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
async function verifyAuth(request: NextRequest) {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.replace("Bearer ", "");

    // Fallback to session cookie
    if (!token) {
      token = request.cookies.get("auth-token")?.value;
    }

    if (!token) {
      return null;
    }

    // Verify JWT signature using Supabase's JWT secret
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      console.error("SUPABASE_JWT_SECRET not configured");
      return null;
    }

    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = verified.payload.sub;

    if (!userId) {
      return null;
    }

    // Fetch user role from database
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    return user || null;
  } catch (error) {
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
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
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
    const adminUser = await verifyAuth(request);
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Verify authentication for protected routes
  const user = await verifyAuth(request);

  // Admin routes require admin role
  if (isAdminRoute(pathname)) {
    if (!user || user.role !== "admin") {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Customer protected routes require authentication
  if (isCustomerProtectedRoute(pathname)) {
    if (!user) {
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
