import type { Metadata } from "next";
import "./globals.css";
import { AuthAwareLayout } from "./components/auth-aware-layout";

export const metadata: Metadata = {
  title: "Muskan Care Center",
  description: "Personal hygiene e-commerce store",
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
