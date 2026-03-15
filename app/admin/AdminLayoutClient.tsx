"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import AdminLogin from "./AdminLogin";
import Link from "next/link";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loading) return;
    const isLoginPage = pathname === "/admin" || pathname === "/admin/";
    if (!user && !isLoginPage) {
      router.replace("/admin");
      return;
    }
    if (user && isLoginPage) {
      router.replace("/admin/dashboard");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted lowercase">loading…</p>
      </div>
    );
  }

  const isLoginPage = pathname === "/admin" || pathname === "/admin/";
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <AdminLogin />
        <Link href="/" className="mt-6 text-sm text-muted hover:text-foreground lowercase">
          ← back to site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border py-4 px-6 flex items-center justify-between">
        <nav className="flex items-center gap-6 lowercase text-sm">
          <Link
            href="/admin/dashboard"
            className="text-foreground hover:text-muted font-medium"
          >
            dashboard
          </Link>
          <Link href="/" className="text-muted hover:text-foreground">
            view site
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted" title={user.email ?? undefined}>
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => auth.signOut().then(() => router.replace("/admin"))}
            className="text-sm text-muted hover:text-foreground lowercase cursor-pointer"
          >
            sign out
          </button>
        </div>
      </header>
      <div className="flex-1 container py-8">{children}</div>
    </div>
  );
}
