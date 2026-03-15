"use client";

import { useEffect, useState } from "react";
import { isRecaptchaEnabled } from "../lib/recaptcha";

const THEME_KEY = "theme";

export default function Footer() {
  const [dark, setDark] = useState(false);
  const [showRecaptchaNotice, setShowRecaptchaNotice] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setShowRecaptchaNotice(isRecaptchaEnabled());
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    if (next) {
      root.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
    }
    setDark(next);
  };

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com";
  const copyrightName = process.env.NEXT_PUBLIC_COPYRIGHT_NAME;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-auto py-6">
      <div className="container flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted">
            © {year}
            {copyrightName ? ` ${copyrightName}` : "the places we went"}
          </span>
        <div className="flex items-center gap-2">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md text-muted hover:text-foreground hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted transition-colors cursor-pointer"
            aria-label="Instagram"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </a>
          <button
            type="button"
            onClick={toggle}
          className="p-2 rounded-md text-muted hover:text-foreground hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted transition-colors cursor-pointer"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
          </button>
        </div>
        </div>
        {showRecaptchaNotice && (
          <p className="text-xs text-muted">
            This site is protected by reCAPTCHA and the Google{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Terms of Service
            </a>{" "}
            apply.
          </p>
        )}
      </div>
    </footer>
  );
}
