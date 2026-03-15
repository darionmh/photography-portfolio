"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

/** Renders site chrome (Header, main, Footer) only for non-admin routes. Admin routes get just children. */
export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="main" className="container flex-1 py-8" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
