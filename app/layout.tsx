import type { Metadata } from "next";
import "./globals.css";
import { AuthAwareLayout } from "./components/auth-aware-layout";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — Premium Personal Hygiene Store`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Premium Personal Hygiene Store`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Premium Personal Hygiene Store`,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <AuthAwareLayout>{children}</AuthAwareLayout>
      </body>
    </html>
  );
}
