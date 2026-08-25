// app/robots.ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/account",
          "/orders",
          "/checkout",
          "/cart",
          "/api",
          "/auth",
          "/order-confirmation",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
