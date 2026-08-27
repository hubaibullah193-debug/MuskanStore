// app/sitemap.ts
import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/shipping`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/track-order`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Public product detail pages. If the DB is unreachable at build/request
  // time, we still expose the static routes above.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (products && products.length > 0) {
      productRoutes = products.map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Database not available (e.g. local build without Supabase) — skip.
  }

  return [...staticRoutes, ...productRoutes];
}
