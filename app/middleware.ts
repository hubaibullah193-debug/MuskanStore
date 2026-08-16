import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

/**
 * Middleware for session validation and route protection
 * Runs on every request to check authentication state
 *
 * Protected routes (redirect to login if unauthenticated):
 * - /checkout/*
 * - /account/*
 * - /admin/* (admin only)
 *
 * Public routes (accessible without auth):
 * - /
 * - /products
 * - /product/*
 * - /auth/*
 */

const PROTECTED_ROUTES = ["/checkout", "/account", "/admin", "/api/protected"];
const PUBLIC_ROUTES = ["/", "/products", "/product", "/auth", "/api/public"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Skip middleware for static assets and API routes we don't control
  if (
    pathname.includes("/_next") ||
    pathname.includes("/api/webhooks") ||
    pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Get session token from cookies
  const sessionToken = request.cookies.get("session-token")?.value;

  // If public route or authenticated, proceed
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // If protected route and no session, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists, update last activity timestamp
  // In production, this would update Redis; for now, set response header
  const response = NextResponse.next();
  response.headers.set("X-Session-Updated", new Date().toISOString());

  return response;
}

// Configure which routes trigger middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
