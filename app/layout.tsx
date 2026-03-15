import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Footer from "./components/Footer";
import Header from "./components/Header";
import ThemeScript from "./components/ThemeScript";
import { GalleriesProvider } from "./contexts/GalleriesContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theplaceswewent.com";
const baseUrl = siteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "The Places We Went | Photography by Darion",
    template: "%s",
  },
  description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
  keywords: ["photography", "Darion", "landscapes", "wildlife", "architecture", "photo gallery", "the places we went"],
  authors: [{ name: "Darion", url: baseUrl }],
  creator: "Darion",
  openGraph: {
    title: "The Places We Went | Photography by Darion",
    description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "The Places We Went",
    // images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "The Places We Went — Photography by Darion" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Places We Went | Photography by Darion",
    description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
  },
  alternates: { canonical: baseUrl },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Darion",
    description: "Photography by Darion. Landscapes, wildlife, architecture.",
    url: baseUrl,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Places We Went",
    description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
    url: baseUrl,
    author: { "@type": "Person", name: "Darion" },
    inLanguage: "en-US",
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <ThemeScript />
        <GalleriesProvider>
          <Header />
          <main className="container flex-1 py-8">
            {children}
          </main>
        </GalleriesProvider>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
