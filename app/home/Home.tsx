"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGalleries } from "../contexts/GalleriesContext";
import { HOME_PAGE, pathForGallery, formatGalleryName } from "../lib/galleries";
import { getRecaptchaToken, isRecaptchaEnabled } from "../lib/recaptcha";
import { getImagesFromStorage, type StorageImage } from "../lib/storage";

const SKELETON_COUNT = 6;
const IMAGE_PARAM = "image";

/** Encode storage fullPath to a URL-safe resource id for deep linking. */
function toResourceId(fullPath: string): string {
  const base64 = btoa(unescape(encodeURIComponent(fullPath)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode resource id from URL back to storage fullPath. */
function fromResourceId(id: string): string | null {
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}

function pathWithImage(pathname: string, resourceId: string | null): string {
  if (resourceId == null) return pathname;
  return `${pathname}?${IMAGE_PARAM}=${resourceId}`;
}

const GALLERY_SKELETON_COUNT = 5;

function GalleryList({
  variant,
  galleries,
  galleriesLoading,
  currentPage,
  onSelect,
}: {
  variant: "horizontal" | "vertical";
  galleries: string[];
  galleriesLoading: boolean;
  currentPage: string;
  onSelect: (page: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () =>
      setHasOverflow(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [galleries]);

  const showSkeletons = galleriesLoading && galleries.length === 0;

  const baseTouch =
    "min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted transition-colors font-medium text-sm";
  const activeClass = "underline underline-offset-4 decoration-2 text-foreground";
  const inactiveClass =
    "text-muted hover:text-foreground/80";

  const homeActive = currentPage === HOME_PAGE;
  const homeClass = homeActive ? activeClass : inactiveClass;

  if (variant === "horizontal") {
    return (
      <nav aria-label="Galleries" className="flex flex-col gap-1">
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-2 -mb-2 overscroll-x-contain snap-x snap-mandatory [scrollbar-width:thin] min-w-0"
          >
            <button
              type="button"
              onClick={() => onSelect(HOME_PAGE)}
              className={`shrink-0 snap-start px-4 py-2.5 rounded-full whitespace-nowrap ${baseTouch} ${homeClass}`}
              aria-current={homeActive ? "page" : undefined}
            >
              Home
            </button>
            <span className="shrink-0 self-center text-xs font-semibold uppercase tracking-wider text-muted">
              Galleries
            </span>
            {showSkeletons
              ? Array.from({ length: GALLERY_SKELETON_COUNT }, (_, i) => (
                  <div
                    key={i}
                    className="shrink-0 h-[44px] w-20 rounded-full bg-surface animate-pulse"
                    aria-hidden
                  />
                ))
              : galleries.map((name) => {
                  const isActive = currentPage === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onSelect(name)}
                      className={`shrink-0 snap-start pl-2 px-4 py-2.5 rounded-full whitespace-nowrap ${baseTouch} ${
                        isActive ? activeClass : inactiveClass
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {formatGalleryName(name)}
                    </button>
                  );
                })}
          </div>
          {!showSkeletons && hasOverflow && (
            <div
              className="absolute right-0 top-0 bottom-2 w-12 flex items-center justify-end gap-1 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none"
              aria-hidden
            >
              <svg
                className="shrink-0 w-4 h-4 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Galleries" className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => onSelect(HOME_PAGE)}
        className={`block w-full text-left px-4 py-2 rounded-md ${baseTouch} ${homeClass}`}
        aria-current={homeActive ? "page" : undefined}
      >
        Home
      </button>
      <h2 className="px-4 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
        Galleries
      </h2>
      {showSkeletons
        ? Array.from({ length: GALLERY_SKELETON_COUNT }, (_, i) => (
            <div
              key={i}
              className="h-9 w-full max-w-[8rem] rounded-md bg-surface animate-pulse ml-4"
              aria-hidden
            />
          ))
        : galleries.map((name) => {
            const isActive = currentPage === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className={`block w-full text-left pl-6 pr-4 py-2 rounded-md ${baseTouch} ${
                  isActive ? activeClass : inactiveClass
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {formatGalleryName(name)}
              </button>
            );
          })}
    </nav>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = pathname === "/" ? HOME_PAGE : pathname.slice(1);
  const imageParam = searchParams.get(IMAGE_PARAM);

  const {
    galleries,
    galleriesLoading,
    getCachedImages,
    setCachedImages,
  } = useGalleries();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<StorageImage | null>(null);
  const [expandedImageLoaded, setExpandedImageLoaded] = useState(false);
  const userClosedRef = useRef(false);
  const currentPathRef = useRef<string>("");
  const expandedPathRef = useRef<string | null>(null);

  // Only reset loading when we're showing a different image (by fullPath), not when expanded gets a new object reference
  useEffect(() => {
    if (!expanded) {
      expandedPathRef.current = null;
      return;
    }
    if (expandedPathRef.current !== expanded.fullPath) {
      expandedPathRef.current = expanded.fullPath;
      setExpandedImageLoaded(false);
    }
  }, [expanded]);

  useEffect(() => {
    const path = currentPage === HOME_PAGE ? "" : currentPage;
    currentPathRef.current = path;

    const cached = getCachedImages(path);
    if (cached !== undefined) {
      setImages(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setImages([]);

    if (isRecaptchaEnabled()) {
      getRecaptchaToken()
        .then((token) => {
          if (!token) {
            if (currentPathRef.current === path) setIsLoading(false);
            return null;
          }
          return fetch("/api/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, path }),
          });
        })
        .then((res) => {
          if (!res || currentPathRef.current !== path) return;
          if (!res.ok) {
            setIsLoading(false);
            return;
          }
          return res.json();
        })
        .then((data) => {
          if (currentPathRef.current !== path) return;
          const dataList = Array.isArray(data?.images) ? data.images : [];
          setCachedImages(path, dataList as StorageImage[]);
          setImages(dataList as StorageImage[]);
          setIsLoading(false);
        })
        .catch(() => {
          if (currentPathRef.current === path) setIsLoading(false);
        });
    } else {
      getImagesFromStorage(path).then(
        (data) => {
          if (currentPathRef.current !== path) return;
          setCachedImages(path, data);
          setImages(data);
          setIsLoading(false);
        },
        () => {
          if (currentPathRef.current !== path) return;
          setIsLoading(false);
        }
      );
    }
  }, [currentPage, getCachedImages, setCachedImages]);

  // Deep link: sync lightbox with URL (resource id in param)
  useEffect(() => {
    if (!imageParam) {
      userClosedRef.current = false;
      if (expanded) setExpanded(null);
      return;
    }
    if (isLoading) return;
    if (userClosedRef.current) return;
    const fullPath = fromResourceId(imageParam);
    if (fullPath) {
      const match = images.find((img) => img.fullPath === fullPath);
      if (match) {
        // Only update if we're not already showing this image (avoids new reference -> loading reset)
        setExpanded((prev) => (prev?.fullPath === fullPath ? prev : match));
      } else if (images.length > 0) {
        router.replace(pathname, { scroll: false });
      }
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [images, isLoading, imageParam, pathname, router]);

  const openExpanded = useCallback(
    (image: StorageImage) => {
      setExpanded(image);
      router.push(pathWithImage(pathname, toResourceId(image.fullPath)), { scroll: false });
    },
    [router, pathname]
  );

  const selectGallery = useCallback(
    (page: string) => {
      router.push(pathForGallery(page), { scroll: false });
    },
    [router]
  );

  const closeExpanded = useCallback(() => {
    userClosedRef.current = true;
    setExpanded(null);
    window.history.replaceState(null, "", pathname);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!expanded) return;
      const filename = expanded.name || "image";
      fetch(expanded.url, { mode: "cors" })
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => {
          window.open(expanded.url, "_blank", "noopener,noreferrer");
        });
    },
    [expanded]
  );

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!expanded) return;
      const shareUrl = typeof window !== "undefined" ? window.location.href : "";
      const title = expanded.dimensions?.baseName ?? expanded.name;
      if (typeof navigator !== "undefined" && navigator.share) {
        navigator
          .share({
            title: title || "Photo",
            url: shareUrl,
          })
          .catch(() => {});
      } else {
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
      }
    },
    [expanded]
  );

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, closeExpanded]);

  // Lock body scroll when lightbox is open (helps mobile/tablet avoid background scroll)
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com";

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:gap-8">
        <div className="order-2 lg:order-1 flex-1 min-w-0">
          {currentPage === HOME_PAGE && (
            <section
              id="about"
              className="mb-8 pb-8 border-b border-border/80"
              aria-labelledby="about-heading"
            >
              <h2 id="about-heading" className="text-lg font-medium tracking-tight text-foreground mb-3">
                About
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-xl">
                Landscapes, wildlife, architecture, whatever the road turns up.
                I like the mix of big sky and small detail, the planned stop and the turn we didn’t expect.
              </p>
              <p className="text-muted text-sm leading-relaxed max-w-xl mt-4">
                I want images that hold a moment without over-explaining it. Over time, a body of work that reads like a map of where I’ve been.
              </p>
              <p className="text-muted text-sm leading-relaxed max-w-xl mt-4">
                Inspired by late light, empty roads, crowded streets, and work that leaves room for the viewer. Craft and intention matter; so do accident and the shot you didn’t plan.
              </p>
              <p className="text-muted text-sm leading-relaxed max-w-xl mt-4">
                Photography turns experience into something you can return to and share. It’s a way to look twice, and proof that we were here.
                The places we went, and what stuck.
              </p>
              <p className="text-sm text-foreground mt-4">
                Follow for more, or reach out{" "}
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-muted underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  @the_places_we_went
                </a>
              </p>
            </section>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {isLoading
          ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/3] w-full bg-surface animate-pulse"
                aria-hidden
              />
            ))
          : images.map((image, index) => {
          const width = image.dimensions?.width ?? 800;
          const height = image.dimensions?.height ?? 600;
          const alt = image.dimensions?.baseName ?? image.name;
          const isAboveFold = index < 6;

          return (
            <button
              key={image.fullPath}
              type="button"
              onClick={() => openExpanded(image)}
              onContextMenu={(e) => e.preventDefault()}
              className="block w-full text-left overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted select-none"
            >
              <Image
                src={image.url}
                alt={alt}
                width={width}
                height={height}
                title={`${image.name} (${(image.size / 1024).toFixed(1)} KB). Click to expand`}
                className="w-full h-auto object-cover cursor-pointer pointer-events-none"
                sizes="(max-width: 640px) 50vw, 33vw"
                draggable={false}
                {...(isAboveFold ? { priority: true } : { loading: "lazy" })}
                unoptimized
              />
            </button>
          );
            })}
          </div>
        </div>
        <aside
          className="hidden lg:block lg:shrink-0 lg:w-48 lg:sticky lg:top-24 lg:self-start"
          aria-label="Galleries"
        >
          <GalleryList
            variant="vertical"
            galleries={galleries}
            galleriesLoading={galleriesLoading}
            currentPage={currentPage}
            onSelect={selectGallery}
          />
        </aside>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 overscroll-contain"
          onClick={closeExpanded}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingRight: "max(0.75rem, env(safe-area-inset-right))",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            }}
          >
            <div
              className="relative flex items-center justify-center min-w-[120px] min-h-[120px] max-h-[min(80vh,80dvh)] select-none"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {!expandedImageLoaded && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  <div className="w-10 h-10 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                </div>
              )}
              <Image
                src={expanded.url}
                alt={expanded.dimensions?.baseName ?? expanded.name}
                width={expanded.dimensions?.width ?? 1920}
                height={expanded.dimensions?.height ?? 1080}
                className={`max-w-full max-h-[min(80vh,80dvh)] w-auto h-auto object-contain transition-opacity duration-200 [-webkit-user-drag:none] [user-drag:none] ${
                  expandedImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                sizes="100vw"
                loading="lazy"
                draggable={false}
                unoptimized
                onLoad={() => setExpandedImageLoaded(true)}
              />
              <div className="absolute bottom-0 right-0 translate-y-full flex gap-5 px-4 pt-4 pb-2 touch-manual">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center w-9 h-9 rounded-full text-background/90 bg-background/10 hover:bg-background/20 active:bg-background/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-background cursor-pointer"
                  aria-label="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center w-9 h-9 rounded-full text-background/90 bg-background/10 hover:bg-background/20 active:bg-background/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-background cursor-pointer"
                  aria-label="Share"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" x2="12" y1="2" y2="15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeExpanded}
            className="absolute z-10 flex items-center justify-center min-w-[44px] min-h-[44px] p-2 text-background/90 hover:bg-background/10 hover:text-background active:bg-background/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-background rounded-full touch-manual cursor-pointer"
            style={{
              top: "max(0.75rem, env(safe-area-inset-top))",
              right: "max(0.75rem, env(safe-area-inset-right))",
            }}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
