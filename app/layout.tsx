import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "The Places We Went | Photography by Darion",
  description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
  openGraph: {
    title: "The Places We Went | Photography by Darion",
    description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "The Places We Went",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Places We Went | Photography by Darion",
    description: "Photography by Darion. Landscapes, wildlife, architecture — the places we went, and what stuck.",
  },
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
    url: siteUrl,
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
        <ThemeScript />
        <GalleriesProvider>
          <Header />
          <main className="container flex-1 py-8">
            {children}
          </main>
        </GalleriesProvider>
        <Footer />
      </body>
    </html>
  );
}
