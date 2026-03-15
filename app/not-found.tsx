"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track } from "@vercel/analytics";

export default function NotFound() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      track("404", { path: window.location.pathname });
    }
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="text-2xl font-medium text-foreground">page not found</h1>
      <p className="text-muted text-sm max-w-md">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-foreground hover:text-muted underline underline-offset-4"
      >
        back to home
      </Link>
    </div>
  );
}
