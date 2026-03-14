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

export const metadata: Metadata = {
  title: "The Places We Went",
  description: "Photography portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col`}
      >
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
