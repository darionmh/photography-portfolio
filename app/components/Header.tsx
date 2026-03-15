"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGalleries } from "../contexts/GalleriesContext";
import { formatGalleryName, pathForGallery, HOME_PAGE } from "../lib/galleries";

export default function Header() {
  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com";
  const pathname = usePathname();
  const currentPage = pathname === "/" ? HOME_PAGE : pathname.slice(1);
  const { galleries, galleriesLoading } = useGalleries();
  const [galleriesOpen, setGalleriesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!galleriesOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGalleriesOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGalleriesOpen(false);
    };
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleriesOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-sm py-5 lg:py-6">
      <div className="container flex items-center justify-between gap-6 sm:gap-8">
        <div className="flex flex-col shrink-0 min-w-0 gap-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-xl font-medium tracking-tight text-foreground antialiased lowercase">
              the places we went
            </h1>
            {currentPage !== HOME_PAGE && (
              <span className="hidden lg:inline text-sm text-muted/90 tracking-wide truncate lowercase" aria-label={`Viewing gallery: ${formatGalleryName(currentPage)}`}>
                / {formatGalleryName(currentPage)}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs text-muted tracking-wide">photography by darion</span>
            {currentPage !== HOME_PAGE && (
              <span className="lg:hidden text-xs text-muted/90 tracking-wide truncate lowercase" aria-label={`Viewing gallery: ${formatGalleryName(currentPage)}`}>
                / {formatGalleryName(currentPage)}
              </span>
            )}
          </div>
        </div>
        {/* Right group: Home + Galleries (small viewports) + Instagram */}
        <div className="flex items-center gap-5 sm:gap-6 lowercase shrink-0">
          <div className="flex items-center gap-5 sm:gap-6 lg:hidden" ref={dropdownRef}>
            <Link
              href="/"
              className="text-sm tracking-wide text-muted hover:text-foreground underline-offset-4 hover:underline transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-muted focus-visible:ring-offset-2 rounded-sm cursor-pointer lowercase"
            >
              Home
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setGalleriesOpen((open) => !open)}
                className="text-sm tracking-wide text-muted hover:text-foreground underline-offset-4 hover:underline transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-muted focus-visible:ring-offset-2 flex items-center gap-1 bg-transparent border-none cursor-pointer font-normal p-0 rounded-sm lowercase"
                aria-expanded={galleriesOpen}
                aria-haspopup="listbox"
                aria-label="Galleries menu"
              >
                Galleries
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 transition-transform duration-200 ${galleriesOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {galleriesOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-full mt-2 py-2 min-w-[12rem] rounded-xl border border-border/80 bg-background shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_8px_16px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.25)] z-30 max-h-[70vh] overflow-y-auto"
                >
                  {galleriesLoading && galleries.length === 0 ? (
                    <span className="block px-4 py-2.5 text-sm text-muted/90 tracking-wide">Loading…</span>
                  ) : (
                    galleries.map((name) => {
                      const isActive = currentPage === name;
                      return (
                        <Link
                          key={name}
                          href={pathForGallery(name)}
                          onClick={() => setGalleriesOpen(false)}
                          role="option"
                          aria-selected={isActive}
                          className={`block w-full text-left px-4 py-2.5 text-sm tracking-wide cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-muted focus-visible:ring-inset rounded-lg mx-1 transition-colors duration-150 lowercase ${
                            isActive
                              ? "text-foreground font-medium bg-surface/60"
                              : "text-muted hover:text-foreground hover:bg-surface/40"
                          }`}
                        >
                          {formatGalleryName(name)}
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-muted focus-visible:ring-offset-2 shrink-0 p-1 rounded-sm cursor-pointer"
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
        </div>
      </div>
    </header>
  );
}
