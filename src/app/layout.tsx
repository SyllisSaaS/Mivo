import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

/**
 * Fonts are self-hosted by next/font, so no third-party font request is made.
 * This keeps the Content-Security-Policy tight and avoids a render-blocking
 * external stylesheet.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mivo — Modern websites for businesses & creators",
    template: "%s — Mivo",
  },
  description:
    "Mivo designs and builds modern, responsive websites tailored to your business. UK-based — get a quote for your next project.",
  openGraph: {
    type: "website",
    title: "Mivo — Websites built around your business",
    description:
      "Modern web design and development for businesses, brands and creators.",
    url: siteUrl,
    siteName: "Mivo",
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: "Mivo — Modern websites",
    description:
      "Websites built around your business. Design, development and collaboration.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
