// Shared site configuration used for SEO metadata, sitemap, and structured data.
export const SITE_NAME = "Muskan Care Center";

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://www.muskancare.com").replace(
    /\/+$/,
    ""
  );

export const SITE_DESCRIPTION =
  "Premium personal hygiene products delivered across Pakistan. Shop trusted, quality care essentials with fast shipping and secure checkout.";

export const SITE_LOCALE = "en_PK";
