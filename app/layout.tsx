import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muskan Care Center",
  description: "Personal hygiene e-commerce store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
